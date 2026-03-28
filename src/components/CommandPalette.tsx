import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, FileText, FolderLock, Home, Newspaper, Search, Shield, Target, Trophy, User, Users, Zap } from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/DataContext';
import { DigitalScorelist, NewsRoomPost } from '@/lib/v2types';
import { logAudit, v2api } from '@/lib/v2api';

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  keywords: string;
  section: string;
  icon: ReactNode;
  action: () => void;
  route?: string;
}

const ROLES: Record<'admin' | 'player' | 'management' | 'all', string> = {
  admin: 'Admin',
  player: 'Player',
  management: 'Management',
  all: 'All users',
};

export function CommandPalette() {
  const { user, isAdmin, isManagement, isPlayer } = useAuth();
  const { matches, players, tournaments, lastRefresh } = useData();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [newsPosts, setNewsPosts] = useState<NewsRoomPost[]>([]);

  const userId = user?.management_id || user?.player_id || user?.username || 'guest';
  const role = user?.type || 'all';
  const queryTelemetryRef = useRef('');

  const refreshIndex = useCallback(async () => {
    const [scorelistRows, newsRows] = await Promise.all([
      v2api.getScorelists(),
      v2api.getNewsRoomPosts(),
    ]);

    setScorelists((prev) => {
      const byId = new Map(prev.map((item) => [item.scorelist_id, item]));
      scorelistRows.forEach((item) => byId.set(item.scorelist_id, item));
      return Array.from(byId.values())
        .sort((a, b) => (b.generated_at || '').localeCompare(a.generated_at || ''))
        .slice(0, 50);
    });

    setNewsPosts((prev) => {
      const byId = new Map(prev.map((item) => [item.post_id, item]));
      newsRows.forEach((item) => byId.set(item.post_id, item));
      return Array.from(byId.values())
        .filter((item) => item.status !== 'draft')
        .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
        .slice(0, 50);
    });
  }, []);

  useEffect(() => {
    refreshIndex();
    const id = window.setInterval(refreshIndex, 60000);
    const onFocus = () => refreshIndex();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshIndex]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    const openFromNav = () => setOpen(true);

    document.addEventListener('keydown', down);
    window.addEventListener('open-command-palette', openFromNav);
    return () => {
      document.removeEventListener('keydown', down);
      window.removeEventListener('open-command-palette', openFromNav);
    };
  }, []);

  useEffect(() => {
    if (open) {
      logAudit(userId, 'command_palette_open', 'ux', 'command_palette', JSON.stringify({ path: location.pathname, role }));
    }
  }, [location.pathname, open, role, userId]);

  useEffect(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2 || normalized === queryTelemetryRef.current) return;
    queryTelemetryRef.current = normalized;
    const timer = window.setTimeout(() => {
      logAudit(userId, 'command_palette_search', 'ux', 'command_palette', JSON.stringify({ query: normalized, path: location.pathname, role }));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [location.pathname, query, role, userId]);

  const execute = useCallback((item: Omit<PaletteItem, 'action'> & { action?: () => void }) => {
    if (item.action) item.action();
    setOpen(false);
    setQuery('');
    logAudit(
      userId,
      'command_palette_execute',
      'ux',
      item.id,
      JSON.stringify({ label: item.label, section: item.section, route: item.route || '', role, query }),
    );
  }, [query, role, userId]);

  const routeItems = useMemo<PaletteItem[]>(() => {
    const base: PaletteItem[] = [
      {
        id: 'route-home',
        label: 'Home',
        description: 'Go to landing dashboard',
        keywords: 'home dashboard index',
        section: 'Routes',
        icon: <Home className="h-4 w-4" />,
        route: '/',
        action: () => navigate('/'),
      },
      {
        id: 'route-leaderboards',
        label: 'Leaderboards',
        description: 'Rankings and performance tables',
        keywords: 'leaderboard rankings points',
        section: 'Routes',
        icon: <Trophy className="h-4 w-4" />,
        route: '/leaderboards',
        action: () => navigate('/leaderboards'),
      },
      {
        id: 'route-live',
        label: 'Live Matches',
        description: 'Live scoring and active matches',
        keywords: 'live matches scoring',
        section: 'Routes',
        icon: <Zap className="h-4 w-4" />,
        route: '/live',
        action: () => navigate('/live'),
      },
    ];

    if (user) {
      base.push({
        id: 'route-management',
        label: 'Board',
        description: 'Board/management portal',
        keywords: 'board management portal',
        section: 'Routes',
        icon: <Users className="h-4 w-4" />,
        route: '/management',
        action: () => navigate('/management'),
      });
    }

    if (isPlayer || isManagement || isAdmin) {
      base.push({
        id: 'route-news-room',
        label: 'News Room',
        description: 'Official updates and bulletins',
        keywords: 'news posts announcements',
        section: 'Routes',
        icon: <Newspaper className="h-4 w-4" />,
        route: '/news-room',
        action: () => navigate('/news-room'),
      });
    }

    if (isManagement || isAdmin) {
      base.push({
        id: 'route-documents',
        label: 'Documents Portal',
        description: 'Restricted documents and files',
        keywords: 'documents files official',
        section: 'Routes',
        icon: <FolderLock className="h-4 w-4" />,
        route: '/documents-portal',
        action: () => navigate('/documents-portal'),
      });
    }

    return base;
  }, [isAdmin, isManagement, isPlayer, navigate, user]);

  const actionItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];
    if (isAdmin || isManagement) {
      items.push({
        id: 'action-generate-scorelist',
        label: 'Generate scorelist',
        description: `${ROLES[role as keyof typeof ROLES]} quick action`,
        keywords: 'generate scorelist digital',
        section: 'Quick actions',
        icon: <FileText className="h-4 w-4" />,
        route: '/admin/scorelists',
        action: () => navigate('/admin/scorelists'),
      });
    }

    if (isAdmin) {
      const pendingApprovals = scorelists.filter((item) => (item.certification_status || '').toLowerCase() === 'pending_approval').length;
      items.push(
        {
          id: 'action-open-match-center',
          label: 'Open match center',
          description: 'Jump to scoring controls',
          keywords: 'match center scoring admin',
          section: 'Quick actions',
          icon: <Target className="h-4 w-4" />,
          route: '/admin/match-center',
          action: () => navigate('/admin/match-center'),
        },
        {
          id: 'action-pending-approvals',
          label: 'View pending approvals',
          description: `Pending certification approvals: ${pendingApprovals}`,
          keywords: 'pending approvals certificate scorelist',
          section: 'Quick actions',
          icon: <Shield className="h-4 w-4" />,
          route: '/admin/scorelists',
          action: () => navigate('/admin/scorelists'),
        },
      );
    }

    if (isPlayer) {
      items.push({
        id: 'action-player-dashboard',
        label: 'Open player dashboard',
        description: 'Personal stats and profile',
        keywords: 'player dashboard profile',
        section: 'Quick actions',
        icon: <User className="h-4 w-4" />,
        route: '/player',
        action: () => navigate('/player'),
      });
    }

    return items;
  }, [isAdmin, isManagement, isPlayer, navigate, role, scorelists]);

  const matchItems = useMemo<PaletteItem[]>(() => matches.slice(0, 40).map((match) => ({
    id: `match-${match.match_id}`,
    label: `${match.team_a} vs ${match.team_b}`,
    description: `${match.date || 'No date'} • ${match.status}`,
    keywords: `${match.match_id} ${match.team_a} ${match.team_b} ${match.venue} ${match.status}`.toLowerCase(),
    section: 'Matches',
    icon: <Zap className="h-4 w-4" />,
    route: `/match/${match.match_id}`,
    action: () => navigate(`/match/${match.match_id}`),
  })), [matches, navigate]);

  const playerItems = useMemo<PaletteItem[]>(() => players.slice(0, 80).map((player) => ({
    id: `player-${player.player_id}`,
    label: player.name,
    description: `${player.role} • ${player.status}`,
    keywords: `${player.player_id} ${player.name} ${player.username} ${player.role} ${player.status}`.toLowerCase(),
    section: 'Players',
    icon: <User className="h-4 w-4" />,
    route: `/player/${player.player_id}`,
    action: () => navigate(`/player/${player.player_id}`),
  })), [navigate, players]);

  const tournamentItems = useMemo<PaletteItem[]>(() => tournaments.slice(0, 40).map((tournament) => ({
    id: `tournament-${tournament.tournament_id}`,
    label: tournament.name,
    description: `${tournament.format} • ${tournament.overs} overs`,
    keywords: `${tournament.tournament_id} ${tournament.name} ${tournament.format} ${tournament.description}`.toLowerCase(),
    section: 'Tournaments',
    icon: <ClipboardList className="h-4 w-4" />,
    route: `/tournament/${tournament.tournament_id}`,
    action: () => navigate(`/tournament/${tournament.tournament_id}`),
  })), [navigate, tournaments]);

  const scorelistItems = useMemo<PaletteItem[]>(() => scorelists.map((scorelist) => ({
    id: `scorelist-${scorelist.scorelist_id}`,
    label: `Scorelist ${scorelist.scorelist_id}`,
    description: `Match ${scorelist.match_id || '-'} • ${scorelist.certification_status || 'untracked'}`,
    keywords: `${scorelist.scorelist_id} ${scorelist.match_id} ${scorelist.generated_by} ${scorelist.certification_status || ''}`.toLowerCase(),
    section: 'Scorelists',
    icon: <FileText className="h-4 w-4" />,
    route: '/admin/scorelists',
    action: () => navigate('/admin/scorelists'),
  })), [navigate, scorelists]);

  const newsItems = useMemo<PaletteItem[]>(() => newsPosts.map((post) => ({
    id: `news-${post.post_id}`,
    label: post.title,
    description: `${post.audience} audience • ${post.posted_by_name}`,
    keywords: `${post.post_id} ${post.title} ${post.body} ${post.posted_by_name}`.toLowerCase(),
    section: 'News',
    icon: <Newspaper className="h-4 w-4" />,
    route: '/news-room',
    action: () => navigate('/news-room'),
  })), [navigate, newsPosts]);

  const sections = useMemo(() => ({
    Routes: routeItems,
    'Quick actions': actionItems,
    Matches: matchItems,
    Players: playerItems,
    Tournaments: tournamentItems,
    Scorelists: scorelistItems,
    News: newsItems,
  }), [actionItems, matchItems, newsItems, playerItems, routeItems, scorelistItems, tournamentItems]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden md:flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground hover:text-foreground"
      >
        <Search className="h-4 w-4" />
        Search or run command
        <span className="rounded border bg-muted px-1.5 py-0.5 text-xs">⌘/Ctrl+K</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search routes, matches, players, tournaments, scorelists, and news..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[65vh]">
          <CommandEmpty>No results found.</CommandEmpty>

          {Object.entries(sections).map(([sectionName, items]) => (
            items.length > 0 ? (
              <CommandGroup key={sectionName} heading={sectionName.toUpperCase()} className="[&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide">
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.keywords} ${item.section}`}
                    onSelect={() => execute(item)}
                    className="items-start"
                  >
                    <div className="mr-2 mt-0.5">{item.icon}</div>
                    <div className="flex-1">
                      <p className="font-medium leading-tight">{item.label}</p>
                      {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                    </div>
                    {item.route && <CommandShortcut>{item.route}</CommandShortcut>}
                  </CommandItem>
                ))}
                <CommandSeparator />
              </CommandGroup>
            ) : null
          ))}

          <div className="px-3 py-2 text-xs text-muted-foreground">
            Index refreshes every 60s and on window focus • Last data refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'warming up'}
          </div>
        </CommandList>
      </CommandDialog>
    </>
  );
}

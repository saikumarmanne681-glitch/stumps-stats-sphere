import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogIn, LogOut, LayoutDashboard, Home, Trophy, Zap, Users, Shield, Database, Menu, Radio, Layers3, Crown, Newspaper, FolderLock, Search, FileText, BadgeCheck, ClipboardList, CalendarDays, ChartNoAxesCombined } from 'lucide-react';
import { CommandPalette } from '@/components/CommandPalette';
import { Logo } from '@/components/Logo';

export function Navbar() {
  const { user, logout, isAdmin, isPlayer, isManagement, isTeam } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => {
    const close = () => mobile && setOpen(false);
    const base = mobile
      ? 'w-full justify-start text-sm h-10'
      : 'h-9 shrink-0 whitespace-nowrap rounded-full px-2.5 text-xs xl:px-3 xl:text-[13px]';
    const MobileSection = ({ title, children }: { title: string; children?: ReactNode }) => (
      <>
        <p className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {children}
      </>
    );

    return (
      <div className={mobile ? 'flex flex-col gap-1 overflow-y-auto max-h-[78vh] pb-4' : 'flex items-center gap-1 flex-nowrap'}>
        {mobile && (
          <Button variant="outline" size="sm" className={base} onClick={() => { close(); window.dispatchEvent(new CustomEvent('open-command-palette')); }}>
            <Search className="h-4 w-4 mr-2" /> Search / Commands
          </Button>
        )}
        {mobile && <MobileSection title="Public" />}
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/"><Home className="h-3.5 w-3.5 mr-1.5" /> Home</Link></Button>
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/leaderboards"><Trophy className="h-3.5 w-3.5 mr-1.5" /> Leaderboards</Link></Button>
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/insights"><ChartNoAxesCombined className="h-3.5 w-3.5 mr-1.5" /> Insights</Link></Button>
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/live"><Radio className="h-3.5 w-3.5 mr-1.5" /> Live</Link></Button>
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/seasons"><Layers3 className="h-3.5 w-3.5 mr-1.5" /> Seasons</Link></Button>
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/schedules"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Schedules</Link></Button>
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/hall-of-glory"><Crown className="h-3.5 w-3.5 mr-1.5" /> Glory</Link></Button>
        <Button variant="ghost" size="sm" className={base} asChild onClick={close}><Link to="/verify"><BadgeCheck className="h-3.5 w-3.5 mr-1.5" /> Verify</Link></Button>

        {mobile && user && <MobileSection title="Workspace" />}
        {user && (
          <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
            <Link to="/management"><Users className="h-3.5 w-3.5 mr-1.5" /> Board</Link>
          </Button>
        )}
        {user && (
          <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
            <Link to="/forms"><FileText className="h-3.5 w-3.5 mr-1.5" /> Forms</Link>
          </Button>
        )}
        {(isPlayer || isManagement || isTeam) && (
          <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
            <Link to="/news-room"><Newspaper className="h-3.5 w-3.5 mr-1.5" /> News</Link>
          </Button>
        )}
        {(isManagement || isAdmin) && (
          <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
            <Link to="/documents-portal"><FolderLock className="h-3.5 w-3.5 mr-1.5" /> Docs</Link>
          </Button>
        )}

        {!user && (
          <Button size="sm" className={base} asChild onClick={close}>
            <Link to="/login"><LogIn className="h-3.5 w-3.5 mr-1.5" /> Login</Link>
          </Button>
        )}

        {isAdmin && (
          <>
            {mobile && <MobileSection title="Admin" />}
            <Button variant="outline" size="sm" className={base} asChild onClick={close}>
              <Link to="/admin"><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Admin</Link>
            </Button>
            <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
              <Link to="/admin/match-center"><Zap className="h-3.5 w-3.5 mr-1.5" /> Scoring</Link>
            </Button>
            <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-3.5 w-3.5 mr-1.5" /> Scorelists</Link>
            </Button>
            <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
              <Link to="/admin/management"><Users className="h-3.5 w-3.5 mr-1.5" /> Mgmt</Link>
            </Button>
            <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
              <Link to="/admin/ops-center"><ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Ops</Link>
            </Button>
            <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
              <Link to="/admin/backups"><Database className="h-3.5 w-3.5 mr-1.5" /> Backup</Link>
            </Button>
          </>
        )}

        {isPlayer && (
          <Button variant="outline" size="sm" className={base} asChild onClick={close}>
            <Link to="/player"><LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Dashboard</Link>
          </Button>
        )}

        {(isManagement || isTeam) && (
          <>
            <Button variant="outline" size="sm" className={base} asChild onClick={close}>
              <Link to={isTeam ? "/management/teams-dashboard" : "/management"}>
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> {isTeam ? 'Team' : 'Mgmt'}
              </Link>
            </Button>
            {isManagement && (
              <Button variant="ghost" size="sm" className={base} asChild onClick={close}>
                <Link to="/admin/scorelists"><Shield className="h-3.5 w-3.5 mr-1.5" /> Scorelists</Link>
              </Button>
            )}
          </>
        )}

        {user && (
          <div className={`flex items-center gap-2 ${mobile ? 'pt-3 mt-2 border-t' : 'ml-1'}`}>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              <strong>{user.name}</strong>
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Log out"
              title="Log out"
              onClick={() => { logout(); navigate('/'); close(); }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-primary/10 bg-card/85 shadow-soft backdrop-blur-xl">
      <span className="absolute inset-x-0 bottom-0 h-px bg-gradient-gold opacity-60" />
      <div className="container relative mx-auto flex min-h-14 items-center justify-between gap-2 px-3 py-2 md:px-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <Logo name="main-logo" size={40} className="hidden lg:block h-10 w-10" />
          <Logo name="main-logo" size={36} className="hidden md:block lg:hidden h-9 w-9" />
          <Logo name="main-logo" size={32} className="md:hidden h-8 w-8" />
          <span className="font-display text-sm font-extrabold leading-none tracking-tight text-primary sm:text-base md:text-lg">Stumps Stats Sphere</span>
        </Link>

        <CommandPalette />

        <div className="hidden min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto scrollbar-thin py-0.5 md:flex">
          <NavItems />
        </div>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Open navigation menu" title="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm border-l border-primary/10 bg-gradient-surface px-4 pt-10">
              <NavItems mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

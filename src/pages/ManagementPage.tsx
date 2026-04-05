import { useEffect, useMemo, useState } from 'react';
import { Search, Users2, ShieldCheck, Clock3, FileCheck2, ArrowRight, Filter, Loader2 } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { v2api } from '@/lib/v2api';
import { BoardConfiguration, ManagementUser } from '@/lib/v2types';
import { BOARD_DEPARTMENTS, inferDepartmentFromManagementUser, parseDepartmentAssignments } from '@/lib/boardDepartments';
import { selectLatestBoardConfiguration } from '@/lib/boardConfig';

const pendingActions = [
  {
    title: 'Scorelist approvals',
    description: 'Scorelists currently waiting for your designation stage approval.',
    to: '/admin/scorelists',
  },
  {
    title: 'Schedule approvals',
    description: 'Schedules that need your governance decision.',
    to: '/admin/work-queue',
  },
];

interface BoardMemberCard {
  id: string;
  name: string;
  role: string;
  email: string;
  description: string;
  tags: string[];
}

const tagStyles: Record<string, string> = {
  Leadership: 'bg-primary/10 text-primary border-primary/20',
  'Administration Team': 'bg-primary/10 text-primary border-primary/20',
  'Executive Board': 'bg-accent/10 text-accent-foreground border-accent/20',
  'Competition Operations': 'bg-primary/10 text-primary border-primary/20',
  'Finance & Compliance': 'bg-primary/10 text-primary border-primary/20',
  'Player Welfare & Development': 'bg-primary/10 text-primary border-primary/20',
  'Discipline & Ethics': 'bg-primary/10 text-primary border-primary/20',
  'Media & Community Engagement': 'bg-accent/10 text-accent-foreground border-accent/20',
  Governance: 'bg-primary/10 text-primary border-primary/20',
  Operations: 'bg-accent/10 text-accent-foreground border-accent/20',
};

const ManagementPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<ManagementUser[]>([]);
  const [boardConfig, setBoardConfig] = useState<BoardConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [designationFilter, setDesignationFilter] = useState('All designations');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [managementUsers, boardConfigs] = await Promise.all([
          v2api.getManagementUsers(),
          v2api.getBoardConfiguration(),
        ]);
        if (cancelled) return;
        setUsers(managementUsers.filter((member) => String(member.status || '').toLowerCase() !== 'inactive'));
        setBoardConfig(selectLatestBoardConfiguration(boardConfigs));
        setLoadError(null);
      } catch {
        if (cancelled) return;
        setLoadError('Board data could not be loaded right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const boardMembers = useMemo<BoardMemberCard[]>(() => {
    const adminTeamIds = new Set(
      String(boardConfig?.administration_team_ids || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );

    const departmentLookup = new Map(BOARD_DEPARTMENTS.map((department) => [department.id, department.name]));
    const assignments = parseDepartmentAssignments(boardConfig);
    const departmentMap = new Map<string, Set<string>>();

    assignments.forEach((assignment) => {
      const departmentName = departmentLookup.get(assignment.department_id);
      if (!departmentName) return;
      [assignment.head_id, ...assignment.team_ids].filter(Boolean).forEach((memberId) => {
        const current = departmentMap.get(memberId) || new Set<string>();
        current.add(departmentName);
        departmentMap.set(memberId, current);
      });
    });

    return [...users]
      .sort((left, right) => Number(right.authority_level || 0) - Number(left.authority_level || 0) || left.name.localeCompare(right.name))
      .map((member) => {
        const inferredDepartment = inferDepartmentFromManagementUser(member);
        const departmentTags = [...(departmentMap.get(member.management_id) || new Set<string>())];
        const tags = Array.from(new Set([
          adminTeamIds.has(member.management_id) ? 'Administration Team' : null,
          /president|vice president|secretary|treasurer/i.test(String(member.designation || '')) ? 'Leadership' : null,
          ...(departmentTags.length ? departmentTags : [inferredDepartment]),
        ].filter(Boolean) as string[]));

        return {
          id: member.management_id,
          name: member.name || member.username || member.management_id,
          role: member.designation || 'Board Member',
          email: member.email || 'No email added',
          description: String(member.role || '').trim() || `Authority level ${member.authority_level || 0} governance member.`,
          tags,
        };
      });
  }, [boardConfig, users]);

  const allDesignations = useMemo(
    () => ['All designations', ...new Set(boardMembers.map((member) => member.role))],
    [boardMembers],
  );

  const kpiCards = useMemo(() => {
    const adminTeamCount = String(boardConfig?.administration_team_ids || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean).length;
    const leadershipCount = boardMembers.filter((member) => member.tags.includes('Leadership')).length;
    const departmentCount = new Set(
      boardMembers.flatMap((member) => member.tags.filter((tag) => BOARD_DEPARTMENTS.some((department) => department.name === tag))),
    ).size;

    return [
      {
        title: 'BOARD MEMBERS',
        value: String(boardMembers.length),
        subtext: 'Active governance users loaded from the management sheets.',
        icon: Users2,
      },
      {
        title: 'ADMIN TEAM',
        value: String(adminTeamCount),
        subtext: 'Executive members currently selected in board configuration.',
        icon: ShieldCheck,
      },
      {
        title: 'LEADERSHIP',
        value: String(leadershipCount),
        subtext: 'President, vice president, secretary, treasurer, and leadership roles.',
        icon: Clock3,
      },
      {
        title: 'DEPARTMENTS',
        value: String(departmentCount),
        subtext: boardConfig?.current_period || 'Department coverage inferred from the latest board configuration.',
        icon: FileCheck2,
      },
    ];
  }, [boardConfig?.administration_team_ids, boardConfig?.current_period, boardMembers]);

  const filteredMembers = useMemo(() => {
    return boardMembers.filter((member) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || [member.name, member.email, member.role, ...member.tags].some((v) => v.toLowerCase().includes(query));
      const matchesDesignation = designationFilter === 'All designations' || member.role === designationFilter;
      return matchesSearch && matchesDesignation;
    });
  }, [searchQuery, designationFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        {/* Hero Header */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-5 sm:p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Governance workspace</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mt-1">🏛️ Management Board</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Unified governance workspace for leadership approvals, coordination, and board directory visibility across all devices.
          </p>
          {boardConfig?.current_period && (
            <Badge variant="outline" className="mt-4 w-fit">Current period: {boardConfig.current_period}</Badge>
          )}
        </div>

        {loadError && (
          <Card className="border-destructive/30">
            <CardContent className="p-4 text-sm text-destructive">{loadError}</CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {kpiCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="border-primary/15 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] sm:text-xs font-semibold tracking-[0.12em] uppercase text-muted-foreground">{card.title}</p>
                    <span className="inline-flex rounded-xl bg-primary/10 p-2">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                  </div>
                  <p className="mt-3 text-2xl sm:text-3xl font-bold text-foreground">{card.value}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{card.subtext}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pending Actions */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="font-display text-lg sm:text-xl">⏳ Pending Management Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingActions.map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-r from-background via-muted/30 to-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm sm:text-base font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{item.description}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(item.to)}
                  className="w-full gap-2 sm:w-auto"
                >
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Board Members */}
        <Card className="border-primary/15">
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="font-display text-lg sm:text-xl">👥 Board Members</CardTitle>
              <Badge variant="outline" className="w-fit text-xs">{filteredMembers.length} of {boardMembers.length} members</Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, email, designation, or role"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={designationFilter} onValueChange={setDesignationFilter}>
                <SelectTrigger className="w-full sm:w-52">
                  <Filter className="h-3.5 w-3.5 mr-1 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allDesignations.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading board members…
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-border bg-gradient-to-br from-card via-background to-primary/5 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground shadow-sm">
                      {member.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                      <p className="text-xs font-medium text-primary">{member.role}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground truncate">{member.email}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{member.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {member.tags.map((tag) => (
                      <span
                        key={`${member.id}-${tag}`}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${tagStyles[tag] ?? 'bg-muted text-muted-foreground border-border'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {!loading && filteredMembers.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground py-8">No members match your search.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagementPage;

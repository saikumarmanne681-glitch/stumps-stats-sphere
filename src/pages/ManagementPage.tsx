import { useState, useMemo } from 'react';
import { Search, Users2, ShieldCheck, Clock3, FileCheck2, ArrowRight, Filter } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

const kpiCards = [
  {
    title: 'PENDING APPROVALS',
    value: '0',
    subtext: 'Items currently waiting for your signature or review.',
    icon: Clock3,
    accent: 'accent',
  },
  {
    title: 'CERTIFIED SCORELISTS',
    value: '3',
    subtext: 'Official documents already locked in the certification chain.',
    icon: FileCheck2,
    accent: 'primary',
  },
  {
    title: 'LEADERSHIP',
    value: '4',
    subtext: 'Executive governance members available for escalations.',
    icon: Users2,
    accent: 'primary',
  },
  {
    title: 'GOVERNANCE TRAFFIC',
    value: '10',
    subtext: 'Integrity hash',
    icon: ShieldCheck,
    accent: 'primary',
  },
];

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

const boardMembers = [
  {
    name: 'Saikumar',
    role: 'President',
    email: 'skmrmdrj@gmail.com',
    description: 'Oversees strategic governance and final executive decisions.',
    tags: ['Executive Board', 'Leadership'],
  },
  {
    name: 'Chandrashekar',
    role: 'Vice President',
    email: 'skmrmdrj@gmail.com',
    description: 'Coordinates operations and supports cross-functional leadership priorities.',
    tags: ['Competition Operations', 'Leadership'],
  },
  {
    name: 'Dayakar',
    role: 'Treasurer',
    email: 'skmrmdrj@gmail.com',
    description: 'Leads treasury governance, budget controls, and compliance checks.',
    tags: ['Finance & Compliance', 'Leadership'],
  },
  {
    name: 'Omprakash',
    role: 'Scoring Official',
    email: 'skmrmdrj@gmail.com',
    description: 'Maintains score integrity with board-level reporting support.',
    tags: ['Executive Board'],
  },
  {
    name: 'Aarav',
    role: 'Secretary',
    email: 'skmrmdrj@gmail.com',
    description: 'Handles governance records and board meeting documentation.',
    tags: ['Executive Board', 'Operations'],
  },
  {
    name: 'Rohit',
    role: 'Compliance Lead',
    email: 'skmrmdrj@gmail.com',
    description: 'Monitors policy adherence and escalates integrity exceptions.',
    tags: ['Finance & Compliance', 'Governance'],
  },
  {
    name: 'Karthik',
    role: 'Scheduling Officer',
    email: 'skmrmdrj@gmail.com',
    description: 'Owns schedule routing and approval chain readiness.',
    tags: ['Competition Operations', 'Governance'],
  },
  {
    name: 'Naveen',
    role: 'Board Coordinator',
    email: 'skmrmdrj@gmail.com',
    description: 'Facilitates communication and board task orchestration.',
    tags: ['Leadership', 'Operations'],
  },
];

const tagStyles: Record<string, string> = {
  Leadership: 'bg-primary/10 text-primary border-primary/20',
  'Executive Board': 'bg-accent/10 text-accent-foreground border-accent/20',
  'Competition Operations': 'bg-primary/10 text-primary border-primary/20',
  'Finance & Compliance': 'bg-primary/10 text-primary border-primary/20',
  Governance: 'bg-primary/10 text-primary border-primary/20',
  Operations: 'bg-accent/10 text-accent-foreground border-accent/20',
};

const allDesignations = ['All designations', ...new Set(boardMembers.map((m) => m.role))];

const ManagementPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('All designations');

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
        </div>

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredMembers.map((member) => (
                <div
                  key={`${member.name}-${member.role}`}
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
                        key={`${member.name}-${tag}`}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${tagStyles[tag] ?? 'bg-muted text-muted-foreground border-border'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {filteredMembers.length === 0 && (
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

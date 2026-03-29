import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, PlusCircle, RefreshCw, ShieldCheck, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useData } from '@/lib/DataContext';
import { useToast } from '@/hooks/use-toast';
import { TeamProfile, TeamTitleRecord, SupportTicket } from '@/lib/v2types';
import { generateId } from '@/lib/utils';
import { Match } from '@/lib/types';
import { clearQAMockData, readQAMockData, writeQAMockData } from '@/lib/qaMockData';

const QA_ITEMS = [
  'Validate dashboard role-based access and login flows',
  'Run full match workflow: create → live scoring → completed result',
  'Verify tournament + season creation/edit/delete from admin',
  'Verify support ticket submission and status transitions',
  'Check team dashboard stats, honors and match history accuracy',
  'Validate menu responsiveness on desktop, tablet and mobile',
  'Run smoke test for elections, announcements and news modules',
];

export function AdminTeamsOperations() {
  const { seasons, tournaments } = useData();
  const { toast } = useToast();
  const [teamName, setTeamName] = useState('');
  const [titleForm, setTitleForm] = useState({
    team_name: '',
    tournament_id: '',
    season_id: '',
    result_type: 'winner' as TeamTitleRecord['result_type'],
    won_on: new Date().toISOString(),
    notes: '',
  });
  const [profileForm, setProfileForm] = useState({
    team_name: '',
    short_name: '',
    captain_name: '',
    coach_name: '',
    home_ground: '',
    founded_year: '',
    primary_color: '#1f4ed8',
    secondary_color: '#f59e0b',
  });
  const [qaState, setQaState] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [qaMockEnabled, setQaMockEnabled] = useState(readQAMockData().enabled);

  const seasonOptions = useMemo(() => seasons.map((season) => {
    const tournament = tournaments.find((item) => item.tournament_id === season.tournament_id);
    return {
      ...season,
      label: `${tournament?.name || season.tournament_id} • ${season.year}`,
    };
  }), [seasons, tournaments]);

  const handleAutoImportTitles = async () => {
    setSubmitting(true);
    try {
      const existing = readQAMockData().titles;
      const existingKeys = new Set(existing.map((item) => `${item.team_name}|${item.season_id}|${item.result_type}`));
      const rows: TeamTitleRecord[] = [];

      seasons.forEach((season) => {
        const tournament = tournaments.find((item) => item.tournament_id === season.tournament_id);
        const competitionName = tournament?.name || season.tournament_id;
        const wonOn = season.end_date || season.start_date || new Date().toISOString();

        if (season.winner_team?.trim()) {
          const key = `${season.winner_team}|${season.season_id}|winner`;
          if (!existingKeys.has(key)) {
            rows.push({
              title_id: generateId('TTL'),
              team_id: season.winner_team.trim().toLowerCase().replace(/\s+/g, '_'),
              team_name: season.winner_team.trim(),
              competition_name: competitionName,
              tournament_id: season.tournament_id,
              season_id: season.season_id,
              season_label: String(season.year),
              result_type: 'winner',
              won_on: wonOn,
              notes: 'Auto imported from season winners data',
              created_at: new Date().toISOString(),
            });
          }
        }

        if (season.runner_up_team?.trim()) {
          const key = `${season.runner_up_team}|${season.season_id}|runner_up`;
          if (!existingKeys.has(key)) {
            rows.push({
              title_id: generateId('TTL'),
              team_id: season.runner_up_team.trim().toLowerCase().replace(/\s+/g, '_'),
              team_name: season.runner_up_team.trim(),
              competition_name: competitionName,
              tournament_id: season.tournament_id,
              season_id: season.season_id,
              season_label: String(season.year),
              result_type: 'runner_up',
              won_on: wonOn,
              notes: 'Auto imported from season runners-up data',
              created_at: new Date().toISOString(),
            });
          }
        }
      });

      const previous = readQAMockData();
      writeQAMockData({
        ...previous,
        enabled: true,
        created_at: previous.created_at || new Date().toISOString(),
        titles: [...previous.titles, ...rows],
      });
      setQaMockEnabled(true);
      const imported = rows.length;
      toast({ title: 'Import finished', description: imported ? `Imported ${imported} title entries from season winners.` : 'No new title rows were needed.' });
    } catch {
      toast({ title: 'Import failed', description: 'Could not import team titles from seasons.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddTitle = async () => {
    if (!titleForm.team_name || !titleForm.tournament_id || !titleForm.season_id) {
      toast({ title: 'Missing fields', description: 'Team, tournament and season are required.', variant: 'destructive' });
      return;
    }
    const season = seasons.find((item) => item.season_id === titleForm.season_id);
    const tournament = tournaments.find((item) => item.tournament_id === titleForm.tournament_id);
    const payload: TeamTitleRecord = {
      title_id: generateId('TTL'),
      team_id: titleForm.team_name.toLowerCase().replace(/\s+/g, '_'),
      team_name: titleForm.team_name,
      competition_name: tournament?.name || titleForm.tournament_id,
      tournament_id: titleForm.tournament_id,
      season_id: titleForm.season_id,
      season_label: season ? String(season.year) : '',
      result_type: titleForm.result_type,
      won_on: titleForm.won_on,
      notes: titleForm.notes,
      created_at: new Date().toISOString(),
    };
    const previous = readQAMockData();
    writeQAMockData({
      ...previous,
      enabled: true,
      created_at: previous.created_at || new Date().toISOString(),
      titles: [payload, ...previous.titles],
    });
    setQaMockEnabled(true);
    toast({ title: 'Mock title added', description: `${payload.team_name} ${payload.result_type === 'winner' ? 'winner entry' : 'runner-up entry'} added in QA mock data.` });
    setTitleForm((prev) => ({ ...prev, notes: '' }));
  };

  const handleAddProfile = async () => {
    if (!profileForm.team_name.trim()) {
      toast({ title: 'Team name required', variant: 'destructive' });
      return;
    }
    const payload: TeamProfile = {
      team_id: generateId('TEAM'),
      team_name: profileForm.team_name.trim(),
      short_name: profileForm.short_name.trim(),
      captain_name: profileForm.captain_name.trim(),
      coach_name: profileForm.coach_name.trim(),
      home_ground: profileForm.home_ground.trim(),
      founded_year: profileForm.founded_year.trim(),
      primary_color: profileForm.primary_color,
      secondary_color: profileForm.secondary_color,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const previous = readQAMockData();
    writeQAMockData({
      ...previous,
      enabled: true,
      created_at: previous.created_at || new Date().toISOString(),
      profiles: [payload, ...previous.profiles],
    });
    setQaMockEnabled(true);
    toast({ title: 'Mock profile saved', description: 'Team profile saved only in QA mock session data.' });
    setTeamName(payload.team_name);
  };

  const handleCreateMockMatchAndTicket = () => {
    const now = new Date().toISOString();
    const mockTeam = profileForm.team_name.trim() || titleForm.team_name.trim() || 'QA Demo Team';
    const mockOpponent = 'QA Opponent XI';
    const mockMatch: Match = {
      match_id: generateId('MQA'),
      season_id: titleForm.season_id || seasons[0]?.season_id || 'QA_SEASON',
      tournament_id: titleForm.tournament_id || tournaments[0]?.tournament_id || 'QA_TOURNAMENT',
      date: now,
      team_a: mockTeam,
      team_b: mockOpponent,
      venue: 'QA Test Ground',
      status: 'completed',
      toss_winner: mockTeam,
      toss_decision: 'bat',
      result: `${mockTeam} won by 21 runs`,
      man_of_match: 'QA Captain',
      team_a_score: '178/6',
      team_b_score: '157/9',
      match_stage: 'QA Simulation',
    };
    const mockTicket: SupportTicket = {
      ticket_id: generateId('TKT'),
      created_by_user_id: 'qa-admin',
      category: 'qa-testing',
      priority: 'medium',
      subject: `[${mockTeam}] QA ticket for weekly checks`,
      description: 'This is session-only mock data for weekly feature validation.',
      attachment_url: '',
      status: 'open',
      assigned_admin_id: 'admin',
      created_at: now,
      first_response_due: now,
      resolution_due: now,
      resolved_at: '',
      closed_at: '',
    };

    const previous = readQAMockData();
    writeQAMockData({
      ...previous,
      enabled: true,
      created_at: previous.created_at || now,
      matches: [mockMatch, ...previous.matches],
      tickets: [mockTicket, ...previous.tickets],
    });
    setQaMockEnabled(true);
    toast({ title: 'Mock data generated', description: 'One mock match and one mock ticket were added for QA testing (session only).' });
  };

  const handleClearMockData = () => {
    clearQAMockData();
    setQaMockEnabled(false);
    toast({ title: 'QA mock data removed', description: 'All weekly testing mock data has been deleted from this browser session.' });
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Weekly Admin QA Facility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Use this checklist once every week to test all key UI features, workflows and functional modules.</p>
          <div className="grid gap-2">
            {QA_ITEMS.map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <Checkbox checked={!!qaState[item]} onCheckedChange={(checked) => setQaState((prev) => ({ ...prev, [item]: checked === true }))} />
                <span>{item}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
            <span>Weekly QA completion</span>
            <Badge>{Object.values(qaState).filter(Boolean).length}/{QA_ITEMS.length}</Badge>
          </div>
          <div className="rounded-lg border border-dashed p-3 text-sm space-y-2">
            <p><strong>Safe testing mode:</strong> all records created below are mock data in browser session storage only.</p>
            <p className="text-muted-foreground">It does not write to Google Sheets/live data and can be removed instantly after weekly testing.</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant={qaMockEnabled ? 'default' : 'outline'}>{qaMockEnabled ? 'Mock data active' : 'Mock data inactive'}</Badge>
              <Button type="button" variant="outline" size="sm" onClick={handleCreateMockMatchAndTicket}>Add sample mock match + ticket</Button>
              <Button type="button" variant="destructive" size="sm" onClick={handleClearMockData}>Delete all mock data</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" /> Auto import tournament titles from season winners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">This pulls winner/runner-up teams from seasons and inserts missing records into QA mock titles for temporary testing.</p>
          <Button onClick={handleAutoImportTitles} disabled={submitting}><ShieldCheck className="h-4 w-4 mr-1" /> {submitting ? 'Importing...' : 'Import titles to QA mock data'}</Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Add team tournament title</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2"><Label>Team name</Label><Input value={titleForm.team_name} onChange={(e) => setTitleForm((prev) => ({ ...prev, team_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Tournament</Label>
              <Select value={titleForm.tournament_id} onValueChange={(value) => setTitleForm((prev) => ({ ...prev, tournament_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select tournament" /></SelectTrigger>
                <SelectContent>{tournaments.map((t) => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Season</Label>
              <Select value={titleForm.season_id} onValueChange={(value) => setTitleForm((prev) => ({ ...prev, season_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>{seasonOptions.map((s) => <SelectItem key={s.season_id} value={s.season_id}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Result type</Label>
              <Select value={titleForm.result_type} onValueChange={(value) => setTitleForm((prev) => ({ ...prev, result_type: value as TeamTitleRecord['result_type'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="winner">Winner</SelectItem><SelectItem value="runner_up">Runner-up</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={titleForm.notes} onChange={(e) => setTitleForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
            <Button onClick={handleAddTitle}><PlusCircle className="h-4 w-4 mr-1" /> Add mock title record</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-primary" /> Add team profile from admin dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2"><Label>Team name</Label><Input value={profileForm.team_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, team_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Short name</Label><Input value={profileForm.short_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, short_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Founded year</Label><Input value={profileForm.founded_year} onChange={(e) => setProfileForm((prev) => ({ ...prev, founded_year: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Captain</Label><Input value={profileForm.captain_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, captain_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Coach</Label><Input value={profileForm.coach_name} onChange={(e) => setProfileForm((prev) => ({ ...prev, coach_name: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Home ground</Label><Input value={profileForm.home_ground} onChange={(e) => setProfileForm((prev) => ({ ...prev, home_ground: e.target.value }))} /></div>
            <Button onClick={handleAddProfile}>Save mock team profile</Button>
            {teamName && <p className="text-xs text-muted-foreground">Recently saved: {teamName}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

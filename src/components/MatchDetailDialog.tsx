import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Match, BattingScorecard, BowlingScorecard, Player, Tournament, Season } from '@/lib/types';
import { Calendar, MapPin, Award, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { SLA_CONFIG, SupportTicket } from '@/lib/v2types';
import { generateId } from '@/lib/utils';

interface MatchDetailDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batting: BattingScorecard[];
  bowling: BowlingScorecard[];
  players: Player[];
  tournament?: Tournament;
  season?: Season;
}

function calcTeamScore(batting: BattingScorecard[], team: string): string {
  const rows = batting.filter(b => b.team === team);
  if (rows.length === 0) return '-';
  const runs = rows.reduce((s, b) => s + b.runs, 0);
  const wkts = rows.filter(b => b.how_out && b.how_out !== 'not out').length;
  const balls = rows.reduce((s, b) => s + b.balls, 0);
  const overs = Math.floor(balls / 6) + (balls % 6) / 10;
  return `${runs}/${wkts} (${overs.toFixed(1)})`;
}

const CATEGORIES = ['Scorecard', 'Technical', 'Bug Report', 'General'];

export function MatchDetailDialog({ match, open, onOpenChange, batting, bowling, players, tournament, season }: MatchDetailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showReport, setShowReport] = useState(false);
  const [reportSubject, setReportSubject] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportCategory, setReportCategory] = useState('Scorecard');
  const [reportPriority, setReportPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [submitting, setSubmitting] = useState(false);

  if (!match) return null;

  const matchBatting = batting.filter(b => b.match_id === match.match_id);
  const matchBowling = bowling.filter(b => b.match_id === match.match_id);
  const mom = players.find(p => p.player_id === match.man_of_match);
  const getPlayerName = (id: string) => players.find(p => p.player_id === id)?.name || id;

  const teamAScore = match.team_a_score || calcTeamScore(matchBatting, match.team_a);
  const teamBScore = match.team_b_score || calcTeamScore(matchBatting, match.team_b);

  const handleReportIssue = async () => {
    if (!reportSubject.trim() || !reportDesc.trim() || !user) return;
    setSubmitting(true);
    const sla = SLA_CONFIG[reportPriority];
    const now = new Date();
    const ticket: SupportTicket = {
      ticket_id: generateId('TKT'),
      created_by_user_id: user.player_id || user.management_id || 'admin',
      category: reportCategory,
      priority: reportPriority,
      subject: `[Match: ${match.team_a} vs ${match.team_b}] ${reportSubject}`,
      description: `Match ID: ${match.match_id}\n${match.team_a} vs ${match.team_b}\n\n${reportDesc}`,
      attachment_url: '',
      status: 'open',
      assigned_admin_id: '',
      created_at: istNow(),
      first_response_due: new Date(now.getTime() + sla.firstResponse * 3600000).toISOString(),
      resolution_due: new Date(now.getTime() + sla.resolution * 3600000).toISOString(),
      resolved_at: '',
      closed_at: '',
    };
    await v2api.addTicket(ticket);
    logAudit(user.player_id || user.username, 'create_ticket_from_match', 'support_ticket', ticket.ticket_id, match.match_id);
    toast({ title: '✅ Issue reported', description: 'Support ticket created for this match' });
    setShowReport(false);
    setReportSubject('');
    setReportDesc('');
    setSubmitting(false);
  };

  const renderTeamScorecard = (team: string) => {
    const teamBat = matchBatting.filter(b => b.team === team);
    const teamBowl = matchBowling.filter(b => b.team === team);
    const totalRuns = teamBat.reduce((s, b) => s + b.runs, 0);
    const totalWickets = teamBat.filter(b => b.how_out && b.how_out !== 'not out').length;
    const totalBalls = teamBat.reduce((s, b) => s + b.balls, 0);
    const displayScore = match.team_a === team ? teamAScore : teamBScore;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-display text-lg md:text-xl font-bold">{team}</span>
          <Badge className="bg-primary text-primary-foreground text-sm px-3">{displayScore}</Badge>
        </div>
        {teamBat.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-primary">🏏 Batting</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Batter</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">B</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">4s</TableHead><TableHead className="text-right hidden sm:table-cell">6s</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">SR</TableHead><TableHead className="hidden sm:table-cell">Dismissal</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {teamBat.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-xs md:text-sm">{getPlayerName(b.player_id)}</TableCell>
                      <TableCell className="text-right font-bold">{b.runs}</TableCell>
                      <TableCell className="text-right">{b.balls}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{b.fours}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{b.sixes}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{b.strike_rate?.toFixed?.(1) || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{b.how_out || '-'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totalRuns}</TableCell>
                    <TableCell className="text-right">{totalBalls}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{teamBat.reduce((s, b) => s + b.fours, 0)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{teamBat.reduce((s, b) => s + b.sixes, 0)}</TableCell>
                    <TableCell className="text-right hidden sm:table-cell">{totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell">{totalWickets} wkts</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {teamBowl.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-destructive">🎯 Bowling</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Bowler</TableHead><TableHead className="text-right">O</TableHead><TableHead className="text-right">M</TableHead>
                  <TableHead className="text-right">R</TableHead><TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Eco</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {teamBowl.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-xs md:text-sm">{getPlayerName(b.player_id)}</TableCell>
                      <TableCell className="text-right">{b.overs}</TableCell>
                      <TableCell className="text-right">{b.maidens}</TableCell>
                      <TableCell className="text-right">{b.runs_conceded}</TableCell>
                      <TableCell className="text-right font-bold">{b.wickets}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">{b.economy?.toFixed?.(1) || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {teamBat.length === 0 && teamBowl.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No scorecard data available.</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-lg md:text-xl">{match.team_a} vs {match.team_b}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pb-3 border-b">
          {tournament && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {tournament.name} • {tournament.format}{season ? ` • ${season.year}` : ''}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(match.date), 'dd MMM yyyy')}</span>
            {match.venue && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{match.venue}</span>}
            {match.match_stage && <Badge className="bg-accent text-accent-foreground text-xs">{match.match_stage}</Badge>}
            <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>{match.status.toUpperCase()}</Badge>
          </div>

          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 mt-2">
            <div className="text-center flex-1">
              <p className="font-display text-sm md:text-lg font-bold">{match.team_a}</p>
              <p className="text-primary font-bold text-lg md:text-xl">{teamAScore}</p>
            </div>
            <span className="text-muted-foreground font-bold text-lg px-2 md:px-4">vs</span>
            <div className="text-center flex-1">
              <p className="font-display text-sm md:text-lg font-bold">{match.team_b}</p>
              <p className="text-primary font-bold text-lg md:text-xl">{teamBScore}</p>
            </div>
          </div>

          {match.result && <p className="text-sm text-primary font-semibold text-center">{match.result}</p>}
          {mom && (
            <div className="flex items-center justify-center gap-1 text-sm text-accent">
              <Award className="h-4 w-4" /><span className="font-semibold">MOM: {mom.name}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ maxHeight: 'calc(90vh - 340px)' }}>
          <Tabs defaultValue="teamA">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="teamA" className="text-xs md:text-sm">{match.team_a}</TabsTrigger>
              <TabsTrigger value="teamB" className="text-xs md:text-sm">{match.team_b}</TabsTrigger>
            </TabsList>
            <TabsContent value="teamA">{renderTeamScorecard(match.team_a)}</TabsContent>
            <TabsContent value="teamB">{renderTeamScorecard(match.team_b)}</TabsContent>
          </Tabs>
        </div>

        {/* Report Issue */}
        {user && (
          <div className="border-t pt-3">
            {!showReport ? (
              <Button variant="outline" size="sm" onClick={() => setShowReport(true)} className="gap-1 w-full md:w-auto">
                <AlertTriangle className="h-3 w-3" /> Report Issue with this Match
              </Button>
            ) : (
              <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
                <p className="text-sm font-semibold">Report Issue</p>
                <Input value={reportSubject} onChange={e => setReportSubject(e.target.value)} placeholder="Brief summary..." />
                <div className="flex gap-2">
                  <Select value={reportCategory} onValueChange={setReportCategory}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={reportPriority} onValueChange={v => setReportPriority(v as any)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} placeholder="Describe the issue..." className="min-h-[60px]" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleReportIssue} disabled={submitting || !reportSubject.trim() || !reportDesc.trim()}>
                    {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null} Submit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReport(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

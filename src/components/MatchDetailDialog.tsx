import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Match, BattingScorecard, BowlingScorecard, Player, Tournament } from '@/lib/types';
import { Calendar, MapPin, Award, Trophy } from 'lucide-react';
import { format } from 'date-fns';

interface MatchDetailDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batting: BattingScorecard[];
  bowling: BowlingScorecard[];
  players: Player[];
  tournament?: Tournament;
}

export function MatchDetailDialog({ match, open, onOpenChange, batting, bowling, players, tournament }: MatchDetailDialogProps) {
  if (!match) return null;

  const matchBatting = batting.filter(b => b.match_id === match.match_id);
  const matchBowling = bowling.filter(b => b.match_id === match.match_id);
  const mom = players.find(p => p.player_id === match.man_of_match);
  const getPlayerName = (id: string) => players.find(p => p.player_id === id)?.name || id;

  const renderTeamScorecard = (team: string) => {
    const teamBat = matchBatting.filter(b => b.team === team);
    const teamBowl = matchBowling.filter(b => b.team === team);
    const totalRuns = teamBat.reduce((s, b) => s + b.runs, 0);
    const totalWickets = teamBat.filter(b => b.how_out && b.how_out !== 'not out').length;
    const totalBalls = teamBat.reduce((s, b) => s + b.balls, 0);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl font-bold">{team}</span>
          <Badge className="bg-primary text-primary-foreground text-sm px-3">
            {match.team_a === team ? match.team_a_score || `${totalRuns}/${totalWickets}` : match.team_b_score || `${totalRuns}/${totalWickets}`}
          </Badge>
        </div>

        {teamBat.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-primary">🏏 Batting</h4>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batter</TableHead>
                    <TableHead className="text-right">R</TableHead>
                    <TableHead className="text-right">B</TableHead>
                    <TableHead className="text-right">4s</TableHead>
                    <TableHead className="text-right">6s</TableHead>
                    <TableHead className="text-right">SR</TableHead>
                    <TableHead>Dismissal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamBat.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{getPlayerName(b.player_id)}</TableCell>
                      <TableCell className="text-right font-bold">{b.runs}</TableCell>
                      <TableCell className="text-right">{b.balls}</TableCell>
                      <TableCell className="text-right">{b.fours}</TableCell>
                      <TableCell className="text-right">{b.sixes}</TableCell>
                      <TableCell className="text-right">{b.strike_rate?.toFixed?.(1) || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.how_out || '-'}
                        {b.bowler_id ? ` (${getPlayerName(b.bowler_id)})` : ''}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totalRuns}</TableCell>
                    <TableCell className="text-right">{totalBalls}</TableCell>
                    <TableCell className="text-right">{teamBat.reduce((s, b) => s + b.fours, 0)}</TableCell>
                    <TableCell className="text-right">{teamBat.reduce((s, b) => s + b.sixes, 0)}</TableCell>
                    <TableCell className="text-right">{totalBalls > 0 ? ((totalRuns / totalBalls) * 100).toFixed(1) : '-'}</TableCell>
                    <TableCell>{totalWickets} wkts</TableCell>
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Bowler</TableHead>
                    <TableHead className="text-right">O</TableHead>
                    <TableHead className="text-right">M</TableHead>
                    <TableHead className="text-right">R</TableHead>
                    <TableHead className="text-right">W</TableHead>
                    <TableHead className="text-right">Eco</TableHead>
                    <TableHead className="text-right">Ext</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamBowl.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{getPlayerName(b.player_id)}</TableCell>
                      <TableCell className="text-right">{b.overs}</TableCell>
                      <TableCell className="text-right">{b.maidens}</TableCell>
                      <TableCell className="text-right">{b.runs_conceded}</TableCell>
                      <TableCell className="text-right font-bold">{b.wickets}</TableCell>
                      <TableCell className="text-right">{b.economy?.toFixed?.(1) || '-'}</TableCell>
                      <TableCell className="text-right">{b.extras}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {teamBat.length === 0 && teamBowl.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No scorecard data available for this team.</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {match.team_a} vs {match.team_b}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pb-3 border-b">
          {tournament && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {tournament.name} • {tournament.format}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(match.date), 'dd MMM yyyy')}</span>
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{match.venue}</span>
            <Badge variant={match.status === 'completed' ? 'default' : 'secondary'}>{match.status.toUpperCase()}</Badge>
          </div>

          {/* Score summary */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3 mt-2">
            <div className="text-center flex-1">
              <p className="font-display text-lg font-bold">{match.team_a}</p>
              <p className="text-primary font-bold text-xl">{match.team_a_score || '-'}</p>
            </div>
            <span className="text-muted-foreground font-bold text-lg px-4">vs</span>
            <div className="text-center flex-1">
              <p className="font-display text-lg font-bold">{match.team_b}</p>
              <p className="text-primary font-bold text-xl">{match.team_b_score || '-'}</p>
            </div>
          </div>

          {match.result && <p className="text-sm text-primary font-semibold text-center">{match.result}</p>}
          {match.toss_winner && <p className="text-xs text-muted-foreground text-center">Toss: {match.toss_winner} elected to {match.toss_decision}</p>}
          {mom && (
            <div className="flex items-center justify-center gap-1 text-sm text-accent">
              <Award className="h-4 w-4" />
              <span className="font-semibold">Man of the Match: {mom.name}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 300px)' }}>
          <Tabs defaultValue="teamA">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="teamA">{match.team_a}</TabsTrigger>
              <TabsTrigger value="teamB">{match.team_b}</TabsTrigger>
            </TabsList>
            <TabsContent value="teamA">{renderTeamScorecard(match.team_a)}</TabsContent>
            <TabsContent value="teamB">{renderTeamScorecard(match.team_b)}</TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

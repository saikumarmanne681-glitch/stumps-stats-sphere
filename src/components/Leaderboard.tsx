import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BattingScorecard, BowlingScorecard, Player, Tournament } from '@/lib/types';
import { getTopRunScorers, getTopWicketTakers, getPlayerMatchCounts } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target } from 'lucide-react';

interface LeaderboardProps {
  batting: BattingScorecard[];
  bowling: BowlingScorecard[];
  players: Player[];
  tournaments: Tournament[];
  filterTournamentId?: string;
  filterMatchIds?: string[];
}

export function Leaderboard({ batting, bowling, players, filterMatchIds }: LeaderboardProps) {
  const filteredBatting = filterMatchIds ? batting.filter(b => filterMatchIds.includes(b.match_id)) : batting;
  const filteredBowling = filterMatchIds ? bowling.filter(b => filterMatchIds.includes(b.match_id)) : bowling;

  const topRunScorers = useMemo(() => getTopRunScorers(filteredBatting, 5), [filteredBatting]);
  const topWicketTakers = useMemo(() => getTopWicketTakers(filteredBowling, 5), [filteredBowling]);
  const matchCounts = useMemo(() => getPlayerMatchCounts(filteredBatting, filteredBowling), [filteredBatting, filteredBowling]);

  const getPlayerName = (id: string) => players.find(p => p.player_id === id)?.name || id;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Trophy className="h-5 w-5 text-accent" />
            Top Run Scorers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Mat</TableHead>
                <TableHead className="text-right">Runs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topRunScorers.map((s, i) => (
                <TableRow key={s.player_id}>
                  <TableCell>
                    {i === 0 ? <Badge className="bg-accent text-accent-foreground">1</Badge> : i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{getPlayerName(s.player_id)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{matchCounts[s.player_id] || 0}</TableCell>
                  <TableCell className="text-right font-bold">{s.runs}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Target className="h-5 w-5 text-destructive" />
            Top Wicket Takers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Mat</TableHead>
                <TableHead className="text-right">Wickets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topWicketTakers.map((s, i) => (
                <TableRow key={s.player_id}>
                  <TableCell>
                    {i === 0 ? <Badge className="bg-destructive text-destructive-foreground">1</Badge> : i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{getPlayerName(s.player_id)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{matchCounts[s.player_id] || 0}</TableCell>
                  <TableCell className="text-right font-bold">{s.wickets}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

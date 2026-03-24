import { useMemo } from 'react';
import { Crown, Medal, Sparkles, Star, Swords, Trophy } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useData } from '@/lib/DataContext';
import { formatSheetDate, hasSheetDate } from '@/lib/dataUtils';

interface ClubDefinition {
  key: string;
  label: string;
  stat: 'runs' | 'wickets';
  threshold: number;
  icon: string;
}

interface ClubEntry {
  playerId: string;
  playerName: string;
  reachedOn: string;
  matchId: string;
  reachedValue: number;
}

const clubDefinitions: ClubDefinition[] = [
  { key: 'runs-300', label: '300 Runs Club', stat: 'runs', threshold: 300, icon: '🔥' },
  { key: 'runs-500', label: '500 Runs Club', stat: 'runs', threshold: 500, icon: '🚀' },
  { key: 'runs-1000', label: '1000 Runs Club', stat: 'runs', threshold: 1000, icon: '💎' },
  { key: 'wickets-25', label: '25 Wickets Club', stat: 'wickets', threshold: 25, icon: '🎯' },
  { key: 'wickets-50', label: '50 Wickets Club', stat: 'wickets', threshold: 50, icon: '⚡' },
  { key: 'wickets-100', label: '100 Wickets Club', stat: 'wickets', threshold: 100, icon: '🛡️' },
];

function isBefore(a: string, b: string) {
  if (!hasSheetDate(a)) return false;
  if (!hasSheetDate(b)) return true;
  return new Date(a).getTime() < new Date(b).getTime();
}

export default function TournamentHonorsPage() {
  const { seasons, tournaments, matches, batting, bowling, players } = useData();

  const championsData = useMemo(() => {
    return seasons
      .filter((season) => season.winner_team || season.runner_up_team)
      .map((season) => ({
        season,
        tournament: tournaments.find((t) => t.tournament_id === season.tournament_id),
      }))
      .sort((a, b) => b.season.year - a.season.year);
  }, [seasons, tournaments]);

  const clubs = useMemo(() => {
    const playerNames = new Map(players.map((p) => [p.player_id, p.name]));
    const matchDates = new Map(matches.map((m) => [m.match_id, m.date]));

    const runsTimeline = new Map<string, { matchId: string; date: string; amount: number }[]>();
    batting.forEach((entry) => {
      const date = matchDates.get(entry.match_id);
      if (!date) return;
      const list = runsTimeline.get(entry.player_id) || [];
      list.push({ matchId: entry.match_id, date, amount: entry.runs });
      runsTimeline.set(entry.player_id, list);
    });

    const wicketsTimeline = new Map<string, { matchId: string; date: string; amount: number }[]>();
    bowling.forEach((entry) => {
      const date = matchDates.get(entry.match_id);
      if (!date) return;
      const list = wicketsTimeline.get(entry.player_id) || [];
      list.push({ matchId: entry.match_id, date, amount: entry.wickets });
      wicketsTimeline.set(entry.player_id, list);
    });

    return clubDefinitions.map((club) => {
      const source = club.stat === 'runs' ? runsTimeline : wicketsTimeline;
      const entries: ClubEntry[] = [];

      source.forEach((events, playerId) => {
        const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let cumulative = 0;
        for (const event of sorted) {
          cumulative += event.amount;
          if (cumulative >= club.threshold) {
            entries.push({
              playerId,
              playerName: playerNames.get(playerId) || playerId,
              reachedOn: event.date,
              matchId: event.matchId,
              reachedValue: cumulative,
            });
            break;
          }
        }
      });

      entries.sort((a, b) => {
        if (a.reachedOn === b.reachedOn) return b.reachedValue - a.reachedValue;
        return isBefore(a.reachedOn, b.reachedOn) ? -1 : 1;
      });

      return { club, entries };
    });
  }, [players, matches, batting, bowling]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Navbar />
      <div className="container mx-auto space-y-8 px-4 py-8">
        <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-accent/10 to-transparent p-6 shadow-sm">
          <Sparkles className="absolute -right-3 -top-3 h-24 w-24 text-primary/15" />
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Public honours portal</p>
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold text-primary"><Trophy className="h-7 w-7" /> Hall of Glory</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">No login required. Explore tournament champions and milestone clubs built from full career records across every season.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="bg-primary text-primary-foreground">{championsData.length} Honours seasons</Badge>
            <Badge variant="secondary">{clubs.reduce((sum, item) => sum + item.entries.length, 0)} Total club entries</Badge>
            <Badge variant="outline">Updated live from Sheets data</Badge>
          </div>
        </section>

        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="font-display text-2xl">🏆 Tournament Winners & Runners-up</CardTitle>
            <p className="text-sm text-muted-foreground">Fantasy styled honours table for season-by-season podium finishes.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/10">
                    <TableHead>Season</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Runner-up</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {championsData.map(({ season, tournament }) => (
                    <TableRow key={season.season_id}>
                      <TableCell className="font-semibold">{season.year}</TableCell>
                      <TableCell>{tournament?.name || season.tournament_id}</TableCell>
                      <TableCell>
                        {season.winner_team ? (
                          <span className="inline-flex items-center gap-2 font-semibold text-primary"><Crown className="h-4 w-4" />{season.winner_team}</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {season.runner_up_team ? (
                          <span className="inline-flex items-center gap-2 text-muted-foreground"><Medal className="h-4 w-4" />{season.runner_up_team}</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {hasSheetDate(season.start_date) && hasSheetDate(season.end_date)
                          ? `${formatSheetDate(season.start_date, 'dd MMM yyyy')} → ${formatSheetDate(season.end_date, 'dd MMM yyyy')}`
                          : '—'}
                      </TableCell>
                      <TableCell><Badge variant={season.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{season.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-2">
          {clubs.map(({ club, entries }) => (
            <Card key={club.key} className="border-accent/30 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-xl">
                  <span className="font-display">{club.icon} {club.label}</span>
                  <Badge variant="outline">{entries.length} players</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{club.stat === 'runs' ? 'Run-machine' : 'Strike-force'} badge unlocked the moment players crossed {club.threshold} career {club.stat}.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {entries.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">No player has reached this milestone yet.</p>
                ) : (
                  entries.map((entry, index) => (
                    <div key={`${club.key}-${entry.playerId}`} className="flex items-center justify-between rounded-lg border bg-background/80 px-3 py-2">
                      <div>
                        <p className="flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-primary" />#{index + 1} {entry.playerName}</p>
                        <p className="text-xs text-muted-foreground">Reached on {formatSheetDate(entry.reachedOn, 'dd MMM yyyy')} ({entry.matchId})</p>
                      </div>
                      <Badge>{entry.reachedValue} {club.stat}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-2 p-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p className="flex items-center gap-2"><Swords className="h-4 w-4 text-primary" /> Next ideas enabled: fastest 1000-run race, 5-wicket haul club, captaincy win rates, and per-era hall of fame.</p>
            <Badge variant="secondary">Community-facing analytics ✨</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useMemo, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Calendar, MapPin, Users, Shield, Lock, ExternalLink, Medal, BarChart3 } from 'lucide-react';
import { v2api } from '@/lib/v2api';
import { DigitalScorelist } from '@/lib/v2types';
import { SecurityShieldBadge, DataIntegrityBadge, SecurityWatermark } from '@/components/SecurityBadge';
import { PageLoader } from '@/components/LoadingOverlay';
import { compareSheetDatesDesc, findTournamentById, formatSheetDate, hasSheetDate, normalizeId } from '@/lib/dataUtils';
import { useAuth } from '@/lib/auth';
import { ApprovedSchedulePanel } from '@/schedules/ApprovedSchedulePanel';
import { scheduleService } from '@/schedules/scheduleService';

const TournamentPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { tournaments, seasons, matches, batting, bowling, players, loading } = useData();
  const [officialScorelists, setOfficialScorelists] = useState<DigitalScorelist[]>([]);
  const [scorelistsLoading, setScorelistsLoading] = useState(true);
  const tournamentId = normalizeId(id);

  const tournament = findTournamentById(tournamentId, tournaments, seasons, matches);
  const tournamentSeasons = seasons.filter(s => normalizeId(s.tournament_id) === tournamentId).sort((a, b) => b.year - a.year);
  const tournamentMatches = matches.filter(m => normalizeId(m.tournament_id) === tournamentId).sort((a, b) => compareSheetDatesDesc(a.date, b.date));

  useEffect(() => {
    if (user) {
      scheduleService.syncFromBackend().catch(() => undefined);
    }
    let active = true;
    setScorelistsLoading(true);
    v2api
      .getScorelists()
      .then((items) => {
        if (!active) return;
        const filtered = items.filter((s) => {
          const status = String(s.certification_status || '').toLowerCase();
          return normalizeId(s.tournament_id) === tournamentId && !!s.locked && status === 'official_certified';
        });
        setOfficialScorelists(filtered);
      })
      .catch((error) => {
        console.error('Unable to load scorelists for tournament page:', error);
        if (!active) return;
        setOfficialScorelists([]);
      })
      .finally(() => {
        if (active) setScorelistsLoading(false);
      });
    return () => { active = false; };
  }, [tournamentId]);

  const getPlayerName = (pid: string) => players.find(p => p.player_id === pid)?.name || pid;

  const completedMatches = tournamentMatches.filter(m => m.status === 'completed');
  const liveMatches = tournamentMatches.filter(m => m.status === 'live');
  const allTeams = useMemo(() => {
    const s = new Set<string>();
    tournamentMatches.forEach(m => { s.add(m.team_a); s.add(m.team_b); });
    return s;
  }, [tournamentMatches]);

  const tournamentMatchIds = useMemo(() => new Set(tournamentMatches.map(m => m.match_id)), [tournamentMatches]);
  const tBatting = useMemo(() => batting.filter(b => tournamentMatchIds.has(b.match_id)), [batting, tournamentMatchIds]);
  const tBowling = useMemo(() => bowling.filter(b => tournamentMatchIds.has(b.match_id)), [bowling, tournamentMatchIds]);

  const topRunScorer = useMemo(() => {
    const map: Record<string, number> = {};
    tBatting.forEach(b => { map[b.player_id] = (map[b.player_id] || 0) + b.runs; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? { id: sorted[0][0], runs: sorted[0][1] } : null;
  }, [tBatting]);

  const topWicketTaker = useMemo(() => {
    const map: Record<string, number> = {};
    tBowling.forEach(b => { map[b.player_id] = (map[b.player_id] || 0) + b.wickets; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return sorted[0] && sorted[0][1] > 0 ? { id: sorted[0][0], wickets: sorted[0][1] } : null;
  }, [tBowling]);

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageLoader message="Loading tournament data..." />
    </div>
  );

  if (!tournament) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl mb-4">Tournament Not Found</h1>
        <Button asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative">
      <SecurityWatermark />
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6 relative z-10">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
          <SecurityShieldBadge label="Official Tournament Page" variant="certified" />
        </div>

        {/* Tournament Hero */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Trophy className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="font-display text-3xl md:text-4xl font-bold">{tournament.name}</h1>
                <p className="text-muted-foreground mt-1">{tournament.format} • {tournament.overs} overs per side</p>
                {tournament.description && <p className="text-sm text-muted-foreground mt-2">{tournament.description}</p>}
                <div className="flex flex-wrap gap-3 mt-4">
                  <Badge className="bg-primary/10 text-primary border-primary/20 gap-1"><Calendar className="h-3 w-3" /> {tournamentSeasons.length} Seasons</Badge>
                  <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" /> {completedMatches.length + liveMatches.length} Matches</Badge>
                  <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" /> {allTeams.size} Teams</Badge>
                  {liveMatches.length > 0 && <Badge className="bg-destructive text-destructive-foreground animate-pulse">{liveMatches.length} LIVE</Badge>}
                </div>
              </div>
            </div>

            {/* Top performers */}
            {(topRunScorer || topWicketTaker) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-border/50">
                {topRunScorer && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                    <span className="text-2xl">🏏</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Top Run Scorer</p>
                      <p className="font-display font-bold">{getPlayerName(topRunScorer.id)} – {topRunScorer.runs} runs</p>
                    </div>
                  </div>
                )}
                {topWicketTaker && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Top Wicket Taker</p>
                      <p className="font-display font-bold">{getPlayerName(topWicketTaker.id)} – {topWicketTaker.wickets} wickets</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/leaderboards?tournament=${tournament.tournament_id}`}>View Tournament Standings</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/leaderboards">View Global Leaderboards</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/live">Live Matches</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Back to Seasons Overview</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Certified scorelists</p>
              <p className="mt-1 font-display text-3xl font-bold text-primary">{officialScorelists.length}</p>
              <p className="text-xs text-muted-foreground">Only locked official records are shown publicly.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Completed matches</p>
              <p className="mt-1 font-display text-3xl font-bold">{completedMatches.length}</p>
              <p className="text-xs text-muted-foreground">Historical results available in the tournament archive.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Live matches</p>
              <p className="mt-1 font-display text-3xl font-bold text-destructive">{liveMatches.length}</p>
              <p className="text-xs text-muted-foreground">Live scores sync with the active scoring feed.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Top performers</p>
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-center gap-1"><Medal className="h-3.5 w-3.5 text-primary" /> {topRunScorer ? `${getPlayerName(topRunScorer.id)} • ${topRunScorer.runs} runs` : 'Runs leaderboard pending'}</p>
                <p className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5 text-destructive" /> {topWicketTaker ? `${getPlayerName(topWicketTaker.id)} • ${topWicketTaker.wickets} wickets` : 'Wickets leaderboard pending'}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seasons */}
        <Card>
          <CardHeader><CardTitle className="font-display flex items-center gap-2">📅 Seasons</CardTitle></CardHeader>
          <CardContent>
            {tournamentSeasons.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No seasons yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournamentSeasons.map(s => {
                  const sMatches = matches.filter(m => m.season_id === s.season_id);
                  const sLive = sMatches.filter(m => m.status === 'live').length;
                  return (
                    <Card key={s.season_id} id={`season-${s.season_id}`} className="border hover:shadow-lg transition-all group scroll-mt-24">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-display text-2xl font-bold text-primary">{s.year}</p>
                          <Badge variant={s.status === 'ongoing' ? 'default' : s.status === 'upcoming' ? 'secondary' : 'outline'} className="capitalize">
                            {s.status === 'ongoing' && '🔴 '}{s.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {hasSheetDate(s.start_date) && hasSheetDate(s.end_date)
                            ? `${formatSheetDate(s.start_date, 'dd MMM')} – ${formatSheetDate(s.end_date, 'dd MMM yyyy')}`
                            : 'Dates unavailable'}
                        </p>
                        {(s.winner_team || s.runner_up_team) && (
                          <div className="rounded-md border bg-muted/30 p-2 text-xs">
                            {s.winner_team && <p className="font-semibold text-primary">🏆 Winner: {s.winner_team}</p>}
                            {s.runner_up_team && <p className="text-muted-foreground">🥈 Runner-up: {s.runner_up_team}</p>}
                          </div>
                        )}
                        <div className="flex gap-2 text-center">
                          <div className="flex-1 bg-muted/50 rounded p-2">
                            <p className="font-bold">{sMatches.length}</p>
                            <p className="text-[10px] text-muted-foreground">Matches</p>
                          </div>
                          <div className="flex-1 bg-muted/50 rounded p-2">
                            <p className="font-bold">{sMatches.filter(m => m.status === 'completed').length}</p>
                            <p className="text-[10px] text-muted-foreground">Completed</p>
                          </div>
                          {sLive > 0 && (
                            <div className="flex-1 bg-destructive/10 rounded p-2">
                              <p className="font-bold text-destructive">{sLive}</p>
                              <p className="text-[10px] text-destructive">LIVE</p>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button asChild variant="outline" size="sm" className="text-xs">
                            <Link to={`/leaderboards?tournament=${tournament.tournament_id}&season=${s.season_id}`}>Standings →</Link>
                          </Button>
                          <Button asChild variant="ghost" size="sm" className="text-xs">
                            <Link to={`/tournament/${tournament.tournament_id}`}>Details</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>


        {user ? (
          <div className="grid gap-6 lg:grid-cols-2"> 
            <Card>
              <CardHeader><CardTitle className="font-display">📝 Tournament Operations</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">Approved schedule versions and governance status are available here for members.</p>
                <div className="rounded-lg border p-4 space-y-1">
                  <p><strong>Approved schedules:</strong> {scheduleService.getApprovedSchedulesForTournament(tournament.tournament_id).length}</p>
                </div>
              </CardContent>
            </Card>
            <ApprovedSchedulePanel tournamentId={tournament.tournament_id} />
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-6 flex items-start gap-3">
              <Lock className="h-5 w-5 mt-0.5 text-primary" />
              <div className="space-y-2">
                <p className="font-semibold">Members-only tournament operations</p>
                <p className="text-sm text-muted-foreground">Registration workflows and approved schedule downloads are available only after login, while existing public tournament details remain unchanged.</p>
                <Button asChild size="sm"><Link to="/login">Login to access new features</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matches */}
        <Card>
          <CardHeader><CardTitle className="font-display">🏏 Matches ({tournamentMatches.length})</CardTitle></CardHeader>
          <CardContent>
            {tournamentMatches.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No matches scheduled yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Date</TableHead><TableHead>Match</TableHead><TableHead>Stage</TableHead><TableHead>Score</TableHead><TableHead>Result</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {tournamentMatches.map(m => {
                      const s = seasons.find(s => s.season_id === m.season_id);
                      return (
                        <TableRow key={m.match_id} className="hover:bg-muted/50">
                          <TableCell className="text-sm whitespace-nowrap">{formatSheetDate(m.date, 'dd MMM yyyy')}</TableCell>
                          <TableCell>
                            <Link to={`/match/${m.match_id}`} className="font-medium hover:text-primary hover:underline">
                              {m.team_a} vs {m.team_b}
                            </Link>
                            {s && <span className="text-xs text-muted-foreground ml-2">({s.year})</span>}
                            {m.status === 'live' && <Badge className="ml-2 bg-destructive text-destructive-foreground animate-pulse text-[10px]">LIVE</Badge>}
                          </TableCell>
                          <TableCell>
                            {m.match_stage ? <Badge variant="outline" className="text-xs">{m.match_stage}</Badge> : '-'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {m.team_a_score && <span className="block">{m.team_a}: {m.team_a_score}</span>}
                            {m.team_b_score && <span className="block">{m.team_b}: {m.team_b_score}</span>}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">{m.result || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Official Certified Scorelists */}
        <Card className="border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Official Certified Scorelists
              <SecurityShieldBadge label="Tamper-Proof" variant="encrypted" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {scorelistsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading certified scorelists...
              </div>
            ) : officialScorelists.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No official locked scorelists available for this tournament yet.</p>
            ) : (
              <div className="space-y-2">
                {officialScorelists.map((s) => (
                  <div key={s.scorelist_id} className="rounded-lg border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <p className="font-mono text-sm font-medium">{s.scorelist_id}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Generated by {s.generated_by || 'System'} • {formatSheetDate(s.generated_at, 'dd MMM yyyy, p')}
                      </p>
                      <DataIntegrityBadge data={s.hash_digest || s.scorelist_id} label="Document Hash" />
                    </div>
                    <Button size="sm" variant="outline" asChild className="gap-1">
                      <Link to={`/verify-scorelist/${s.scorelist_id}`}>
                        <ExternalLink className="h-3 w-3" /> View Certified
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TournamentPage;

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useData } from '@/lib/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Award, Share2, ArrowLeft } from 'lucide-react';
import { formatSheetDate } from '@/lib/dataUtils';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/LoadingOverlay';
import { SecurityShieldBadge, DataIntegrityBadge } from '@/components/SecurityBadge';
import { api } from '@/lib/googleSheets';
import { BattingScorecard, BowlingScorecard } from '@/lib/types';
import { getTeamScoreSummary } from '@/lib/liveScoring';

const MatchPage = () => {
  const { match_id } = useParams();
  const { matches, batting, bowling, players, tournaments, seasons, loading } = useData();
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [liveBatting, setLiveBatting] = useState<BattingScorecard[]>([]);
  const [liveBowling, setLiveBowling] = useState<BowlingScorecard[]>([]);
  const [liveRefreshing, setLiveRefreshing] = useState(false);

  const match = matches.find(m => m.match_id === match_id);
  const tournament = match ? tournaments.find(t => t.tournament_id === match.tournament_id) : null;
  const season = match ? seasons.find(s => s.season_id === match.season_id) : null;
  useEffect(() => {
    setLiveBatting(batting.filter((entry) => entry.match_id === match_id));
    setLiveBowling(bowling.filter((entry) => entry.match_id === match_id));
  }, [batting, bowling, match_id]);

  useEffect(() => {
    if (!match || match.status !== 'live') return;

    let active = true;
    const pullLiveData = async () => {
      setLiveRefreshing(true);
      try {
        const [latestBatting, latestBowling] = await Promise.all([api.getBattingScorecard(), api.getBowlingScorecard()]);
        if (!active) return;
        setLiveBatting(latestBatting.filter((entry) => entry.match_id === match.match_id));
        setLiveBowling(latestBowling.filter((entry) => entry.match_id === match.match_id));
      } catch (error) {
        console.warn('Unable to refresh live match score data', error);
      } finally {
        if (active) setLiveRefreshing(false);
      }
    };

    pullLiveData();
    const intervalId = window.setInterval(pullLiveData, 8000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [match]);

  const matchBatting = liveBatting;
  const matchBowling = liveBowling;
  const mom = match ? players.find(p => p.player_id === match.man_of_match) : null;
  const getPlayerName = (id: string) => players.find(p => p.player_id === id)?.name || id;

  const teamAScore = match ? getTeamScoreSummary(matchBatting, match.team_a, match.team_a_score) : null;
  const teamBScore = match ? getTeamScoreSummary(matchBatting, match.team_b, match.team_b_score) : null;
  const matchDateLabel = match ? formatSheetDate(match.date, 'dd MMM yyyy', 'Date TBD') : 'Date TBD';

  const topBatsman = useMemo(() => {
    if (matchBatting.length === 0) return null;
    return [...matchBatting].sort((a, b) => b.runs - a.runs)[0];
  }, [matchBatting]);

  const topBowler = useMemo(() => {
    if (matchBowling.length === 0) return null;
    return [...matchBowling].sort((a, b) => b.wickets - a.wickets)[0];
  }, [matchBowling]);

  // Show loading state instead of "not found" while data loads
  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageLoader message="Loading match details..." />
    </div>
  );

  if (!match) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl mb-4">Match Not Found</h1>
        <p className="text-muted-foreground mb-4">The match you're looking for doesn't exist or may have been removed.</p>
        <Button asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Home</Link></Button>
      </div>
    </div>
  );

  const shareUrl = `${window.location.origin}/match/${match.match_id}`;
  const shareText = `${match.team_a} vs ${match.team_b}${match.result ? ` — ${match.result}` : ''}`;

  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${match.team_a} vs ${match.team_b}`, text: shareText, url: shareUrl });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: 'Link copied', description: 'Match link copied to clipboard.' });
        return;
      }
      throw new Error('No supported share mechanism available');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast({ title: 'Share failed', description: 'Could not share this match right now.', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  const renderTeamScorecard = (team: string) => {
    const teamBat = matchBatting.filter(b => b.team === team);
    const teamBowl = matchBowling.filter(b => b.team === team);
    return (
      <div className="space-y-4">
        {teamBat.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-primary">🏏 Batting</h4>
            <div className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader><TableRow>
                  <TableHead>Batter</TableHead><TableHead className="text-right">R</TableHead><TableHead className="text-right">B</TableHead>
                  <TableHead className="text-right">4s</TableHead><TableHead className="text-right">6s</TableHead><TableHead className="text-right">SR</TableHead><TableHead>Dismissal</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {teamBat.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium"><Link to={`/player/${b.player_id}`} className="hover:text-primary hover:underline">{getPlayerName(b.player_id)}</Link></TableCell>
                      <TableCell className="text-right font-bold">{b.runs}</TableCell>
                      <TableCell className="text-right">{b.balls}</TableCell>
                      <TableCell className="text-right">{b.fours}</TableCell>
                      <TableCell className="text-right">{b.sixes}</TableCell>
                      <TableCell className="text-right">{b.strike_rate?.toFixed?.(1) || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{b.how_out || 'not out'}{b.bowler_id ? ` (${getPlayerName(b.bowler_id)})` : ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        {teamBowl.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 text-destructive">🎯 Bowling</h4>
            <div className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader><TableRow>
                  <TableHead>Bowler</TableHead><TableHead className="text-right">O</TableHead><TableHead className="text-right">M</TableHead>
                  <TableHead className="text-right">R</TableHead><TableHead className="text-right">W</TableHead><TableHead className="text-right">Eco</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {teamBowl.map(b => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium"><Link to={`/player/${b.player_id}`} className="hover:text-primary hover:underline">{getPlayerName(b.player_id)}</Link></TableCell>
                      <TableCell className="text-right">{b.overs}</TableCell>
                      <TableCell className="text-right">{b.maidens}</TableCell>
                      <TableCell className="text-right">{b.runs_conceded}</TableCell>
                      <TableCell className="text-right font-bold">{b.wickets}</TableCell>
                      <TableCell className="text-right">{b.economy?.toFixed?.(1) || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <h1 className="font-display text-2xl font-bold">{match.team_a} vs {match.team_b}</h1>
          <SecurityShieldBadge label="Official" variant="certified" />
        </div>

        {/* Match Header */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {tournament && <Badge variant="outline">{tournament.name} • {tournament.format}</Badge>}
              {season && <Badge variant="outline">Season {season.year}</Badge>}
              {match.match_stage && <Badge className="bg-accent/20 text-accent-foreground border border-accent/30">{match.match_stage}</Badge>}
              <Badge className={match.status === 'live' ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground'}>{match.status.toUpperCase()}</Badge>
            </div>

            <div className="my-4 grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4">
              <div className="text-center">
                <p className="font-display text-base font-bold sm:text-xl">{match.team_a}</p>
                <p className="text-xl font-bold text-primary sm:text-3xl">{teamAScore?.display || '0/0 (0.0)'}</p>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-base font-display font-bold text-muted-foreground sm:text-2xl">VS</span>
              </div>
              <div className="text-center">
                <p className="font-display text-base font-bold sm:text-xl">{match.team_b}</p>
                <p className="text-xl font-bold text-primary sm:text-3xl">{teamBScore?.display || '0/0 (0.0)'}</p>
              </div>
            </div>

            {match.result && <p className="text-center font-semibold text-primary text-lg">{match.result}</p>}
            {match.status === 'live' && (
              <p className="text-center text-xs text-muted-foreground">
                {liveRefreshing ? 'Refreshing live score data, please wait...' : 'Live score data auto-refreshes every few seconds.'}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{matchDateLabel}</span>
              {match.venue && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{match.venue}</span>}
              <Button variant="outline" size="sm" onClick={handleShare} className="gap-1" loading={sharing} loadingText="Preparing link...">
                <Share2 className="h-3 w-3" /> Share
              </Button>
              {tournament && (
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link to={`/tournament/${tournament.tournament_id}`}>View Tournament →</Link>
                </Button>
              )}
            </div>
            <div className="flex justify-center mt-2">
              <DataIntegrityBadge data={JSON.stringify({ id: match.match_id, a: teamAScore?.display, b: teamBScore?.display })} label="Score Hash" />
            </div>
          </CardContent>
        </Card>

        {/* Scorecard Tabs */}
        <Card>
          <Tabs defaultValue="teamA">
            <TabsList className="grid grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="teamA">{match.team_a}</TabsTrigger>
              <TabsTrigger value="teamB">{match.team_b}</TabsTrigger>
            </TabsList>
            <CardContent className="pt-4">
              <TabsContent value="teamA">{renderTeamScorecard(match.team_a)}</TabsContent>
              <TabsContent value="teamB">{renderTeamScorecard(match.team_b)}</TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mom && (
            <Card className="border-l-4 border-l-accent">
              <CardContent className="p-4 flex items-center gap-3">
                <Award className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">Man of the Match</p>
                  <p className="font-display font-bold text-lg">{mom.name}</p>
                </div>
              </CardContent>
            </Card>
          )}
          {topBatsman && (
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-2xl">🏏</span>
                <div>
                  <p className="text-xs text-muted-foreground">Top Batsman</p>
                  <p className="font-display font-bold">{getPlayerName(topBatsman.player_id)} – {topBatsman.runs}({topBatsman.balls})</p>
                </div>
              </CardContent>
            </Card>
          )}
          {topBowler && topBowler.wickets > 0 && (
            <Card className="border-l-4 border-l-destructive">
              <CardContent className="p-4 flex items-center gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <p className="text-xs text-muted-foreground">Best Bowler</p>
                  <p className="font-display font-bold">{getPlayerName(topBowler.player_id)} – {topBowler.wickets}/{topBowler.runs_conceded}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MatchPage;

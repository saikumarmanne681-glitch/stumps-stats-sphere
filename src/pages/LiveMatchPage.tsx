import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { v2api } from '@/lib/v2api';
import { MatchTimeline } from '@/lib/v2types';
import { Radio, Calendar, MapPin, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/googleSheets';

function calcTeamScore(batting: any[], team: string) {
  const rows = batting.filter((b: any) => b.team === team);
  if (rows.length === 0) return { runs: 0, wkts: 0, overs: '0.0' };
  const runs = rows.reduce((s: number, b: any) => s + (b.runs || 0), 0);
  const wkts = rows.filter((b: any) => b.how_out && b.how_out !== 'not out' && b.how_out !== '').length;
  const balls = rows.reduce((s: number, b: any) => s + (b.balls || 0), 0);
  const overs = Math.floor(balls / 6) + (balls % 6) / 10;
  return { runs, wkts, overs: overs.toFixed(1) };
}

const LiveMatchPage = () => {
  const { matches, batting, bowling, players, tournaments, seasons } = useData();
  const [timeline, setTimeline] = useState<MatchTimeline[]>([]);
  const [liveBatting, setLiveBatting] = useState(batting);
  const [liveBowling, setLiveBowling] = useState(bowling);
  const [shareLoadingMatchId, setShareLoadingMatchId] = useState<string | null>(null);
  const { toast } = useToast();

  const liveMatches = matches.filter(m => m.status === 'live');
  const recentCompleted = matches
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  useEffect(() => {
    v2api.getMatchTimeline().then(setTimeline);
    const iv = setInterval(() => v2api.getMatchTimeline().then(setTimeline), 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    setLiveBatting(batting);
    setLiveBowling(bowling);
  }, [batting, bowling]);

  useEffect(() => {
    const pullLiveScorecards = async () => {
      try {
        const [latestBatting, latestBowling] = await Promise.all([api.getBattingScorecard(), api.getBowlingScorecard()]);
        setLiveBatting(latestBatting);
        setLiveBowling(latestBowling);
      } catch (error) {
        console.warn('Unable to refresh live scorecards', error);
      }
    };
    pullLiveScorecards();
    const interval = setInterval(pullLiveScorecards, 10000);
    return () => clearInterval(interval);
  }, []);

  const getPlayerName = (id: string) => players.find(p => p.player_id === id)?.name || id;

  const handleShare = async (match: typeof matches[0]) => {
    setShareLoadingMatchId(match.match_id);
    const shareUrl = `${window.location.origin}/match/${match.match_id}`;
    const shareText = `${match.team_a} vs ${match.team_b}${match.result ? ` — ${match.result}` : ''}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${match.team_a} vs ${match.team_b}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Link copied',
          description: 'Match link copied to clipboard.',
        });
        return;
      }

      throw new Error('No supported share mechanism available');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      toast({
        title: 'Share failed',
        description: 'Could not share this match right now.',
        variant: 'destructive',
      });
      console.error('Share action failed', error);
    } finally {
      setShareLoadingMatchId((prev) => (prev === match.match_id ? null : prev));
    }
  };

  const renderMatch = (match: typeof matches[0], isLive: boolean) => {
    const tournament = tournaments.find(t => t.tournament_id === match.tournament_id);
    const season = seasons.find(s => s.season_id === match.season_id);
    const matchBatting = liveBatting.filter(b => b.match_id === match.match_id);
    const matchBowling = liveBowling.filter(b => b.match_id === match.match_id);
    const matchTimeline = timeline.filter(t => t.match_id === match.match_id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const teamABatting = matchBatting.filter((b) => b.team === match.team_a);
    const teamBBatting = matchBatting.filter((b) => b.team === match.team_b);
    const liveAScore = (() => { const s = calcTeamScore(matchBatting, match.team_a); return `${s.runs}/${s.wkts} (${s.overs})`; })();
    const liveBScore = (() => { const s = calcTeamScore(matchBatting, match.team_b); return `${s.runs}/${s.wkts} (${s.overs})`; })();
    const aScore = isLive
      ? (teamABatting.length > 0 ? liveAScore : (match.team_a_score || liveAScore))
      : (match.team_a_score || liveAScore);
    const bScore = isLive
      ? (teamBBatting.length > 0 ? liveBScore : (match.team_b_score || liveBScore))
      : (match.team_b_score || liveBScore);

    return (
      <Card key={match.match_id} className={`border-2 ${isLive ? 'border-destructive/40 bg-gradient-to-br from-destructive/5 to-accent/5' : 'border-primary/20'}`}>
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {isLive && <Badge className="bg-destructive text-destructive-foreground animate-pulse gap-1"><Radio className="h-3 w-3" /> LIVE</Badge>}
            {tournament && <Badge variant="outline">{tournament.name}</Badge>}
            {season && <Badge variant="outline">{season.year}</Badge>}
            {match.match_stage && <Badge className="bg-accent text-accent-foreground">{match.match_stage}</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
            <div className="p-2 md:p-4 rounded-lg bg-muted/50">
              <p className="font-display text-sm md:text-xl font-bold">{match.team_a}</p>
              <p className="text-xl md:text-3xl font-bold text-primary">{aScore}</p>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-lg md:text-2xl font-display font-bold text-muted-foreground">VS</span>
            </div>
            <div className="p-2 md:p-4 rounded-lg bg-muted/50">
              <p className="font-display text-sm md:text-xl font-bold">{match.team_b}</p>
              <p className="text-xl md:text-3xl font-bold text-primary">{bScore}</p>
            </div>
          </div>

          {match.result && <p className="text-center font-semibold text-primary">{match.result}</p>}

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(match.date), 'dd MMM yyyy')}</span>
            {match.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{match.venue}</span>}
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => handleShare(match)}
              loading={shareLoadingMatchId === match.match_id}
              loadingText="Preparing link..."
            >
              <Share2 className="h-3 w-3" /> Share
            </Button>
            <Button variant="link" size="sm" className="text-xs h-auto p-0" asChild>
              <Link to={`/match/${match.match_id}`}>View Full Scorecard →</Link>
            </Button>
          </div>

          {/* Timeline */}
          {matchTimeline.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Recent Events</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
                {matchTimeline.slice(0, 10).map(evt => (
                  <div key={evt.event_id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted/30">
                    <Badge variant="outline" className="text-[10px] shrink-0">{evt.over}</Badge>
                    <span className="flex-1">{evt.description}</span>
                    <Badge className={`text-[10px] ${
                      evt.event_type === 'WICKET' ? 'bg-destructive text-destructive-foreground' :
                      evt.event_type === 'FOUR' ? 'bg-primary text-primary-foreground' :
                      evt.event_type === 'SIX' ? 'bg-accent text-accent-foreground' :
                      'bg-muted text-muted-foreground'
                    }`}>{evt.event_type}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-2xl md:text-4xl font-bold flex items-center justify-center gap-2">
            <Radio className="h-6 w-6 md:h-8 md:w-8 text-destructive animate-pulse" /> Live Matches
          </h1>
          <p className="text-sm text-muted-foreground">Watch live scores and match updates in real-time</p>
        </div>

        {liveMatches.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 md:p-12 text-center">
              <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold mb-2">No Live Matches</h2>
              <p className="text-muted-foreground text-sm">Check back when a match is in progress</p>
            </CardContent>
          </Card>
        )}

        {liveMatches.map(m => renderMatch(m, true))}

        {recentCompleted.length > 0 && (
          <>
            <h2 className="font-display text-xl md:text-2xl font-bold pt-4">📋 Recent Results</h2>
            {recentCompleted.map(m => renderMatch(m, false))}
          </>
        )}
      </div>
    </div>
  );
};

export default LiveMatchPage;

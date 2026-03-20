import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Match, Tournament, Player, BattingScorecard, Season } from '@/lib/types';
import { Calendar, MapPin, Award } from 'lucide-react';
import { format } from 'date-fns';

interface MatchCardProps {
  match: Match;
  tournament?: Tournament;
  season?: Season;
  players: Player[];
  batting?: BattingScorecard[];
  onClick?: () => void;
}

function calcTeamScore(batting: BattingScorecard[], team: string): string {
  const rows = batting.filter(b => b.team === team);
  if (rows.length === 0) return '';
  const runs = rows.reduce((s, b) => s + b.runs, 0);
  const wkts = rows.filter(b => b.how_out && b.how_out !== 'not out').length;
  const balls = rows.reduce((s, b) => s + b.balls, 0);
  const overs = Math.floor(balls / 6) + (balls % 6) / 10;
  return `${runs}/${wkts} (${overs.toFixed(1)})`;
}

export function MatchCard({ match, tournament, season, players, batting = [], onClick }: MatchCardProps) {
  const mom = players.find(p => p.player_id === match.man_of_match);
  const statusColors: Record<string, string> = {
    completed: 'bg-primary text-primary-foreground',
    live: 'bg-destructive text-destructive-foreground',
    scheduled: 'bg-accent text-accent-foreground',
    cancelled: 'bg-muted text-muted-foreground',
  };

  const matchBatting = batting.filter(b => b.match_id === match.match_id);
  const teamAScore = match.team_a_score || calcTeamScore(matchBatting, match.team_a);
  const teamBScore = match.team_b_score || calcTeamScore(matchBatting, match.team_b);

  return (
    <Card
      className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary cursor-pointer hover:border-l-accent active:scale-[0.98]"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-mono">{match.match_id}</span>
          <div className="flex items-center gap-1">
            {match.match_stage && (
              <Badge className="bg-accent/20 text-accent-foreground border border-accent/30 text-[10px] font-display">
                {match.match_stage}
              </Badge>
            )}
            <Badge className={statusColors[match.status] || 'bg-muted'}>
              {match.status === 'live' && '🔴 '}{match.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {tournament && (
          <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">
            {tournament.name} • {tournament.format}
            {season ? ` • ${season.year}` : ''}
          </p>
        )}

        <div className="flex items-center justify-between my-3">
          <div className="text-center flex-1">
            <span className="font-display text-lg font-semibold block">{match.team_a}</span>
            {teamAScore && <span className="text-primary font-bold text-sm">{teamAScore}</span>}
          </div>
          <span className="text-muted-foreground text-sm font-bold px-2">vs</span>
          <div className="text-center flex-1">
            <span className="font-display text-lg font-semibold block">{match.team_b}</span>
            {teamBScore && <span className="text-primary font-bold text-sm">{teamBScore}</span>}
          </div>
        </div>

        {match.result && (
          <p className="text-sm text-primary font-medium mb-2 text-center">{match.result}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(match.date), 'dd MMM yyyy')}
          </span>
          {match.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.venue}
            </span>
          )}
        </div>

        {mom && (
          <div className="flex items-center gap-1 mt-2 text-xs text-accent">
            <Award className="h-3 w-3" />
            <span className="font-medium">MOM: {mom.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

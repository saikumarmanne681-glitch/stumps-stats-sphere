import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Match, Tournament, Player } from '@/lib/types';
import { Calendar, MapPin, Award } from 'lucide-react';
import { format } from 'date-fns';

interface MatchCardProps {
  match: Match;
  tournament?: Tournament;
  players: Player[];
  onClick?: () => void;
}

export function MatchCard({ match, tournament, players, onClick }: MatchCardProps) {
  const mom = players.find(p => p.player_id === match.man_of_match);
  const statusColors: Record<string, string> = {
    completed: 'bg-primary text-primary-foreground',
    live: 'bg-destructive text-destructive-foreground',
    scheduled: 'bg-accent text-accent-foreground',
    cancelled: 'bg-muted text-muted-foreground',
  };

  return (
    <Card
      className="hover:shadow-lg transition-shadow border-l-4 border-l-primary cursor-pointer hover:border-l-accent"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-mono">{match.match_id}</span>
          <Badge className={statusColors[match.status] || 'bg-muted'}>
            {match.status.toUpperCase()}
          </Badge>
        </div>

        {tournament && (
          <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">
            {tournament.name} • {tournament.format}
          </p>
        )}

        <div className="flex items-center justify-between my-3">
          <div className="text-center flex-1">
            <span className="font-display text-lg font-semibold block">{match.team_a}</span>
            {match.team_a_score && <span className="text-primary font-bold text-sm">{match.team_a_score}</span>}
          </div>
          <span className="text-muted-foreground text-sm font-bold px-2">vs</span>
          <div className="text-center flex-1">
            <span className="font-display text-lg font-semibold block">{match.team_b}</span>
            {match.team_b_score && <span className="text-primary font-bold text-sm">{match.team_b_score}</span>}
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
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {match.venue}
          </span>
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

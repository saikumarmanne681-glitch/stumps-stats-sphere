import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ExternalLink, Shield, Trophy } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataIntegrityBadge } from '@/components/SecurityBadge';
import { useData } from '@/lib/DataContext';
import { formatSheetDate, hasSheetDate } from '@/lib/dataUtils';

export default function SeasonsOverviewPage() {
  const { seasons, tournaments, matches } = useData();
  const [filterTournament, setFilterTournament] = useState<string>('all');
  const relevantSeasons = useMemo(() => filterTournament === 'all' ? seasons : seasons.filter((s) => s.tournament_id === filterTournament), [filterTournament, seasons]);
  const seasonCards = useMemo(() => relevantSeasons
    .sort((a, b) => b.year - a.year)
    .map((season) => {
      const tournament = tournaments.find((t) => t.tournament_id === season.tournament_id);
      const seasonMatches = matches.filter((m) => m.season_id === season.season_id);
      const completedMatches = seasonMatches.filter((m) => m.status === 'completed');
      const liveMatches = seasonMatches.filter((m) => m.status === 'live');
      const teams = new Set<string>();
      seasonMatches.forEach((m) => { teams.add(m.team_a); teams.add(m.team_b); });
      return { season, tournament, totalMatches: seasonMatches.length, completedMatches: completedMatches.length, liveMatches: liveMatches.length, teams: teams.size };
    }), [relevantSeasons, tournaments, matches]);

  return <div className='min-h-screen bg-background'>
    <Navbar />
    <div className='container mx-auto px-4 py-8 space-y-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-sm uppercase tracking-[0.3em] text-muted-foreground'>Season Directory</p>
          <h1 className='font-display text-3xl font-bold'>📋 Seasons Overview</h1>
          <p className='text-muted-foreground'>Homepage now stays focused on leaderboards and latest matches, while this page keeps the full season hub.</p>
        </div>
        <Button variant='outline' asChild><Link to='/'>← Back Home</Link></Button>
      </div>
      <div className='flex flex-wrap items-center gap-4'>
        <span className='font-display text-lg font-semibold'>Filter Tournament:</span>
        <Select value={filterTournament} onValueChange={setFilterTournament}>
          <SelectTrigger className='w-52'><SelectValue placeholder='Tournament' /></SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Tournaments</SelectItem>
            {tournaments.map((t) => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {seasonCards.length === 0 ? <p className='py-10 text-center text-muted-foreground'>No seasons found for the selected tournament.</p> : <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {seasonCards.map(({ season, tournament, totalMatches, completedMatches, liveMatches, teams }) => <Card key={season.season_id} className='border-l-4 border-l-primary/60 bg-gradient-to-br from-white via-primary/5 to-accent/10 shadow-sm transition-all hover:shadow-lg'>
          <CardContent className='space-y-3 p-5'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'><Trophy className='h-4 w-4 text-primary' /><span className='font-display text-lg font-bold'>{tournament?.name}</span></div>
              <Badge variant={season.status === 'ongoing' ? 'default' : season.status === 'upcoming' ? 'secondary' : 'outline'} className='capitalize'>{season.status}</Badge>
            </div>
            <div className='flex items-center gap-2 font-display text-2xl font-bold text-primary'><Calendar className='h-5 w-5' />{season.year}</div>
            <div className='grid grid-cols-3 gap-2 text-center'>
              <div className='rounded-lg bg-muted/50 p-2'><p className='text-lg font-bold text-primary'>{totalMatches}</p><p className='text-xs text-muted-foreground'>Matches</p></div>
              <div className='rounded-lg bg-muted/50 p-2'><p className='text-lg font-bold text-primary'>{completedMatches}</p><p className='text-xs text-muted-foreground'>Completed</p></div>
              <div className='rounded-lg bg-muted/50 p-2'><p className='text-lg font-bold text-primary'>{teams}</p><p className='text-xs text-muted-foreground'>Teams</p></div>
            </div>
            {liveMatches > 0 && <Badge className='bg-rose-500 text-white'>{liveMatches} Live</Badge>}
            {hasSheetDate(season.start_date) && hasSheetDate(season.end_date) && <p className='text-xs text-muted-foreground'>{formatSheetDate(season.start_date, 'dd MMM')} – {formatSheetDate(season.end_date, 'dd MMM yyyy')}</p>}
            <div className='rounded-xl border bg-white/70 p-3'>
              <div className='flex items-center justify-between gap-2'>
                <div><p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Quick access</p><p className='text-sm font-medium'>Standings, tournament page and season anchor</p></div>
                <Shield className='h-4 w-4 text-primary' />
              </div>
              <div className='mt-2 flex items-center justify-between gap-2'>
                <DataIntegrityBadge data={`${season.season_id}:${season.tournament_id}:${season.year}:${totalMatches}`} label='Season view hash' />
                <Badge variant='outline' className='text-[10px]'>{tournament?.format || 'League'}</Badge>
              </div>
            </div>
            <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
              <Button variant='outline' size='sm' asChild><Link to={`/leaderboards?tournament=${season.tournament_id}&season=${season.season_id}`}>View Standings →</Link></Button>
              <Button variant='secondary' size='sm' asChild><Link to={`/tournament/${season.tournament_id}`}>Tournament Page</Link></Button>
              <Button variant='ghost' size='sm' asChild><Link to={`/tournament/${season.tournament_id}#season-${season.season_id}`}>Open Season Hub <ExternalLink className='h-3 w-3' /></Link></Button>
            </div>
          </CardContent>
        </Card>)}
      </div>}
    </div>
  </div>;
}

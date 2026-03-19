import { useMemo, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useData } from '@/lib/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { v2api } from '@/lib/v2api';
import { DigitalScorelist } from '@/lib/v2types';

const TournamentPage = () => {
  const { id } = useParams();
  const { tournaments, seasons, matches, batting, bowling, players } = useData();
  const [officialScorelists, setOfficialScorelists] = useState<DigitalScorelist[]>([]);
  
  const tournament = tournaments.find(t => t.tournament_id === id);
  const tournamentSeasons = seasons.filter(s => s.tournament_id === id).sort((a, b) => b.year - a.year);
  const tournamentMatches = matches.filter(m => m.tournament_id === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  useEffect(() => {
    let active = true;
    v2api.getScorelists().then((items) => {
      if (!active) return;
      const filtered = items.filter((s) => {
        const status = String(s.certification_status || '').toLowerCase();
        return s.tournament_id === id && !!s.locked && status === 'official_certified';
      });
      setOfficialScorelists(filtered);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (!tournament) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl mb-4">Tournament Not Found</h1>
        <Button asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>
      </div>
    </div>
  );

  const getPlayerName = (id: string) => players.find(p => p.player_id === id)?.name || id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link></Button>

        <Card className="border-l-4 border-l-accent bg-gradient-to-r from-accent/5 to-transparent">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Trophy className="h-10 w-10 text-accent" />
              <div>
                <h1 className="font-display text-3xl font-bold">{tournament.name}</h1>
                <p className="text-muted-foreground">{tournament.format} • {tournament.overs} overs</p>
                {tournament.description && <p className="text-sm text-muted-foreground mt-1">{tournament.description}</p>}
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <Badge>{tournamentSeasons.length} Seasons</Badge>
              <Badge variant="outline">{tournamentMatches.length} Matches</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Seasons */}
        <Card>
          <CardHeader><CardTitle className="font-display">📅 Seasons</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tournamentSeasons.map(s => (
                <Card key={s.season_id} className="border">
                  <CardContent className="p-4">
                    <p className="font-display text-xl font-bold">{s.year}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(s.start_date), 'dd MMM')} - {format(new Date(s.end_date), 'dd MMM yyyy')}</p>
                    <Badge variant={s.status === 'ongoing' ? 'default' : 'secondary'} className="mt-2">{s.status}</Badge>
                    <p className="text-sm mt-2">{matches.filter(m => m.season_id === s.season_id).length} matches</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Match Schedule */}
        <Card>
          <CardHeader><CardTitle className="font-display">🏏 Matches</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Match</TableHead><TableHead>Stage</TableHead><TableHead>Score</TableHead><TableHead>Result</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tournamentMatches.map(m => {
                  const s = seasons.find(s => s.season_id === m.season_id);
                  return (
                    <TableRow key={m.match_id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(m.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Link to={`/match/${m.match_id}`} className="font-medium hover:text-primary hover:underline">
                          {m.team_a} vs {m.team_b}
                        </Link>
                        {s && <span className="text-xs text-muted-foreground ml-2">({s.year})</span>}
                      </TableCell>
                      <TableCell>{m.match_stage ? <Badge variant="outline" className="text-xs">{m.match_stage}</Badge> : '-'}</TableCell>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display">🔒 Official Certified Scorelists</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {officialScorelists.length === 0 ? (
              <p className="text-sm text-muted-foreground">No official locked scorelists available for this tournament yet.</p>
            ) : (
              <div className="space-y-2">
                {officialScorelists.map((s) => (
                  <div key={s.scorelist_id} className="rounded-md border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs">{s.scorelist_id}</p>
                      <p className="text-xs text-muted-foreground">Generated by {s.generated_by || 'System'} • {s.generated_at ? format(new Date(s.generated_at), 'dd MMM yyyy, p') : '-'}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/verify-scorelist/${s.scorelist_id}`}>View Certified</Link>
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

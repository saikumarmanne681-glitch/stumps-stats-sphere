import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockMatches, mockSeasons, mockTournaments, mockPlayers, mockBattingScorecard, mockBowlingScorecard } from '@/lib/mockData';
import { Match, BattingScorecard, BowlingScorecard } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function AdminMatches() {
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [batting, setBatting] = useState<BattingScorecard[]>(mockBattingScorecard);
  const [bowling, setBowling] = useState<BowlingScorecard[]>(mockBowlingScorecard);
  const [editMatch, setEditMatch] = useState<Match | null>(null);
  const [editBat, setEditBat] = useState<BattingScorecard | null>(null);
  const [editBowl, setEditBowl] = useState<BowlingScorecard | null>(null);
  const [matchOpen, setMatchOpen] = useState(false);
  const [batOpen, setBatOpen] = useState(false);
  const [bowlOpen, setBowlOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<string>('');
  const { toast } = useToast();

  const emptyMatch: Match = { match_id: '', season_id: '', tournament_id: '', date: '', team_a: '', team_b: '', venue: '', status: 'scheduled', toss_winner: '', toss_decision: '', result: '', man_of_match: '' };
  const emptyBat: BattingScorecard = { id: '', match_id: '', player_id: '', team: '', runs: 0, balls: 0, fours: 0, sixes: 0, strike_rate: 0, how_out: '', bowler_id: '' };
  const emptyBowl: BowlingScorecard = { id: '', match_id: '', player_id: '', team: '', overs: 0, maidens: 0, runs_conceded: 0, wickets: 0, economy: 0, extras: 0 };

  const saveMatch = () => {
    if (!editMatch?.team_a || !editMatch?.team_b) { toast({ title: 'Error', description: 'Fill teams', variant: 'destructive' }); return; }
    if (editMatch.match_id) {
      setMatches(prev => prev.map(m => m.match_id === editMatch.match_id ? editMatch : m));
    } else {
      setMatches(prev => [...prev, { ...editMatch, match_id: `M${String(prev.length + 1).padStart(3, '0')}` }]);
    }
    toast({ title: 'Saved' }); setMatchOpen(false);
  };

  const saveBat = () => {
    if (!editBat?.player_id) { toast({ title: 'Error', description: 'Select player', variant: 'destructive' }); return; }
    const sr = editBat.balls > 0 ? (editBat.runs / editBat.balls) * 100 : 0;
    const entry = { ...editBat, strike_rate: Math.round(sr * 100) / 100 };
    if (entry.id) {
      setBatting(prev => prev.map(b => b.id === entry.id ? entry : b));
    } else {
      setBatting(prev => [...prev, { ...entry, id: `B${String(prev.length + 1).padStart(3, '0')}` }]);
    }
    toast({ title: 'Saved' }); setBatOpen(false);
  };

  const saveBowl = () => {
    if (!editBowl?.player_id) { toast({ title: 'Error', description: 'Select player', variant: 'destructive' }); return; }
    const eco = editBowl.overs > 0 ? editBowl.runs_conceded / editBowl.overs : 0;
    const entry = { ...editBowl, economy: Math.round(eco * 100) / 100 };
    if (entry.id) {
      setBowling(prev => prev.map(b => b.id === entry.id ? entry : b));
    } else {
      setBowling(prev => [...prev, { ...entry, id: `BW${String(prev.length + 1).padStart(3, '0')}` }]);
    }
    toast({ title: 'Saved' }); setBowlOpen(false);
  };

  const matchBatting = batting.filter(b => b.match_id === selectedMatch);
  const matchBowling = bowling.filter(b => b.match_id === selectedMatch);
  const sel = matches.find(m => m.match_id === selectedMatch);

  return (
    <div className="space-y-6">
      {/* Matches */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">🏏 Matches</CardTitle>
          <Dialog open={matchOpen} onOpenChange={setMatchOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditMatch({ ...emptyMatch })}><Plus className="h-4 w-4 mr-1" /> Add Match</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editMatch?.match_id ? 'Edit' : 'Add'} Match</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Tournament</Label>
                  <Select value={editMatch?.tournament_id || ''} onValueChange={v => setEditMatch(prev => prev ? { ...prev, tournament_id: v } : null)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{mockTournaments.map(t => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Season</Label>
                  <Select value={editMatch?.season_id || ''} onValueChange={v => setEditMatch(prev => prev ? { ...prev, season_id: v } : null)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{mockSeasons.filter(s => !editMatch?.tournament_id || s.tournament_id === editMatch.tournament_id).map(s => <SelectItem key={s.season_id} value={s.season_id}>{s.year} ({s.season_id})</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Date</Label><Input type="date" value={editMatch?.date || ''} onChange={e => setEditMatch(prev => prev ? { ...prev, date: e.target.value } : null)} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Team A</Label><Input value={editMatch?.team_a || ''} onChange={e => setEditMatch(prev => prev ? { ...prev, team_a: e.target.value } : null)} /></div>
                  <div><Label>Team B</Label><Input value={editMatch?.team_b || ''} onChange={e => setEditMatch(prev => prev ? { ...prev, team_b: e.target.value } : null)} /></div>
                </div>
                <div><Label>Venue</Label><Input value={editMatch?.venue || ''} onChange={e => setEditMatch(prev => prev ? { ...prev, venue: e.target.value } : null)} /></div>
                <div><Label>Status</Label>
                  <Select value={editMatch?.status || 'scheduled'} onValueChange={v => setEditMatch(prev => prev ? { ...prev, status: v as Match['status'] } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="live">Live</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                  </Select></div>
                <div><Label>Toss Winner</Label><Input value={editMatch?.toss_winner || ''} onChange={e => setEditMatch(prev => prev ? { ...prev, toss_winner: e.target.value } : null)} /></div>
                <div><Label>Toss Decision</Label><Input value={editMatch?.toss_decision || ''} onChange={e => setEditMatch(prev => prev ? { ...prev, toss_decision: e.target.value } : null)} /></div>
                <div><Label>Result</Label><Input value={editMatch?.result || ''} onChange={e => setEditMatch(prev => prev ? { ...prev, result: e.target.value } : null)} /></div>
                <div><Label>Man of Match</Label>
                  <Select value={editMatch?.man_of_match || ''} onValueChange={v => setEditMatch(prev => prev ? { ...prev, man_of_match: v } : null)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{mockPlayers.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <Button onClick={saveMatch} className="w-full">Save Match</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Date</TableHead><TableHead>Teams</TableHead><TableHead>Status</TableHead><TableHead>Result</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(m => (
                <TableRow key={m.match_id} className={selectedMatch === m.match_id ? 'bg-primary/5' : ''} onClick={() => setSelectedMatch(m.match_id)}>
                  <TableCell className="font-mono text-xs cursor-pointer">{m.match_id}</TableCell>
                  <TableCell>{m.date ? format(new Date(m.date), 'dd MMM yyyy') : '-'}</TableCell>
                  <TableCell className="font-medium">{m.team_a} vs {m.team_b}</TableCell>
                  <TableCell><Badge variant={m.status === 'completed' ? 'default' : 'secondary'}>{m.status}</Badge></TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{m.result || '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditMatch(m); setMatchOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setMatches(prev => prev.filter(x => x.match_id !== m.match_id)); toast({ title: 'Deleted' }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scorecard for selected match */}
      {selectedMatch && sel && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display">📊 Scorecard — {sel.team_a} vs {sel.team_b} ({sel.match_id})</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="batting">
              <TabsList>
                <TabsTrigger value="batting">Batting</TabsTrigger>
                <TabsTrigger value="bowling">Bowling</TabsTrigger>
              </TabsList>

              <TabsContent value="batting" className="mt-4">
                <div className="flex justify-end mb-2">
                  <Dialog open={batOpen} onOpenChange={setBatOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setEditBat({ ...emptyBat, match_id: selectedMatch })}><Plus className="h-4 w-4 mr-1" /> Add Batting</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Batting Entry</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Player</Label>
                          <Select value={editBat?.player_id || ''} onValueChange={v => setEditBat(prev => prev ? { ...prev, player_id: v } : null)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{mockPlayers.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name} ({p.player_id})</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div><Label>Team</Label><Input value={editBat?.team || ''} onChange={e => setEditBat(prev => prev ? { ...prev, team: e.target.value } : null)} placeholder={`${sel.team_a} or ${sel.team_b}`} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label>Runs</Label><Input type="number" value={editBat?.runs || 0} onChange={e => setEditBat(prev => prev ? { ...prev, runs: Number(e.target.value) } : null)} /></div>
                          <div><Label>Balls</Label><Input type="number" value={editBat?.balls || 0} onChange={e => setEditBat(prev => prev ? { ...prev, balls: Number(e.target.value) } : null)} /></div>
                          <div><Label>4s</Label><Input type="number" value={editBat?.fours || 0} onChange={e => setEditBat(prev => prev ? { ...prev, fours: Number(e.target.value) } : null)} /></div>
                          <div><Label>6s</Label><Input type="number" value={editBat?.sixes || 0} onChange={e => setEditBat(prev => prev ? { ...prev, sixes: Number(e.target.value) } : null)} /></div>
                        </div>
                        <div><Label>How Out</Label><Input value={editBat?.how_out || ''} onChange={e => setEditBat(prev => prev ? { ...prev, how_out: e.target.value } : null)} placeholder="caught, bowled, not out, etc." /></div>
                        <div><Label>Bowler</Label>
                          <Select value={editBat?.bowler_id || ''} onValueChange={v => setEditBat(prev => prev ? { ...prev, bowler_id: v } : null)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">N/A</SelectItem>
                              {mockPlayers.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select></div>
                        <Button onClick={saveBat} className="w-full">Save</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Player</TableHead><TableHead>Team</TableHead><TableHead>R</TableHead><TableHead>B</TableHead><TableHead>4s</TableHead><TableHead>6s</TableHead><TableHead>SR</TableHead><TableHead>Out</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {matchBatting.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{mockPlayers.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                        <TableCell>{b.team}</TableCell>
                        <TableCell className="font-bold">{b.runs}</TableCell>
                        <TableCell>{b.balls}</TableCell>
                        <TableCell>{b.fours}</TableCell>
                        <TableCell>{b.sixes}</TableCell>
                        <TableCell>{b.strike_rate.toFixed(1)}</TableCell>
                        <TableCell className="text-xs">{b.how_out}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditBat(b); setBatOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => { setBatting(prev => prev.filter(x => x.id !== b.id)); toast({ title: 'Deleted' }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="bowling" className="mt-4">
                <div className="flex justify-end mb-2">
                  <Dialog open={bowlOpen} onOpenChange={setBowlOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setEditBowl({ ...emptyBowl, match_id: selectedMatch })}><Plus className="h-4 w-4 mr-1" /> Add Bowling</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Bowling Entry</DialogTitle></DialogHeader>
                      <div className="space-y-3">
                        <div><Label>Player</Label>
                          <Select value={editBowl?.player_id || ''} onValueChange={v => setEditBowl(prev => prev ? { ...prev, player_id: v } : null)}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>{mockPlayers.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name} ({p.player_id})</SelectItem>)}</SelectContent>
                          </Select></div>
                        <div><Label>Team</Label><Input value={editBowl?.team || ''} onChange={e => setEditBowl(prev => prev ? { ...prev, team: e.target.value } : null)} /></div>
                        <div className="grid grid-cols-2 gap-2">
                          <div><Label>Overs</Label><Input type="number" step="0.1" value={editBowl?.overs || 0} onChange={e => setEditBowl(prev => prev ? { ...prev, overs: Number(e.target.value) } : null)} /></div>
                          <div><Label>Maidens</Label><Input type="number" value={editBowl?.maidens || 0} onChange={e => setEditBowl(prev => prev ? { ...prev, maidens: Number(e.target.value) } : null)} /></div>
                          <div><Label>Runs</Label><Input type="number" value={editBowl?.runs_conceded || 0} onChange={e => setEditBowl(prev => prev ? { ...prev, runs_conceded: Number(e.target.value) } : null)} /></div>
                          <div><Label>Wickets</Label><Input type="number" value={editBowl?.wickets || 0} onChange={e => setEditBowl(prev => prev ? { ...prev, wickets: Number(e.target.value) } : null)} /></div>
                          <div><Label>Extras</Label><Input type="number" value={editBowl?.extras || 0} onChange={e => setEditBowl(prev => prev ? { ...prev, extras: Number(e.target.value) } : null)} /></div>
                        </div>
                        <Button onClick={saveBowl} className="w-full">Save</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Player</TableHead><TableHead>Team</TableHead><TableHead>O</TableHead><TableHead>M</TableHead><TableHead>R</TableHead><TableHead>W</TableHead><TableHead>Eco</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {matchBowling.map(b => (
                      <TableRow key={b.id}>
                        <TableCell>{mockPlayers.find(p => p.player_id === b.player_id)?.name || b.player_id}</TableCell>
                        <TableCell>{b.team}</TableCell>
                        <TableCell>{b.overs}</TableCell>
                        <TableCell>{b.maidens}</TableCell>
                        <TableCell>{b.runs_conceded}</TableCell>
                        <TableCell className="font-bold">{b.wickets}</TableCell>
                        <TableCell>{b.economy.toFixed(1)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => { setEditBowl(b); setBowlOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => { setBowling(prev => prev.filter(x => x.id !== b.id)); toast({ title: 'Deleted' }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/lib/DataContext';
import { Season } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AdminSeasons() {
  const { seasons, tournaments, addSeason, updateSeason, deleteSeason } = useData();
  const [editItem, setEditItem] = useState<Season | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const empty: Season = {
    season_id: '',
    tournament_id: '',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    status: 'upcoming',
    winner_team: '',
    runner_up_team: '',
  };

  const handleSave = async () => {
    if (!editItem?.tournament_id || !editItem?.year) { toast({ title: 'Error', description: 'Fill required fields', variant: 'destructive' }); return; }
    if (editItem.status === 'completed' && !editItem.winner_team?.trim()) {
      toast({ title: 'Error', description: 'Completed seasons must have a winner team.', variant: 'destructive' });
      return;
    }
    if (editItem.winner_team?.trim() && editItem.runner_up_team?.trim() && editItem.winner_team.trim().toLowerCase() === editItem.runner_up_team.trim().toLowerCase()) {
      toast({ title: 'Error', description: 'Winner and runner-up teams cannot be the same.', variant: 'destructive' });
      return;
    }

    const normalizedSeason: Season = {
      ...editItem,
      winner_team: editItem.winner_team?.trim() || '',
      runner_up_team: editItem.runner_up_team?.trim() || '',
    };

    if (editItem.season_id) {
      await updateSeason(normalizedSeason);
    } else {
      await addSeason({ ...normalizedSeason, season_id: generateId('S') });
    }
    toast({ title: 'Saved' });
    setOpen(false);
  };

  const getTournamentName = (id: string) => tournaments.find(t => t.tournament_id === id)?.name || id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">📅 Seasons</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditItem({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem?.season_id ? 'Edit' : 'Add'} Season</DialogTitle>
              <DialogDescription>Fill in the season details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tournament</Label>
                <Select value={editItem?.tournament_id || ''} onValueChange={v => setEditItem(prev => prev ? { ...prev, tournament_id: v } : null)}>
                  <SelectTrigger><SelectValue placeholder="Select tournament" /></SelectTrigger>
                  <SelectContent>{tournaments.map(t => <SelectItem key={t.tournament_id} value={t.tournament_id}>{t.name} ({t.tournament_id})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Year</Label><Input type="number" value={editItem?.year || ''} onChange={e => setEditItem(prev => prev ? { ...prev, year: Number(e.target.value) } : null)} /></div>
              <div><Label>Start Date</Label><Input type="date" value={editItem?.start_date || ''} onChange={e => setEditItem(prev => prev ? { ...prev, start_date: e.target.value } : null)} /></div>
              <div><Label>End Date</Label><Input type="date" value={editItem?.end_date || ''} onChange={e => setEditItem(prev => prev ? { ...prev, end_date: e.target.value } : null)} /></div>
              <div>
                <Label>Status</Label>
                <Select value={editItem?.status || 'upcoming'} onValueChange={v => setEditItem(prev => prev ? { ...prev, status: v as Season['status'] } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Winner Team</Label><Input value={editItem?.winner_team || ''} onChange={e => setEditItem(prev => prev ? { ...prev, winner_team: e.target.value } : null)} placeholder="e.g. Thunder XI" /></div>
              <div><Label>Runner-up Team</Label><Input value={editItem?.runner_up_team || ''} onChange={e => setEditItem(prev => prev ? { ...prev, runner_up_team: e.target.value } : null)} placeholder="e.g. Royal Stars" /></div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Tournament</TableHead><TableHead>Year</TableHead><TableHead>Winner</TableHead><TableHead>Runner-up</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {seasons.map(s => (
              <TableRow key={s.season_id}>
                <TableCell className="font-mono text-xs">{s.season_id}</TableCell>
                <TableCell>{getTournamentName(s.tournament_id)}</TableCell>
                <TableCell>{s.year}</TableCell>
                <TableCell>{s.winner_team || '—'}</TableCell>
                <TableCell>{s.runner_up_team || '—'}</TableCell>
                <TableCell><Badge variant={s.status === 'ongoing' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditItem(s); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={async () => { await deleteSeason(s.season_id); toast({ title: 'Deleted' }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

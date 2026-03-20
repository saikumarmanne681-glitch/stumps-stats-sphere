import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/lib/DataContext';
import { Tournament } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function AdminTournaments() {
  const { tournaments, addTournament, updateTournament, deleteTournament } = useData();
  const [editItem, setEditItem] = useState<Tournament | null>(null);
  const [open, setOpen] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const { toast } = useToast();

  const empty: Tournament = { tournament_id: '', name: '', format: 'T20', overs: 20, description: '' };

  const handleSave = async () => {
    if (!editItem?.name) { toast({ title: 'Error', description: 'Name required', variant: 'destructive' }); return; }
    setActionKey(editItem.tournament_id || 'new');
    try {
      if (editItem.tournament_id) {
        await updateTournament(editItem);
      } else {
        await addTournament({ ...editItem, tournament_id: generateId('T') });
      }
      toast({ title: 'Saved' });
      setOpen(false);
    } finally {
      setActionKey(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">🏆 Tournaments</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditItem({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem?.tournament_id ? 'Edit' : 'Add'} Tournament</DialogTitle>
              <DialogDescription>Fill in the tournament details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editItem?.name || ''} onChange={e => setEditItem(prev => prev ? { ...prev, name: e.target.value } : null)} /></div>
              <div><Label>Format</Label><Input value={editItem?.format || ''} onChange={e => setEditItem(prev => prev ? { ...prev, format: e.target.value } : null)} /></div>
              <div><Label>Overs</Label><Input type="number" value={editItem?.overs || 0} onChange={e => setEditItem(prev => prev ? { ...prev, overs: Number(e.target.value) } : null)} /></div>
              <div><Label>Description</Label><Input value={editItem?.description || ''} onChange={e => setEditItem(prev => prev ? { ...prev, description: e.target.value } : null)} /></div>
              <Button onClick={handleSave} className="w-full" loading={!!actionKey} loadingText="Saving tournament...">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Format</TableHead><TableHead>Overs</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {tournaments.map(t => (
              <TableRow key={t.tournament_id}>
                <TableCell className="font-mono text-xs">{t.tournament_id}</TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.format}</TableCell>
                <TableCell>{t.overs}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditItem(t); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={async () => { setActionKey(t.tournament_id); try { await deleteTournament(t.tournament_id); toast({ title: 'Deleted' }); } finally { setActionKey(null); } }} loading={actionKey === t.tournament_id}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

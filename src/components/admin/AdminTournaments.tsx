import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { mockTournaments } from '@/lib/mockData';
import { Tournament } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function AdminTournaments() {
  const [items, setItems] = useState<Tournament[]>(mockTournaments);
  const [editItem, setEditItem] = useState<Tournament | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const empty: Tournament = { tournament_id: '', name: '', format: 'T20', overs: 20, description: '' };

  const handleSave = () => {
    if (!editItem?.name) { toast({ title: 'Error', description: 'Name required', variant: 'destructive' }); return; }
    if (editItem.tournament_id) {
      setItems(prev => prev.map(i => i.tournament_id === editItem.tournament_id ? editItem : i));
    } else {
      setItems(prev => [...prev, { ...editItem, tournament_id: `T${String(prev.length + 1).padStart(3, '0')}` }]);
    }
    toast({ title: 'Saved' });
    setOpen(false);
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
            <DialogHeader><DialogTitle>{editItem?.tournament_id ? 'Edit' : 'Add'} Tournament</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editItem?.name || ''} onChange={e => setEditItem(prev => prev ? { ...prev, name: e.target.value } : null)} /></div>
              <div><Label>Format</Label><Input value={editItem?.format || ''} onChange={e => setEditItem(prev => prev ? { ...prev, format: e.target.value } : null)} /></div>
              <div><Label>Overs</Label><Input type="number" value={editItem?.overs || 0} onChange={e => setEditItem(prev => prev ? { ...prev, overs: Number(e.target.value) } : null)} /></div>
              <div><Label>Description</Label><Input value={editItem?.description || ''} onChange={e => setEditItem(prev => prev ? { ...prev, description: e.target.value } : null)} /></div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Format</TableHead><TableHead>Overs</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map(t => (
              <TableRow key={t.tournament_id}>
                <TableCell className="font-mono text-xs">{t.tournament_id}</TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>{t.format}</TableCell>
                <TableCell>{t.overs}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditItem(t); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { setItems(prev => prev.filter(x => x.tournament_id !== t.tournament_id)); toast({ title: 'Deleted' }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

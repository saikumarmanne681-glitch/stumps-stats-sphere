import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/lib/DataContext';
import { Player } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AdminPlayers() {
  const { players, addPlayer, updatePlayer, deletePlayer } = useData();
  const [editItem, setEditItem] = useState<Player | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const empty: Player = { player_id: '', name: '', username: '', password: '', phone: '', role: 'batsman', status: 'active' };

  const handleSave = async () => {
    if (!editItem?.name || !editItem?.username) { toast({ title: 'Error', description: 'Name and username required', variant: 'destructive' }); return; }
    if (editItem.player_id) {
      await updatePlayer(editItem);
    } else {
      await addPlayer({ ...editItem, player_id: `P${String(players.length + 1).padStart(3, '0')}` });
    }
    toast({ title: 'Saved' });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">👥 Players</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditItem({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem?.player_id ? 'Edit' : 'Add'} Player</DialogTitle>
              <DialogDescription>Fill in the player details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={editItem?.name || ''} onChange={e => setEditItem(prev => prev ? { ...prev, name: e.target.value } : null)} /></div>
              <div><Label>Username</Label><Input value={editItem?.username || ''} onChange={e => setEditItem(prev => prev ? { ...prev, username: e.target.value } : null)} /></div>
              <div><Label>Password</Label><Input value={editItem?.password || ''} onChange={e => setEditItem(prev => prev ? { ...prev, password: e.target.value } : null)} /></div>
              <div><Label>Phone</Label><Input value={editItem?.phone || ''} onChange={e => setEditItem(prev => prev ? { ...prev, phone: e.target.value } : null)} /></div>
              <div>
                <Label>Role</Label>
                <Select value={editItem?.role || 'batsman'} onValueChange={v => setEditItem(prev => prev ? { ...prev, role: v as Player['role'] } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="batsman">Batsman</SelectItem>
                    <SelectItem value="bowler">Bowler</SelectItem>
                    <SelectItem value="allrounder">All-rounder</SelectItem>
                    <SelectItem value="wicketkeeper">Wicketkeeper</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editItem?.status || 'active'} onValueChange={v => setEditItem(prev => prev ? { ...prev, status: v as Player['status'] } : null)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Username</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {players.map(p => (
              <TableRow key={p.player_id}>
                <TableCell className="font-mono text-xs">{p.player_id}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell>{p.username}</TableCell>
                <TableCell className="capitalize">{p.role}</TableCell>
                <TableCell><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditItem(p); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={async () => { await deletePlayer(p.player_id); toast({ title: 'Deleted' }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

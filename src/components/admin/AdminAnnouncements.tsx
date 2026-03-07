import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { mockAnnouncements } from '@/lib/mockData';
import { Announcement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const emptyAnnouncement: Announcement = { id: '', title: '', message: '', date: new Date().toISOString().split('T')[0], active: true, created_by: 'admin' };

  const handleSave = () => {
    if (!editItem?.title || !editItem?.message) {
      toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' });
      return;
    }
    if (editItem.id) {
      setAnnouncements(prev => prev.map(a => a.id === editItem.id ? editItem : a));
      toast({ title: 'Updated', description: 'Announcement updated' });
    } else {
      const newItem = { ...editItem, id: `A${String(announcements.length + 1).padStart(3, '0')}` };
      setAnnouncements(prev => [...prev, newItem]);
      toast({ title: 'Added', description: 'Announcement created' });
    }
    setOpen(false);
    setEditItem(null);
  };

  const handleDelete = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    toast({ title: 'Deleted', description: 'Announcement removed' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">📢 Announcements</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditItem({ ...emptyAnnouncement })}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editItem?.id ? 'Edit' : 'Add'} Announcement</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editItem?.title || ''} onChange={e => setEditItem(prev => prev ? { ...prev, title: e.target.value } : null)} /></div>
              <div><Label>Message</Label><Textarea value={editItem?.message || ''} onChange={e => setEditItem(prev => prev ? { ...prev, message: e.target.value } : null)} /></div>
              <div><Label>Date</Label><Input type="date" value={editItem?.date || ''} onChange={e => setEditItem(prev => prev ? { ...prev, date: e.target.value } : null)} /></div>
              <div className="flex items-center gap-2">
                <Switch checked={editItem?.active || false} onCheckedChange={c => setEditItem(prev => prev ? { ...prev, active: c } : null)} />
                <Label>Active</Label>
              </div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.id}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell>{format(new Date(a.date), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  <Switch checked={a.active} onCheckedChange={c => setAnnouncements(prev => prev.map(x => x.id === a.id ? { ...x, active: c } : x))} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditItem(a); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

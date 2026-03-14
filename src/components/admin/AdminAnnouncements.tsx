import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useData } from '@/lib/DataContext';
import { Announcement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export function AdminAnnouncements() {
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useData();
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const emptyAnnouncement: Announcement = { id: '', title: '', message: '', date: new Date().toISOString().split('T')[0], active: true, created_by: 'admin' };

  const handleSave = async () => {
    if (!editItem?.title || !editItem?.message) { toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' }); return; }
    if (editItem.id) {
      await updateAnnouncement(editItem);
      toast({ title: 'Updated' });
    } else {
      await addAnnouncement({ ...editItem, id: generateId('A') });
      toast({ title: 'Added' });
    }
    setOpen(false);
    setEditItem(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display">📢 Announcements</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setEditItem({ ...emptyAnnouncement })}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editItem?.id ? 'Edit' : 'Add'} Announcement</DialogTitle>
              <DialogDescription>Fill in the announcement details.</DialogDescription>
            </DialogHeader>
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
      <CardContent className="max-h-[500px] overflow-y-auto scrollbar-thin">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Title</TableHead><TableHead>Date</TableHead><TableHead>Active</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {[...announcements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">{a.id}</TableCell>
                <TableCell>{a.title}</TableCell>
                <TableCell>{format(new Date(a.date), 'dd MMM yyyy')}</TableCell>
                <TableCell>
                  <Switch checked={a.active} onCheckedChange={async c => { await updateAnnouncement({ ...a, active: c }); }} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditItem(a); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={async () => { await deleteAnnouncement(a.id); toast({ title: 'Deleted' }); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

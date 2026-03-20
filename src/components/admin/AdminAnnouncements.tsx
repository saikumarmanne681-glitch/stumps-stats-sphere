import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/lib/DataContext';
import { Announcement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { BellRing, CalendarClock, Megaphone, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { logAudit } from '@/lib/v2api';

const quickTemplates = [
  {
    title: 'Match Day Notice',
    message: 'Please report 30 minutes before the scheduled start time. Carry your player ID and arrive in full kit for a smooth toss and scoring flow.',
  },
  {
    title: 'Scorecard Update',
    message: 'Official scorecards for today have been refreshed. Please review your individual scores and report any discrepancies through Support within the same day.',
  },
  {
    title: 'Weather Advisory',
    message: 'Weather watch is active for upcoming fixtures. Keep notifications enabled for real-time venue, toss, and timing updates.',
  },
];

export function AdminAnnouncements() {
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement } = useData();
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const emptyAnnouncement: Announcement = {
    id: '',
    title: '',
    message: '',
    date: new Date().toISOString().split('T')[0],
    active: true,
    created_by: 'admin',
  };

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...announcements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter((item) => !query || [item.title, item.message, item.id].join(' ').toLowerCase().includes(query));
  }, [announcements, search]);

  const activeAnnouncements = announcements.filter((item) => item.active).length;
  const scheduledAnnouncements = announcements.filter((item) => new Date(item.date).getTime() >= new Date().setHours(0, 0, 0, 0)).length;

  const handleSave = async () => {
    if (!editItem?.title || !editItem?.message) {
      toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' });
      return;
    }

    if (editItem.id) {
      await updateAnnouncement(editItem);
      logAudit('admin', 'admin_save_announcement', 'announcement', editItem.id, JSON.stringify({ title: editItem.title, active: editItem.active }));
      toast({ title: 'Announcement updated' });
    } else {
      const created = { ...editItem, id: generateId('A') };
      await addAnnouncement(created);
      logAudit('admin', 'admin_add_announcement', 'announcement', created.id, JSON.stringify({ title: created.title, active: created.active }));
      toast({ title: 'Announcement published' });
    }

    setOpen(false);
    setEditItem(null);
  };

  return (
    <div className="space-y-6">
      <section className="admin-section-shell soft-dot-grid overflow-hidden p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              <Megaphone className="h-3.5 w-3.5" /> Notice center
            </div>
            <div>
              <h2 className="section-heading">Make announcements impossible to miss.</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Create polished notices, keep important updates active, and surface the right communication at the right time for players and staff.
              </p>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full px-5" onClick={() => setEditItem({ ...emptyAnnouncement })}>
                <Plus className="mr-1 h-4 w-4" /> New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-[1.5rem] border-primary/10">
              <DialogHeader>
                <DialogTitle>{editItem?.id ? 'Edit' : 'Create'} Announcement</DialogTitle>
                <DialogDescription>Use a short title, a crisp message, and schedule the notice for visibility.</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Title</Label>
                    <Input value={editItem?.title || ''} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, title: e.target.value } : null))} placeholder="Ex: Semi-final reporting time" />
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input type="date" value={editItem?.date || ''} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, date: e.target.value } : null))} />
                  </div>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea value={editItem?.message || ''} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, message: e.target.value } : null))} className="min-h-[150px]" placeholder="Share the complete notice, update, or reminder..." />
                </div>
                <div className="space-y-2">
                  <Label>Quick templates</Label>
                  <div className="grid gap-2 md:grid-cols-3">
                    {quickTemplates.map((template) => (
                      <button
                        type="button"
                        key={template.title}
                        className="rounded-2xl border border-primary/10 bg-muted/40 p-3 text-left transition hover:border-primary/25 hover:bg-primary/5"
                        onClick={() => setEditItem((prev) => (prev ? { ...prev, title: template.title, message: template.message } : prev))}
                      >
                        <p className="text-sm font-semibold">{template.title}</p>
                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{template.message}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Active on player dashboards</p>
                    <p className="text-xs text-muted-foreground">Turn this on for urgent communication and rolling notices.</p>
                  </div>
                  <Switch checked={editItem?.active || false} onCheckedChange={(checked) => setEditItem((prev) => (prev ? { ...prev, active: checked } : null))} />
                </div>
                <Button onClick={handleSave} className="w-full rounded-xl">Save Announcement</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live notices</p>
            <p className="mt-2 text-3xl font-bold text-primary">{activeAnnouncements}</p>
            <p className="mt-1 text-sm text-muted-foreground">Currently visible across player-facing screens.</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scheduled / recent</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{scheduledAnnouncements}</p>
            <p className="mt-1 text-sm text-muted-foreground">Upcoming or same-day messages ready to go.</p>
          </div>
          <div className="metric-tile">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total archive</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{announcements.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">Searchable history for operations and audits.</p>
          </div>
        </div>
      </section>

      <Card className="admin-section-shell overflow-hidden">
        <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-background to-primary/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl"><BellRing className="h-5 w-5 text-primary" /> Announcement library</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Review every player-facing notice, update status quickly, and edit copy inline.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, copy, or IDs..." className="rounded-full pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6">
          <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-primary/10">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Announcement</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnnouncements.map((item) => (
                    <TableRow key={item.id} className="hover:bg-primary/5">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold">{item.title}</p>
                          <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{item.message}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{item.id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{format(new Date(item.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Badge className={item.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                            {item.active ? 'Active' : 'Hidden'}
                          </Badge>
                          <Switch
                            checked={item.active}
                            onCheckedChange={async (checked) => {
                              await updateAnnouncement({ ...item, active: checked });
                              logAudit('admin', 'toggle_announcement_visibility', 'announcement', item.id, JSON.stringify({ active: checked }));
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { setEditItem(item); setOpen(true); }}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              await deleteAnnouncement(item.id);
                              logAudit('admin', 'admin_delete_announcement', 'announcement', item.id, item.title);
                              toast({ title: 'Announcement deleted' });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAnnouncements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No announcements found for the current search.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-4">
              {(filteredAnnouncements.slice(0, 3)).map((item) => (
                <div key={item.id} className="rounded-[1.5rem] border border-primary/10 bg-gradient-to-br from-background via-background to-accent/5 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Featured notice</p>
                      <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                    </div>
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.message}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1"><CalendarClock className="h-3 w-3" /> {format(new Date(item.date), 'dd MMM yyyy')}</Badge>
                    <Badge className={item.active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}>{item.active ? 'Showing now' : 'Draft / hidden'}</Badge>
                  </div>
                </div>
              ))}
              {filteredAnnouncements.length === 0 && (
                <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                  Start by creating a notice using one of the quick templates above.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

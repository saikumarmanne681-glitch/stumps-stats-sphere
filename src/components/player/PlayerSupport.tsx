import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { SupportTicket, SupportMessage, SupportCSAT, SLA_CONFIG, ManagementUser } from '@/lib/v2types';
import { generateId } from '@/lib/utils';
import { Loader2, Plus, Send, Star, CalendarClock } from 'lucide-react';
import { resolveSupportActor } from '@/lib/supportNotifications';

const CATEGORIES = ['Account', 'Technical', 'Scorecard', 'Tournament', 'General', 'Bug Report'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-primary/10 text-primary',
  in_progress: 'bg-accent/10 text-accent',
  waiting_for_user: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-muted text-muted-foreground',
};

const toIST = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
};

interface PlayerSupportProps {
  playerId: string;
}

export function PlayerSupport({ playerId }: PlayerSupportProps) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [csatRating, setCsatRating] = useState(0);
  const [csatFeedback, setCsatFeedback] = useState('');

  const [newCategory, setNewCategory] = useState('General');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachment, setNewAttachment] = useState('');

  const refresh = async (ticketToKeepOpen?: string) => {
    const [t, m, mgmt] = await Promise.all([v2api.getTickets(), v2api.getTicketMessages(), v2api.getManagementUsers()]);
    const myTickets = t.filter((ticket) => ticket.created_by_user_id === playerId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTickets(myTickets);
    setMessages(m);
    setManagementUsers(mgmt);
    if (ticketToKeepOpen) setSelectedTicket(myTickets.find((tk) => tk.ticket_id === ticketToKeepOpen) || null);
    setLoading(false);
  };

  useEffect(() => { refresh(); const iv = setInterval(() => refresh(selectedTicket?.ticket_id), 15000); return () => clearInterval(iv); }, [playerId, selectedTicket?.ticket_id]);

  const handleCreate = async () => {
    if (!newSubject.trim() || !newDescription.trim()) return;
    setSending(true);
    const sla = SLA_CONFIG[newPriority];
    const now = new Date();
    const ticket: SupportTicket = {
      ticket_id: generateId('TKT'),
      created_by_user_id: playerId,
      category: newCategory,
      priority: newPriority,
      subject: newSubject,
      description: newDescription,
      attachment_url: newAttachment,
      status: 'open',
      assigned_admin_id: '',
      created_at: istNow(),
      first_response_due: new Date(now.getTime() + sla.firstResponse * 3600000).toISOString(),
      resolution_due: new Date(now.getTime() + sla.resolution * 3600000).toISOString(),
      resolved_at: '',
      closed_at: '',
    };
    await v2api.addTicket(ticket);
    logAudit(playerId, 'create_ticket', 'support_ticket', ticket.ticket_id);
    setShowCreate(false);
    setNewSubject('');
    setNewDescription('');
    setNewAttachment('');
    toast({ title: 'Ticket created successfully' });
    setSending(false);
    await refresh(ticket.ticket_id);
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    await v2api.addTicketMessage({
      message_id: generateId('SM'),
      ticket_id: selectedTicket.ticket_id,
      sender_id: playerId,
      sender_role: 'player',
      message_body: replyText,
      attachment_url: '',
      is_internal_note: false,
      created_at: istNow(),
    });
    if (selectedTicket.status === 'waiting_for_user') {
      await v2api.updateTicket({ ...selectedTicket, status: 'in_progress' });
    }
    setReplyText('');
    setSending(false);
    toast({ title: 'Reply sent to support desk' });
    await refresh(selectedTicket.ticket_id);
  };

  const handleCSAT = async (ticketId: string) => {
    if (!csatRating) return;
    const csat: SupportCSAT = {
      csat_id: generateId('CSAT'),
      ticket_id: ticketId,
      rating: csatRating,
      feedback: csatFeedback,
      submitted_at: istNow(),
    };
    await v2api.addCSAT(csat);
    setCsatRating(0);
    setCsatFeedback('');
    toast({ title: 'Thank you for your feedback' });
  };

  const ticketMessages = useMemo(() => selectedTicket
    ? messages.filter((m) => m.ticket_id === selectedTicket.ticket_id && !m.is_internal_note).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [], [messages, selectedTicket]);

  const getAssigneeLabel = (id: string) => {
    if (!id) return 'Unassigned';
    return resolveSupportActor(id, managementUsers).name;
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="font-display text-xl font-bold">Support Center</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Raise New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Subject</Label>
                <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Short summary" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as typeof newPriority)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Please share complete details to help us resolve faster." className="min-h-[120px]" />
              </div>
              <div>
                <Label>Attachment URL (optional)</Label>
                <Input value={newAttachment} onChange={(e) => setNewAttachment(e.target.value)} placeholder="https://..." />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={sending || !newSubject.trim() || !newDescription.trim()}>{sending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}Create Ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No support tickets yet. Tap “Raise New Ticket” to contact support.</CardContent></Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.ticket_id} className="cursor-pointer hover:border-primary/40" onClick={() => setSelectedTicket(ticket)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{ticket.subject}</p>
                <Badge className={STATUS_COLORS[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{ticket.category}</Badge>
                <Badge variant="outline">{ticket.priority}</Badge>
                <Badge variant="outline">Assigned: {getAssigneeLabel(ticket.assigned_admin_id)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Created: {toIST(ticket.created_at)} IST</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader><DialogTitle>{selectedTicket.subject}</DialogTitle></DialogHeader>
              <div className="flex flex-wrap gap-2 mb-2">
                <Badge className={STATUS_COLORS[selectedTicket.status]}>{selectedTicket.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{selectedTicket.category}</Badge>
                <Badge variant="outline">{selectedTicket.priority}</Badge>
                <Badge variant="outline">Assigned: {getAssigneeLabel(selectedTicket.assigned_admin_id)}</Badge>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Detailed Timeline (IST)</CardTitle></CardHeader>
                <CardContent className="space-y-3 max-h-[48vh] overflow-y-auto">
                  <div className="rounded-lg border p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground">Ticket raised • {toIST(selectedTicket.created_at)} IST</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">First response due • {toIST(selectedTicket.first_response_due)} IST</p>
                    <p className="text-xs text-muted-foreground">Resolution due • {toIST(selectedTicket.resolution_due)} IST</p>
                  </div>
                  {ticketMessages.map((msg) => (
                    <div key={msg.message_id} className={`rounded-lg border p-3 ${msg.sender_id === playerId ? 'bg-primary/5 border-primary/20' : ''}`}>
                      <p className="text-xs text-muted-foreground">{msg.sender_id === playerId ? 'You' : getAssigneeLabel(msg.sender_id)} • {toIST(msg.created_at)} IST</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{msg.message_body}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to support team..." className="flex-1 min-h-[70px]" />
                  <Button onClick={handleReply} disabled={sending || !replyText.trim()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                </div>
              )}

              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm mb-2">Rate your support experience</p>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} onClick={() => setCsatRating(n)} className="transition-transform active:scale-90">
                          <Star className={`h-6 w-6 ${n <= csatRating ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                    </div>
                    <Input value={csatFeedback} onChange={(e) => setCsatFeedback(e.target.value)} placeholder="Optional feedback" className="mb-2" />
                    <Button size="sm" onClick={() => handleCSAT(selectedTicket.ticket_id)} disabled={csatRating === 0}>Submit Feedback</Button>
                  </CardContent>
                </Card>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" />All support timestamps shown in IST (Asia/Kolkata).</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

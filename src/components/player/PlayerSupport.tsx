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
import { Loader2, Plus, Send, Star, CalendarClock, AlertTriangle, BadgeCheck, Clock3, LifeBuoy } from 'lucide-react';
import { resolveSupportActor } from '@/lib/supportNotifications';
import { getAdminNotificationRecipient, sendAdminCommunicationEmail, sendSupportTicketCreatedEmail } from '@/lib/mailer';
import { compareTimestampsAsc, compareTimestampsDesc, formatInIST } from '@/lib/time';

const CATEGORIES = ['Account', 'Technical', 'Scorecard', 'Tournament', 'General', 'Bug Report'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-primary/10 text-primary',
  in_progress: 'bg-accent/10 text-accent',
  waiting_for_user: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-muted text-muted-foreground',
};

const PRIORITY_STYLES: Record<SupportTicket['priority'], string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-destructive/10 text-destructive border-destructive/20',
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
    const myTickets = t.filter((ticket) => ticket.created_by_user_id === playerId).sort((a, b) => compareTimestampsDesc(a.created_at, b.created_at));
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
    logAudit(playerId, 'create_ticket', 'support_ticket', ticket.ticket_id, JSON.stringify({
      subject: ticket.subject,
      priority: ticket.priority,
      category: ticket.category,
      attachmentProvided: Boolean(ticket.attachment_url),
      firstResponseDue: ticket.first_response_due,
      resolutionDue: ticket.resolution_due,
    }));
    await notifyTicketCreation(ticket);
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
    logAudit(playerId, 'reply_ticket_message', 'support_ticket', selectedTicket.ticket_id, JSON.stringify({
      replyLength: replyText.trim().length,
      previousStatus: selectedTicket.status,
      nextStatus: selectedTicket.status === 'waiting_for_user' ? 'in_progress' : selectedTicket.status,
    }));
    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendAdminCommunicationEmail({
        to: adminRecipient,
        title: `Player replied on support ticket • ${selectedTicket.ticket_id}`,
        summary: 'A player added a new support reply.',
        detailLines: [
          `Ticket ID: ${selectedTicket.ticket_id}`,
          `Player ID: ${playerId}`,
          `Subject: ${selectedTicket.subject}`,
          `Reply preview: ${replyText.trim().slice(0, 180)}`,
        ],
      }).catch(console.warn);
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
    ? messages.filter((m) => m.ticket_id === selectedTicket.ticket_id && !m.is_internal_note).sort((a, b) => compareTimestampsAsc(a.created_at, b.created_at))
    : [], [messages, selectedTicket]);

  const openCount = tickets.filter((ticket) => ['open', 'in_progress', 'waiting_for_user'].includes(ticket.status)).length;
  const resolvedCount = tickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length;
  const criticalCount = tickets.filter((ticket) => ticket.priority === 'critical').length;

  const getAssigneeLabel = (id: string) => {
    if (!id) return 'Unassigned';
    return resolveSupportActor(id, managementUsers).name;
  };

  const notifyTicketCreation = async (ticket: SupportTicket) => {
    try {
      const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
      const linkedEmail = links.find((entry) => entry.user_id === playerId && entry.is_verified && entry.email);
      const pref = prefs.find((entry) => entry.user_id === playerId);
      if (linkedEmail?.email && (!pref || pref.support_updates)) {
        await sendSupportTicketCreatedEmail({
          to: linkedEmail.email,
          userName: 'Player',
          ticketId: ticket.ticket_id,
          subjectLine: ticket.subject,
          priority: ticket.priority,
          category: ticket.category,
        });
      }
    } catch (error) {
      console.warn('Unable to send player support creation email', error);
    }

    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendAdminCommunicationEmail({
        to: adminRecipient,
        title: `New support ticket created • ${ticket.ticket_id}`,
        summary: 'A player created a new support request that may need admin visibility.',
        detailLines: [
          `Ticket ID: ${ticket.ticket_id}`,
          `Player ID: ${ticket.created_by_user_id}`,
          `Subject: ${ticket.subject}`,
          `Priority: ${ticket.priority}`,
          `Category: ${ticket.category}`,
        ],
      }).catch(console.warn);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold">Support Center</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="gap-1"><LifeBuoy className="h-3.5 w-3.5" />{tickets.length} total</Badge>
            <Badge variant="outline" className="gap-1"><Clock3 className="h-3.5 w-3.5" />{openCount} active</Badge>
            <Badge variant="outline" className="gap-1"><BadgeCheck className="h-3.5 w-3.5" />{resolvedCount} resolved</Badge>
            <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3.5 w-3.5" />{criticalCount} critical</Badge>
          </div>
        </div>
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
              <Button className="w-full" onClick={handleCreate} disabled={sending || !newSubject.trim() || !newDescription.trim()} loading={sending} loadingText="Creating ticket and notifying support..."><Plus className="h-4 w-4 mr-1" />Create Ticket</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No support tickets yet. Tap “Raise New Ticket” to contact support.</CardContent></Card>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tickets.map((ticket) => (
          <Card key={ticket.ticket_id} className="cursor-pointer hover:border-primary/40 transition-all hover:shadow-sm" onClick={() => setSelectedTicket(ticket)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_id}</p>
                </div>
                <Badge className={STATUS_COLORS[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{ticket.category}</Badge>
                <Badge className={PRIORITY_STYLES[ticket.priority]}>{ticket.priority}</Badge>
                <Badge variant="outline">Assigned: {getAssigneeLabel(ticket.assigned_admin_id)}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Created: {formatInIST(ticket.created_at)} IST</p>
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
                    <p className="text-xs text-muted-foreground">Ticket raised • {formatInIST(selectedTicket.created_at)} IST</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">First response due • {formatInIST(selectedTicket.first_response_due)} IST</p>
                    <p className="text-xs text-muted-foreground">Resolution due • {formatInIST(selectedTicket.resolution_due)} IST</p>
                  </div>
                  {ticketMessages.map((msg) => (
                    <div key={msg.message_id} className={`rounded-lg border p-3 ${msg.sender_id === playerId ? 'bg-primary/5 border-primary/20' : ''}`}>
                      <p className="text-xs text-muted-foreground">{msg.sender_id === playerId ? 'You' : getAssigneeLabel(msg.sender_id)} • {formatInIST(msg.created_at)} IST</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{msg.message_body}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Reply to support team..." className="flex-1 min-h-[70px]" />
                  <Button onClick={handleReply} disabled={sending || !replyText.trim()} loading={sending} loadingText="Sending update..."><Send className="h-4 w-4" /></Button>
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

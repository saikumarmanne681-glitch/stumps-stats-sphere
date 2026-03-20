import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/DataContext';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { SupportTicket, SupportMessage, SupportCSAT, ManagementUser } from '@/lib/v2types';
import { notifyTicketOwner, resolveSupportActor } from '@/lib/supportNotifications';
import { generateId } from '@/lib/utils';
import { Loader2, Search, MessageSquare, Clock, AlertTriangle, CheckCircle2, Send, StickyNote, UserRoundCheck, CalendarClock } from 'lucide-react';
import { getAdminNotificationRecipient, sendAdminCommunicationEmail } from '@/lib/mailer';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-primary/10 text-primary border-primary/30',
  in_progress: 'bg-accent/10 text-accent border-accent/30',
  waiting_for_user: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  resolved: 'bg-green-100 text-green-800 border-green-300',
  closed: 'bg-muted text-muted-foreground border-border',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-destructive/10 text-destructive',
};

const CATEGORIES = ['Account', 'Technical', 'Scorecard', 'Tournament', 'General', 'Bug Report'];

const toIST = (value?: string) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
};

export function AdminSupportDashboard() {
  const { user } = useAuth();
  const { players } = useData();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [csatData, setCSATData] = useState<SupportCSAT[]>([]);
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [sending, setSending] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = async (ticketToKeepOpen?: string) => {
    const [t, m, c, mgmt] = await Promise.all([v2api.getTickets(), v2api.getTicketMessages(), v2api.getCSAT(), v2api.getManagementUsers()]);
    setTickets(t);
    setMessages(m);
    setCSATData(c);
    setManagementUsers(mgmt.filter((u) => String(u.status || '').toLowerCase() !== 'inactive'));
    if (ticketToKeepOpen) {
      const latest = t.find((tk) => tk.ticket_id === ticketToKeepOpen) || null;
      setSelectedTicket(latest);
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); const iv = setInterval(() => refresh(selectedTicket?.ticket_id), 15000); return () => clearInterval(iv); }, [selectedTicket?.ticket_id]);

  const getPlayerName = (id: string) => {
    if (id === 'admin') return 'Admin';
    return players.find((p) => p.player_id === id)?.name || id;
  };

  const getAssigneeName = (id: string) => {
    if (!id) return 'Unassigned';
    const actor = resolveSupportActor(id, managementUsers);
    return actor.designation ? `${actor.name} • ${actor.designation}` : actor.name;
  };

  const isSLABreached = (ticket: SupportTicket, field: 'first_response_due' | 'resolution_due') => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') return false;
    const due = new Date(ticket[field]);
    return due.getTime() > 0 && Date.now() > due.getTime();
  };

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (filterStatus !== 'all') result = result.filter((t) => t.status === filterStatus);
    if (filterCategory !== 'all') result = result.filter((t) => t.category === filterCategory);
    if (filterPriority !== 'all') result = result.filter((t) => t.priority === filterPriority);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.subject.toLowerCase().includes(q) || t.ticket_id.toLowerCase().includes(q) || getPlayerName(t.created_by_user_id).toLowerCase().includes(q));
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [tickets, filterStatus, filterCategory, filterPriority, searchQuery, players]);

  const ticketMessages = useMemo(() => selectedTicket
    ? messages.filter((m) => m.ticket_id === selectedTicket.ticket_id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [], [messages, selectedTicket]);

  const latestCSAT = selectedTicket ? csatData.filter((c) => c.ticket_id === selectedTicket.ticket_id).sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0] : null;

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    const msg: SupportMessage = {
      message_id: generateId('SM'),
      ticket_id: selectedTicket.ticket_id,
      sender_id: user?.management_id || 'admin',
      sender_role: 'admin',
      message_body: replyText,
      attachment_url: '',
      is_internal_note: false,
      created_at: istNow(),
    };
    await v2api.addTicketMessage(msg);
    const effectiveTicket = selectedTicket.status === 'open' ? { ...selectedTicket, status: 'in_progress' as const } : selectedTicket;
    if (effectiveTicket !== selectedTicket) await v2api.updateTicket(effectiveTicket);
    const actor = resolveSupportActor(user?.management_id || user?.username || 'admin', managementUsers);
    await notifyTicketOwner({ ticket: effectiveTicket, actorName: actor.name, actorDesignation: actor.designation, updateType: 'reply', detail: replyText.trim().slice(0, 220), players });
    logAudit('admin', 'reply_ticket', 'support_ticket', selectedTicket.ticket_id, JSON.stringify({
      actor: actor.name,
      actorDesignation: actor.designation,
      replyLength: replyText.trim().length,
      previousStatus: selectedTicket.status,
      nextStatus: effectiveTicket.status,
    }));
    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendAdminCommunicationEmail({
        to: adminRecipient,
        title: `Support reply sent • ${selectedTicket.ticket_id}`,
        summary: 'A support reply was sent to a player and recorded in the support timeline.',
        detailLines: [
          `Ticket ID: ${selectedTicket.ticket_id}`,
          `Actor: ${actor.name}${actor.designation ? ` (${actor.designation})` : ''}`,
          `Subject: ${selectedTicket.subject}`,
          `Reply preview: ${replyText.trim().slice(0, 180)}`,
        ],
      }).catch(console.warn);
    }
    setReplyText('');
    setSending(false);
    toast({ title: 'Reply sent to player' });
    await refresh(selectedTicket.ticket_id);
  };

  const handleInternalNote = async () => {
    if (!internalNote.trim() || !selectedTicket) return;
    setSending(true);
    await v2api.addTicketMessage({
      message_id: generateId('SM'),
      ticket_id: selectedTicket.ticket_id,
      sender_id: user?.management_id || 'admin',
      sender_role: 'admin',
      message_body: internalNote,
      attachment_url: '',
      is_internal_note: true,
      created_at: istNow(),
    });
    logAudit('admin', 'internal_note', 'support_ticket', selectedTicket.ticket_id, JSON.stringify({
      noteLength: internalNote.trim().length,
      actor: user?.management_id || user?.username || 'admin',
    }));
    setInternalNote('');
    setSending(false);
    toast({ title: 'Internal note added' });
    await refresh(selectedTicket.ticket_id);
  };

  const handleStatusChange = async (status: SupportTicket['status']) => {
    if (!selectedTicket) return;
    const updated: SupportTicket = { ...selectedTicket, status };
    if (status === 'resolved') updated.resolved_at = istNow();
    if (status === 'closed') updated.closed_at = istNow();
    await v2api.updateTicket(updated);
    const actor = resolveSupportActor(user?.management_id || user?.username || 'admin', managementUsers);
    await notifyTicketOwner({ ticket: updated, actorName: actor.name, actorDesignation: actor.designation, updateType: 'status', detail: `Ticket status changed to ${status.replace('_', ' ')}`, players });
    logAudit('admin', 'change_status', 'support_ticket', selectedTicket.ticket_id, JSON.stringify({
      previousStatus: selectedTicket.status,
      nextStatus: status,
      subject: selectedTicket.subject,
    }));
    toast({ title: `Status updated to ${status.replace('_', ' ')}` });
    await refresh(selectedTicket.ticket_id);
  };

  const handleAssign = async (adminId: string) => {
    if (!selectedTicket) return;
    const updated = { ...selectedTicket, assigned_admin_id: adminId };
    await v2api.updateTicket(updated);
    const assignee = resolveSupportActor(adminId, managementUsers);
    await notifyTicketOwner({
      ticket: updated,
      actorName: assignee.name,
      actorDesignation: assignee.designation || 'Support Team',
      updateType: 'assignment',
      detail: `Assigned to ${assignee.name}${assignee.designation ? ` (${assignee.designation})` : ''}`,
      players,
    });
    logAudit('admin', 'assign_ticket', 'support_ticket', selectedTicket.ticket_id, JSON.stringify({
      previousAssignee: selectedTicket.assigned_admin_id,
      nextAssignee: adminId,
      subject: selectedTicket.subject,
    }));
    toast({ title: 'Assignee updated' });
    await refresh(selectedTicket.ticket_id);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const breachedCount = tickets.filter((t) => isSLABreached(t, 'resolution_due')).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Tickets</p><p className="text-2xl font-bold">{tickets.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-2xl font-bold text-primary">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-2xl font-bold text-accent">{inProgressCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">SLA Breached</p><p className="text-2xl font-bold text-destructive">{breachedCount}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" placeholder="Ticket ID, subject, player..." />
            </div>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="waiting_for_user">Waiting for User</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filteredTickets.length === 0 && <Card className="xl:col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No tickets found.</CardContent></Card>}
        {filteredTickets.map((ticket) => (
          <Card key={ticket.ticket_id} className="cursor-pointer hover:border-primary/40 transition-all" onClick={() => setSelectedTicket(ticket)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground font-mono">{ticket.ticket_id}</p>
                </div>
                <Badge className={STATUS_COLORS[ticket.status]}>{ticket.status.replace('_', ' ')}</Badge>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">{ticket.category}</Badge>
                <Badge className={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Badge>
                <Badge variant="outline" className="max-w-full truncate"><UserRoundCheck className="h-3 w-3 mr-1" />{getAssigneeName(ticket.assigned_admin_id)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                <span>{getPlayerName(ticket.created_by_user_id)}</span>
                <span>•</span>
                <span>{toIST(ticket.created_at)} IST</span>
                {isSLABreached(ticket, 'resolution_due') ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Clock className="h-4 w-4" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />{selectedTicket.subject}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Conversation Timeline (IST)</CardTitle></CardHeader>
                  <CardContent className="space-y-3 max-h-[58vh] overflow-y-auto">
                    <div className="rounded-lg border p-3 bg-muted/30">
                      <p className="text-xs text-muted-foreground">Ticket created • {toIST(selectedTicket.created_at)} IST</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTicket.description}</p>
                    </div>
                    {ticketMessages.map((msg) => (
                      <div key={msg.message_id} className={`rounded-lg border p-3 ${msg.is_internal_note ? 'bg-yellow-50 border-yellow-200' : msg.sender_role === 'admin' ? 'bg-primary/5 border-primary/20' : 'bg-background'}`}>
                        <div className="flex justify-between gap-2 text-xs mb-1">
                          <span className="font-semibold">{msg.sender_role === 'admin' ? getAssigneeName(msg.sender_id) : getPlayerName(msg.sender_id)}</span>
                          <span className="text-muted-foreground">{toIST(msg.created_at)} IST</span>
                        </div>
                        {msg.is_internal_note && <Badge variant="outline" className="mb-2">Internal Note</Badge>}
                        <p className="text-sm whitespace-pre-wrap">{msg.message_body}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4 space-y-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Badge className={STATUS_COLORS[selectedTicket.status]}>{selectedTicket.status.replace('_', ' ')}</Badge>
                        <Badge className={PRIORITY_COLORS[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                        <Badge variant="outline">{selectedTicket.category}</Badge>
                      </div>
                      <p><span className="text-muted-foreground">Raised by:</span> {getPlayerName(selectedTicket.created_by_user_id)}</p>
                      <p><span className="text-muted-foreground">Assigned:</span> {getAssigneeName(selectedTicket.assigned_admin_id)}</p>
                      <p><span className="text-muted-foreground">First response due:</span> {toIST(selectedTicket.first_response_due)} IST</p>
                      <p><span className="text-muted-foreground">Resolution due:</span> {toIST(selectedTicket.resolution_due)} IST</p>
                      {selectedTicket.resolved_at && <p><span className="text-muted-foreground">Resolved:</span> {toIST(selectedTicket.resolved_at)} IST</p>}
                      {selectedTicket.closed_at && <p><span className="text-muted-foreground">Closed:</span> {toIST(selectedTicket.closed_at)} IST</p>}
                      <div className="pt-2 grid grid-cols-1 gap-2">
                        <Select value={selectedTicket.status} onValueChange={(v) => handleStatusChange(v as SupportTicket['status'])}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="waiting_for_user">Waiting for User</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={selectedTicket.assigned_admin_id || 'unassigned'} onValueChange={(v) => handleAssign(v === 'unassigned' ? '' : v)}>
                          <SelectTrigger><SelectValue placeholder="Assign to..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            {managementUsers.map((m) => <SelectItem key={m.management_id} value={m.management_id}>{m.name} • {m.designation}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  {latestCSAT && (
                    <Card>
                      <CardContent className="p-4 text-sm">
                        <p className="font-semibold">Player CSAT</p>
                        <p className="text-muted-foreground">Rating: {latestCSAT.rating}/5</p>
                        {latestCSAT.feedback && <p className="mt-2">“{latestCSAT.feedback}”</p>}
                      </CardContent>
                    </Card>
                  )}

                  <Tabs defaultValue="reply">
                    <TabsList className="grid grid-cols-2 w-full">
                      <TabsTrigger value="reply">Reply</TabsTrigger>
                      <TabsTrigger value="note">Internal Note</TabsTrigger>
                    </TabsList>
                    <TabsContent value="reply" className="space-y-2">
                      <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Professional update to ticket raiser..." className="min-h-[90px]" />
                      <Button className="w-full" onClick={handleReply} disabled={sending || !replyText.trim()} loading={sending} loadingText="Sending reply and notifying player..."><Send className="h-4 w-4 mr-2" />Send Reply</Button>
                    </TabsContent>
                    <TabsContent value="note" className="space-y-2">
                      <Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Private note for admin team..." className="min-h-[90px]" />
                      <Button variant="outline" className="w-full" onClick={handleInternalNote} disabled={sending || !internalNote.trim()} loading={sending} loadingText="Saving internal note..."><StickyNote className="h-4 w-4 mr-2" />Save Internal Note</Button>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="h-3 w-3" />All timestamps shown in IST (Asia/Kolkata).</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

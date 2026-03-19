import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/DataContext';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { SupportTicket, SupportMessage, SupportCSAT, ManagementUser } from '@/lib/v2types';
import { notifyTicketOwner, resolveSupportActor } from '@/lib/supportNotifications';
import { generateId } from '@/lib/utils';
import { Loader2, Plus, Search, MessageSquare, Clock, AlertTriangle, CheckCircle, Send, Star, Filter, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';

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
  const [sortBy, setSortBy] = useState<'newest' | 'sla' | 'priority'>('newest');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const refresh = async () => {
    const [t, m, c, mgmt] = await Promise.all([v2api.getTickets(), v2api.getTicketMessages(), v2api.getCSAT(), v2api.getManagementUsers()]);
    setTickets(t);
    setMessages(m);
    setCSATData(c);
    setManagementUsers(mgmt.filter((u) => String(u.status || '').toLowerCase() !== 'inactive'));
    setLoading(false);
  };

  useEffect(() => { refresh(); const iv = setInterval(refresh, 15000); return () => clearInterval(iv); }, []);

  const getPlayerName = (id: string) => {
    if (id === 'admin') return 'Admin';
    return players.find(p => p.player_id === id)?.name || id;
  };

  const isSLABreached = (ticket: SupportTicket, field: 'first_response_due' | 'resolution_due') => {
    if (ticket.status === 'closed' || ticket.status === 'resolved') return false;
    const due = new Date(ticket[field]);
    return due.getTime() > 0 && Date.now() > due.getTime();
  };

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (filterStatus !== 'all') result = result.filter(t => t.status === filterStatus);
    if (filterCategory !== 'all') result = result.filter(t => t.category === filterCategory);
    if (filterPriority !== 'all') result = result.filter(t => t.priority === filterPriority);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.subject.toLowerCase().includes(q) ||
        t.ticket_id.toLowerCase().includes(q) ||
        getPlayerName(t.created_by_user_id).toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === 'priority') {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] || 3) - (order[b.priority] || 3);
      }
      if (sortBy === 'sla') {
        const aTime = new Date(a.first_response_due).getTime() || Infinity;
        const bTime = new Date(b.first_response_due).getTime() || Infinity;
        return aTime - bTime;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [tickets, filterStatus, filterCategory, filterPriority, searchQuery, sortBy, players]);

  const pagedTickets = filteredTickets.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredTickets.length / PAGE_SIZE);

  const ticketMessages = useMemo(() =>
    selectedTicket ? messages.filter(m => m.ticket_id === selectedTicket.ticket_id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) : []
  , [selectedTicket, messages]);

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    const msg: SupportMessage = {
      message_id: generateId('SM'),
      ticket_id: selectedTicket.ticket_id,
      sender_id: 'admin',
      sender_role: 'admin',
      message_body: replyText,
      attachment_url: '',
      is_internal_note: false,
      created_at: istNow(),
    };
    await v2api.addTicketMessage(msg);
    let effectiveTicket = selectedTicket;
    if (selectedTicket.status === 'open') {
      effectiveTicket = { ...selectedTicket, status: 'in_progress' };
      await v2api.updateTicket(effectiveTicket);
    }
    const actor = resolveSupportActor(user?.management_id || user?.username || 'admin', managementUsers);
    await notifyTicketOwner({
      ticket: effectiveTicket,
      actorName: actor.name,
      actorDesignation: actor.designation,
      updateType: 'reply',
      detail: replyText.trim().slice(0, 220),
      players,
    });
    logAudit('admin', 'reply_ticket', 'support_ticket', selectedTicket.ticket_id);
    toast({ title: 'Reply sent' });
    setReplyText('');
    setSending(false);
    refresh();
  };

  const handleInternalNote = async () => {
    if (!internalNote.trim() || !selectedTicket) return;
    setSending(true);
    const msg: SupportMessage = {
      message_id: generateId('SM'),
      ticket_id: selectedTicket.ticket_id,
      sender_id: 'admin',
      sender_role: 'admin',
      message_body: internalNote,
      attachment_url: '',
      is_internal_note: true,
      created_at: istNow(),
    };
    await v2api.addTicketMessage(msg);
    logAudit('admin', 'internal_note', 'support_ticket', selectedTicket.ticket_id);
    toast({ title: 'Internal note added' });
    setInternalNote('');
    setSending(false);
    refresh();
  };

  const handleStatusChange = async (status: SupportTicket['status']) => {
    if (!selectedTicket) return;
    const updated = { ...selectedTicket, status };
    if (status === 'resolved') updated.resolved_at = istNow();
    if (status === 'closed') updated.closed_at = istNow();
    await v2api.updateTicket(updated);
    const actor = resolveSupportActor(user?.management_id || user?.username || 'admin', managementUsers);
    await notifyTicketOwner({
      ticket: updated,
      actorName: actor.name,
      actorDesignation: actor.designation,
      updateType: 'status',
      detail: `Ticket status changed to ${status.replace('_', ' ')}`,
      players,
    });
    logAudit('admin', 'change_status', 'support_ticket', selectedTicket.ticket_id, status);
    toast({ title: `Ticket ${status.replace('_', ' ')}` });
    setSelectedTicket(updated);
    refresh();
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
    logAudit('admin', 'assign_ticket', 'support_ticket', selectedTicket.ticket_id, adminId);
    toast({ title: 'Ticket assigned', description: `Owner notified: ${assignee.name}` });
    setSelectedTicket(updated);
    refresh();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const breachedCount = tickets.filter(t => isSLABreached(t, 'resolution_due')).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/30"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{tickets.length}</p><p className="text-xs text-muted-foreground">Total Tickets</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-accent/15 via-background to-background border-accent/30"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-accent">{openCount}</p><p className="text-xs text-muted-foreground">Open</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-blue-500/10 via-background to-background border-blue-300/40"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{inProgressCount}</p><p className="text-xs text-muted-foreground">In Progress</p></CardContent></Card>
        <Card className="bg-gradient-to-br from-destructive/10 via-background to-background border-destructive/30"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{breachedCount}</p><p className="text-xs text-muted-foreground">SLA Breached</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 w-60" placeholder="Search tickets..." /></div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="waiting_for_user">Waiting</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="closed">Closed</SelectItem></SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Priority</Label>
              <Select value={filterPriority} onValueChange={setFilterPriority}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
            </div>
            <div>
              <Label className="text-xs">Sort</Label>
              <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="sla">SLA Due</SelectItem><SelectItem value="priority">Priority</SelectItem></SelectContent></Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedTickets.map(ticket => (
                <TableRow key={ticket.ticket_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedTicket(ticket)}>
                  <TableCell className="font-mono text-xs">{ticket.ticket_id.substring(0, 12)}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{ticket.subject}</TableCell>
                  <TableCell className="text-sm">{getPlayerName(ticket.created_by_user_id)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{ticket.category}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>
                    {isSLABreached(ticket, 'resolution_due') && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    {!isSLABreached(ticket, 'resolution_due') && ticket.status !== 'closed' && <Clock className="h-4 w-4 text-muted-foreground" />}
                    {ticket.status === 'closed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ticket.created_at}</TableCell>
                  <TableCell><Button variant="ghost" size="sm"><MessageSquare className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
              {pagedTickets.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No tickets found</TableCell></TableRow>}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={open => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto scrollbar-thin">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {selectedTicket.subject}
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap gap-2 mb-4">
                <Badge className={PRIORITY_COLORS[selectedTicket.priority]}>{selectedTicket.priority}</Badge>
                <Badge className={STATUS_COLORS[selectedTicket.status]}>{selectedTicket.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{selectedTicket.category}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">by {getPlayerName(selectedTicket.created_by_user_id)} • {selectedTicket.created_at}</span>
              </div>

              {/* SLA Info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`p-2 rounded border text-xs ${isSLABreached(selectedTicket, 'first_response_due') ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                  <span className="font-semibold">First Response Due:</span> {selectedTicket.first_response_due || 'N/A'}
                  {isSLABreached(selectedTicket, 'first_response_due') && <AlertTriangle className="inline h-3 w-3 text-destructive ml-1" />}
                </div>
                <div className={`p-2 rounded border text-xs ${isSLABreached(selectedTicket, 'resolution_due') ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
                  <span className="font-semibold">Resolution Due:</span> {selectedTicket.resolution_due || 'N/A'}
                  {isSLABreached(selectedTicket, 'resolution_due') && <AlertTriangle className="inline h-3 w-3 text-destructive ml-1" />}
                </div>
              </div>

              {/* Description */}
              <Card className="mb-4">
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
                  {selectedTicket.attachment_url && <a href={selectedTicket.attachment_url} target="_blank" className="text-xs text-primary underline mt-2 block">📎 Attachment</a>}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Select onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Change Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_for_user">Waiting for User</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                  <Select onValueChange={handleAssign}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    {managementUsers.map((m) => (
                      <SelectItem key={m.management_id} value={m.management_id}>
                        {m.name} • {m.designation}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Conversation */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin mb-4">
                {ticketMessages.map(msg => (
                  <div key={msg.message_id} className={`flex ${msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      msg.is_internal_note ? 'bg-yellow-50 border border-yellow-200' :
                      msg.sender_role === 'admin' ? 'bg-primary/10 border border-primary/20' : 'bg-muted'
                    }`}>
                      {msg.is_internal_note && <div className="flex items-center gap-1 mb-1"><StickyNote className="h-3 w-3 text-yellow-600" /><span className="text-xs font-semibold text-yellow-600">Internal Note</span></div>}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{getPlayerName(msg.sender_id)}</span>
                        <span className="text-xs text-muted-foreground">{msg.created_at}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message_body}</p>
                    </div>
                  </div>
                ))}
                {ticketMessages.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No messages yet</p>}
              </div>

              {/* Reply / Note */}
              <Tabs defaultValue="reply">
                <TabsList className="mb-2">
                  <TabsTrigger value="reply">Reply</TabsTrigger>
                  <TabsTrigger value="note">Internal Note</TabsTrigger>
                </TabsList>
                <TabsContent value="reply">
                  <div className="flex gap-2">
                    <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type reply to user..." className="flex-1 min-h-[60px]" />
                    <Button onClick={handleReply} disabled={sending || !replyText.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="note">
                  <div className="flex gap-2">
                    <Textarea value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Internal note (not visible to user)..." className="flex-1 min-h-[60px]" />
                    <Button variant="outline" onClick={handleInternalNote} disabled={sending || !internalNote.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <StickyNote className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

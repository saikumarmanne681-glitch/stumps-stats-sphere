import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { SupportTicket, SupportMessage, SupportCSAT, SLA_CONFIG } from '@/lib/v2types';
import { generateId } from '@/lib/utils';
import { useData } from '@/lib/DataContext';
import { Loader2, Plus, Send, MessageSquare, Star, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const CATEGORIES = ['Account', 'Technical', 'Scorecard', 'Tournament', 'General', 'Bug Report'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-primary/10 text-primary',
  in_progress: 'bg-accent/10 text-accent',
  waiting_for_user: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-muted text-muted-foreground',
};

interface PlayerSupportProps {
  playerId: string;
}

export function PlayerSupport({ playerId }: PlayerSupportProps) {
  const { user } = useAuth();
  const { players } = useData();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [csatRating, setCsatRating] = useState(0);
  const [csatFeedback, setCsatFeedback] = useState('');

  // Create form
  const [newCategory, setNewCategory] = useState('General');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAttachment, setNewAttachment] = useState('');

  const refresh = async () => {
    const [t, m] = await Promise.all([v2api.getTickets(), v2api.getTicketMessages()]);
    setTickets(t.filter(ticket => ticket.created_by_user_id === playerId));
    setMessages(m);
    setLoading(false);
  };

  useEffect(() => { refresh(); const iv = setInterval(refresh, 15000); return () => clearInterval(iv); }, [playerId]);
  useEffect(() => {
    if (!selectedTicket) return;
    const latest = tickets.find((t) => t.ticket_id === selectedTicket.ticket_id);
    if (latest) setSelectedTicket(latest);
  }, [tickets, selectedTicket]);

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
      first_response_due: new Date(now.getTime() + sla.firstResponse * 3600000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      resolution_due: new Date(now.getTime() + sla.resolution * 3600000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      resolved_at: '',
      closed_at: '',
    };
    await v2api.addTicket(ticket);
    logAudit(playerId, 'create_ticket', 'support_ticket', ticket.ticket_id);
    toast({ title: '✅ Ticket created' });
    setShowCreate(false);
    setNewSubject('');
    setNewDescription('');
    setNewAttachment('');
    setSending(false);
    refresh();
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSending(true);
    const msg: SupportMessage = {
      message_id: generateId('SM'),
      ticket_id: selectedTicket.ticket_id,
      sender_id: playerId,
      sender_role: 'player',
      message_body: replyText,
      attachment_url: '',
      is_internal_note: false,
      created_at: istNow(),
    };
    await v2api.addTicketMessage(msg);
    if (selectedTicket.status === 'waiting_for_user') {
      await v2api.updateTicket({ ...selectedTicket, status: 'in_progress' });
    }
    toast({ title: 'Reply sent' });
    setReplyText('');
    setSending(false);
    refresh();
  };

  const handleCSAT = async (ticketId: string) => {
    if (csatRating === 0) return;
    const csat: SupportCSAT = {
      csat_id: generateId('CSAT'),
      ticket_id: ticketId,
      rating: csatRating,
      feedback: csatFeedback,
      submitted_at: istNow(),
    };
    await v2api.addCSAT(csat);
    toast({ title: '⭐ Feedback submitted' });
    setCsatRating(0);
    setCsatFeedback('');
  };

  const getDisplayName = (id: string) => {
    if (id === 'admin') return '🛡️ Support Team';
    return players.find(p => p.player_id === id)?.name || id;
  };

  const ticketMessages = selectedTicket
    ? messages.filter(m => m.ticket_id === selectedTicket.ticket_id && !m.is_internal_note)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : [];

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">🎫 My Support Tickets</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Ticket</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create Support Ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Subject</Label>
                <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Brief summary of your issue" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label>Category</Label>
                  <Select value={newCategory} onValueChange={setNewCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="flex-1">
                  <Label>Priority</Label>
                  <Select value={newPriority} onValueChange={v => setNewPriority(v as any)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Describe your issue in detail..." className="min-h-[100px]" />
              </div>
              <div>
                <Label>Attachment URL (optional)</Label>
                <Input value={newAttachment} onChange={e => setNewAttachment(e.target.value)} placeholder="https://..." />
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={sending || !newSubject.trim() || !newDescription.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Create Ticket
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 && <p className="text-muted-foreground text-center py-8">No support tickets yet. Create one if you need help!</p>}

      {tickets.map(ticket => (
        <Card key={ticket.ticket_id} className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all bg-gradient-to-br from-background to-primary/5" onClick={() => setSelectedTicket(ticket)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm">{ticket.subject}</span>
              <div className="flex gap-2">
                <Badge className={`text-xs ${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace('_', ' ')}</Badge>
                <Badge variant="outline" className="text-xs">{ticket.priority}</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{ticket.category}</span>
              <span>•</span>
              <span>{ticket.created_at}</span>
              <span>•</span>
              <span className="font-mono">{ticket.ticket_id.substring(0, 12)}</span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Ticket Detail */}
      <Dialog open={!!selectedTicket} onOpenChange={open => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto scrollbar-thin">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selectedTicket.subject}</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-3">
                <Badge className={STATUS_COLORS[selectedTicket.status]}>{selectedTicket.status.replace('_', ' ')}</Badge>
                <Badge variant="outline">{selectedTicket.category}</Badge>
                <Badge variant="outline">{selectedTicket.priority}</Badge>
              </div>

              <Card className="mb-4">
                <CardContent className="p-3"><p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p></CardContent>
              </Card>

              {/* Messages */}
              <div className="space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin mb-4">
                {ticketMessages.map(msg => (
                  <div key={msg.message_id} className={`flex ${msg.sender_id === playerId ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.sender_id === playerId ? 'bg-primary/10 border border-primary/20' : 'bg-muted'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{getDisplayName(msg.sender_id)}</span>
                        <span className="text-xs text-muted-foreground">{msg.created_at}</span>
                      </div>
                      <p className="text-sm">{msg.message_body}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              {selectedTicket.status !== 'closed' && (
                <div className="flex gap-2">
                  <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." className="flex-1 min-h-[50px]" />
                  <Button onClick={handleReply} disabled={sending || !replyText.trim()}>
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              )}

              {/* CSAT for closed/resolved tickets */}
              {(selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') && (
                <Card className="mt-4 border-primary/20">
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm mb-2">How was your support experience?</p>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setCsatRating(n)} className="transition-transform active:scale-90">
                          <Star className={`h-6 w-6 ${n <= csatRating ? 'text-accent fill-accent' : 'text-muted-foreground'}`} />
                        </button>
                      ))}
                    </div>
                    <Input value={csatFeedback} onChange={e => setCsatFeedback(e.target.value)} placeholder="Optional feedback..." className="mb-2" />
                    <Button size="sm" onClick={() => handleCSAT(selectedTicket.ticket_id)} disabled={csatRating === 0}>Submit Feedback</Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

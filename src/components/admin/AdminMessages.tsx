import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/lib/DataContext';
import { Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { Send, MessageSquare, CheckCheck, Clock, Search, Users } from 'lucide-react';
import { format } from 'date-fns';
import { v2api } from '@/lib/v2api';
import { useEffect } from 'react';
import { ManagementUser } from '@/lib/v2types';
import { logAudit } from '@/lib/v2api';
import { sendMessageNotificationEmail } from '@/lib/mailer';
import { getAdminNotificationRecipient, sendSystemEmail } from '@/lib/mailer';

export function AdminMessages() {
  const { messages, players, addMessage, updateMessage } = useData();
  const [toId, setToId] = useState<string>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string>('');
  const [replyBody, setReplyBody] = useState('');
  const [expandedThread, setExpandedThread] = useState<string>('');
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [sending, setSending] = useState(false);
  const [replySending, setReplySending] = useState(false);
  const [threadSearch, setThreadSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    v2api.getManagementUsers().then((users) => setManagementUsers(users)).catch(() => setManagementUsers([]));
  }, []);

  // Send email notification to player when admin sends message
  const notifyPlayerByEmail = async (playerId: string, msgSubject: string, msgBody: string) => {
    try {
      const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
      const emailLink = links.find(l => l.user_id === playerId && l.is_verified && l.email);
      if (!emailLink) return;
      const pref = prefs.find(p => p.user_id === playerId);
      if (pref && !pref.announcements) return;
      const playerName = players.find(p => p.player_id === playerId)?.name || 'Player';
      await sendMessageNotificationEmail({
        to: emailLink.email,
        playerName,
        senderName: 'Admin',
        senderDesignation: 'Portal Administrator',
        subject: msgSubject,
        bodyPreview: msgBody,
      });
    } catch (err) {
      console.warn('Failed to send email notification', err);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { toast({ title: 'Error', description: 'Fill subject and body', variant: 'destructive' }); return; }
    setSending(true);
    const msg: Message = {
      id: generateId('MSG'),
      from_id: 'admin',
      to_id: toId,
      subject,
      body,
      date: new Date().toISOString().split('T')[0],
      read: false,
      reply_to: '',
      timestamp: new Date().toISOString(),
    };
    await addMessage(msg);
    logAudit('admin', 'admin_send_message', 'message', msg.id, JSON.stringify({ to: toId, subject, bodyLength: body.length }));

    // Send email notification
    if (toId === 'all') {
      // Notify all players with verified emails
      const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
      for (const link of links.filter(l => l.is_verified && l.email)) {
        const pref = prefs.find(p => p.user_id === link.user_id);
        if (pref && !pref.announcements) continue;
        const playerName = players.find(p => p.player_id === link.user_id)?.name || 'Player';
        sendMessageNotificationEmail({ to: link.email, playerName, senderName: 'Admin', senderDesignation: 'Portal Administrator', subject, bodyPreview: body }).catch(console.warn);
      }
    } else {
      notifyPlayerByEmail(toId, subject, body);
    }

    setSubject('');
    setBody('');
    setSending(false);
    toast({ title: 'Sent', description: `Message sent to ${toId === 'all' ? 'all players' : players.find(p => p.player_id === toId)?.name || toId}` });
  };

  const handleReply = async (parentMsg: Message) => {
    if (!replyBody.trim()) return;
    setReplySending(true);
    const msg: Message = {
      id: generateId('MSG'),
      from_id: 'admin',
      to_id: parentMsg.from_id === 'admin' ? parentMsg.to_id : parentMsg.from_id,
      subject: parentMsg.subject.startsWith('Re:') ? parentMsg.subject : `Re: ${parentMsg.subject}`,
      body: replyBody,
      date: new Date().toISOString().split('T')[0],
      read: false,
      reply_to: parentMsg.id,
      timestamp: new Date().toISOString(),
    };
    await addMessage(msg);
    logAudit('admin', 'admin_reply_message', 'message', msg.id, JSON.stringify({ to: msg.to_id, replyTo: parentMsg.id }));

    // Notify player
    const recipientId = msg.to_id;
    if (recipientId !== 'admin' && recipientId !== 'all') {
      notifyPlayerByEmail(recipientId, msg.subject, replyBody);
    }

    // Notify admin inbox
    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendSystemEmail({ to: adminRecipient, subject: `Admin reply sent: ${msg.subject}`, htmlBody: `<p>You replied to <strong>${recipientId}</strong>: "${replyBody.slice(0, 200)}"</p>` }).catch(console.warn);
    }

    setReplyBody('');
    setReplyTo('');
    setReplySending(false);
    toast({ title: 'Reply Sent' });
  };

  const markAsRead = async (msg: Message) => {
    if (!msg.read) {
      await updateMessage({ ...msg, read: true });
    }
  };

  const threads = useMemo(() => {
    const threadMap = new Map<string, Message[]>();
    const rootMessages = messages.filter(m => !m.reply_to);
    rootMessages.forEach(root => {
      const thread = [root];
      const findReplies = (parentId: string) => {
        const replies = messages.filter(m => m.reply_to === parentId);
        replies.forEach(r => { thread.push(r); findReplies(r.id); });
      };
      findReplies(root.id);
      thread.sort((a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime());
      threadMap.set(root.id, thread);
    });
    return Array.from(threadMap.entries())
      .sort(([, a], [, b]) => {
        const lastA = a[a.length - 1];
        const lastB = b[b.length - 1];
        return new Date(lastB.timestamp || lastB.date).getTime() - new Date(lastA.timestamp || lastA.date).getTime();
      });
  }, [messages]);

  const getDisplayName = (id: string) => {
    if (id === 'admin') return '🛡️ Admin';
    if (id === 'all') return '📢 All Players';
    const mgmt = managementUsers.find((m) => m.management_id === id || m.username === id);
    if (mgmt) return `${mgmt.name} (${mgmt.designation})`;
    return players.find(p => p.player_id === id)?.name || id;
  };

  const visibleThreads = useMemo(() => {
    const query = threadSearch.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(([, thread]) =>
      thread.some((m) =>
        [m.subject, m.body, getDisplayName(m.from_id), getDisplayName(m.to_id)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [threadSearch, threads, managementUsers, players]);

  return (
    <div className="space-y-6">
      {/* Compose Card */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> Send Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>To</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><span className="flex items-center gap-1"><Users className="h-3 w-3" /> All Players</span></SelectItem>
                {players.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name} ({p.player_id})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject..." /></div>
          <div><Label>Body</Label><Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your message..." className="min-h-[100px]" /></div>
          <Button onClick={handleSend} loading={sending} loadingText="Sending message..." disabled={!subject.trim() || !body.trim()}>
            <Send className="h-4 w-4 mr-1" /> Send
          </Button>
        </CardContent>
      </Card>

      {/* Conversations */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display flex items-center gap-2">📬 Conversations</CardTitle>
            <Badge variant="outline">{visibleThreads.length} threads</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={threadSearch}
              onChange={(e) => setThreadSearch(e.target.value)}
              placeholder="Search by subject, sender, recipient, or message text..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
          {visibleThreads.map(([rootId, thread]) => {
            const root = thread[0];
            const unreadCount = thread.filter(m => !m.read && m.from_id !== 'admin').length;
            const isExpanded = expandedThread === rootId;

            return (
              <div key={rootId} className={`border rounded-lg overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
                <div
                  className={`p-3 cursor-pointer hover:bg-muted/50 flex items-center justify-between ${unreadCount > 0 ? 'border-l-4 border-l-accent' : ''}`}
                  onClick={() => {
                    setExpandedThread(isExpanded ? '' : rootId);
                    thread.filter(m => !m.read && m.from_id !== 'admin').forEach(m => markAsRead(m));
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm truncate">{root.subject}</span>
                      {unreadCount > 0 && <Badge className="bg-accent text-accent-foreground text-xs h-5 px-1.5">{unreadCount} new</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {getDisplayName(root.from_id)} → {getDisplayName(root.to_id)} • {thread.length} message{thread.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {format(new Date(thread[thread.length - 1].timestamp || thread[thread.length - 1].date), 'dd MMM HH:mm')}
                  </span>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/10">
                    <div className="max-h-[400px] overflow-y-auto p-3 space-y-3 scrollbar-thin">
                      {thread.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.from_id === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-xl p-3 ${msg.from_id === 'admin' ? 'bg-primary/10 border border-primary/20' : 'bg-card border'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">{getDisplayName(msg.from_id)}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(msg.timestamp || msg.date), 'dd MMM yyyy HH:mm')}</span>
                              {msg.from_id === 'admin' && (
                                msg.read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm leading-relaxed">{msg.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 border-t flex gap-2">
                      <Input
                        placeholder="Type your reply..."
                        value={replyTo === rootId ? replyBody : ''}
                        onChange={e => { setReplyTo(rootId); setReplyBody(e.target.value); }}
                        onFocus={() => setReplyTo(rootId)}
                        className="flex-1"
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(thread[thread.length - 1]); } }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleReply(thread[thread.length - 1])}
                        disabled={!replyBody.trim() || replyTo !== rootId}
                        loading={replySending}
                        loadingText="Sending..."
                      >
                        <Send className="h-3 w-3 mr-1" /> Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {visibleThreads.length === 0 && <p className="text-muted-foreground text-center py-4">No messages found.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

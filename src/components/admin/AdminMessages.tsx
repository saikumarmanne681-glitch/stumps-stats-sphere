import { useEffect, useMemo, useState } from 'react';
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
import { BellRing, CheckCheck, Clock, MessageSquare, Search, Send, Sparkles, Users } from 'lucide-react';
import { format } from 'date-fns';
import { logAudit, v2api } from '@/lib/v2api';
import { ManagementUser } from '@/lib/v2types';
import { getAdminNotificationRecipient, sendAdminCommunicationEmail, sendMessageNotificationEmail, sendSystemEmail } from '@/lib/mailer';

const quickMessageTemplates = [
  {
    subject: 'Today’s reporting reminder',
    body: 'Please report at the ground 30 minutes before the match start. Carry full kit, player ID, and be available for toss confirmation.',
  },
  {
    subject: 'Scorecard review requested',
    body: 'Official score entry has been updated. Please check your match card and raise a support ticket if any batting, bowling, or result detail looks incorrect.',
  },
  {
    subject: 'Tournament operations update',
    body: 'Fixtures, notices, and live-scoring instructions have been refreshed. Keep the dashboard notifications enabled to avoid missing critical updates.',
  },
];

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

  const notifyPlayerByEmail = async (playerId: string, msgSubject: string, msgBody: string) => {
    try {
      const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
      const emailLink = links.find((link) => link.user_id === playerId && link.is_verified && link.email);
      if (!emailLink) return;
      const pref = prefs.find((item) => item.user_id === playerId);
      if (pref && !pref.announcements) return;
      const playerName = players.find((player) => player.player_id === playerId)?.name || 'Player';
      await sendMessageNotificationEmail({
        to: emailLink.email,
        playerName,
        senderName: 'Admin',
        senderDesignation: 'Portal Administrator',
        subject: msgSubject,
        bodyPreview: msgBody,
      });
    } catch (error) {
      console.warn('Failed to send email notification', error);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: 'Error', description: 'Fill subject and body', variant: 'destructive' });
      return;
    }

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
    logAudit('admin', 'admin_send_message', 'message', msg.id, JSON.stringify({
      to: toId,
      subject,
      bodyLength: body.length,
      recipientType: toId === 'all' ? 'broadcast' : 'direct',
    }));

    if (toId === 'all') {
      const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
      for (const link of links.filter((item) => item.is_verified && item.email)) {
        const pref = prefs.find((item) => item.user_id === link.user_id);
        if (pref && !pref.announcements) continue;
        const playerName = players.find((player) => player.player_id === link.user_id)?.name || 'Player';
        sendMessageNotificationEmail({
          to: link.email,
          playerName,
          senderName: 'Admin',
          senderDesignation: 'Portal Administrator',
          subject,
          bodyPreview: body,
        }).catch(console.warn);
      }
    } else {
      await notifyPlayerByEmail(toId, subject, body);
    }

    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendAdminCommunicationEmail({
        to: adminRecipient,
        title: `Admin message sent • ${subject}`,
        summary: 'A player communication was sent from the admin message center.',
        detailLines: [
          `Recipient: ${toId === 'all' ? 'All players' : players.find((player) => player.player_id === toId)?.name || toId}`,
          `Subject: ${subject}`,
          `Body preview: ${body.slice(0, 180)}`,
        ],
      }).catch(console.warn);
    }

    setSubject('');
    setBody('');
    setSending(false);
    toast({ title: 'Sent', description: `Message sent to ${toId === 'all' ? 'all players' : players.find((player) => player.player_id === toId)?.name || toId}` });
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
    logAudit('admin', 'admin_reply_message', 'message', msg.id, JSON.stringify({
      to: msg.to_id,
      replyTo: parentMsg.id,
      subject: msg.subject,
      bodyLength: replyBody.length,
    }));

    const recipientId = msg.to_id;
    if (recipientId !== 'admin' && recipientId !== 'all') {
      await notifyPlayerByEmail(recipientId, msg.subject, replyBody);
    }

    const adminRecipient = getAdminNotificationRecipient();
    if (adminRecipient) {
      sendSystemEmail({
        to: adminRecipient,
        subject: `Admin reply sent: ${msg.subject}`,
        htmlBody: `<p>You replied to <strong>${recipientId}</strong>: "${replyBody.slice(0, 200)}"</p>`,
      }).catch(console.warn);
    }

    setReplyBody('');
    setReplyTo('');
    setReplySending(false);
    toast({ title: 'Reply Sent' });
  };

  const markAsRead = async (msg: Message) => {
    if (!msg.read) await updateMessage({ ...msg, read: true });
  };

  const threads = useMemo(() => {
    const threadMap = new Map<string, Message[]>();
    const rootMessages = messages.filter((message) => !message.reply_to);

    rootMessages.forEach((root) => {
      const thread = [root];
      const findReplies = (parentId: string) => {
        const replies = messages.filter((message) => message.reply_to === parentId);
        replies.forEach((reply) => {
          thread.push(reply);
          findReplies(reply.id);
        });
      };
      findReplies(root.id);
      thread.sort((left, right) => new Date(left.timestamp || left.date).getTime() - new Date(right.timestamp || right.date).getTime());
      threadMap.set(root.id, thread);
    });

    return Array.from(threadMap.entries()).sort(([, left], [, right]) => {
      const leftLast = left[left.length - 1];
      const rightLast = right[right.length - 1];
      return new Date(rightLast.timestamp || rightLast.date).getTime() - new Date(leftLast.timestamp || leftLast.date).getTime();
    });
  }, [messages]);

  const getDisplayName = (id: string) => {
    if (id === 'admin') return '🛡️ Admin';
    if (id === 'all') return '📢 All Players';
    const managementUser = managementUsers.find((item) => item.management_id === id || item.username === id);
    if (managementUser) return `${managementUser.name} (${managementUser.designation})`;
    return players.find((player) => player.player_id === id)?.name || id;
  };

  const visibleThreads = useMemo(() => {
    const query = threadSearch.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(([, thread]) =>
      thread.some((message) =>
        [message.subject, message.body, getDisplayName(message.from_id), getDisplayName(message.to_id)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [threadSearch, threads, managementUsers, players]);

  const totalUnread = useMemo(() => threads.flatMap(([, thread]) => thread).filter((message) => !message.read && message.from_id !== 'admin').length, [threads]);
  const broadcasts = messages.filter((message) => message.to_id === 'all' && message.from_id === 'admin').length;

  return (
    <div className="space-y-6">
      <section className="admin-section-shell soft-dot-grid overflow-hidden p-6">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              <BellRing className="h-3.5 w-3.5" /> Communication cockpit
            </div>
            <div>
              <h2 className="section-heading">Send notices faster. Keep conversations beautifully organized.</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Use polished templates, target one player or everyone, and keep every thread neatly searchable so the admin team can move fast without losing context.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="metric-tile">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active inbox threads</p>
                <p className="mt-2 text-3xl font-bold text-primary">{visibleThreads.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">Searchable across player and admin conversations.</p>
              </div>
              <div className="metric-tile">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unread from players</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{totalUnread}</p>
                <p className="mt-1 text-sm text-muted-foreground">Prioritize responses with unread badges.</p>
              </div>
              <div className="metric-tile">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Broadcast notices sent</p>
                <p className="mt-2 text-3xl font-bold text-foreground">{broadcasts}</p>
                <p className="mt-1 text-sm text-muted-foreground">Useful for tournament-wide updates and reminders.</p>
              </div>
            </div>
          </div>

          <Card className="glass-panel rounded-[1.75rem] border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-xl"><Send className="h-5 w-5 text-primary" /> Send message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>To</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all"><span className="flex items-center gap-1"><Users className="h-3 w-3" /> All Players</span></SelectItem>
                    {players.map((player) => (
                      <SelectItem key={player.player_id} value={player.player_id}>{player.name} ({player.player_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Message subject..." className="rounded-xl" />
              </div>
              <div>
                <Label>Body</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." className="min-h-[120px] rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Quick templates</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {quickMessageTemplates.map((template) => (
                    <button
                      type="button"
                      key={template.subject}
                      className="rounded-2xl border border-primary/10 bg-muted/40 p-3 text-left transition hover:border-primary/25 hover:bg-primary/5"
                      onClick={() => {
                        setSubject(template.subject);
                        setBody(template.body);
                      }}
                    >
                      <p className="text-sm font-semibold">{template.subject}</p>
                      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{template.body}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleSend} loading={sending} loadingText="Sending message..." disabled={!subject.trim() || !body.trim()} className="w-full rounded-xl">
                <Send className="mr-1 h-4 w-4" /> Send
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="admin-section-shell overflow-hidden">
        <CardHeader className="space-y-3 border-b border-primary/10 bg-gradient-to-r from-background to-primary/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 font-display text-xl">📬 Conversations</CardTitle>
              <p className="text-sm text-muted-foreground">Every thread stays grouped, searchable, and ready for a quick reply.</p>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">{visibleThreads.length} threads</Badge>
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={threadSearch} onChange={(e) => setThreadSearch(e.target.value)} placeholder="Search by subject, sender, recipient, or message text..." className="rounded-full pl-9" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 md:max-h-[680px] md:overflow-y-auto md:p-6 scrollbar-thin">
          {visibleThreads.map(([rootId, thread]) => {
            const root = thread[0];
            const unreadCount = thread.filter((message) => !message.read && message.from_id !== 'admin').length;
            const isExpanded = expandedThread === rootId;
            const lastMessage = thread[thread.length - 1];

            return (
              <div key={rootId} className={`overflow-hidden rounded-[1.5rem] border transition-all ${isExpanded ? 'border-primary/30 shadow-lg shadow-primary/10' : 'border-primary/10 shadow-sm'}`}>
                <div
                  className={`cursor-pointer p-4 transition ${unreadCount > 0 ? 'bg-accent/5' : 'bg-background'} hover:bg-primary/5`}
                  onClick={() => {
                    setExpandedThread(isExpanded ? '' : rootId);
                    thread.filter((message) => !message.read && message.from_id !== 'admin').forEach((message) => markAsRead(message));
                  }}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate font-semibold text-sm md:text-base">{root.subject}</span>
                        {unreadCount > 0 && <Badge className="h-6 rounded-full bg-accent text-accent-foreground">{unreadCount} new</Badge>}
                        {root.to_id === 'all' && <Badge variant="outline" className="rounded-full">Broadcast</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground md:text-sm">
                        {getDisplayName(root.from_id)} → {getDisplayName(root.to_id)} • {thread.length} message{thread.length > 1 ? 's' : ''}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{lastMessage.body}</p>
                    </div>
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <Badge variant="outline" className="rounded-full">{format(new Date(lastMessage.timestamp || lastMessage.date), 'dd MMM HH:mm')}</Badge>
                      <span className="text-xs text-muted-foreground">Thread ID {rootId}</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-primary/10 bg-muted/20">
                    <div className="max-h-[420px] space-y-4 overflow-y-auto p-4 scrollbar-thin">
                      {thread.map((message) => (
                        <div key={message.id} className={`flex ${message.from_id === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[88%] rounded-[1.25rem] border px-4 py-3 shadow-sm ${message.from_id === 'admin' ? 'border-primary/20 bg-primary/10' : 'border-border bg-card'}`}>
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-foreground">{getDisplayName(message.from_id)}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(message.timestamp || message.date), 'dd MMM yyyy HH:mm')}</span>
                              {message.from_id === 'admin' && (message.read ? <CheckCheck className="h-3.5 w-3.5 text-primary" /> : <Clock className="h-3.5 w-3.5 text-muted-foreground" />)}
                            </div>
                            <p className="text-sm leading-6">{message.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-primary/10 p-4">
                      <div className="rounded-[1.25rem] border border-primary/10 bg-background p-3 shadow-sm">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                          <Sparkles className="h-4 w-4 text-accent" /> Quick reply
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="Type your reply..."
                            value={replyTo === rootId ? replyBody : ''}
                            onChange={(e) => { setReplyTo(rootId); setReplyBody(e.target.value); }}
                            onFocus={() => setReplyTo(rootId)}
                            className="flex-1 rounded-xl"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleReply(lastMessage);
                              }
                            }}
                          />
                          <Button size="sm" onClick={() => handleReply(lastMessage)} disabled={!replyBody.trim() || replyTo !== rootId} loading={replySending} loadingText="Sending..." className="rounded-xl px-5">
                            <Send className="mr-1 h-3.5 w-3.5" /> Reply
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleThreads.length === 0 && (
            <div className="rounded-[1.5rem] border border-dashed border-primary/20 bg-muted/30 p-10 text-center text-sm text-muted-foreground">
              No messages found for the current search.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

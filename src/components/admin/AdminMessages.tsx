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
import { Send, MessageSquare, CheckCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { v2api } from '@/lib/v2api';
import { useEffect } from 'react';
import { ManagementUser } from '@/lib/v2types';

export function AdminMessages() {
  const { messages, players, addMessage, updateMessage } = useData();
  const [toId, setToId] = useState<string>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string>('');
  const [replyBody, setReplyBody] = useState('');
  const [expandedThread, setExpandedThread] = useState<string>('');
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    v2api.getManagementUsers().then((users) => setManagementUsers(users)).catch(() => setManagementUsers([]));
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { toast({ title: 'Error', description: 'Fill subject and body', variant: 'destructive' }); return; }
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
    setSubject('');
    setBody('');
    toast({ title: 'Sent', description: `Message sent to ${toId === 'all' ? 'all players' : players.find(p => p.player_id === toId)?.name || toId}` });
  };

  const handleReply = async (parentMsg: Message) => {
    if (!replyBody.trim()) return;
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
    setReplyBody('');
    setReplyTo('');
    toast({ title: 'Reply Sent' });
  };

  const markAsRead = async (msg: Message) => {
    if (!msg.read) {
      await updateMessage({ ...msg, read: true });
    }
  };

  // Group messages into threads
  const threads = useMemo(() => {
    const threadMap = new Map<string, Message[]>();
    const rootMessages = messages.filter(m => !m.reply_to);
    
    rootMessages.forEach(root => {
      const thread = [root];
      const findReplies = (parentId: string) => {
        const replies = messages.filter(m => m.reply_to === parentId);
        replies.forEach(r => {
          thread.push(r);
          findReplies(r.id);
        });
      };
      findReplies(root.id);
      thread.sort((a, b) => new Date(a.timestamp || a.date).getTime() - new Date(b.timestamp || b.date).getTime());
      threadMap.set(root.id, thread);
    });

    // Sort threads by latest message
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="font-display">✉️ Send Message</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>To</Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {players.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name} ({p.player_id})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea value={body} onChange={e => setBody(e.target.value)} /></div>
          <Button onClick={handleSend}><Send className="h-4 w-4 mr-1" /> Send</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">📬 Conversations ({threads.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin">
          {threads.map(([rootId, thread]) => {
            const root = thread[0];
            const unreadCount = thread.filter(m => !m.read && m.from_id !== 'admin').length;
            const isExpanded = expandedThread === rootId;

            return (
              <div key={rootId} className="border rounded-lg overflow-hidden">
                {/* Thread header */}
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

                {/* Expanded thread */}
                {isExpanded && (
                  <div className="border-t bg-muted/20">
                    <div className="max-h-[400px] overflow-y-auto p-3 space-y-3 scrollbar-thin">
                      {thread.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.from_id === 'admin' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] rounded-lg p-3 ${msg.from_id === 'admin' ? 'bg-primary/10 border border-primary/20' : 'bg-card border'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold">{getDisplayName(msg.from_id)}</span>
                              <span className="text-xs text-muted-foreground">{format(new Date(msg.timestamp || msg.date), 'dd MMM yyyy HH:mm')}</span>
                              {msg.from_id === 'admin' && (
                                msg.read ? <CheckCheck className="h-3 w-3 text-primary" /> : <Clock className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm">{msg.body}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-mono">{msg.id}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply input */}
                    <div className="p-3 border-t flex gap-2">
                      <Input
                        placeholder="Type your reply..."
                        value={replyTo === rootId ? replyBody : ''}
                        onChange={e => { setReplyTo(rootId); setReplyBody(e.target.value); }}
                        onFocus={() => setReplyTo(rootId)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={() => handleReply(thread[thread.length - 1])} disabled={!replyBody.trim() || replyTo !== rootId}>
                        <Send className="h-3 w-3 mr-1" /> Reply
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {threads.length === 0 && <p className="text-muted-foreground text-center py-4">No messages yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

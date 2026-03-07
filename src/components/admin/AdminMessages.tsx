import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockPlayers, mockMessages } from '@/lib/mockData';
import { Message } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';
import { format } from 'date-fns';

export function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [toId, setToId] = useState<string>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const { toast } = useToast();

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) { toast({ title: 'Error', description: 'Fill subject and body', variant: 'destructive' }); return; }
    const msg: Message = {
      id: `MSG${String(messages.length + 1).padStart(3, '0')}`,
      from_id: 'admin',
      to_id: toId,
      subject,
      body,
      date: new Date().toISOString().split('T')[0],
      read: false,
      reply_to: '',
    };
    setMessages(prev => [msg, ...prev]);
    setSubject('');
    setBody('');
    toast({ title: 'Sent', description: `Message sent to ${toId === 'all' ? 'all players' : toId}` });
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
                {mockPlayers.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name} ({p.player_id})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div><Label>Body</Label><Textarea value={body} onChange={e => setBody(e.target.value)} /></div>
          <Button onClick={handleSend}><Send className="h-4 w-4 mr-1" /> Send</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-display">📬 Message History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {messages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(msg => (
            <div key={msg.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium">
                  {msg.from_id === 'admin' ? '→' : '←'} {msg.from_id === 'admin' ? `To: ${msg.to_id === 'all' ? 'All Players' : mockPlayers.find(p => p.player_id === msg.to_id)?.name || msg.to_id}` : `From: ${mockPlayers.find(p => p.player_id === msg.from_id)?.name || msg.from_id}`}
                </span>
                <span className="text-xs text-muted-foreground">{format(new Date(msg.date), 'dd MMM yyyy')}</span>
              </div>
              <p className="font-semibold text-sm">{msg.subject}</p>
              <p className="text-sm text-muted-foreground">{msg.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

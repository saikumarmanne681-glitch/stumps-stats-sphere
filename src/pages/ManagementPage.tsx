import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Shield, ShieldCheck, Clock, CheckCircle2, ChevronDown, ChevronUp, Send, Loader2, MessageSquare } from 'lucide-react';
import { v2api, logAudit, istNow } from '@/lib/v2api';
import { ManagementUser, DigitalScorelist, CertificationApproval } from '@/lib/v2types';
import { useToast } from '@/hooks/use-toast';
import { Navigate, Link } from 'react-router-dom';
import { useData } from '@/lib/DataContext';
import { generateId } from '@/lib/utils';

const designationToStage: Record<string, string> = {
  'Scoring Official': 'scoring_completed',
  'Match Referee': 'referee_verified',
  'Tournament Director': 'director_approved',
  President: 'official_certified',
  'Vice President': 'official_certified',
};

const stageOrder = ['draft', 'scoring_completed', 'referee_verified', 'director_approved', 'official_certified'];
const stageLabels: Record<string, string> = {
  draft: 'Draft', scoring_completed: 'Scoring Completed', referee_verified: 'Referee Verified',
  director_approved: 'Director Approved', official_certified: 'Official Certified',
};

const ManagementPage = () => {
  const { user, isManagement, isAdmin } = useAuth();
  const { players, messages, addMessage } = useData();
  const { toast } = useToast();
  const [mgmtUsers, setMgmtUsers] = useState<ManagementUser[]>([]);
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScorelist, setExpandedScorelist] = useState<string | null>(null);

  // Messaging
  const [showCompose, setShowCompose] = useState(false);
  const [msgTo, setMsgTo] = useState('all');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    const [users, scorelistData] = await Promise.all([v2api.getManagementUsers(), v2api.getScorelists()]);
    setMgmtUsers(users.filter(m => String(m.status || '').trim().toLowerCase() !== 'inactive'));
    setScorelists(scorelistData);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const leadership = mgmtUsers.filter(m => ['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));
  const committee = mgmtUsers.filter(m => !['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));

  // Pending: show only scorelists where this user's stage is next
  const pendingScorelists = scorelists.filter(s => {
    if (s.locked) return false;
    if (!isManagement || !user?.management_id) return false;
    const certs: CertificationApproval[] = s.certifications_json ? JSON.parse(s.certifications_json) : [];
    // Check if user already signed
    if (certs.some(c => c.approver_id === user.management_id)) return false;
    // Check if this user's designation stage is the next required
    const userStage = designationToStage[user.designation || ''];
    if (!userStage) return false;
    if (userStage === 'official_certified' && certs.some(c => c.stage === 'official_certified')) return false;
    const currentIdx = stageOrder.indexOf(s.certification_status || 'draft');
    const nextStage = currentIdx < stageOrder.length - 1 ? stageOrder[currentIdx + 1] : null;
    return nextStage === userStage;
  });

  const signScorelist = async (scorelist: DigitalScorelist) => {
    if (!isManagement || !user?.management_id) return;
    const certs: CertificationApproval[] = scorelist.certifications_json ? JSON.parse(scorelist.certifications_json) : [];
    if (certs.some(c => c.approver_id === user.management_id)) {
      toast({ title: 'Already signed' }); return;
    }
    const stage = designationToStage[user.designation || ''] || 'referee_verified';
    certs.push({
      approver_id: user.management_id,
      approver_name: user.name || 'Management User',
      designation: user.designation || 'Management',
      timestamp: new Date().toISOString(),
      token: `MGT_CERT_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      stage,
    });
    await v2api.updateScorelist({
      ...scorelist,
      certification_status: stage,
      certifications_json: JSON.stringify(certs),
      locked: stage === 'official_certified',
    });
    logAudit(user.management_id, 'management_sign_scorelist', 'scorelist', scorelist.scorelist_id, stage);
    toast({ title: '✅ Scorelist signed', description: `Signed as ${user.designation}` });
    refresh();
  };

  const getCerts = (sl: DigitalScorelist): CertificationApproval[] => {
    try { return sl.certifications_json ? JSON.parse(sl.certifications_json) : []; } catch { return []; }
  };

  const handleSendMessage = async () => {
    if (!msgSubject.trim() || !msgBody.trim() || !user) return;
    setSending(true);
    const msg = {
      id: generateId('MSG'),
      from_id: user.management_id || user.username,
      to_id: msgTo,
      subject: msgSubject,
      body: `[${user.designation || 'Management'}] ${msgBody}`,
      date: new Date().toISOString().split('T')[0],
      read: false,
      reply_to: '',
      timestamp: new Date().toISOString(),
    };
    await addMessage(msg);
    logAudit(user.management_id || user.username, 'send_management_notice', 'message', msg.id, msgTo);
    toast({ title: '✅ Notice sent', description: `To: ${msgTo === 'all' ? 'All Members' : players.find(p => p.player_id === msgTo)?.name || msgTo}` });
    setShowCompose(false);
    setMsgSubject('');
    setMsgBody('');
    setSending(false);
  };

  // Received messages for management user
  const myMessages = messages.filter(m => {
    if (!user) return false;
    const userId = user.management_id || user.username;
    return m.to_id === userId || m.from_id === userId || m.to_id === 'all';
  }).sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());

  if (!user) return <Navigate to="/login" />;

  if (loading) return (
    <div className="min-h-screen bg-background"><Navbar /><div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary/10 mb-2">
            <Shield className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">Management Board</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">Club Leadership & Tournament Committee</p>
        </div>

        {isManagement && (
          <Tabs defaultValue="pending">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="pending" className="text-xs md:text-sm">Pending Signatures</TabsTrigger>
              <TabsTrigger value="all" className="text-xs md:text-sm">All Scorelists</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs md:text-sm">Messages</TabsTrigger>
              <TabsTrigger value="compose" className="text-xs md:text-sm">Send Notice</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingScorelists.length === 0 && (
                <Card><CardContent className="p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All scorelists signed! Nothing pending.</p>
                </CardContent></Card>
              )}
              {pendingScorelists.map(s => {
                const certs = getCerts(s);
                const payload = (() => { try { return JSON.parse(s.payload_json); } catch { return null; } })();
                const match = payload?.match;
                const isExpanded = expandedScorelist === s.scorelist_id;
                return (
                  <Card key={s.scorelist_id} className="border-l-4 border-l-accent">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground">{s.scorelist_id}</p>
                          {match && <p className="font-display font-bold text-sm">{match.team_a} {match.team_a_score || ''} vs {match.team_b} {match.team_b_score || ''}</p>}
                          <Badge className="bg-accent/20 text-accent-foreground text-xs mt-1">{stageLabels[s.certification_status || 'draft']}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => signScorelist(s)} className="gap-1">
                            <ShieldCheck className="h-4 w-4" /> Sign
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/admin/scorelists">View Details</Link>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setExpandedScorelist(isExpanded ? null : s.scorelist_id)}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t pt-3 space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certification Timeline</p>
                          {stageOrder.map(stage => {
                            const cert = stage === 'draft'
                              ? { approver_name: s.generated_by || 'System', designation: 'Scorelist Engine', timestamp: s.generated_at || '', token: 'DRAFT', stage: 'draft' }
                              : certs.find(c => c.stage === stage);
                            return (
                              <div key={stage} className={`flex items-center gap-3 p-2 rounded text-sm ${cert ? 'bg-primary/5' : 'opacity-50'}`}>
                                {cert ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium capitalize text-xs">{stageLabels[stage]}</p>
                                  {cert && <p className="text-xs text-muted-foreground truncate">{cert.approver_name} ({cert.designation}) • {new Date(cert.timestamp).toLocaleString()}</p>}
                                </div>
                                {cert && <Badge variant="outline" className="text-[10px] font-mono shrink-0">{cert.token.substring(0, 10)}</Badge>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                {scorelists.map(s => {
                  const certs = getCerts(s);
                  return (
                    <Card key={s.scorelist_id}>
                      <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono text-xs">{s.scorelist_id}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {certs.map((c, i) => <Badge key={i} variant="outline" className="text-[10px]">{c.approver_name}</Badge>)}
                          </div>
                        </div>
                        <Badge className={s.locked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                          {s.locked ? '🔒 Certified' : stageLabels[s.certification_status || 'draft']}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="messages" className="mt-4 space-y-3">
              <h3 className="font-display text-lg font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Messages</h3>
              {myMessages.length === 0 && <p className="text-muted-foreground text-center py-6">No messages yet.</p>}
              {myMessages.slice(0, 20).map(msg => {
                const isFromMe = msg.from_id === (user.management_id || user.username);
                const senderName = isFromMe ? `You (${user.designation || 'Management'})` : 
                  msg.from_id === 'admin' ? '🛡️ Admin' : 
                  players.find(p => p.player_id === msg.from_id)?.name || msg.from_id;
                return (
                  <Card key={msg.id} className={isFromMe ? 'border-l-4 border-l-primary' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{msg.subject}</span>
                        <span className="text-xs text-muted-foreground">{msg.timestamp || msg.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{senderName} → {msg.to_id === 'all' ? '📢 All' : players.find(p => p.player_id === msg.to_id)?.name || msg.to_id}</p>
                      <p className="text-sm">{msg.body}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="compose" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="font-display text-sm">📨 Send Official Notice</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Sent as: <strong>{user.name}</strong> – <Badge variant="outline" className="text-xs">{user.designation}</Badge>
                  </p>
                  <div>
                    <Label>To</Label>
                    <Select value={msgTo} onValueChange={setMsgTo}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">📢 All Members</SelectItem>
                        {players.map(p => <SelectItem key={p.player_id} value={p.player_id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Subject</Label><Input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Notice subject..." /></div>
                  <div><Label>Message</Label><Textarea value={msgBody} onChange={e => setMsgBody(e.target.value)} placeholder="Write your message..." className="min-h-[80px]" /></div>
                  <Button onClick={handleSendMessage} disabled={sending || !msgSubject.trim() || !msgBody.trim()} className="gap-1">
                    {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send Notice
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Leadership */}
        {leadership.length > 0 && (
          <section>
            <h2 className="font-display text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" /> Club Leadership
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leadership.map(m => (
                <Card key={m.management_id} className="border-l-4 border-l-primary hover:shadow-lg transition-all group overflow-hidden">
                  <CardContent className="p-4 md:p-6 flex items-center gap-4">
                    <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                      {m.signature_image ? (
                        <img src={m.signature_image} alt={m.name} className="h-12 w-12 md:h-16 md:w-16 rounded-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display text-base md:text-lg font-bold truncate">{m.name}</h3>
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">{m.designation}</Badge>
                      {m.email && <p className="text-xs text-muted-foreground mt-1 truncate">{m.email}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Committee */}
        {committee.length > 0 && (
          <section>
            <h2 className="font-display text-xl md:text-2xl font-bold mb-4">⚙️ Tournament Committee</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {committee.map(m => (
                <Card key={m.management_id} className="hover:shadow-lg transition-all group">
                  <CardContent className="p-4 md:p-6 flex items-center gap-4">
                    <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      {m.signature_image ? (
                        <img src={m.signature_image} alt={m.name} className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 md:h-7 md:w-7 text-accent" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold truncate">{m.name}</h3>
                      <Badge variant="outline" className="text-xs">{m.designation}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{m.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {mgmtUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No management users configured yet.</p>}
      </div>
    </div>
  );
};

export default ManagementPage;

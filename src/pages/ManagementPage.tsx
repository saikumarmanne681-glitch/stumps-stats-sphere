import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Shield, ShieldCheck, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { v2api, logAudit } from '@/lib/v2api';
import { ManagementUser, DigitalScorelist, CertificationApproval, CERTIFICATION_STAGES } from '@/lib/v2types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { useData } from '@/lib/DataContext';

const designationToStage: Record<string, string> = {
  'Scoring Official': 'scoring_completed',
  'Match Referee': 'referee_verified',
  'Tournament Director': 'director_approved',
  President: 'official_certified',
  'Vice President': 'official_certified',
};

const stageOrder = ['draft', 'scoring_completed', 'referee_verified', 'director_approved', 'official_certified'];

const ManagementPage = () => {
  const { user, isManagement, isAdmin } = useAuth();
  const { players } = useData();
  const { toast } = useToast();
  const [mgmtUsers, setMgmtUsers] = useState<ManagementUser[]>([]);
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScorelist, setExpandedScorelist] = useState<string | null>(null);

  const refresh = async () => {
    const [users, scorelistData] = await Promise.all([v2api.getManagementUsers(), v2api.getScorelists()]);
    setMgmtUsers(users.filter(m => String(m.status || '').trim().toLowerCase() !== 'inactive'));
    setScorelists(scorelistData);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const leadership = mgmtUsers.filter(m => ['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));
  const committee = mgmtUsers.filter(m => !['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));

  // Fix: Only show scorelists where THIS user hasn't signed yet AND it's not locked
  const pendingScorelists = scorelists.filter(s => {
    if (s.locked) return false;
    if (!isManagement || !user?.management_id) return false;
    const certs: CertificationApproval[] = s.certifications_json ? JSON.parse(s.certifications_json) : [];
    return !certs.some(c => c.approver_id === user.management_id);
  });

  const signScorelist = async (scorelist: DigitalScorelist) => {
    if (!isManagement || !user?.management_id) return;
    const certs: CertificationApproval[] = scorelist.certifications_json ? JSON.parse(scorelist.certifications_json) : [];

    if (certs.some(c => c.approver_id === user.management_id)) {
      toast({ title: 'Already signed', description: 'You already signed this scorelist.' });
      return;
    }

    const stage = designationToStage[user.designation || ''] || 'referee_verified';
    const nextStatus = stage === 'official_certified' ? 'official_certified' : stage;

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
      certification_status: nextStatus,
      certifications_json: JSON.stringify(certs),
      locked: stage === 'official_certified' ? true : scorelist.locked,
    });

    logAudit(user.management_id, 'management_sign_scorelist', 'scorelist', scorelist.scorelist_id, stage);
    toast({ title: 'Scorelist signed', description: `Signed as ${user.designation || 'Management'}` });
    refresh();
  };

  const getCerts = (sl: DigitalScorelist): CertificationApproval[] => {
    try { return sl.certifications_json ? JSON.parse(sl.certifications_json) : []; } catch { return []; }
  };

  if (!user) return <Navigate to="/login" />;

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-4xl font-bold">Management Board</h1>
          <p className="text-muted-foreground max-w-md mx-auto">Club Leadership & Tournament Committee</p>
        </div>

        {/* Pending Scorelists for Management Users */}
        {isManagement && (
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Pending Scorelists for Your Signature
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingScorelists.length === 0 && (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">All scorelists signed! Nothing pending.</p>
                </div>
              )}
              {pendingScorelists.map(s => {
                const certs = getCerts(s);
                const isExpanded = expandedScorelist === s.scorelist_id;
                return (
                  <div key={s.scorelist_id} className="border rounded-lg p-4 bg-card space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-mono text-xs text-muted-foreground">{s.scorelist_id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{s.scope_type}</Badge>
                          <Badge className="bg-accent/20 text-accent-foreground text-xs">{s.certification_status || 'draft'}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => signScorelist(s)} className="gap-1">
                          <ShieldCheck className="h-4 w-4" /> Sign
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setExpandedScorelist(isExpanded ? null : s.scorelist_id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Certification Timeline */}
                    {isExpanded && (
                      <div className="border-t pt-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certification Timeline</p>
                        {stageOrder.map((stage, i) => {
                          const cert = certs.find(c => c.stage === stage);
                          const isPast = cert !== undefined;
                          const isCurrent = s.certification_status === stage;
                          return (
                            <div key={stage} className={`flex items-center gap-3 p-2 rounded text-sm ${isPast ? 'bg-primary/5' : isCurrent ? 'bg-accent/10' : 'opacity-50'}`}>
                              {isPast ? (
                                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                              )}
                              <div className="flex-1">
                                <p className="font-medium capitalize">{stage.replace(/_/g, ' ')}</p>
                                {cert && (
                                  <p className="text-xs text-muted-foreground">
                                    {cert.approver_name} ({cert.designation}) • {new Date(cert.timestamp).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              {isPast && <Badge variant="outline" className="text-xs font-mono">{cert!.token.substring(0, 10)}</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* All scorelists status (for management to see full picture) */}
        {isManagement && scorelists.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-sm">All Scorelists Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {scorelists.map(s => {
                  const certs = getCerts(s);
                  return (
                    <div key={s.scorelist_id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <span className="font-mono text-xs">{s.scorelist_id}</span>
                        <div className="flex gap-1 mt-1">
                          {certs.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{c.approver_name}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={s.locked ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}>
                          {s.locked ? '🔒 Certified' : s.certification_status || 'draft'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leadership */}
        {leadership.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" /> Club Leadership
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leadership.map(m => (
                <Card key={m.management_id} className="border-l-4 border-l-primary hover:shadow-lg transition-all group overflow-hidden">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {m.signature_image ? (
                        <img src={m.signature_image} alt={m.name} className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold">{m.name}</h3>
                      <Badge className="bg-primary/10 text-primary border-primary/20">{m.designation}</Badge>
                      {m.email && <p className="text-xs text-muted-foreground mt-1">{m.email}</p>}
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
            <h2 className="font-display text-2xl font-bold mb-4">⚙️ Tournament Committee</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {committee.map(m => (
                <Card key={m.management_id} className="hover:shadow-lg transition-all group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-accent/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {m.signature_image ? (
                        <img src={m.signature_image} alt={m.name} className="h-14 w-14 rounded-full object-cover" />
                      ) : (
                        <User className="h-7 w-7 text-accent" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold">{m.name}</h3>
                      <Badge variant="outline">{m.designation}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{m.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {mgmtUsers.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No management users configured yet.</p>
        )}
      </div>
    </div>
  );
};

export default ManagementPage;

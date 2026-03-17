import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Shield, ShieldCheck } from 'lucide-react';
import { v2api, logAudit } from '@/lib/v2api';
import { ManagementUser, DigitalScorelist, CertificationApproval } from '@/lib/v2types';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const designationToStage: Record<string, string> = {
  'Scoring Official': 'scoring_completed',
  'Match Referee': 'referee_verified',
  'Tournament Director': 'director_approved',
  President: 'official_certified',
  'Vice President': 'official_certified',
};

const ManagementPage = () => {
  const { user, isManagement } = useAuth();
  const { toast } = useToast();
  const [mgmtUsers, setMgmtUsers] = useState<ManagementUser[]>([]);
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [users, scorelistData] = await Promise.all([v2api.getManagementUsers(), v2api.getScorelists()]);
    setMgmtUsers(users.filter(m => m.status === 'active'));
    setScorelists(scorelistData);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const leadership = mgmtUsers.filter(m => ['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));
  const committee = mgmtUsers.filter(m => !['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));

  const pendingScorelists = scorelists.filter(s => !s.locked);

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
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-2" />
          <h1 className="font-display text-4xl font-bold">Management Board</h1>
          <p className="text-muted-foreground">Club Leadership & Tournament Committee</p>
        </div>

        {isManagement && (
          <Card className="border-primary/40">
            <CardHeader>
              <CardTitle className="font-display">Pending Scorelists for Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingScorelists.map(s => (
                <div key={s.scorelist_id} className="flex items-center justify-between border rounded-lg p-3">
                  <div>
                    <p className="font-mono text-xs">{s.scorelist_id}</p>
                    <p className="text-sm text-muted-foreground">{s.scope_type} • {s.certification_status || 'draft'}</p>
                  </div>
                  <Button size="sm" onClick={() => signScorelist(s)} className="gap-1">
                    <ShieldCheck className="h-4 w-4" /> Sign
                  </Button>
                </div>
              ))}
              {pendingScorelists.length === 0 && <p className="text-sm text-muted-foreground">No pending scorelists.</p>}
            </CardContent>
          </Card>
        )}


        {leadership.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">🏛️ Club Leadership</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leadership.map(m => (
                <Card key={m.management_id} className="border-l-4 border-l-accent hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      {m.signature_image ? (
                        <img src={m.signature_image} alt={m.name} className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <User className="h-8 w-8 text-accent" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold">{m.name}</h3>
                      <Badge className="bg-accent text-accent-foreground">{m.designation}</Badge>
                      {m.email && <p className="text-xs text-muted-foreground mt-1">{m.email}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {committee.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold mb-4">⚙️ Tournament Committee</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {committee.map(m => (
                <Card key={m.management_id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {m.signature_image ? (
                        <img src={m.signature_image} alt={m.name} className="h-14 w-14 rounded-full object-cover" />
                      ) : (
                        <User className="h-7 w-7 text-primary" />
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

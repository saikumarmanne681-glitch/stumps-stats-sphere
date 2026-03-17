import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Shield } from 'lucide-react';
import { v2api } from '@/lib/v2api';
import { ManagementUser } from '@/lib/v2types';
import { Loader2 } from 'lucide-react';

const ManagementPage = () => {
  const { user } = useAuth();
  const [mgmtUsers, setMgmtUsers] = useState<ManagementUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    v2api.getManagementUsers().then(data => { setMgmtUsers(data.filter(m => m.status === 'active')); setLoading(false); });
  }, []);

  // Only accessible to logged-in users
  if (!user) return <Navigate to="/login" />;

  const leadership = mgmtUsers.filter(m => ['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));
  const committee = mgmtUsers.filter(m => !['President', 'Vice President', 'Secretary', 'Treasurer'].includes(m.designation));

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

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, User, Users } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (type: 'admin' | 'player' | 'management') => {
    if (!username.trim() || !password.trim()) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const success = await login(username, password, type);
    setLoading(false);
    if (success) {
      toast({ title: 'Welcome!', description: `Logged in as ${username}` });
      navigate(type === 'admin' ? '/admin' : type === 'management' ? '/management' : '/player');
    } else {
      toast({ title: 'Login Failed', description: 'Invalid credentials', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 text-4xl">🏏</div>
            <CardTitle className="font-display text-2xl">Login to Cricket Club</CardTitle>
            <CardDescription>Choose your role and sign in</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="admin" className="flex items-center gap-1">
                  <Shield className="h-4 w-4" /> Admin
                </TabsTrigger>
                <TabsTrigger value="player" className="flex items-center gap-1">
                  <User className="h-4 w-4" /> Player
                </TabsTrigger>
                <TabsTrigger value="management" className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> Management
                </TabsTrigger>
              </TabsList>

              <TabsContent value="admin" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input placeholder="admin" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="••••" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">Admin credentials are read from the <span className="font-semibold">ADMIN_CREDENTIALS</span> sheet (columns: admin_id, username, password, name, status).</p>
                <Button className="w-full" onClick={() => handleLogin('admin')} disabled={loading}>
                  {loading ? 'Logging in...' : 'Login as Admin'}
                </Button>
              </TabsContent>

              <TabsContent value="player" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input placeholder="your username" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="••••" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => handleLogin('player')} disabled={loading}>
                  {loading ? 'Logging in...' : 'Login as Player'}
                </Button>
              </TabsContent>

              <TabsContent value="management" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input placeholder="management username" value={username} onChange={e => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" placeholder="••••" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={() => handleLogin('management')} disabled={loading}>
                  {loading ? 'Logging in...' : 'Login as Management'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

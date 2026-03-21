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

  const LoginForm = ({ type, icon: Icon, label }: { type: 'admin' | 'player' | 'management'; icon: typeof Shield; label: string }) => (
    <div className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Username</Label>
        <Input placeholder={`Enter your ${type} username`} value={username} onChange={e => setUsername(e.target.value)} className="bg-card/80" />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Password</Label>
        <Input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="bg-card/80" />
      </div>
      <Button className="w-full" onClick={() => handleLogin(type)} loading={loading} loadingText="Signing in...">
        <Icon className="h-4 w-4" /> Login as {label}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center py-16 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl shadow-md">🏏</div>
            <CardTitle className="font-display text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your cricket portal account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="admin" className="flex items-center gap-1 text-xs">
                  <Shield className="h-3.5 w-3.5" /> Admin
                </TabsTrigger>
                <TabsTrigger value="player" className="flex items-center gap-1 text-xs">
                  <User className="h-3.5 w-3.5" /> Player
                </TabsTrigger>
                <TabsTrigger value="management" className="flex items-center gap-1 text-xs">
                  <Users className="h-3.5 w-3.5" /> Board
                </TabsTrigger>
              </TabsList>
              <TabsContent value="admin"><LoginForm type="admin" icon={Shield} label="Admin" /></TabsContent>
              <TabsContent value="player"><LoginForm type="player" icon={User} label="Player" /></TabsContent>
              <TabsContent value="management"><LoginForm type="management" icon={Users} label="Management" /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;

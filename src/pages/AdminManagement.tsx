import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { v2api, logAudit } from '@/lib/v2api';
import { ManagementUser, MANAGEMENT_ROLES } from '@/lib/v2types';
import { generateId } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Shield } from 'lucide-react';

const AdminManagement = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagementUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<ManagementUser | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    const data = await v2api.getManagementUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  if (!isAdmin) return <Navigate to="/login" />;

  const empty: ManagementUser = {
    management_id: '', name: '', email: '', phone: '', designation: '', role: '',
    authority_level: 1, signature_image: '', status: 'active', created_at: '',
    username: '', password: '',
  };

  const handleSave = async () => {
    if (!editUser?.name || !editUser?.designation) {
      toast({ title: 'Error', description: 'Name and designation required', variant: 'destructive' });
      return;
    }
    if (!String(editUser.username || '').trim() || !String(editUser.password || '').trim()) {
      toast({ title: 'Error', description: 'Username and password are required for management login', variant: 'destructive' });
      return;
    }
    if (editUser.management_id) {
      await v2api.updateManagementUser(editUser);
    } else {
      await v2api.addManagementUser({ ...editUser, management_id: generateId('MGT'), created_at: new Date().toISOString() });
    }
    logAudit('admin', editUser.management_id ? 'update_management_user' : 'add_management_user', 'management', editUser.management_id || 'new');
    toast({ title: 'Saved' });
    setOpen(false);
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
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Shield className="h-8 w-8" /> Management Users</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditUser({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editUser?.management_id ? 'Edit' : 'Add'} Management User</DialogTitle>
                <DialogDescription>Fill in the management user details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Name</Label><Input value={editUser?.name || ''} onChange={e => setEditUser(prev => prev ? { ...prev, name: e.target.value } : null)} /></div>
                <div><Label>Email</Label><Input type="email" value={editUser?.email || ''} onChange={e => setEditUser(prev => prev ? { ...prev, email: e.target.value } : null)} /></div>
                <div><Label>Phone</Label><Input value={editUser?.phone || ''} onChange={e => setEditUser(prev => prev ? { ...prev, phone: e.target.value } : null)} /></div>
                <div><Label>Username (for login)</Label><Input value={editUser?.username || ''} onChange={e => setEditUser(prev => prev ? { ...prev, username: e.target.value } : null)} /></div>
                <div><Label>Password</Label><Input value={editUser?.password || ''} onChange={e => setEditUser(prev => prev ? { ...prev, password: e.target.value } : null)} /></div>
                <div>
                  <Label>Designation</Label>
                  <Select value={editUser?.designation || ''} onValueChange={v => setEditUser(prev => prev ? { ...prev, designation: v } : null)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {MANAGEMENT_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Role Description</Label><Input value={editUser?.role || ''} onChange={e => setEditUser(prev => prev ? { ...prev, role: e.target.value } : null)} placeholder="e.g. Head of Tournament Operations" /></div>
                <div>
                  <Label>Authority Level (1-10)</Label>
                  <Input type="number" min={1} max={10} value={editUser?.authority_level || 1} onChange={e => setEditUser(prev => prev ? { ...prev, authority_level: Number(e.target.value) } : null)} />
                </div>
                <div><Label>Photo URL</Label><Input value={editUser?.signature_image || ''} onChange={e => setEditUser(prev => prev ? { ...prev, signature_image: e.target.value } : null)} placeholder="https://..." /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={editUser?.status || 'active'} onValueChange={v => setEditUser(prev => prev ? { ...prev, status: v as 'active' | 'inactive' } : null)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSave} className="w-full">Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Total users</p><p className="mt-1 text-3xl font-bold">{users.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Active</p><p className="mt-1 text-3xl font-bold text-primary">{users.filter((entry) => entry.status === 'active').length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Signing roles</p><p className="mt-1 text-3xl font-bold">{users.filter((entry) => ['President', 'Vice President', 'Tournament Director', 'Match Referee', 'Scoring Official'].includes(entry.designation)).length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">Avg authority</p><p className="mt-1 text-3xl font-bold">{users.length ? (users.reduce((sum, entry) => sum + Number(entry.authority_level || 0), 0) / users.length).toFixed(1) : '0.0'}</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Designation</TableHead><TableHead>Email</TableHead><TableHead>Authority</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.management_id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell><Badge className="bg-accent text-accent-foreground">{u.designation}</Badge></TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>{u.authority_level}</TableCell>
                    <TableCell><Badge variant={u.status === 'active' ? 'default' : 'secondary'}>{u.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditUser(u); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" onClick={async () => { await v2api.deleteManagementUser(u.management_id); toast({ title: 'Deleted' }); refresh(); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No management users</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminManagement;

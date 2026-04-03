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
import { BoardConfiguration, ManagementUser, MANAGEMENT_ROLES, TeamAccessUser } from '@/lib/v2types';
import { generateId } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Shield } from 'lucide-react';
import { BOARD_DEPARTMENTS, parseDepartmentAssignments, resolveDepartmentMember, toDepartmentAssignmentsJson } from '@/lib/boardDepartments';
import { selectLatestBoardConfiguration } from '@/lib/boardConfig';

const AdminManagement = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<ManagementUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamUsers, setTeamUsers] = useState<TeamAccessUser[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<Array<{ team_id: string; team_name: string }>>([]);
  const [editTeamUser, setEditTeamUser] = useState<TeamAccessUser | null>(null);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<ManagementUser | null>(null);
  const [open, setOpen] = useState(false);
  const [boardConfig, setBoardConfig] = useState<BoardConfiguration | null>(null);
  const [savingBoardConfig, setSavingBoardConfig] = useState(false);
  const [savingUser, setSavingUser] = useState(false);

  const refresh = async () => {
    const [data, config, teamRows, profileRows] = await Promise.all([
      v2api.getManagementUsers(),
      v2api.getBoardConfiguration(),
      v2api.getTeamAccessUsers(),
      v2api.getTeamProfiles(),
    ]);
    setUsers(data);
    setBoardConfig(selectLatestBoardConfiguration(config));
    setTeamUsers(teamRows);
    setTeamProfiles(profileRows.map((item) => ({ team_id: item.team_id, team_name: item.team_name })));
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
    setSavingUser(true);
    try {
      if (editUser.management_id) {
        await v2api.updateManagementUser(editUser);
      } else {
        await v2api.addManagementUser({ ...editUser, management_id: generateId('MGT'), created_at: new Date().toISOString() });
      }
      logAudit('admin', editUser.management_id ? 'update_management_user' : 'add_management_user', 'management', editUser.management_id || 'new');
      toast({ title: 'Saved', description: 'Management user details updated.' });
      setOpen(false);
      await refresh();
    } finally {
      setSavingUser(false);
    }
  };





  const emptyTeamUser: TeamAccessUser = {
    team_access_id: '',
    team_id: '',
    team_name: '',
    username: '',
    password: '',
    status: 'active',
    created_at: '',
    updated_at: '',
    linked_by_admin: 'admin',
  };

  const handleSaveTeamUser = async () => {
    if (!editTeamUser?.team_name || !editTeamUser?.username || !editTeamUser?.password) {
      toast({ title: 'Missing fields', description: 'Team name, username and password are required.', variant: 'destructive' });
      return;
    }
    setSavingUser(true);
    try {
      const now = new Date().toISOString();
      const payload: TeamAccessUser = {
        ...editTeamUser,
        team_access_id: editTeamUser.team_access_id || generateId('TEAMACCESS'),
        team_id: editTeamUser.team_id || generateId('TEAM'),
        created_at: editTeamUser.created_at || now,
        updated_at: now,
        linked_by_admin: 'admin',
      };
      const ok = editTeamUser.team_access_id ? await v2api.updateTeamAccessUser(payload) : await v2api.addTeamAccessUser(payload);
      if (!ok) {
        toast({ title: 'Save failed', description: 'Could not save team login user.', variant: 'destructive' });
        return;
      }
      logAudit('admin', editTeamUser.team_access_id ? 'update_team_login' : 'add_team_login', 'team_access', payload.team_access_id, JSON.stringify({ team_id: payload.team_id, team_name: payload.team_name, username: payload.username }));
      toast({ title: 'Saved', description: 'Team login credentials linked successfully.' });
      setTeamDialogOpen(false);
      await refresh();
    } finally {
      setSavingUser(false);
    }
  };

  const saveBoardConfig = async () => {
    const existingConfigId = boardConfig?.config_id || generateId('BRCFG');
    const payload: BoardConfiguration = {
      ...(boardConfig || {}),
      config_id: existingConfigId,
      current_period: boardConfig?.current_period || '',
      administration_team_ids: boardConfig?.administration_team_ids || '',
      department_assignments_json: boardConfig?.department_assignments_json || toDepartmentAssignmentsJson(departmentAssignments),
      updated_at: new Date().toISOString(),
      updated_by: 'admin',
    };

    setSavingBoardConfig(true);
    try {
      let ok = boardConfig?.config_id ? await v2api.updateBoardConfiguration(payload) : await v2api.addBoardConfiguration(payload);
      if (!ok && boardConfig?.config_id) {
        ok = await v2api.addBoardConfiguration(payload);
      }
      if (!ok) {
        toast({ title: 'Save failed', description: 'Unable to save board configuration.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Board configuration updated', description: 'Management board settings saved successfully.' });
      logAudit('admin', 'update_board_configuration', 'board', payload.config_id, JSON.stringify({ current_period: payload.current_period, administration_team_ids: payload.administration_team_ids, department_assignments_json: payload.department_assignments_json || '' }));
      await refresh();
    } finally {
      setSavingBoardConfig(false);
    }
  };

  const selectedAdminTeamIds = String(boardConfig?.administration_team_ids || '').split(',').map((v) => v.trim()).filter(Boolean);
  const departmentAssignments = parseDepartmentAssignments(boardConfig);
  const getConfigDraft = (overrides: Partial<BoardConfiguration> = {}): BoardConfiguration => ({
    config_id: boardConfig?.config_id || generateId('BRCFG'),
    current_period: boardConfig?.current_period || '',
    administration_team_ids: boardConfig?.administration_team_ids || '',
    department_assignments_json: boardConfig?.department_assignments_json || toDepartmentAssignmentsJson(departmentAssignments),
    updated_at: boardConfig?.updated_at || new Date().toISOString(),
    updated_by: 'admin',
    ...overrides,
  });

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
                <Button onClick={handleSave} className="w-full" disabled={savingUser}>
                  {savingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving management user...</> : 'Save'}
                </Button>
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
          <CardHeader><CardTitle>Management Board Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Period</Label>
              <Input
                placeholder="e.g. 2026-2028 Executive Committee"
                value={boardConfig?.current_period || ''}
                onChange={(e) => setBoardConfig((prev) => ({
                  ...getConfigDraft(prev || {}),
                  current_period: e.target.value,
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Administration Team (select from board users)</Label>
              <div className="grid gap-2 md:grid-cols-2">
                {users.filter((u) => u.status === 'active').map((u) => {
                  const isSelected = selectedAdminTeamIds.includes(u.management_id);
                  return (
                    <Button
                      key={u.management_id}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      className="justify-between"
                      onClick={() => {
                        const next = isSelected
                          ? selectedAdminTeamIds.filter((id) => id !== u.management_id)
                          : [...selectedAdminTeamIds, u.management_id];
                        setBoardConfig(getConfigDraft({ administration_team_ids: next.join(',') }));
                      }}
                    >
                      <span>{u.name}</span>
                      <span className="text-xs opacity-80">{u.designation}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label>Department Directory (5 Departments)</Label>
                <p className="text-xs text-muted-foreground mt-1">Assign one head and a supporting team for each department. This same structure will be visible on the Management Board page.</p>
              </div>
              <div className="space-y-3">
                {BOARD_DEPARTMENTS.map((department) => {
                  const assignment = departmentAssignments.find((item) => item.department_id === department.id) || { department_id: department.id, head_id: '', team_ids: [] };
                  return (
                    <div key={department.id} className="rounded-lg border p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{department.name}</p>
                        <Badge variant="outline">{assignment.team_ids.length} team member{assignment.team_ids.length === 1 ? '' : 's'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{department.description}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Department Head</Label>
                          <Select
                            value={assignment.head_id || '__none__'}
                            onValueChange={(value) => {
                              const next = departmentAssignments.map((item) => item.department_id === department.id ? { ...item, head_id: value === '__none__' ? '' : value } : item);
                              setBoardConfig(getConfigDraft({ department_assignments_json: toDepartmentAssignmentsJson(next) }));
                            }}
                          >
                            <SelectTrigger><SelectValue placeholder="Select department head" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No head assigned</SelectItem>
                              {users.filter((u) => u.status === 'active').map((u) => (
                                <SelectItem key={`${department.id}:head:${u.management_id}`} value={u.management_id}>
                                  {u.name} • {u.designation}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Department Team</Label>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {users.filter((u) => u.status === 'active').map((u) => {
                              const selected = assignment.team_ids.includes(u.management_id);
                              return (
                                <Button
                                  key={`${department.id}:team:${u.management_id}`}
                                  type="button"
                                  size="sm"
                                  variant={selected ? 'default' : 'outline'}
                                  className="justify-between"
                                  onClick={() => {
                                    const teamIds = selected
                                      ? assignment.team_ids.filter((id) => id !== u.management_id)
                                      : [...assignment.team_ids, u.management_id];
                                    const next = departmentAssignments.map((item) => item.department_id === department.id ? { ...item, team_ids: teamIds } : item);
                                    setBoardConfig(getConfigDraft({ department_assignments_json: toDepartmentAssignmentsJson(next) }));
                                  }}
                                >
                                  <span className="truncate">{u.name}</span>
                                  <span className="text-[10px] opacity-80">{u.designation}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {assignment.head_id && (
                        <p className="text-xs text-muted-foreground">
                          Head preview: <span className="font-medium text-foreground">{resolveDepartmentMember(assignment.head_id, users)?.name || 'Unknown member'}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button onClick={saveBoardConfig} disabled={savingBoardConfig}>
              {savingBoardConfig ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving board configuration...</> : 'Save Board Settings'}
            </Button>
            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <p className="font-semibold">Admin-friendly workflow guide</p>
              <ol className="list-decimal ml-5 text-sm text-muted-foreground space-y-1">
                <li>Update the current period and save so management pages show the right committee cycle.</li>
                <li>Use administration team selection so signatures route to the right approvers.</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team Login Access</CardTitle>
            <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditTeamUser({ ...emptyTeamUser })}><Plus className="h-4 w-4 mr-1" /> Add Team Login</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editTeamUser?.team_access_id ? 'Edit' : 'Add'} Team Login</DialogTitle>
                  <DialogDescription>Link a team with a username/password for dashboard access.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Team profile (optional)</Label>
                    <Select value={editTeamUser?.team_id || '__custom__'} onValueChange={(v) => {
                      if (v === '__custom__') return;
                      const team = teamProfiles.find((item) => item.team_id === v);
                      if (!team) return;
                      setEditTeamUser((prev) => prev ? { ...prev, team_id: team.team_id, team_name: team.team_name } : prev);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select team profile" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__custom__">Custom / manual team</SelectItem>
                        {teamProfiles.map((team) => <SelectItem key={team.team_id} value={team.team_id}>{team.team_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Team Name</Label><Input value={editTeamUser?.team_name || ''} onChange={(e) => setEditTeamUser((prev) => prev ? { ...prev, team_name: e.target.value } : prev)} /></div>
                  <div><Label>Team ID</Label><Input value={editTeamUser?.team_id || ''} onChange={(e) => setEditTeamUser((prev) => prev ? { ...prev, team_id: e.target.value } : prev)} placeholder="Leave empty to auto-generate" /></div>
                  <div><Label>Username</Label><Input value={editTeamUser?.username || ''} onChange={(e) => setEditTeamUser((prev) => prev ? { ...prev, username: e.target.value } : prev)} /></div>
                  <div><Label>Password</Label><Input value={editTeamUser?.password || ''} onChange={(e) => setEditTeamUser((prev) => prev ? { ...prev, password: e.target.value } : prev)} /></div>
                  <div>
                    <Label>Status</Label>
                    <Select value={editTeamUser?.status || 'active'} onValueChange={(v) => setEditTeamUser((prev) => prev ? { ...prev, status: v as 'active' | 'inactive' } : prev)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveTeamUser} className="w-full" disabled={savingUser}>
                    {savingUser ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving team login...</> : 'Save Team Login'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Team</TableHead><TableHead>Username</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {teamUsers.map((row) => (
                  <TableRow key={row.team_access_id}>
                    <TableCell>
                      <p className="font-medium">{row.team_name}</p>
                      <p className="text-xs text-muted-foreground">{row.team_id}</p>
                    </TableCell>
                    <TableCell>{row.username}</TableCell>
                    <TableCell><Badge variant={row.status === 'active' ? 'default' : 'secondary'}>{row.status}</Badge></TableCell>
                    <TableCell>{new Date(row.updated_at || row.created_at || '').toLocaleString() || '-'}</TableCell>
                    <TableCell><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setEditTeamUser(row); setTeamDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button><Button size="icon" variant="ghost" onClick={async () => { await v2api.deleteTeamAccessUser(row.team_access_id); logAudit('admin', 'delete_team_login', 'team_access', row.team_access_id); toast({ title: 'Deleted', description: `Removed team login for ${row.team_name}.` }); refresh(); }}><Trash2 className="h-3 w-3 text-destructive" /></Button></div></TableCell>
                  </TableRow>
                ))}
                {teamUsers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No team logins configured. Add one to enable team dashboard sign in.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
                        <Button size="icon" variant="ghost" onClick={async () => { await v2api.deleteManagementUser(u.management_id); logAudit('admin', 'delete_management_user', 'management', u.management_id); toast({ title: 'Deleted', description: `Removed ${u.name} from management users.` }); refresh(); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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

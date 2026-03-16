import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useData } from '@/lib/DataContext';
import { v2api } from '@/lib/v2api';
import { UserPresence, getPresenceStatus } from '@/lib/v2types';
import { Loader2, Search, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';

const STATUS_ICON: Record<string, React.ReactNode> = {
  online: <Wifi className="h-4 w-4 text-green-500" />,
  away: <Clock className="h-4 w-4 text-yellow-500" />,
  offline: <WifiOff className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_BADGE: Record<string, string> = {
  online: 'bg-green-100 text-green-800',
  away: 'bg-yellow-100 text-yellow-800',
  offline: 'bg-muted text-muted-foreground',
};

export function AdminPresence() {
  const { players } = useData();
  const [presence, setPresence] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortCol, setSortCol] = useState<'name' | 'status' | 'lastSeen'>('status');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const refresh = async () => {
    const data = await v2api.getPresence();
    setPresence(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 12000);
    return () => clearInterval(iv);
  }, []);

  const enriched = useMemo(() => {
    return presence.map(p => {
      const player = players.find(pl => pl.player_id === p.user_id);
      const status = getPresenceStatus(p.last_heartbeat);
      return { ...p, name: player?.name || p.user_id, status };
    });
  }, [presence, players]);

  const filtered = useMemo(() => {
    let result = [...enriched];
    if (filterStatus !== 'all') result = result.filter(r => r.status === filterStatus);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.name.toLowerCase().includes(q) || r.user_id.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortCol === 'status') {
        const order = { online: 0, away: 1, offline: 2 };
        cmp = order[a.status] - order[b.status];
      } else {
        cmp = new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [enriched, filterStatus, searchQuery, sortCol, sortDir]);

  const onlineCount = enriched.filter(e => e.status === 'online').length;
  const awayCount = enriched.filter(e => e.status === 'away').length;
  const offlineCount = enriched.filter(e => e.status === 'offline').length;

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-2"><Wifi className="h-5 w-5 text-green-500" /><p className="text-2xl font-bold text-green-600">{onlineCount}</p></div><p className="text-xs text-muted-foreground">Online</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-2"><Clock className="h-5 w-5 text-yellow-500" /><p className="text-2xl font-bold text-yellow-600">{awayCount}</p></div><p className="text-xs text-muted-foreground">Away</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-2"><WifiOff className="h-5 w-5 text-muted-foreground" /><p className="text-2xl font-bold text-muted-foreground">{offlineCount}</p></div><p className="text-xs text-muted-foreground">Offline</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 w-60" placeholder="Search users..." /></div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="online">Online</SelectItem><SelectItem value="away">Away</SelectItem><SelectItem value="offline">Offline</SelectItem></SelectContent></Select>
            </div>
            <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('name')}>User {sortCol === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('status')}>Status {sortCol === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('lastSeen')}>Last Seen {sortCol === 'lastSeen' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(row => (
                <TableRow key={row.user_id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell><div className="flex items-center gap-2">{STATUS_ICON[row.status]}<Badge className={`text-xs ${STATUS_BADGE[row.status]}`}>{row.status}</Badge></div></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.last_seen}</TableCell>
                  <TableCell>{row.active_sessions}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{row.device_type || 'unknown'}</Badge></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No presence data</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

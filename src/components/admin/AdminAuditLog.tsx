import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { v2api } from '@/lib/v2api';
import { AuditEvent } from '@/lib/v2types';
import { useData } from '@/lib/DataContext';
import { Loader2, Search, Shield } from 'lucide-react';

export function AdminAuditLog() {
  const { players } = useData();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    v2api.getAuditEvents().then(data => {
      setEvents(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setLoading(false);
    });
  }, []);

  const getActorName = (id: string) => {
    if (id === 'admin') return 'Admin';
    return players.find(p => p.player_id === id)?.name || id;
  };

  const eventTypes = [...new Set(events.map(e => e.event_type))];

  const filtered = events.filter(e => {
    if (filterType !== 'all' && e.event_type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return [e.event_id, e.actor_user, e.event_type, e.entity_type, e.entity_id, e.metadata]
        .some(v => v?.toLowerCase().includes(q));
    }
    return true;
  });

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 w-60" placeholder="Search events..." /></div>
          </div>
          <div>
            <Label className="text-xs">Event Type</Label>
            <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{eventTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map(evt => (
                <TableRow key={evt.event_id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{evt.timestamp}</TableCell>
                  <TableCell className="text-sm">{getActorName(evt.actor_user)}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{evt.event_type}</Badge></TableCell>
                  <TableCell className="text-xs">{evt.entity_type}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[100px] truncate">{evt.entity_id}</TableCell>
                  <TableCell className="text-xs max-w-[150px] truncate">{evt.metadata}</TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No audit events</TableCell></TableRow>}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4 border-t">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

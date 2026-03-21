import { useEffect, useMemo, useState } from 'react';
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
import { Loader2, Search, Shield, Sparkles } from 'lucide-react';
import { formatInIST } from '@/lib/time';

export function AdminAuditLog() {
  const { players } = useData();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  useEffect(() => {
    v2api.getAuditEvents().then((data) => {
      setEvents(data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setLoading(false);
    });
  }, []);

  const getActorName = (id: string) => {
    if (id === 'admin') return 'Admin';
    if (id === 'system') return 'System';
    return players.find((player) => player.player_id === id)?.name || id;
  };

  const eventTypes = [...new Set(events.map((event) => event.event_type))];
  const parseMetadata = (value: string) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const filtered = useMemo(() => events.filter((event) => {
    if (filterType !== 'all' && event.event_type !== filterType) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return [event.event_id, event.actor_user, event.event_type, event.entity_type, event.entity_id, event.metadata]
        .some((value) => value?.toLowerCase().includes(query));
    }
    return true;
  }), [events, filterType, searchQuery]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const todayCount = events.filter((event) => String(event.timestamp).includes(new Date().getFullYear().toString())).length;

  useEffect(() => {
    setPage(0);
  }, [filterType, searchQuery]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <section className="admin-section-shell overflow-hidden p-6">
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              <Shield className="h-3.5 w-3.5" /> Full audit trail
            </div>
            <h2 className="section-heading mt-3">Everything important, captured in one place.</h2>
            <p className="mt-2 text-sm text-muted-foreground">Track admin actions, live-scoring events, communication activity, ticket activity, and sheet-facing CRUD updates with searchable metadata.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="metric-tile"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total events</p><p className="mt-2 text-3xl font-bold text-primary">{events.length}</p></div>
            <div className="metric-tile"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Filtered</p><p className="mt-2 text-3xl font-bold text-foreground">{filtered.length}</p></div>
            <div className="metric-tile"><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Coverage pulse</p><p className="mt-2 text-3xl font-bold text-foreground">{todayCount}</p></div>
          </div>
        </div>
      </section>

      <Card className="admin-section-shell overflow-hidden">
        <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-background to-primary/5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="font-display text-xl">Audit explorer</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Use the filters below to isolate any action, user, entity, or metadata payload.</p>
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div>
                <Label className="text-xs">Search</Label>
                <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-72 rounded-full pl-8" placeholder="Search events..." /></div>
              </div>
              <div>
                <Label className="text-xs">Event Type</Label>
                <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-48 rounded-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{eventTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
          </div>
        </CardHeader>
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
              {paged.map((event) => (
                <TableRow key={event.event_id} className="align-top hover:bg-primary/5">
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatInIST(event.timestamp)}</TableCell>
                  <TableCell className="text-sm font-medium">{getActorName(event.actor_user)}</TableCell>
                  <TableCell><Badge variant="outline" className="rounded-full text-xs">{event.event_type}</Badge></TableCell>
                  <TableCell className="text-xs">{event.entity_type}</TableCell>
                  <TableCell className="max-w-[120px] truncate font-mono text-xs">{event.entity_id}</TableCell>
                  <TableCell className="max-w-[360px] text-xs">
                    <div className="space-y-2 rounded-2xl border border-primary/10 bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground"><Sparkles className="h-3 w-3" /> {event.event_id}</div>
                      <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-foreground">
                        {typeof parseMetadata(event.metadata) === 'string' ? String(parseMetadata(event.metadata)) : JSON.stringify(parseMetadata(event.metadata), null, 2)}
                      </pre>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No audit events</TableCell></TableRow>}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t py-4">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((value) => value + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

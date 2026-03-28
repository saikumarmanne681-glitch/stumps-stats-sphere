import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { v2api } from '@/lib/v2api';
import { MailDiagnostic } from '@/lib/v2types';
import { formatInIST } from '@/lib/time';
import { Loader2, MailSearch } from 'lucide-react';

export function AdminMailDiagnostics() {
  const [logs, setLogs] = useState<MailDiagnostic[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'sent' | 'failed'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    v2api.getMailDiagnostics()
      .then((data) => setLogs(data.sort((a, b) => String(b.triggered_at || '').localeCompare(String(a.triggered_at || '')))))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => logs.filter((log) => {
    if (status !== 'all' && log.status !== status) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [log.mail_log_id, log.recipient, log.subject, log.trigger_source, log.trigger_entity_id, log.failure_reason, log.triggered_by]
      .some((value) => String(value || '').toLowerCase().includes(q));
  }), [logs, query, status]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  useEffect(() => {
    setPage(0);
  }, [query, status]);

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><MailSearch className="h-5 w-5" /> Mail diagnostics</CardTitle>
          <p className="text-sm text-muted-foreground">Every send attempt is recorded with full payload, trigger context, and failure reason.</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{logs.length}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Sent</p><p className="text-2xl font-bold text-emerald-600">{logs.filter((l) => l.status === 'sent').length}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Failed</p><p className="text-2xl font-bold text-destructive">{logs.filter((l) => l.status === 'failed').length}</p></div>
          <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Filtered</p><p className="text-2xl font-bold">{filtered.length}</p></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label className="text-xs">Search</Label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="recipient, subject, trigger, reason" />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as 'all' | 'sent' | 'failed')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Failure / Raw</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((log) => (
                <TableRow key={log.mail_log_id} className="align-top">
                  <TableCell className="text-xs min-w-[160px]">{formatInIST(log.triggered_at)}<br />by <strong>{log.triggered_by || 'system'}</strong></TableCell>
                  <TableCell><Badge variant={log.status === 'sent' ? 'default' : 'destructive'}>{log.status}</Badge><div className="text-[11px] text-muted-foreground mt-1">{log.mail_provider || 'n/a'}</div></TableCell>
                  <TableCell className="text-xs"><div>{log.trigger_source || 'unknown'}</div><div className="text-muted-foreground">{log.trigger_entity_type}:{log.trigger_entity_id || '-'}</div></TableCell>
                  <TableCell className="text-xs max-w-[180px] break-words">{log.recipient}</TableCell>
                  <TableCell className="text-xs max-w-[320px]"><div className="font-medium">{log.subject}</div><details className="mt-1"><summary className="cursor-pointer text-muted-foreground">View full body</summary><pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-[10px]">{log.body_text || log.body_html || '(empty)'}</pre></details></TableCell>
                  <TableCell className="text-xs max-w-[320px]"><div className="text-destructive">{log.failure_reason || '—'}</div><details className="mt-1"><summary className="cursor-pointer text-muted-foreground">Raw response</summary><pre className="mt-2 whitespace-pre-wrap break-words rounded-md bg-muted p-2 text-[10px]">{log.raw_response || '—'}</pre></details></TableCell>
                </TableRow>
              ))}
              {paged.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No diagnostics found.</TableCell></TableRow>}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 border-t py-3">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((prev) => prev - 1)}>Previous</Button>
              <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((prev) => prev + 1)}>Next</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

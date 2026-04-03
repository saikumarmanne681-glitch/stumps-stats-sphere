import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { v2api } from '@/lib/v2api';
import { Loader2 } from 'lucide-react';

const SHEETS = [
  'Players',
  'Tournaments',
  'Seasons',
  'Matches',
  'DIGITAL_SCORELISTS',
  'CERTIFICATES',
  'CERTIFICATE_APPROVALS',
  'CERTIFICATE_TEMPLATES',
  'FORM_DEFINITIONS',
  'FORM_ENTRIES',
  'schedules',
  'approvals',
] as const;

interface AdminSheetsConsoleProps {
  initialSheet?: string;
  lockSheetSelection?: boolean;
}

export function AdminSheetsConsole({ initialSheet, lockSheetSelection = false }: AdminSheetsConsoleProps = {}) {
  const initialValue = initialSheet && SHEETS.includes(initialSheet as (typeof SHEETS)[number]) ? initialSheet : SHEETS[0];
  const [sheet, setSheet] = useState<string>(initialValue);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [jsonValue, setJsonValue] = useState('{}');
  const [deleteKey, setDeleteKey] = useState('');

  const refresh = async () => {
    setLoading(true);
    const data = await v2api.getCustomSheet<Record<string, unknown>>(sheet);
    setRows(data);
    setLoading(false);
  };

  const headers = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => Object.keys(row || {}).forEach((key) => set.add(key)));
    return Array.from(set);
  }, [rows]);

  const keyColumn = useMemo(() => {
    const preferred = [
      'player_id',
      'tournament_id',
      'season_id',
      'match_id',
      'scorelist_id',
      'certificate_id',
      'template_id',
      'form_id',
      'entry_id',
      'schedule_id',
      'approval_id',
      'id',
    ];
    return preferred.find((key) => headers.includes(key)) || headers[0] || '';
  }, [headers]);

  const upsertRow = async () => {
    try {
      const payload = JSON.parse(jsonValue) as Record<string, unknown>;
      const ok = await v2api.addCustomSheetRow(sheet, payload);
      if (ok) await refresh();
    } catch {
      // invalid json - no-op by design
    }
  };

  const removeRow = async () => {
    if (!keyColumn || !deleteKey) return;
    const ok = await v2api.deleteCustomSheetRow(sheet, { [keyColumn]: deleteKey });
    if (ok) {
      setDeleteKey('');
      await refresh();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sheets Data Console (Admin CRUD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Sheet</Label>
              <Select value={sheet} onValueChange={setSheet} disabled={lockSheetSelection}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>{SHEETS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={refresh} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load rows'}</Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Upsert row JSON (same key will overwrite in Apps Script)</Label>
              <Input value={jsonValue} onChange={(event) => setJsonValue(event.target.value)} placeholder='{"player_id":"P1","name":"New name"}' />
              <Button variant="secondary" onClick={upsertRow}>Add / overwrite row</Button>
            </div>
            <div className="space-y-2">
              <Label>Delete by key ({keyColumn || 'unknown'})</Label>
              <Input value={deleteKey} onChange={(event) => setDeleteKey(event.target.value)} placeholder="Enter key value" />
              <Button variant="destructive" onClick={removeRow}>Delete row</Button>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => <TableHead key={header}>{header}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 100).map((row, index) => (
                  <TableRow key={`${index}-${String(row[keyColumn] || '')}`}>
                    {headers.map((header) => {
                      const value = row[header];
                      return <TableCell key={header} className="max-w-[220px] truncate text-xs">{typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}</TableCell>;
                    })}
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={Math.max(headers.length, 1)} className="text-center text-muted-foreground">No rows loaded</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

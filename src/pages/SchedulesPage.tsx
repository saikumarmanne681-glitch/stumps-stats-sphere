import { useEffect, useMemo, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { v2api } from '@/lib/v2api';
import { PublicScheduleRecord } from '@/lib/v2types';
import { generateId } from '@/lib/utils';
import { Download, FileText, Globe, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScheduleMatch, ScheduleRecord } from '@/schedules/types';
import { formatScheduleSlotInIST } from '@/lib/time';

const SHEET_NAME = 'PUBLIC_SCHEDULES';

function tryParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function getGoogleDriveFileId(raw: string): string {
  const url = tryParseUrl(raw);
  if (!url) return '';
  const host = url.hostname.replace(/^www\./, '');
  if (!host.includes('google.com')) return '';

  const fromQuery = url.searchParams.get('id');
  if (fromQuery) return fromQuery;

  const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/i);
  if (fileMatch?.[1]) return fileMatch[1];

  const docMatch = url.pathname.match(/\/(?:document|spreadsheets|presentation)\/d\/([^/]+)/i);
  if (docMatch?.[1]) return docMatch[1];

  return '';
}

function getGoogleEmbedUrl(raw: string): string {
  const url = tryParseUrl(raw);
  if (!url) return raw;
  const host = url.hostname.replace(/^www\./, '');
  const path = url.pathname;
  const fileId = getGoogleDriveFileId(raw);

  if (host === 'docs.google.com' && fileId && path.includes('/document/')) return `https://docs.google.com/document/d/${fileId}/preview`;
  if (host === 'docs.google.com' && fileId && path.includes('/spreadsheets/')) return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
  if (host === 'docs.google.com' && fileId && path.includes('/presentation/')) return `https://docs.google.com/presentation/d/${fileId}/embed`;
  if (host === 'drive.google.com' && fileId) return `https://drive.google.com/file/d/${fileId}/preview`;

  return raw;
}

function getScheduleEmbedUrl(raw: string): string {
  const source = String(raw || '').trim();
  if (!source) return '';
  const parsed = tryParseUrl(source);
  if (!parsed) return source;

  const host = parsed.hostname.replace(/^www\./, '');
  if (host.endsWith('google.com')) return getGoogleEmbedUrl(source);

  return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(source)}`;
}

const emptyForm = {
  title: '',
  tournament: '',
  season: '',
  pdf_url: '',
};

interface PublishedMatchSchedule {
  id: string;
  title: string;
  tournament: string;
  season: string;
  source: 'manual_file' | 'governance_release';
  fileUrl?: string;
  publishedAt: string;
  matches: ScheduleMatch[];
}

export default function SchedulesPage() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<PublicScheduleRecord[]>([]);
  const [governanceSchedules, setGovernanceSchedules] = useState<ScheduleRecord[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    const [data, certified] = await Promise.all([
      v2api.getCustomSheet<PublicScheduleRecord>(SHEET_NAME),
      v2api.getCustomSheet<ScheduleRecord>('schedules'),
    ]);
    setRows(
      data
        .filter((item) => item.schedule_id && item.pdf_url)
        .sort((a, b) => (b.published_at || b.updated_at || '').localeCompare(a.published_at || a.updated_at || '')),
    );
    setGovernanceSchedules(
      certified
        .filter((item) => item.schedule_id && item.status === 'approved' && item.matches_json)
        .sort((a, b) => (b.certified_at || b.timestamp || '').localeCompare(a.certified_at || a.timestamp || '')),
    );
  };

  useEffect(() => {
    void refresh();
  }, []);

  const publishedSchedules = useMemo<PublishedMatchSchedule[]>(() => {
    const manual = rows
      .filter((item) => String(item.status || '').toLowerCase() === 'published')
      .map((item) => ({
        id: item.schedule_id,
        title: item.title,
        tournament: item.tournament || 'General',
        season: item.season || '',
        source: 'manual_file' as const,
        fileUrl: item.pdf_url,
        publishedAt: item.published_at || item.updated_at || '',
        matches: [],
      }));

    const governance = governanceSchedules.map((item) => {
      let matches: ScheduleMatch[] = [];
      try {
        matches = JSON.parse(item.matches_json) as ScheduleMatch[];
      } catch {
        matches = [];
      }
      return {
        id: `${item.schedule_id}:fixture`,
        title: `${item.tournament_name} · Official Fixture (v${item.version_number})`,
        tournament: item.tournament_name,
        season: item.timestamp?.slice(0, 4) || '',
        source: 'governance_release' as const,
        publishedAt: item.certified_at || item.timestamp || '',
        matches,
      };
    });

    return [...governance, ...manual].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }, [rows, governanceSchedules]);

  const createSchedule = async () => {
    if (!isAdmin) return;
    if (!form.title.trim() || !form.pdf_url.trim()) {
      toast({ title: 'Title and file URL are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const payload: PublicScheduleRecord = {
      schedule_id: generateId('SCH'),
      title: form.title.trim(),
      tournament: form.tournament.trim(),
      season: form.season.trim(),
      pdf_url: form.pdf_url.trim(),
      status: 'published',
      published_at: now,
      created_by: user?.username || 'admin',
      created_at: now,
      updated_at: now,
    };
    const ok = await v2api.addCustomSheetRow(SHEET_NAME, payload);
    setSaving(false);
    if (!ok) {
      toast({ title: 'Unable to publish schedule', variant: 'destructive' });
      return;
    }
    setForm(emptyForm);
    await refresh();
    toast({ title: 'Schedule published' });
  };

  const removeSchedule = async (scheduleId: string) => {
    if (!isAdmin) return;
    const ok = await v2api.deleteCustomSheetRow(SHEET_NAME, { schedule_id: scheduleId });
    if (!ok) {
      toast({ title: 'Unable to delete schedule', variant: 'destructive' });
      return;
    }
    await refresh();
    toast({ title: 'Schedule removed' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto space-y-6 px-3 py-5 sm:px-4 sm:py-8">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Globe className="h-5 w-5 text-primary" /> Public Match Schedules</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All published schedule files are visible here to every visitor, including non-logged-in users.
            </p>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin: Publish Schedule File</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="IPL 2026 Official Fixture" /></div>
              <div><Label>Tournament</Label><Input value={form.tournament} onChange={(e) => setForm((p) => ({ ...p, tournament: e.target.value }))} placeholder="IPL" /></div>
              <div><Label>Season</Label><Input value={form.season} onChange={(e) => setForm((p) => ({ ...p, season: e.target.value }))} placeholder="2026" /></div>
              <div><Label>File URL (PDF, DOC, Drive, etc.)</Label><Input value={form.pdf_url} onChange={(e) => setForm((p) => ({ ...p, pdf_url: e.target.value }))} placeholder="https://.../schedule.pdf" /></div>
              <div className="md:col-span-2">
                <Button onClick={createSchedule} disabled={saving}><Plus className="mr-1 h-4 w-4" /> Publish schedule</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {publishedSchedules.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{item.tournament || 'General'} {item.season ? `• ${item.season}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Published</Badge>
                    <Badge variant={item.source === 'governance_release' ? 'default' : 'secondary'}>
                      {item.source === 'governance_release' ? 'Season release' : 'Uploaded file'}
                    </Badge>
                    {item.fileUrl && <Button asChild size="sm" variant="outline"><a href={item.fileUrl} target="_blank" rel="noreferrer"><Download className="mr-1 h-3.5 w-3.5" /> Open file</a></Button>}
                    {isAdmin && item.source === 'manual_file' && (
                      <Button size="sm" variant="destructive" onClick={() => void removeSchedule(item.id)}><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {item.fileUrl ? (
                  <div className="h-[68vh] w-full overflow-hidden rounded-lg border bg-muted/10">
                    <iframe title={item.title} src={getScheduleEmbedUrl(item.fileUrl)} className="h-full w-full" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Official season fixture generated from the governance scheduler and released after certification.</p>
                    <div className="max-h-[55vh] overflow-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Slot (IST)</th>
                            <th className="px-3 py-2 text-left font-medium">Match</th>
                            <th className="px-3 py-2 text-left font-medium">Venue</th>
                            <th className="px-3 py-2 text-left font-medium">Stage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.matches.map((match) => (
                            <tr key={match.match_id} className="border-t">
                              <td className="px-3 py-2 whitespace-nowrap">{formatScheduleSlotInIST(match.date, match.time)}</td>
                              <td className="px-3 py-2">{match.team_a} vs {match.team_b}</td>
                              <td className="px-3 py-2">{match.venue}</td>
                              <td className="px-3 py-2">{match.stage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {publishedSchedules.length === 0 && (
            <Card>
              <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" /> No schedules are published yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

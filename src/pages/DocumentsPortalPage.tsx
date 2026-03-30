import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AnnouncementTicker } from '@/components/AnnouncementTicker';
import { VerticalAnnouncementsBox } from '@/components/VerticalAnnouncementsBox';
import { useAuth } from '@/lib/auth';
import { v2api, logAudit } from '@/lib/v2api';
import { generateId } from '@/lib/utils';
import { OfficialDocumentRecord } from '@/lib/v2types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Shield, FileText, Eye, Download, Sparkles, LockKeyhole, Building2, CalendarClock } from 'lucide-react';
import { formatSheetDate } from '@/lib/dataUtils';

const categories = ['Governance', 'Tournament', 'Finance', 'Legal', 'Operations'] as const;

export default function DocumentsPortalPage() {
  const { user, isAdmin, isManagement } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<OfficialDocumentRecord[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('Governance');
  const [department, setDepartment] = useState('Executive Board');
  const [accessList, setAccessList] = useState('all_management');

  const refresh = async () => {
    const rows = await v2api.getCustomSheet<OfficialDocumentRecord>('OFFICIAL_DOCUMENTS');
    setDocs(rows.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')));
  };

  useEffect(() => { refresh(); }, []);

  const hasDocumentAccess = (doc: OfficialDocumentRecord) => {
    if (isAdmin) return true;
    if (!isManagement || !user) return false;
    if (doc.status === 'hidden') return false;

    const allowlist = String(doc.allowed_management_ids || '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (allowlist.length === 0 || allowlist.includes('all_management')) return true;

    const designation = String(user.designation || '').toLowerCase();
    const username = String(user.username || '').toLowerCase();
    const managementId = String(user.management_id || '').toLowerCase();
    const authorityLevel = Number((user as any).authority_level || 0);

    return allowlist.some((entry) =>
      entry === managementId ||
      entry === username ||
      entry === designation ||
      (entry.startsWith('designation:') && entry.slice(12) === designation) ||
      (entry.startsWith('authority>=') && authorityLevel >= Number(entry.replace('authority>=', ''))),
    );
  };

  const visibleDocs = useMemo(() => {
    return docs.filter(hasDocumentAccess);
  }, [docs, isAdmin, isManagement, user]);
  const latestVisibleDocs = useMemo(() => visibleDocs.slice(0, 10), [visibleDocs]);

  const addDocument = async () => {
    if (!isAdmin) return;
    if (!title.trim() || !url.trim()) {
      toast({ title: 'Title and URL are required', variant: 'destructive' });
      return;
    }
    const row: OfficialDocumentRecord = {
      document_id: generateId('DOC'),
      title: title.trim(),
      category,
      department: department.trim() || 'General',
      source_url: url.trim(),
      source_type: 'url',
      status: 'published',
      allowed_management_ids: accessList.trim() || 'all_management',
      allow_preview: true,
      allow_download: true,
      created_by: user?.username || 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ok = await v2api.addCustomSheetRow('OFFICIAL_DOCUMENTS', row);
    if (!ok) {
      toast({ title: 'Unable to save document', description: 'Please check OFFICIAL_DOCUMENTS sheet mapping.', variant: 'destructive' });
      return;
    }
    logAudit(user?.username || 'admin', 'document_create', 'document', row.document_id, JSON.stringify({ category, department, allowed: row.allowed_management_ids }));
    setTitle('');
    setUrl('');
    toast({ title: 'Document added to official library' });
    refresh();
  };

  const toggleVisibility = async (doc: OfficialDocumentRecord) => {
    if (!isAdmin) return;
    const payload = { ...doc, status: doc.status === 'published' ? 'hidden' : 'published', updated_at: new Date().toISOString() };
    await v2api.updateCustomSheetRow('OFFICIAL_DOCUMENTS', payload);
    refresh();
  };

  if (!user) return <Navigate to="/login" />;
  if (!isAdmin && !isManagement) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <AnnouncementTicker />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2"><Shield className="h-5 w-5" /> Official Documents Portal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Secure library for governance records, circulars, and approved tournament files with role-based access control.</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-background/80">Visible for you: {visibleDocs.length}</Badge>
                <Badge variant="outline" className="bg-background/80">Total records: {docs.length}</Badge>
                <Badge variant="outline" className="bg-background/80">Admin mode: {isAdmin ? 'Enabled' : 'Disabled'}</Badge>
              </div>
            </CardContent>
          </Card>
          <VerticalAnnouncementsBox />
        </div>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Horizontal Scroller · Quick Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {latestVisibleDocs.map((doc) => (
                <div key={`scroll-${doc.document_id}`} className="min-w-[280px] rounded-xl border border-primary/20 bg-background/80 p-3 shadow-sm">
                  <p className="line-clamp-2 text-sm font-semibold">{doc.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" /> {doc.department}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> Updated {formatSheetDate(doc.updated_at, 'dd MMM yyyy', doc.updated_at)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{doc.category}</Badge>
                    <Badge variant={doc.status === 'published' ? 'default' : 'secondary'}>{doc.status}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {doc.allow_preview && <Button size="sm" variant="outline" onClick={() => window.open(doc.source_url, '_blank', 'noopener,noreferrer')}><Eye className="mr-1 h-3 w-3" />Preview</Button>}
                    {doc.allow_download && <Button size="sm" variant="outline" asChild><a href={doc.source_url} target="_blank" rel="noreferrer"><Download className="mr-1 h-3 w-3" />Download</a></Button>}
                  </div>
                </div>
              ))}
              {latestVisibleDocs.length === 0 && (
                <div className="min-w-[280px] rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
                  No documents available for quick access.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>Add New Document</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Board circular / policy / schedule" /></div>
              <div><Label>Category</Label><Select value={category} onValueChange={(v) => setCategory(v as (typeof categories)[number])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2"><Label>Document URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Drive/Sharepoint URL (pdf, docx, png, jpeg...)" /></div>
              <div><Label>Department</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
              <div className="md:col-span-2"><Label>Access</Label><Input value={accessList} onChange={(e) => setAccessList(e.target.value)} placeholder="all_management, management_id, username, designation:treasurer, authority>=7" /></div>
              <div className="md:col-span-1 flex items-end"><Button onClick={addDocument} className="w-full">Publish to Library</Button></div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {visibleDocs.map((doc) => (
            <Card key={doc.document_id} className="border-primary/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.department}</p>
                  </div>
                  <Badge variant={doc.status === 'published' ? 'default' : 'secondary'}>{doc.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{doc.category}</Badge>
                  <Badge variant="outline"><LockKeyhole className="mr-1 h-3 w-3" />Access: {doc.allowed_management_ids}</Badge>
                </div>
                {doc.source_url.toLowerCase().includes('.pdf') && (
                  <div className="overflow-hidden rounded-xl border bg-muted/20">
                    <iframe title={`${doc.title} preview`} src={doc.source_url} className="h-56 w-full" />
                  </div>
                )}
                <div className="flex gap-2 flex-wrap">
                  {doc.allow_preview && <Button size="sm" variant="outline" onClick={() => window.open(doc.source_url, '_blank', 'noopener,noreferrer')}><Eye className="mr-1 h-3 w-3" /> Preview</Button>}
                  {doc.allow_download && <Button size="sm" variant="outline" asChild><a href={doc.source_url} target="_blank" rel="noreferrer"><Download className="mr-1 h-3 w-3" /> Download</a></Button>}
                  {!doc.allow_preview && !doc.allow_download && <Badge variant="secondary">Restricted by admin</Badge>}
                  {isAdmin && <Button size="sm" onClick={() => toggleVisibility(doc)}>{doc.status === 'published' ? 'Hide' : 'Publish'}</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {visibleDocs.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-2" />No documents available for your permission profile.</CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}

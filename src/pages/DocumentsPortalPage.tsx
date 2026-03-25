import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
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
import { Shield, FileText, Eye, Download } from 'lucide-react';

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

  const visibleDocs = useMemo(() => {
    if (isAdmin) return docs;
    if (!isManagement || !user?.management_id) return [];
    return docs.filter((doc) => {
      if (doc.status === 'hidden') return false;
      if (doc.allowed_management_ids === 'all_management') return true;
      const allowed = String(doc.allowed_management_ids || '').split(',').map((v) => v.trim()).filter(Boolean);
      return allowed.includes(user.management_id || '');
    });
  }, [docs, isAdmin, isManagement, user?.management_id]);

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
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Shield className="h-5 w-5" /> Official Documents Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Secure library for governance records, circulars, and approved tournament files with role-based access control.</p>
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
              <div className="md:col-span-2"><Label>Access</Label><Input value={accessList} onChange={(e) => setAccessList(e.target.value)} placeholder="all_management or comma separated management IDs" /></div>
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
                    <p className="font-semibold">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.department}</p>
                  </div>
                  <Badge variant={doc.status === 'published' ? 'default' : 'secondary'}>{doc.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{doc.category}</Badge>
                  <Badge variant="outline">Access: {doc.allowed_management_ids}</Badge>
                </div>
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

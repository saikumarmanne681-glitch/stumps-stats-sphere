import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { AnnouncementTicker } from '@/components/AnnouncementTicker';
import { VerticalAnnouncementsBox } from '@/components/VerticalAnnouncementsBox';
import { useAuth } from '@/lib/auth';
import { v2api, logAudit } from '@/lib/v2api';
import { generateId } from '@/lib/utils';
import { OfficialDocumentRecord, ManagementUser } from '@/lib/v2types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { FileText, Eye, Download, Sparkles, LockKeyhole, Building2, CalendarClock, ShieldCheck } from 'lucide-react';
import { formatSheetDate } from '@/lib/dataUtils';
import { DepartmentBadge } from '@/components/DepartmentBadge';
import { DEPARTMENT_CATALOG, getDepartmentById, getDepartmentByName } from '@/lib/departmentCatalog';
import { PageHeader } from '@/components/PageHeader';

const categories = ['Governance', 'Tournament', 'Finance', 'Legal', 'Operations'] as const;
const documentDepartmentOptions = DEPARTMENT_CATALOG.map((entry) => ({ id: entry.id, name: entry.name }));

const repoDocuments = import.meta.glob('../../docs/*.{pdf,PDF,doc,docx,txt,md}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

interface DocumentSecurityProfile {
  viewOnly: boolean;
  allowPreview: boolean;
  allowDownload: boolean;
  allowPrint: boolean;
  watermark: boolean;
  disableCopy: boolean;
  disableRightClick: boolean;
  blurWhenInactive: boolean;
  expiryEnabled: boolean;
  expiryAt: string;
  maxViewsEnabled: boolean;
  maxViews: number;
  blockScreenCaptureWarning: boolean;
  requireReasonToOpen: boolean;
  requireTwoStepConfirm: boolean;
  forceReauthPrompt: boolean;
  geoFenceHint: boolean;
  ipAllowlistHint: boolean;
  timeWindowEnabled: boolean;
  openFromHour: string;
  closeAtHour: string;
  allowAnnotation: boolean;
  redactSensitiveLayer: boolean;
  pinRequiredHint: boolean;
  tamperHashVisible: boolean;
  autoCloseOnIdle: boolean;
  idleMinutes: number;
  auditEveryAction: boolean;
  openInSandboxedFrame: boolean;
  downloadRequiresApprovalHint: boolean;
}

interface DocumentSecurityProfileRow {
  document_id: string;
  profile_json: string;
  updated_by: string;
  updated_at: string;
}

const defaultSecurityProfile: DocumentSecurityProfile = {
  viewOnly: true,
  allowPreview: true,
  allowDownload: false,
  allowPrint: false,
  watermark: true,
  disableCopy: true,
  disableRightClick: true,
  blurWhenInactive: true,
  expiryEnabled: false,
  expiryAt: '',
  maxViewsEnabled: false,
  maxViews: 50,
  blockScreenCaptureWarning: true,
  requireReasonToOpen: true,
  requireTwoStepConfirm: true,
  forceReauthPrompt: true,
  geoFenceHint: false,
  ipAllowlistHint: false,
  timeWindowEnabled: false,
  openFromHour: '08:00',
  closeAtHour: '20:00',
  allowAnnotation: false,
  redactSensitiveLayer: false,
  pinRequiredHint: false,
  tamperHashVisible: true,
  autoCloseOnIdle: true,
  idleMinutes: 5,
  auditEveryAction: true,
  openInSandboxedFrame: true,
  downloadRequiresApprovalHint: true,
};

const storageKeyForCounter = (docId: string) => `doc-security-counter:${docId}`;

export default function DocumentsPortalPage() {
  const { user, isAdmin, isManagement } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<OfficialDocumentRecord[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('Governance');
  const [departmentId, setDepartmentId] = useState('executive_board');
  const [sourceUrl, setSourceUrl] = useState('');
  const [accessRuleMode, setAccessRuleMode] = useState<'all_management' | 'admin_only' | 'custom'>('all_management');
  const [selectedManagementIds, setSelectedManagementIds] = useState<string[]>([]);
  const [manualAccessTokens, setManualAccessTokens] = useState('');
  const [editingId, setEditingId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [securityProfile, setSecurityProfile] = useState<DocumentSecurityProfile>(defaultSecurityProfile);
  const [securityRows, setSecurityRows] = useState<DocumentSecurityProfileRow[]>([]);
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [sessionReason, setSessionReason] = useState('');
  const [securityConfirmed, setSecurityConfirmed] = useState(false);
  const [securityStep2Confirmed, setSecurityStep2Confirmed] = useState(false);
  const [previewCandidateIndex, setPreviewCandidateIndex] = useState(0);

  const refresh = async () => {
    const rows = await v2api.getCustomSheet<OfficialDocumentRecord>('OFFICIAL_DOCUMENTS');
    setDocs(rows.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')));
  };

  const refreshSecurityProfiles = async () => {
    const rows = await v2api.getCustomSheet<DocumentSecurityProfileRow>('DOCUMENT_SECURITY_PROFILES');
    setSecurityRows(rows);
  };

  const refreshManagementUsers = async () => {
    const rows = await v2api.getManagementUsers();
    setManagementUsers(rows.filter((entry) => String(entry.status || 'active').toLowerCase() === 'active'));
  };

  useEffect(() => {
    void refresh();
    void refreshSecurityProfiles();
    void refreshManagementUsers();
  }, []);

  const buildAccessList = () => {
    if (accessRuleMode === 'all_management') return 'all_management';
    if (accessRuleMode === 'admin_only') return 'admin_only';
    const customTokens = manualAccessTokens
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
    return [...selectedManagementIds, ...customTokens].join(',');
  };

  const repoDocRows = useMemo<OfficialDocumentRecord[]>(() => {
    const now = new Date().toISOString();
    return Object.entries(repoDocuments)
      .map(([path, src], index) => {
        const filename = path.split('/').pop() || `repo-doc-${index + 1}.pdf`;
        const titleText = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
        return {
          document_id: `REPO_${filename.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()}`,
          title: titleText,
          category: 'Governance',
          department_id: 'executive_board',
          department: 'Executive Board',
          source_url: src,
          source_type: 'repository',
          status: 'published',
          allowed_management_ids: 'admin_only',
          allow_preview: true,
          allow_download: false,
          created_by: 'system_repo_sync',
          created_at: now,
          updated_at: now,
        } satisfies OfficialDocumentRecord;
      })
      .sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  const mergedDocs = useMemo(() => {
    const rowById = new Map<string, OfficialDocumentRecord>();
    repoDocRows.forEach((doc) => rowById.set(doc.document_id, doc));
    docs.forEach((doc) => rowById.set(doc.document_id, doc));
    return [...rowById.values()].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
  }, [docs, repoDocRows]);

  const getStoredDocument = (documentId: string) => docs.find((item) => item.document_id === documentId) || null;

  const hasDocumentAccess = (doc: OfficialDocumentRecord) => {
    if (isAdmin) return true;
    if (!isManagement || !user) return false;
    if (doc.status === 'hidden') return false;

    const allowlist = String(doc.allowed_management_ids || '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
    if (allowlist.length === 0) return false;
    if (allowlist.includes('all_management')) return true;

    const designation = String(user.designation || '').toLowerCase();
    const username = String(user.username || '').toLowerCase();
    const managementId = String(user.management_id || '').toLowerCase();
    const authorityLevel = Number(user.authority_level || 0);

    return allowlist.some((entry) => (
      entry === managementId
      || entry === username
      || entry === designation
      || (entry.startsWith('designation:') && entry.slice(12) === designation)
      || (entry.startsWith('authority>=') && authorityLevel >= Number(entry.replace('authority>=', '')))
    ));
  };

  const visibleDocs = useMemo(() => mergedDocs.filter(hasDocumentAccess), [mergedDocs, isAdmin, isManagement, user]);
  const latestVisibleDocs = useMemo(() => visibleDocs.slice(0, 10), [visibleDocs]);

  const selectedDoc = useMemo(() => visibleDocs.find((doc) => doc.document_id === selectedDocId) || null, [selectedDocId, visibleDocs]);
  const previewCandidates = useMemo(() => (selectedDoc ? getPreviewCandidates(selectedDoc) : []), [selectedDoc]);

  const resolveDocDepartmentId = (doc: OfficialDocumentRecord) => {
    if (doc.department_id) return doc.department_id;
    return getDepartmentByName(doc.department)?.id || 'general';
  };

  const loadProfileForDoc = (docId: string) => {
    const row = securityRows.find((entry) => entry.document_id === docId);
    const raw = row?.profile_json || '';
    if (!raw) return { ...defaultSecurityProfile };
    try {
      return { ...defaultSecurityProfile, ...(JSON.parse(raw) as Partial<DocumentSecurityProfile>) };
    } catch {
      return { ...defaultSecurityProfile };
    }
  };

  useEffect(() => {
    if (!selectedDocId) return;
    setSecurityProfile(loadProfileForDoc(selectedDocId));
    setSecurityConfirmed(false);
    setSecurityStep2Confirmed(false);
    setSessionReason('');
    setPreviewCandidateIndex(0);
  }, [selectedDocId, securityRows]);

  useEffect(() => {
    if (previewCandidateIndex < previewCandidates.length) return;
    setPreviewCandidateIndex(0);
  }, [previewCandidateIndex, previewCandidates.length]);

  const saveSecurityProfile = async () => {
    if (!selectedDocId || !isAdmin) return;
    const payload: DocumentSecurityProfileRow = {
      document_id: selectedDocId,
      profile_json: JSON.stringify(securityProfile),
      updated_by: user?.username || 'admin',
      updated_at: new Date().toISOString(),
    };
    const exists = securityRows.some((entry) => entry.document_id === selectedDocId);
    const ok = exists
      ? await v2api.updateCustomSheetRow('DOCUMENT_SECURITY_PROFILES', payload)
      : await v2api.addCustomSheetRow('DOCUMENT_SECURITY_PROFILES', payload);
    if (ok) {
      toast({ title: 'Security profile saved' });
      await refreshSecurityProfiles();
    } else {
      toast({ title: 'Unable to save security profile', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const onContext = (event: MouseEvent) => {
      if (selectedDoc && securityProfile.disableRightClick) {
        event.preventDefault();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (!selectedDoc) return;
      const isPrint = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p';
      const isSave = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
      const isCopy = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c';
      if ((!securityProfile.allowPrint && isPrint) || (securityProfile.viewOnly && isSave) || (securityProfile.disableCopy && isCopy)) {
        event.preventDefault();
        toast({ title: 'Security policy active', description: 'That action is blocked by document controls.', variant: 'destructive' });
      }
    };
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedDoc, securityProfile, toast]);

  useEffect(() => {
    if (!selectedDoc || !securityProfile.autoCloseOnIdle) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setSelectedDocId('');
        toast({ title: 'Session locked', description: `Viewer auto-locked after ${securityProfile.idleMinutes} min idle time.` });
      }, securityProfile.idleMinutes * 60 * 1000);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [selectedDoc, securityProfile.autoCloseOnIdle, securityProfile.idleMinutes, toast]);

  const addDocument = async () => {
    if (!isAdmin) return;
    if (!title.trim()) {
      toast({ title: 'Document title is required', variant: 'destructive' });
      return;
    }
    if (!sourceUrl.trim()) {
      toast({ title: 'Source URL is required for preview', variant: 'destructive' });
      return;
    }
    const row: OfficialDocumentRecord = {
      document_id: generateId('DOC'),
      title: title.trim(),
      category,
      department_id: departmentId,
      department: getDepartmentById(departmentId)?.name || 'General',
      source_url: sourceUrl.trim(),
      source_type: 'repository',
      status: 'published',
      allowed_management_ids: buildAccessList() || 'all_management',
      allow_preview: true,
      allow_download: false,
      created_by: user?.username || 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const ok = await v2api.addCustomSheetRow('OFFICIAL_DOCUMENTS', row);
    if (!ok) {
      toast({ title: 'Unable to save document policy', description: 'Please check OFFICIAL_DOCUMENTS sheet mapping.', variant: 'destructive' });
      return;
    }
    logAudit(user?.username || 'admin', 'document_create', 'document', row.document_id, JSON.stringify({ category, department_id: row.department_id, allowed: row.allowed_management_ids }));
    setTitle('');
    setSelectedManagementIds([]);
    setManualAccessTokens('');
    setAccessRuleMode('all_management');
    setSourceUrl('');
    toast({ title: 'Document policy added' });
    refresh();
  };

  const toggleVisibility = async (doc: OfficialDocumentRecord) => {
    if (!isAdmin) return;
    const existing = getStoredDocument(doc.document_id);
    const payload: OfficialDocumentRecord = {
      ...(existing || doc),
      source_url: existing?.source_url || doc.source_url,
      source_type: existing?.source_type || doc.source_type || 'repository',
      status: doc.status === 'published' ? 'hidden' : 'published',
      updated_at: new Date().toISOString(),
      created_by: existing?.created_by || user?.username || 'admin',
      created_at: existing?.created_at || doc.created_at || new Date().toISOString(),
    };
    const ok = existing
      ? await v2api.updateCustomSheetRow('OFFICIAL_DOCUMENTS', payload)
      : await v2api.addCustomSheetRow('OFFICIAL_DOCUMENTS', payload);
    if (!ok) {
      toast({ title: 'Unable to update visibility', variant: 'destructive' });
      return;
    }
    logAudit(user?.username || 'admin', 'document_visibility_toggle', 'document', doc.document_id, JSON.stringify({ status: payload.status }));
    refresh();
  };

  const loadForEdit = (doc: OfficialDocumentRecord) => {
    setEditingId(doc.document_id);
    setTitle(doc.title || '');
    setCategory((categories.includes(doc.category as (typeof categories)[number]) ? doc.category : 'Governance') as (typeof categories)[number]);
    setDepartmentId(resolveDocDepartmentId(doc));
    setSourceUrl(doc.source_url || '');
    const tokens = String(doc.allowed_management_ids || 'all_management').split(',').map((token) => token.trim()).filter(Boolean);
    if (tokens.includes('all_management') || tokens.length === 0) {
      setAccessRuleMode('all_management');
      setSelectedManagementIds([]);
      setManualAccessTokens('');
    } else if (tokens.includes('admin_only')) {
      setAccessRuleMode('admin_only');
      setSelectedManagementIds([]);
      setManualAccessTokens('');
    } else {
      const knownIds = new Set(managementUsers.map((entry) => String(entry.management_id || '').trim()).filter(Boolean));
      const pickedIds = tokens.filter((token) => knownIds.has(token));
      const manual = tokens.filter((token) => !knownIds.has(token)).join(', ');
      setAccessRuleMode('custom');
      setSelectedManagementIds(pickedIds);
      setManualAccessTokens(manual);
    }
  };

  const clearEditor = () => {
    setEditingId('');
    setTitle('');
    setCategory('Governance');
    setDepartmentId('executive_board');
    setSourceUrl('');
    setAccessRuleMode('all_management');
    setSelectedManagementIds([]);
    setManualAccessTokens('');
  };

  const saveEditedDocument = async () => {
    if (!isAdmin || !editingId) return;
    const existing = getStoredDocument(editingId);
    const baseDoc = mergedDocs.find((item) => item.document_id === editingId);
    if (!baseDoc) return;
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!sourceUrl.trim()) {
      toast({ title: 'Source URL is required for preview', variant: 'destructive' });
      return;
    }
    const payload: OfficialDocumentRecord = {
      ...(existing || baseDoc),
      title: title.trim(),
      category,
      department_id: departmentId,
      department: getDepartmentById(departmentId)?.name || 'General',
      allowed_management_ids: buildAccessList() || 'all_management',
      source_url: sourceUrl.trim(),
      updated_at: new Date().toISOString(),
    };
    const ok = existing
      ? await v2api.updateCustomSheetRow('OFFICIAL_DOCUMENTS', payload)
      : await v2api.addCustomSheetRow('OFFICIAL_DOCUMENTS', payload);
    if (!ok) {
      toast({ title: 'Unable to update document', variant: 'destructive' });
      return;
    }
    logAudit(user?.username || 'admin', 'document_update', 'document', payload.document_id, JSON.stringify({ category: payload.category, department_id: payload.department_id, allowed: payload.allowed_management_ids }));
    toast({ title: 'Document updated' });
    clearEditor();
    refresh();
  };

  const deleteDocument = async (doc: OfficialDocumentRecord) => {
    if (!isAdmin) return;
    const existing = getStoredDocument(doc.document_id);
    if (!existing) {
      toast({ title: 'Cannot delete repository file', description: 'Delete the file from /docs in the repository to remove it.', variant: 'destructive' });
      return;
    }
    const confirmed = window.confirm(`Delete document "${doc.title}"?`);
    if (!confirmed) return;
    const ok = await v2api.deleteCustomSheetRow('OFFICIAL_DOCUMENTS', existing);
    if (!ok) {
      toast({ title: 'Unable to delete document', variant: 'destructive' });
      return;
    }
    logAudit(user?.username || 'admin', 'document_delete', 'document', doc.document_id, JSON.stringify({ title: doc.title }));
    if (editingId === doc.document_id) clearEditor();
    toast({ title: 'Document deleted' });
    refresh();
  };

  const incrementViewCounter = (docId: string) => {
    const next = Number(localStorage.getItem(storageKeyForCounter(docId)) || '0') + 1;
    localStorage.setItem(storageKeyForCounter(docId), String(next));
    return next;
  };

  const canOpenSelectedDocument = (doc: OfficialDocumentRecord) => {
    const now = new Date();
    if (securityProfile.expiryEnabled && securityProfile.expiryAt && now > new Date(securityProfile.expiryAt)) return false;
    if (securityProfile.timeWindowEnabled) {
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (hhmm < securityProfile.openFromHour || hhmm > securityProfile.closeAtHour) return false;
    }
    if (securityProfile.requireReasonToOpen && !sessionReason.trim()) return false;
    if (securityProfile.requireTwoStepConfirm && !securityStep2Confirmed) return false;
    if (securityProfile.forceReauthPrompt && !securityConfirmed) return false;
    if (securityProfile.maxViewsEnabled) {
      const views = Number(localStorage.getItem(storageKeyForCounter(doc.document_id)) || '0');
      if (views >= securityProfile.maxViews) return false;
    }
    return true;
  };

  const openSelectedDocument = () => {
    if (!selectedDoc) return;
    if (!canOpenSelectedDocument(selectedDoc)) {
      toast({ title: 'Access blocked by policy', description: 'This document is currently locked due to active security rules.', variant: 'destructive' });
      return;
    }
    incrementViewCounter(selectedDoc.document_id);
    if (securityProfile.auditEveryAction) {
      logAudit(user?.username || 'unknown', 'document_open', 'document', selectedDoc.document_id, JSON.stringify({ reason: sessionReason || 'n/a', source_type: selectedDoc.source_type }));
    }
    toast({ title: 'Secure viewer unlocked', description: 'Document opened with current security controls.' });
  };

  function getPreviewCandidates(doc: OfficialDocumentRecord) {
    const raw = String(doc.source_url || '').trim();
    if (!raw) return [];
    const absolute = raw.startsWith('http') ? raw : `${window.location.origin}${raw.startsWith('/') ? '' : '/'}${raw}`;
    const candidates = [absolute];
    if (/\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(absolute) && absolute.startsWith('http')) {
      candidates.push(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absolute)}`);
    }
    return [...new Set(candidates)];
  }

  const handleSecureDownload = (doc: OfficialDocumentRecord) => {
    if (!securityProfile.allowDownload || securityProfile.viewOnly) {
      toast({ title: 'Download blocked', description: 'Current security policy does not allow downloads.', variant: 'destructive' });
      return;
    }
    const source = String(doc.source_url || '').trim();
    if (!source) {
      toast({ title: 'Missing document source', variant: 'destructive' });
      return;
    }
    const absolute = source.startsWith('http') ? source : `${window.location.origin}${source}`;
    const actor = user?.management_id || user?.username || 'unknown-user';
    const watermark = `${actor} • ${new Date().toISOString()} • ${doc.document_id}`;
    const link = document.createElement('a');
    link.href = absolute;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    link.remove();

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
    if (printWindow) {
      printWindow.document.write(`<!doctype html><html><head><title>Secured Document Print</title><style>body{margin:0;font-family:sans-serif}.wm{position:fixed;inset:0;display:grid;place-items:center;font-size:18px;opacity:.14;transform:rotate(-24deg);pointer-events:none}.top{padding:8px 12px;background:#111;color:#fff;font-size:12px}iframe{border:0;width:100%;height:calc(100vh - 34px)}</style></head><body><div class="top">Protected copy • ${watermark}</div><div class="wm">${watermark}</div><iframe src="${absolute}"></iframe></body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 1200);
    }
    logAudit(user?.username || 'unknown', 'document_download', 'document', doc.document_id, JSON.stringify({ watermark }));
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
              <PageHeader route="/documents-portal" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-background/80">Repository documents: {repoDocRows.length}</Badge>
                <Badge variant="outline" className="bg-background/80">Visible for admin: {visibleDocs.length}</Badge>
                <Badge variant="outline" className="bg-background/80">Strict admin only: Enabled</Badge>
              </div>
              <p className="text-sm text-muted-foreground">All documents are loaded from the repository <code>/docs</code> folder. Admin can apply granular security controls per document profile.</p>
            </CardContent>
          </Card>
          <VerticalAnnouncementsBox />
        </div>

        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Quick Access · Latest Repository Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {latestVisibleDocs.map((doc) => (
                <div key={`scroll-${doc.document_id}`} className="min-w-[280px] rounded-xl border border-primary/20 bg-background/80 p-3 shadow-sm">
                  <p className="line-clamp-2 text-sm font-semibold">{doc.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    <DepartmentBadge department={doc.department} departmentId={resolveDocDepartmentId(doc)} className="h-6 px-2 py-0 text-[10px]" />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" /> Updated {formatSheetDate(doc.updated_at, 'dd MMM yyyy', doc.updated_at)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{doc.category}</Badge>
                    <Badge variant={doc.status === 'published' ? 'default' : 'secondary'}>{doc.status}</Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedDocId(doc.document_id)}><Eye className="mr-1 h-3 w-3" />Secure View</Button>
                  </div>
                </div>
              ))}
              {latestVisibleDocs.length === 0 && (
                <div className="min-w-[280px] rounded-xl border border-dashed p-5 text-sm text-muted-foreground">No documents available for quick access.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card>
            <CardHeader><CardTitle>{editingId ? 'Edit Document Policy' : 'Add Document Policy'}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Board circular / policy / schedule" /></div>
              <div><Label>Category</Label><Select value={category} onValueChange={(v) => setCategory(v as (typeof categories)[number])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categories.map((item) => <SelectItem value={item} key={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Department</Label><Select value={departmentId} onValueChange={setDepartmentId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{documentDepartmentOptions.map((option) => <SelectItem value={option.id} key={option.id}>{option.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="md:col-span-2"><Label>Source URL (required for preview)</Label><Input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="/docs/ICC 2017.pdf or https://..." /></div>
              <div>
                <Label>Access Mode</Label>
                <Select value={accessRuleMode} onValueChange={(value) => setAccessRuleMode(value as 'all_management' | 'admin_only' | 'custom')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_management">All Management</SelectItem>
                    <SelectItem value="admin_only">Admin Only</SelectItem>
                    <SelectItem value="custom">Custom Selection</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {accessRuleMode === 'custom' && (
                <>
                  <div className="md:col-span-3 rounded-md border p-3 space-y-2">
                    <p className="text-xs font-medium">Select management users with access</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {managementUsers.map((entry) => {
                        const key = String(entry.management_id);
                        const checked = selectedManagementIds.includes(key);
                        return (
                          <label key={entry.management_id} className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) => setSelectedManagementIds((prev) => (next ? [...prev, key] : prev.filter((id) => id !== key)))}
                            />
                            <span>{entry.name} · {entry.designation} <span className="text-muted-foreground">({entry.management_id})</span></span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <Label>Extra Access Rules (optional)</Label>
                    <Input value={manualAccessTokens} onChange={(e) => setManualAccessTokens(e.target.value)} placeholder="username, designation:treasurer, authority>=7" />
                  </div>
                </>
              )}
              <div className="md:col-span-3 text-xs text-muted-foreground rounded-md border p-3">Repository documents are loaded automatically from <code>/docs</code>. This form manages permission policy metadata.</div>
              <div className="md:col-span-1 flex items-end gap-2">
                {editingId ? (
                  <>
                    <Button onClick={saveEditedDocument} className="w-full">Save Changes</Button>
                    <Button variant="outline" onClick={clearEditor} className="w-full">Cancel</Button>
                  </>
                ) : (
                  <Button onClick={addDocument} className="w-full">Save Policy</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 grid gap-4 md:grid-cols-2">
            {visibleDocs.map((doc) => (
              <Card key={doc.document_id} className="border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {doc.title}</p>
                      <div className="mt-1"><DepartmentBadge department={doc.department} departmentId={resolveDocDepartmentId(doc)} className="text-[10px]" /></div>
                    </div>
                    <Badge variant={doc.status === 'published' ? 'default' : 'secondary'}>{doc.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{doc.category}</Badge>
                    {isAdmin && <Badge variant="outline"><LockKeyhole className="mr-1 h-3 w-3" />Access: {doc.allowed_management_ids}</Badge>}
                    <Badge variant="outline">Source: {doc.source_type}</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => setSelectedDocId(doc.document_id)}><Eye className="mr-1 h-3 w-3" /> Secure View</Button>
                    {isAdmin && <Button size="sm" onClick={() => void toggleVisibility(doc)}>{doc.status === 'published' ? 'Hide' : 'Publish'}</Button>}
                    {isAdmin && <Button size="sm" variant="secondary" onClick={() => loadForEdit(doc)}>Edit</Button>}
                    {isAdmin && <Button size="sm" variant="destructive" onClick={() => void deleteDocument(doc)}>Delete</Button>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {visibleDocs.length === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-2" />No documents available for your permission profile.</CardContent></Card>
            )}
          </div>

          <Card className="lg:col-span-2 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Document Security Console</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedDoc && <p className="text-sm text-muted-foreground">Select a document to configure or enforce secure-view controls.</p>}
              {selectedDoc && (
                <>
                  <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                    <p className="font-medium">{selectedDoc.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{selectedDoc.document_id}</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {([
                      ['View only mode', 'viewOnly'],
                      ['Preview allowed', 'allowPreview'],
                      ['Download allowed', 'allowDownload'],
                      ['Print allowed', 'allowPrint'],
                      ['Dynamic watermark', 'watermark'],
                      ['Disable copy shortcuts', 'disableCopy'],
                      ['Disable right-click menu', 'disableRightClick'],
                      ['Blur when tab inactive', 'blurWhenInactive'],
                      ['Screen-capture warning', 'blockScreenCaptureWarning'],
                      ['Reason required to open', 'requireReasonToOpen'],
                      ['Two-step security confirmation', 'requireTwoStepConfirm'],
                      ['Force re-auth confirmation', 'forceReauthPrompt'],
                      ['Geo-fence hint flag', 'geoFenceHint'],
                      ['IP allowlist hint flag', 'ipAllowlistHint'],
                      ['Time-window enforcement', 'timeWindowEnabled'],
                      ['Annotation allowed', 'allowAnnotation'],
                      ['Redaction overlay enabled', 'redactSensitiveLayer'],
                      ['PIN required hint flag', 'pinRequiredHint'],
                      ['Visible tamper hash badge', 'tamperHashVisible'],
                      ['Auto close on idle', 'autoCloseOnIdle'],
                      ['Audit every action', 'auditEveryAction'],
                      ['Open in sandboxed iframe', 'openInSandboxedFrame'],
                      ['Download requires approval hint', 'downloadRequiresApprovalHint'],
                      ['Expiry policy enabled', 'expiryEnabled'],
                      ['Max-view cap enabled', 'maxViewsEnabled'],
                    ] as Array<[string, keyof DocumentSecurityProfile]>).map(([label, key]) => (
                      <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <p className="text-xs">{label}</p>
                        <Switch checked={Boolean(securityProfile[key])} onCheckedChange={(checked) => setSecurityProfile((prev) => ({ ...prev, [key]: checked }))} disabled={!isAdmin} />
                      </div>
                    ))}
                  </div>

                  {securityProfile.expiryEnabled && (
                    <div>
                      <Label>Expiry date/time (UTC)</Label>
                      <Input type="datetime-local" value={securityProfile.expiryAt} onChange={(e) => setSecurityProfile((prev) => ({ ...prev, expiryAt: e.target.value }))} />
                    </div>
                  )}
                  {securityProfile.maxViewsEnabled && (
                    <div>
                      <Label>Maximum opens</Label>
                      <Input type="number" min={1} value={securityProfile.maxViews} onChange={(e) => setSecurityProfile((prev) => ({ ...prev, maxViews: Number(e.target.value || 1) }))} />
                    </div>
                  )}
                  {securityProfile.timeWindowEnabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Open from</Label><Input type="time" value={securityProfile.openFromHour} onChange={(e) => setSecurityProfile((prev) => ({ ...prev, openFromHour: e.target.value }))} /></div>
                      <div><Label>Close at</Label><Input type="time" value={securityProfile.closeAtHour} onChange={(e) => setSecurityProfile((prev) => ({ ...prev, closeAtHour: e.target.value }))} /></div>
                    </div>
                  )}
                  {securityProfile.autoCloseOnIdle && (
                    <div>
                      <Label>Idle timeout (minutes)</Label>
                      <Input type="number" min={1} max={60} value={securityProfile.idleMinutes} onChange={(e) => setSecurityProfile((prev) => ({ ...prev, idleMinutes: Number(e.target.value || 5) }))} />
                    </div>
                  )}
                  {securityProfile.requireReasonToOpen && (
                    <div>
                      <Label>Reason for access</Label>
                      <Input value={sessionReason} onChange={(e) => setSessionReason(e.target.value)} placeholder="Enter access justification" />
                    </div>
                  )}
                  {securityProfile.forceReauthPrompt && (
                    <div className="flex items-center gap-2 text-xs">
                      <Switch checked={securityConfirmed} onCheckedChange={setSecurityConfirmed} />
                      I reconfirm this viewing is authorized.
                    </div>
                  )}
                  {securityProfile.requireTwoStepConfirm && (
                    <div className="flex items-center gap-2 text-xs">
                      <Switch checked={securityStep2Confirmed} onCheckedChange={setSecurityStep2Confirmed} />
                      I understand activity is audited and traceable.
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={openSelectedDocument} className="flex-1"><Eye className="mr-1 h-4 w-4" />Unlock Secure Viewer</Button>
                    {securityProfile.allowDownload && !securityProfile.viewOnly ? (
                      <Button variant="outline" onClick={() => handleSecureDownload(selectedDoc)}><Download className="mr-1 h-4 w-4" />Download + Watermark</Button>
                    ) : (
                      <Button variant="outline" disabled>Download Blocked</Button>
                    )}
                    {isAdmin && <Button variant="secondary" onClick={() => void saveSecurityProfile()}>Save Security</Button>}
                  </div>
                  {securityProfile.allowPreview && previewCandidates.length > 0 && (
                    <div className={`relative overflow-hidden rounded-xl border ${securityProfile.blurWhenInactive ? 'transition-all' : ''}`}>
                      {securityProfile.watermark && (
                        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center opacity-20 text-sm font-semibold rotate-[-20deg]">
                          CONFIDENTIAL · {user?.username || 'admin'} · {selectedDoc.document_id}
                        </div>
                      )}
                      <p className="px-3 py-2 text-xs text-muted-foreground">Simple preview mode. If it does not load, open it in a new tab.</p>
                      <iframe
                        title={`${selectedDoc.title} preview`}
                        src={previewCandidates[previewCandidateIndex] || previewCandidates[0]}
                        className={`w-full ${securityProfile.disableCopy ? 'select-none' : ''}`}
                        style={{ height: 'min(78vh, calc(100vw * 1.2))', minHeight: 420 }}
                      />
                    </div>
                  )}
                  {securityProfile.allowPreview && previewCandidates.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewCandidateIndex((idx) => (idx + 1) % previewCandidates.length)}
                      >
                        Try alternate preview
                      </Button>
                      <Button type="button" size="sm" variant="ghost" asChild>
                        <a href={previewCandidates[previewCandidateIndex] || previewCandidates[0]} target="_blank" rel="noreferrer">Open preview in new tab</a>
                      </Button>
                    </div>
                  )}
                  {securityProfile.allowPreview && previewCandidates.length === 0 && (
                    <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">Preview unavailable: missing source URL for this document.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { v2api, logAudit } from '@/lib/v2api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApproverRole, CertificateApprovalRecord, CertificateRecord, approverLabel, canFinalize, deriveApprovalStatus, mapDesignationToApproverRole, normalizeCertificateStatus } from '@/lib/certificates';
import { CertificatePreview } from './CertificatePreview';
import { sendSystemEmail, getAdminNotificationRecipient } from '@/lib/mailer';
import { CheckCircle2, XCircle, Eye, Loader2, ShieldCheck, Award, Clock, AlertCircle } from 'lucide-react';

interface Props {
  mode: 'admin' | 'approver';
}

export function ApprovalPanel({ mode }: Props) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [approvals, setApprovals] = useState<CertificateApprovalRecord[]>([]);
  const [templates, setTemplates] = useState<Record<string, { template_name?: string; image_url?: string }>>({});
  const [selected, setSelected] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  const myRole = mapDesignationToApproverRole(user?.designation, user?.role);

  const load = async () => {
    setLoading(true);
    const [cRows, aRows, tRows] = await Promise.all([v2api.getCertificates(), v2api.getCertificateApprovals(), v2api.getCertificateTemplates()]);
    setCertificates(cRows);
    setApprovals(aRows);
    setTemplates(Object.fromEntries(tRows.map((row) => [row.template_id, row])));
    setSelected((prev) => cRows.find((item) => item.id === prev?.id) || null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const handleCertificatesChanged = () => { load(); };
    window.addEventListener('certificates:changed', handleCertificatesChanged);
    return () => window.removeEventListener('certificates:changed', handleCertificatesChanged);
  }, []);

  const pending = useMemo(() => certificates.filter((item) => {
    const status = normalizeCertificateStatus(item.status);
    return status === 'PENDING_APPROVAL';
  }), [certificates]);

  const approved = useMemo(() => certificates.filter((item) => {
    const status = normalizeCertificateStatus(item.status);
    return status === 'APPROVED';
  }), [certificates]);

  const certified = useMemo(() => certificates.filter((item) => {
    const status = normalizeCertificateStatus(item.status);
    return status === 'CERTIFIED';
  }), [certificates]);

  const rejected = useMemo(() => certificates.filter((item) => {
    const status = normalizeCertificateStatus(item.status);
    return status === 'REJECTED';
  }), [certificates]);

  const rows = useMemo(() => {
    if (mode === 'admin') {
      if (activeTab === 'pending') return pending;
      if (activeTab === 'approved') return approved;
      if (activeTab === 'certified') return certified;
      if (activeTab === 'rejected') return rejected;
      return certificates.filter((item) => {
        const status = normalizeCertificateStatus(item.status);
        return !!status && ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CERTIFIED'].includes(status);
      });
    }
    if (!myRole) return [];
    return certificates.filter((item) => {
      if (normalizeCertificateStatus(item.status) !== 'PENDING_APPROVAL') return false;
      const status = deriveApprovalStatus(approvals.filter((row) => row.certificate_id === item.id));
      return status[myRole] === 'pending';
    });
  }, [approvals, certificates, mode, myRole, activeTab, pending, approved, certified, rejected]);

  const approve = async (certificate: CertificateRecord, decision: 'approved' | 'rejected') => {
    if (!myRole || mode !== 'approver') return;
    setActionLoading(`${certificate.id}:${decision}`);
    try {
      const existingApproval = approvals.find((item) => item.certificate_id === certificate.id && item.role === myRole);
      const payload: CertificateApprovalRecord = {
        certificate_id: certificate.id,
        role: myRole,
        status: decision,
        approved_by: user?.management_id || user?.username || 'management',
        approved_at: new Date().toISOString(),
        remarks: '',
      };
      const ok = existingApproval
        ? await v2api.updateCertificateApproval(payload)
        : await v2api.addCertificateApproval(payload);
      if (!ok) {
        toast({ title: 'Action failed', description: 'Unable to update approval.', variant: 'destructive' });
        return;
      }
      const current = approvals.filter((item) => item.certificate_id === certificate.id && item.role !== myRole);
      const overall = deriveApprovalStatus([...current, payload]);
      const nextStatus: CertificateRecord['status'] = decision === 'rejected' ? 'REJECTED' : canFinalize(overall) ? 'APPROVED' : 'PENDING_APPROVAL';
      await v2api.updateCertificate({ ...certificate, status: nextStatus });
      const adminRecipient = getAdminNotificationRecipient();
      if (adminRecipient) {
        await sendSystemEmail({
          to: adminRecipient,
          subject: `Certificate ${decision}: ${certificate.id}`,
          htmlBody: `<p>${approverLabel(myRole)} ${decision} certificate <strong>${certificate.id}</strong>.</p>`,
          diagnostics: { triggerSource: 'certificate_approval_update', triggerEntityType: 'certificate', triggerEntityId: certificate.id, triggeredBy: user?.username || 'management' },
        });
      }
      logAudit(user?.management_id || user?.username || 'management', `certificate_${decision}`, 'certificate', certificate.id, JSON.stringify({ role: myRole }));
      toast({ title: `Certificate ${decision}` });
      window.dispatchEvent(new CustomEvent('certificates:changed'));
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const finalize = async (certificate: CertificateRecord) => {
    setActionLoading(`${certificate.id}:finalize`);
    try {
      const payload: CertificateRecord = { ...certificate, status: 'CERTIFIED', certified_at: new Date().toISOString(), certified_by: user?.username || 'admin' };
      const ok = await v2api.updateCertificate(payload);
      if (!ok) {
        toast({ title: 'Finalize failed', variant: 'destructive' });
        return;
      }
      logAudit(user?.username || 'admin', 'certificate_certified', 'certificate', certificate.id);
      const adminRecipient = getAdminNotificationRecipient();
      if (adminRecipient) {
        await sendSystemEmail({ to: adminRecipient, subject: `Certificate certified: ${certificate.id}`, htmlBody: `<p>Certificate <strong>${certificate.id}</strong> has been fully certified.</p>` });
      }
      toast({ title: 'Certificate finalized', description: `${certificate.id} is now certified and visible on player/team dashboards.` });
      window.dispatchEvent(new CustomEvent('certificates:changed'));
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const directCertify = async (certificate: CertificateRecord) => {
    setActionLoading(`${certificate.id}:direct-certify`);
    try {
      // Admin bypasses approval chain and directly certifies
      const payload: CertificateRecord = {
        ...certificate,
        status: 'CERTIFIED',
        certified_at: new Date().toISOString(),
        certified_by: user?.username || 'admin',
        verification_code: certificate.verification_code || `VERIFY-${Date.now().toString(36).toUpperCase()}`,
      };
      const ok = await v2api.updateCertificate(payload);
      if (!ok) {
        toast({ title: 'Certification failed', variant: 'destructive' });
        return;
      }
      logAudit(user?.username || 'admin', 'certificate_direct_certified', 'certificate', certificate.id, 'Admin direct certification bypass');
      toast({ title: '✅ Certificate certified', description: `${certificate.id} is now certified and visible on dashboards.` });
      window.dispatchEvent(new CustomEvent('certificates:changed'));
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading certificates…</span>
        </CardContent>
      </Card>
    );
  }

  const renderCertificateCard = (certificate: CertificateRecord) => {
    const status = deriveApprovalStatus(approvals.filter((item) => item.certificate_id === certificate.id));
    const isSelected = selected?.id === certificate.id;
    const certStatus = normalizeCertificateStatus(certificate.status);
    const isCertified = certStatus === 'CERTIFIED';
    const isApproved = certStatus === 'APPROVED';
    const isPending = certStatus === 'PENDING_APPROVAL';

    return (
      <div key={certificate.id} className={`rounded-xl border p-4 transition-all duration-200 ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 hover:shadow-sm'}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Award className="h-4 w-4 text-accent shrink-0" />
              <p className="font-semibold text-sm">{certificate.type}</p>
            </div>
            <p className="mt-1 text-sm text-foreground font-medium">{certificate.recipient_name}</p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{certificate.id}</p>
            <p className="text-xs text-muted-foreground">{certificate.tournament} • {certificate.season}</p>
          </div>
          <Badge
            variant={isCertified ? 'default' : certStatus === 'REJECTED' ? 'destructive' : 'outline'}
            className={isCertified ? 'bg-primary' : ''}
          >
            {isCertified && <ShieldCheck className="h-3 w-3 mr-1" />}
            {isPending && <Clock className="h-3 w-3 mr-1" />}
            {certStatus === 'REJECTED' && <AlertCircle className="h-3 w-3 mr-1" />}
            {certStatus || certificate.status}
          </Badge>
        </div>

        {/* Approval chain */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(['treasurer', 'referee', 'tournament_director'] as ApproverRole[]).map((role) => {
            const s = status[role];
            return (
              <Badge
                key={`${certificate.id}:${role}`}
                variant={s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'outline'}
                className={`gap-1 text-[10px] ${s === 'approved' ? 'bg-primary/80' : ''}`}
              >
                {s === 'approved' && <CheckCircle2 className="h-2.5 w-2.5" />}
                {s === 'rejected' && <XCircle className="h-2.5 w-2.5" />}
                {approverLabel(role)}: {s}
              </Badge>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant={isSelected ? 'secondary' : 'outline'} onClick={() => setSelected(isSelected ? null : certificate)} className="text-xs">
            <Eye className="h-3 w-3 mr-1" /> {isSelected ? 'Hide' : 'Preview'}
          </Button>
          {mode === 'approver' && myRole && status[myRole] === 'pending' && (
            <>
              <Button
                size="sm"
                onClick={() => approve(certificate, 'approved')}
                disabled={!!actionLoading}
                loading={actionLoading === `${certificate.id}:approved`}
                className="text-xs"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => approve(certificate, 'rejected')}
                disabled={!!actionLoading}
                loading={actionLoading === `${certificate.id}:rejected`}
                className="text-xs"
              >
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
            </>
          )}
          {mode === 'admin' && !isCertified && isApproved && (
            <Button
              size="sm"
              onClick={() => finalize(certificate)}
              disabled={!canFinalize(status) || !!actionLoading}
              loading={actionLoading === `${certificate.id}:finalize`}
              className="text-xs"
            >
              <ShieldCheck className="h-3 w-3 mr-1" /> Finalize
            </Button>
          )}
          {mode === 'admin' && isAdmin && !isCertified && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => directCertify(certificate)}
              disabled={!!actionLoading}
              loading={actionLoading === `${certificate.id}:direct-certify`}
              className="text-xs"
            >
              <ShieldCheck className="h-3 w-3 mr-1" /> Certify Now
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {mode === 'admin' ? 'Certificate Approval Queue' : 'Certificates Awaiting Your Approval'}
            {certificates.length > 0 && <Badge className="ml-2 bg-primary">{certificates.length} total</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'admin' && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex flex-wrap h-auto gap-1">
                <TabsTrigger value="pending" className="text-xs gap-1">
                  <Clock className="h-3 w-3" /> Pending {pending.length > 0 && <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">{pending.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Approved {approved.length > 0 && <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">{approved.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="certified" className="text-xs gap-1">
                  <ShieldCheck className="h-3 w-3" /> Certified {certified.length > 0 && <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">{certified.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="rejected" className="text-xs gap-1">
                  <XCircle className="h-3 w-3" /> Rejected {rejected.length > 0 && <Badge variant="outline" className="ml-1 text-[10px] h-4 px-1">{rejected.length}</Badge>}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {rows.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Award className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {mode === 'admin'
                  ? activeTab === 'pending' ? 'No certificates pending approval. Create one from the Certificate Builder below.' : `No ${activeTab} certificates.`
                  : 'No certificates pending your approval.'}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {rows.map(renderCertificateCard)}
          </div>
        </CardContent>
      </Card>

      {/* Preview panel */}
      {selected && (
        <CertificatePreview
          certificate={selected}
          verificationUrl={`${window.location.origin}/verify?certificate_id=${encodeURIComponent(selected.id)}`}
          template={templates[selected.template_id]}
          watermark={normalizeCertificateStatus(selected.status) === 'CERTIFIED'}
          showDownload
          defaultExpanded
        />
      )}
    </div>
  );
}

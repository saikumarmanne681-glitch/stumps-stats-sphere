import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { v2api, logAudit } from '@/lib/v2api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ApproverRole, CertificateApprovalRecord, CertificateRecord, approverLabel, canFinalize, deriveApprovalStatus, mapDesignationToApproverRole, normalizeCertificateStatus } from '@/lib/certificates';
import { CertificatePreview } from './CertificatePreview';
import { sendSystemEmail, getAdminNotificationRecipient } from '@/lib/mailer';
import { CheckCircle2, XCircle, Eye, Loader2, ShieldCheck } from 'lucide-react';

interface Props {
  mode: 'admin' | 'approver';
}

export function ApprovalPanel({ mode }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [approvals, setApprovals] = useState<CertificateApprovalRecord[]>([]);
  const [templates, setTemplates] = useState<Record<string, { template_name?: string; image_url?: string }>>({});
  const [selected, setSelected] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    if (mode === 'admin') return certificates.filter((item) => {
      const status = normalizeCertificateStatus(item.status);
      return !!status && ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CERTIFIED'].includes(status);
    });
    if (!myRole) return [];
    return certificates.filter((item) => {
      if (normalizeCertificateStatus(item.status) !== 'PENDING_APPROVAL') return false;
      const status = deriveApprovalStatus(approvals.filter((row) => row.certificate_id === item.id));
      return status[myRole] === 'pending';
    });
  }, [approvals, certificates, mode, myRole]);

  const approve = async (certificate: CertificateRecord, decision: 'approved' | 'rejected') => {
    if (!myRole || mode !== 'approver') return;
    setActionLoading(`${certificate.id}:${decision}`);
    try {
      const payload: CertificateApprovalRecord = {
        certificate_id: certificate.id,
        role: myRole,
        status: decision,
        approved_by: user?.management_id || user?.username || 'management',
        approved_at: new Date().toISOString(),
        remarks: '',
      };
      const ok = await v2api.updateCertificateApproval(payload);
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
      await load();
    } finally {
      setActionLoading(null);
    }
  };

  const finalize = async (certificate: CertificateRecord) => {
    const status = deriveApprovalStatus(approvals.filter((item) => item.certificate_id === certificate.id));
    if (!canFinalize(status)) {
      toast({ title: 'All approvals required', description: 'Treasurer, Referee, and Tournament Director must approve.', variant: 'destructive' });
      return;
    }
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
      toast({ title: 'Certificate finalized', description: `${certificate.id} is now certified.` });
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {mode === 'admin' ? 'Certificate Approval Queue' : 'Certificates Awaiting Your Approval'}
            {rows.length > 0 && <Badge className="ml-2">{rows.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {mode === 'admin' ? 'No certificates in the approval pipeline.' : 'No certificates pending your approval.'}
            </p>
          )}
          {rows.map((certificate) => {
            const status = deriveApprovalStatus(approvals.filter((item) => item.certificate_id === certificate.id));
            const isSelected = selected?.id === certificate.id;
            return (
              <div key={certificate.id} className={`rounded-lg border p-4 transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{certificate.type} · {certificate.recipient_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{certificate.id} · {certificate.tournament} · {certificate.season}</p>
                  </div>
                  <Badge variant={normalizeCertificateStatus(certificate.status) === 'CERTIFIED' ? 'default' : normalizeCertificateStatus(certificate.status) === 'REJECTED' ? 'destructive' : 'outline'}>
                    {normalizeCertificateStatus(certificate.status) || certificate.status}
                  </Badge>
                </div>

                {/* Approval chain */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(['treasurer', 'referee', 'tournament_director'] as ApproverRole[]).map((role) => {
                    const s = status[role];
                    return (
                      <Badge
                        key={`${certificate.id}:${role}`}
                        variant={s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'outline'}
                        className="gap-1"
                      >
                        {s === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                        {s === 'rejected' && <XCircle className="h-3 w-3" />}
                        {approverLabel(role)}: {s}
                      </Badge>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant={isSelected ? 'secondary' : 'outline'} onClick={() => setSelected(isSelected ? null : certificate)}>
                    <Eye className="h-3 w-3 mr-1" /> {isSelected ? 'Hide Preview' : 'Preview'}
                  </Button>
                  {mode === 'approver' && myRole && status[myRole] === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approve(certificate, 'approved')}
                        disabled={!!actionLoading}
                        loading={actionLoading === `${certificate.id}:approved`}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => approve(certificate, 'rejected')}
                        disabled={!!actionLoading}
                        loading={actionLoading === `${certificate.id}:rejected`}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                  {mode === 'admin' && normalizeCertificateStatus(certificate.status) !== 'CERTIFIED' && (
                    <Button
                      size="sm"
                      onClick={() => finalize(certificate)}
                      disabled={!canFinalize(status) || !!actionLoading}
                      loading={actionLoading === `${certificate.id}:finalize`}
                    >
                      <ShieldCheck className="h-3 w-3 mr-1" /> Finalize Certificate
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Preview panel */}
      {selected && (
        <CertificatePreview
          certificate={selected}
          verificationUrl={`${window.location.origin}/verify?certificate_id=${encodeURIComponent(selected.id)}`}
          template={templates[selected.template_id]}
          watermark={selected.status === 'CERTIFIED'}
          showDownload
        />
      )}
    </div>
  );
}

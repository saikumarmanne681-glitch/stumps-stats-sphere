import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { v2api } from '@/lib/v2api';
import { DigitalScorelist, CertificateRecord, ManagementUser } from '@/lib/v2types';
import { scheduleService } from '@/schedules/scheduleService';
import { ScheduleApprovalRecord, ScheduleRecord } from '@/schedules/types';
import { getScorelistRoadmap, getScheduleApprovalRoadmap } from '@/lib/workflowStatus';

export function AdminApprovalsRealtime() {
  const [scorelists, setScorelists] = useState<DigitalScorelist[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [managementUsers, setManagementUsers] = useState<ManagementUser[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [approvals, setApprovals] = useState<ScheduleApprovalRecord[]>([]);

  const refresh = async () => {
    await scheduleService.syncFromBackend();
    const [scorelistRows, certificateRows, managementRows] = await Promise.all([
      v2api.getScorelists(),
      v2api.getCertificates(),
      v2api.getManagementUsers(),
    ]);
    setScorelists(scorelistRows);
    setCertificates(certificateRows);
    setManagementUsers(managementRows);
    setSchedules(scheduleService.getSchedules());
    setApprovals(scheduleService.getApprovals());
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 10000);
    return () => window.clearInterval(id);
  }, []);

  const pendingScorelists = useMemo(() => scorelists.filter((item) => item.certification_status !== 'certified' && !item.locked), [scorelists]);
  const pendingSchedules = useMemo(() => schedules.filter((item) => item.status === 'pending_approval'), [schedules]);
  const pendingCertificates = useMemo(() => certificates.filter((item) => item.approval_status === 'pending_approval'), [certificates]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Realtime approval tracker (Schedules, Scorelists, Certificates)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <p className="mb-2 text-sm font-semibold">Digital scorelists ({pendingScorelists.length})</p>
          {pendingScorelists.slice(0, 10).map((row) => {
            const roadmap = getScorelistRoadmap(row, managementUsers);
            const approvedBy = roadmap.flatMap((step) => step.approvals.map((entry) => entry.approver_name || entry.approver_id));
            const pendingWith = roadmap.flatMap((step) => step.pendingApprovers.map((member) => member.designation || member.name));
            return <div key={row.scorelist_id} className="mb-2 rounded border p-2 text-xs"><span className="font-mono">{row.scorelist_id}</span> • Approved by: {approvedBy.join(', ') || 'None'} • Pending with: {pendingWith.join(', ') || 'None'} </div>;
          })}
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold">Schedules ({pendingSchedules.length})</p>
          {pendingSchedules.slice(0, 10).map((row) => {
            const roadmap = getScheduleApprovalRoadmap(row, approvals);
            const approvedBy = roadmap.filter((step) => step.completed).map((step) => step.approval?.approver_name || step.role);
            const pendingWith = roadmap.filter((step) => !step.completed).map((step) => step.role);
            return <div key={row.schedule_id} className="mb-2 rounded border p-2 text-xs"><span className="font-mono">{row.schedule_id}</span> • Approved by: {approvedBy.join(', ') || 'None'} • Pending with: {pendingWith.join(', ') || 'None'} </div>;
          })}
        </section>

        <section>
          <p className="mb-2 text-sm font-semibold">Certificates ({pendingCertificates.length})</p>
          {pendingCertificates.slice(0, 10).map((row) => {
            const approvalsMap = (() => {
              try { return row.approvals_json ? JSON.parse(row.approvals_json) as Record<string, boolean> : {}; } catch { return {}; }
            })();
            const approvedBy = Object.entries(approvalsMap).filter(([, done]) => done).map(([role]) => role);
            const pendingWith = Object.entries(approvalsMap).filter(([, done]) => !done).map(([role]) => role);
            return <div key={row.certificate_id} className="mb-2 rounded border p-2 text-xs"><span className="font-mono">{row.certificate_id}</span> • Approved by: {approvedBy.join(', ') || 'None'} • Pending with: {pendingWith.join(', ') || 'None'} <Badge variant="outline" className="ml-2">{row.approval_status}</Badge></div>;
          })}
        </section>
      </CardContent>
    </Card>
  );
}

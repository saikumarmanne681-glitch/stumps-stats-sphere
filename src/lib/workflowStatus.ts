import { scheduleApproverRoles } from '@/lib/accessControl';
import { CertificationApproval, CertificationStage, DigitalScorelist, ManagementUser } from '@/lib/v2types';
import { ScheduleApprovalRecord, ScheduleRecord } from '@/schedules/types';

export const scorelistStageOrder = ['draft', 'scoring_completed', 'referee_verified', 'director_approved', 'official_certified'] as const;

export const scorelistStageLabels: Record<(typeof scorelistStageOrder)[number], string> = {
  draft: 'Draft',
  scoring_completed: 'Scoring Completed',
  referee_verified: 'Referee Verified',
  director_approved: 'Director Approved',
  official_certified: 'Official Certified',
};

export const scorelistStageResponsibilities: Record<(typeof scorelistStageOrder)[number], string> = {
  draft: 'Admin generates the digital scorelist and starts the approval chain.',
  scoring_completed: 'Scoring Official validates scoring entries, innings totals, and data completeness.',
  referee_verified: 'Match Referee verifies the match facts, dismissal details, and fairness of the recorded outcome.',
  director_approved: 'Tournament Director confirms the scorelist matches the tournament record and competition schedule.',
  official_certified: 'President or Vice President gives the final executive sign-off and locks the scorelist.',
};

export const electionRoleResponsibilities = [
  {
    role: 'President',
    designation: 'Executive Head',
    responsibilities: 'Leads the club, oversees governance priorities, and signs off on key election and tournament decisions.',
  },
  {
    role: 'Vice President',
    designation: 'Deputy Executive Head',
    responsibilities: 'Supports the President, coordinates leadership continuity, and can finalize official certifications when delegated.',
  },
  {
    role: 'Secretary',
    designation: 'Governance & Records Lead',
    responsibilities: 'Maintains official club records, notices, meeting follow-ups, and election documentation.',
  },
  {
    role: 'Treasurer',
    designation: 'Finance & Compliance Lead',
    responsibilities: 'Oversees financial accountability, budget compliance, and approval visibility for governance activities.',
  },
] as const;

function normalizeDesignation(designation?: string) {
  return String(designation || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveStageFromDesignation(designation?: string): CertificationStage | null {
  const value = normalizeDesignation(designation);
  if (!value) return null;
  if (value.includes('scoring')) return 'scoring_completed';
  if (value.includes('referee')) return 'referee_verified';
  if (value.includes('director')) return 'director_approved';
  if (value.includes('president')) return 'official_certified';
  return null;
}

export function readScorelistCertifications(scorelist: DigitalScorelist): CertificationApproval[] {
  if (!scorelist.certifications_json) return [];
  try {
    const parsed = JSON.parse(scorelist.certifications_json);
    return Array.isArray(parsed) ? parsed as CertificationApproval[] : [];
  } catch {
    return [];
  }
}

function readScorelistStatus(scorelist: DigitalScorelist, certifications: CertificationApproval[]): CertificationStage {
  if (scorelist.certification_status) return scorelist.certification_status;
  return certifications.reduce<CertificationStage>((current, approval) => {
    const approvalStage = approval.stage as CertificationStage;
    return scorelistStageOrder.indexOf(approvalStage) > scorelistStageOrder.indexOf(current)
      ? approvalStage
      : current;
  }, 'draft');
}

export interface ScorelistRoadmapStep {
  stage: CertificationStage;
  label: string;
  responsibility: string;
  completed: boolean;
  approvals: CertificationApproval[];
  pendingApprovers: ManagementUser[];
}

export function getScorelistRoadmap(scorelist: DigitalScorelist, managementUsers: ManagementUser[]): ScorelistRoadmapStep[] {
  const certifications = readScorelistCertifications(scorelist);
  const effectiveStatus = readScorelistStatus(scorelist, certifications);
  const effectiveLocked = Boolean(scorelist.locked);

  return scorelistStageOrder.map((stage) => {
    if (stage === 'draft') {
      return {
        stage,
        label: scorelistStageLabels[stage],
        responsibility: scorelistStageResponsibilities[stage],
        completed: true,
        approvals: [{
          approver_id: scorelist.generated_by || 'system',
          approver_name: scorelist.generated_by || 'System',
          designation: 'Scorelist Engine',
          timestamp: scorelist.generated_at || '',
          token: 'DRAFT',
          stage,
        }],
        pendingApprovers: [],
      };
    }

    const approvals = certifications.filter((item) => item.stage === stage);
    const requiredApprovers = managementUsers.filter((member) => resolveStageFromDesignation(member.designation) === stage);
    const pendingApprovers = requiredApprovers.filter((member) => !approvals.some((item) => item.approver_id === member.management_id));
    const completed = stage === 'official_certified'
      ? approvals.length > 0 || effectiveLocked
      : stage === effectiveStatus
        ? pendingApprovers.length === 0 && approvals.length > 0
        : scorelistStageOrder.indexOf(stage) < scorelistStageOrder.indexOf(effectiveStatus as (typeof scorelistStageOrder)[number]);

    return {
      stage,
      label: scorelistStageLabels[stage],
      responsibility: scorelistStageResponsibilities[stage],
      completed,
      approvals,
      pendingApprovers,
    };
  });
}

export function getScorelistDetailedStatus(scorelist: DigitalScorelist, managementUsers: ManagementUser[]) {
  const roadmap = getScorelistRoadmap(scorelist, managementUsers);
  const officialStep = roadmap.find((step) => step.stage === 'official_certified');
  if (scorelist.locked && officialStep?.approvals[0]) {
    return `Officially certified by ${officialStep.approvals[0].approver_name} (${officialStep.approvals[0].designation})`;
  }

  const pendingStep = roadmap.find((step) => step.stage !== 'draft' && !step.completed);
  if (!pendingStep) return 'Approval chain completed';
  if (pendingStep.pendingApprovers.length === 0) return `Pending at ${pendingStep.label}`;
  return `Pending with ${pendingStep.pendingApprovers.map((member) => member.designation || member.name).join(', ')}`;
}

export function getScheduleApprovalRoadmap(schedule: ScheduleRecord, approvals: ScheduleApprovalRecord[]) {
  const approvedByRole = new Map(
    approvals
      .filter((item) => item.schedule_id === schedule.schedule_id && item.decision === 'approved')
      .map((item) => [item.approver_role, item]),
  );

  return scheduleApproverRoles.map((role) => ({
    role,
    approval: approvedByRole.get(role),
    completed: approvedByRole.has(role),
  }));
}

export function getScheduleDetailedStatus(schedule: ScheduleRecord, approvals: ScheduleApprovalRecord[]) {
  const roadmap = getScheduleApprovalRoadmap(schedule, approvals);
  if (schedule.status === 'approved') {
    return 'Approved by President, Vice President, Secretary, and Treasurer';
  }
  if (schedule.rejection_reason) {
    return 'Returned to Tournament Director for revision';
  }
  if (schedule.status === 'draft') {
    return 'Draft with Tournament Director';
  }
  const pendingRoles = roadmap.filter((item) => !item.completed).map((item) => item.role);
  return pendingRoles.length > 0 ? `Pending with ${pendingRoles.join(', ')}` : 'Pending final confirmation';
}

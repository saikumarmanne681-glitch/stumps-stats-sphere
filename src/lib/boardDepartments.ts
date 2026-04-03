import { BoardConfiguration, ManagementUser } from '@/lib/v2types';

export interface DepartmentDefinition {
  id: string;
  name: string;
  description: string;
}

export interface DepartmentAssignment {
  department_id: string;
  head_id: string;
  team_ids: string[];
}

export const BOARD_DEPARTMENTS: DepartmentDefinition[] = [
  {
    id: 'competition_operations',
    name: 'Competition Operations',
    description: 'Fixtures, umpire coordination, venue readiness and match-day governance.',
  },
  {
    id: 'player_welfare_development',
    name: 'Player Welfare & Development',
    description: 'Player relations, grievance support, training pathways and performance guidance.',
  },
  {
    id: 'discipline_ethics',
    name: 'Discipline & Ethics',
    description: 'Code-of-conduct, dispute resolution, and integrity compliance reviews.',
  },
  {
    id: 'finance_compliance',
    name: 'Finance & Compliance',
    description: 'Budget approvals, payout checks, reimbursements, and policy compliance.',
  },
  {
    id: 'media_community',
    name: 'Media & Community Engagement',
    description: 'Announcements, fan engagement, communication workflows, and outreach.',
  },
];

export function parseDepartmentAssignments(config: BoardConfiguration | null): DepartmentAssignment[] {
  const raw = String(config?.department_assignments_json || '').trim();
  if (!raw) {
    return BOARD_DEPARTMENTS.map((department) => ({
      department_id: department.id,
      head_id: '',
      team_ids: [],
    }));
  }

  try {
    const parsed = JSON.parse(raw);
    const map = new Map<string, DepartmentAssignment>();
    const registerAssignment = (row: Partial<DepartmentAssignment>) => {
      if (!row.department_id) return;
      const teamIds = Array.isArray(row.team_ids)
        ? row.team_ids.map((id) => String(id || '').trim()).filter(Boolean)
        : String((row as { team_ids?: unknown }).team_ids || '')
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);
      map.set(String(row.department_id), {
        department_id: String(row.department_id),
        head_id: String(row.head_id || '').trim(),
        team_ids: Array.from(new Set(teamIds)),
      });
    };

    if (Array.isArray(parsed)) {
      parsed.forEach((entry) => registerAssignment(entry as Partial<DepartmentAssignment>));
    } else if (parsed && typeof parsed === 'object') {
      Object.entries(parsed as Record<string, unknown>).forEach(([departmentId, value]) => {
        const row = (value || {}) as Partial<DepartmentAssignment> & { team_id?: string };
        registerAssignment({
          department_id: departmentId,
          head_id: row.head_id || '',
          team_ids: Array.isArray(row.team_ids)
            ? row.team_ids
            : row.team_id
              ? [row.team_id]
              : [],
        });
      });
    } else {
      throw new Error('Invalid assignments payload');
    }

    return BOARD_DEPARTMENTS.map((department) => map.get(department.id) || {
      department_id: department.id,
      head_id: '',
      team_ids: [],
    });
  } catch {
    return BOARD_DEPARTMENTS.map((department) => ({
      department_id: department.id,
      head_id: '',
      team_ids: [],
    }));
  }
}

export function toDepartmentAssignmentsJson(assignments: DepartmentAssignment[]): string {
  const normalized = BOARD_DEPARTMENTS.map((department) => {
    const current = assignments.find((item) => item.department_id === department.id);
    const uniqueTeamIds = Array.from(new Set((current?.team_ids || []).map((id) => String(id || '').trim()).filter(Boolean)));
    return {
      department_id: department.id,
      head_id: String(current?.head_id || '').trim(),
      team_ids: uniqueTeamIds,
    };
  });
  return JSON.stringify(normalized);
}

export function resolveDepartmentMember(id: string, users: ManagementUser[]): ManagementUser | null {
  return users.find((member) => member.management_id === id) || null;
}

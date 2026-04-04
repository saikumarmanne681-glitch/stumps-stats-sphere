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
    const firstPass = JSON.parse(raw);
    const parsed = typeof firstPass === 'string' ? JSON.parse(firstPass) : firstPass;
    const map = new Map<string, DepartmentAssignment>();
    const registerAssignment = (row: Partial<DepartmentAssignment>) => {
      if (!row.department_id) return;
      const legacy = row as Partial<DepartmentAssignment> & {
        team_id?: string;
        team_members?: unknown;
        member_ids?: unknown;
      };
      const multiValue = legacy.team_ids ?? legacy.team_members ?? legacy.member_ids ?? legacy.team_id ?? '';
      const teamIds = Array.isArray(multiValue)
        ? multiValue.map((id) => String(id || '').trim()).filter(Boolean)
        : String(multiValue)
          .split(/[,\n|]/)
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
        const row = (value || {}) as Partial<DepartmentAssignment> & {
          team_id?: string;
          team_members?: unknown;
          member_ids?: unknown;
        };
        registerAssignment({
          department_id: departmentId,
          head_id: row.head_id || '',
          team_ids: Array.isArray(row.team_ids)
            ? row.team_ids
            : row.team_members
              ? (Array.isArray(row.team_members) ? row.team_members : String(row.team_members).split(/[,\n|]/))
              : row.member_ids
                ? (Array.isArray(row.member_ids) ? row.member_ids : String(row.member_ids).split(/[,\n|]/))
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

export function inferDepartmentFromManagementUser(user: Partial<ManagementUser>): string {
  const combined = `${String(user.designation || '')} ${String(user.role || '')}`.toLowerCase();
  if (combined.includes('treasurer') || combined.includes('finance') || combined.includes('compliance')) return 'Finance & Compliance';
  if (combined.includes('referee') || combined.includes('discipline') || combined.includes('ethics') || combined.includes('umpire')) return 'Discipline & Ethics';
  if (combined.includes('media') || combined.includes('community') || combined.includes('communication')) return 'Media & Community Engagement';
  if (combined.includes('welfare') || combined.includes('development')) return 'Player Welfare & Development';
  if (combined.includes('tournament') || combined.includes('competition') || combined.includes('fixture') || combined.includes('operations')) return 'Competition Operations';
  if (combined.includes('president') || combined.includes('secretary') || combined.includes('vice president')) return 'Executive Board';
  return 'Executive Board';
}

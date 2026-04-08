import { resolveDepartmentCatalogEntry } from '@/lib/departmentCatalog';
import { type LogoName } from '@/components/Logo';

export interface DepartmentBranding {
  key: string;
  label: string;
  logo: string;
  logoName: LogoName;
}

const logoByDepartmentId: Record<string, LogoName> = {
  competition_operations: 'cricket-operations',
  player_welfare_development: 'player-management',
  discipline_ethics: 'match-scoring',
  finance_compliance: 'certificates',
  media_community: 'community',
  governance: 'admin',
  executive_board: 'admin',
  operations: 'cricket-operations',
  general: 'main-logo',
};

export function resolveDepartmentBranding(value?: string, departmentId?: string): DepartmentBranding {
  const department = resolveDepartmentCatalogEntry({ id: departmentId, name: value });
  return {
    key: department.id,
    label: department.name,
    logo: department.logo,
    logoName: logoByDepartmentId[department.id] || 'main-logo',
  };
}

import { resolveDepartmentCatalogEntry } from '@/lib/departmentCatalog';

export interface DepartmentBranding {
  key: string;
  label: string;
  logo: string;
}

export function resolveDepartmentBranding(value?: string, departmentId?: string): DepartmentBranding {
  const department = resolveDepartmentCatalogEntry({ id: departmentId, name: value });
  return {
    key: department.id,
    label: department.name,
    logo: department.logo,
  };
}

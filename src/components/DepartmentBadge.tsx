import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { resolveDepartmentBranding } from '@/lib/departmentBranding';

interface Props {
  department?: string;
  departmentId?: string;
  className?: string;
}

export function DepartmentBadge({ department, departmentId, className }: Props) {
  const brand = resolveDepartmentBranding(department, departmentId);
  return (
    <Badge variant="outline" className={cn('gap-1.5', className)}>
      <span aria-hidden>{brand.logo}</span>
      <span>{brand.label}</span>
    </Badge>
  );
}

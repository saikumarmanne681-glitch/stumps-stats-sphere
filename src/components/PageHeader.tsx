import { DepartmentBadge } from '@/components/DepartmentBadge';
import { resolvePageBranding } from '@/lib/pageBranding';

interface PageHeaderProps {
  route: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function PageHeader({ route, title, subtitle, className }: PageHeaderProps) {
  const meta = resolvePageBranding(route);
  const Icon = meta?.icon;
  const resolvedTitle = title || meta?.title || 'Page';
  const resolvedSubtitle = subtitle || meta?.subtitle;

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden>{meta?.emoji || '📄'}</span>
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            {Icon ? <Icon className="h-6 w-6 text-primary" /> : null}
            {resolvedTitle}
          </h1>
          {resolvedSubtitle ? <p className="text-sm text-muted-foreground mt-1">{resolvedSubtitle}</p> : null}
        </div>
      </div>
      {meta?.departmentId ? (
        <div className="mt-3">
          <DepartmentBadge departmentId={meta.departmentId} className="text-xs" />
        </div>
      ) : null}
    </div>
  );
}

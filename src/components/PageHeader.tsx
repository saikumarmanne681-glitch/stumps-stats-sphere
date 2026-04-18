import { DepartmentBadge } from '@/components/DepartmentBadge';
import { Logo, type LogoName } from '@/components/Logo';
import { resolvePageBranding } from '@/lib/pageBranding';

interface PageHeaderProps {
  route: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

const departmentLogoById: Record<string, LogoName> = {
  competition_operations: 'cricket-operations',
  player_welfare_development: 'player-management',
  discipline_ethics: 'match-scoring',
  finance_compliance: 'certificates',
  media_community: 'community',
  governance: 'admin',
  executive_board: 'admin',
  tournament: 'cricket-operations',
};

export function PageHeader({ route, title, subtitle, className }: PageHeaderProps) {
  const meta = resolvePageBranding(route);
  const Icon = meta?.icon;
  const resolvedTitle = title || meta?.title || 'Page';
  const resolvedSubtitle = subtitle || meta?.subtitle;
  const logoName = meta?.logoName || departmentLogoById[meta?.departmentId || ''] || 'main-logo';

  return (
    <div className={className}>
      <div className="flex flex-col items-center text-center gap-3">
        <Logo
          name={logoName}
          alt={`${resolvedTitle} logo`}
          className="h-[60px] w-[60px] md:h-[70px] md:w-[70px] lg:h-[80px] lg:w-[80px]"
          lazy
        />
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center justify-center gap-2">
            {Icon ? <Icon className="h-6 w-6 text-primary" /> : null}
            {resolvedTitle}
          </h1>
          {resolvedSubtitle ? <p className="text-sm text-muted-foreground mt-1">{resolvedSubtitle}</p> : null}
        </div>
      </div>
      {meta?.departmentId ? (
        <div className="mt-3 flex justify-center">
          <DepartmentBadge departmentId={meta.departmentId} className="text-xs" />
        </div>
      ) : null}
    </div>
  );
}

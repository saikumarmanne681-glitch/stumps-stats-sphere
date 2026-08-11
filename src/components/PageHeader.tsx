import { DepartmentBadge } from '@/components/DepartmentBadge';
import { Logo, type LogoName } from '@/components/Logo';
import { resolvePageBranding } from '@/lib/pageBranding';
import { cn } from '@/lib/utils';

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
    <div className={cn('relative overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-surface px-4 py-7 shadow-soft animate-rise-in md:px-8 md:py-9', className)}>
      <span className="pointer-events-none absolute inset-0 soft-dot-grid opacity-50" />
      <span className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
      <span className="pointer-events-none absolute -right-12 -top-10 h-40 w-40 rounded-full bg-gold/15 blur-3xl" />
      <div className="relative flex flex-col items-center gap-3 text-center">
        <Logo
          name={logoName}
          alt={`${resolvedTitle} logo`}
          className="h-[60px] w-[60px] md:h-[70px] md:w-[70px] lg:h-[80px] lg:w-[80px]"
          lazy
        />
        <div>
          <h1 className="flex items-center justify-center gap-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
            {Icon ? <Icon className="h-6 w-6 text-primary" /> : null}
            {resolvedTitle}
          </h1>
          <div className="mx-auto mt-3 h-0.5 w-24 gold-divider" />
          {resolvedSubtitle ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{resolvedSubtitle}</p> : null}
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

import { Link } from 'react-router-dom';
import { ArrowLeft, Crown, Home, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClosedAccessScreenProps {
  title: string;
  reason?: string;
  backHref?: string;
  homeHref?: string;
}

export function ClosedAccessScreen({
  title,
  reason,
  backHref = '/',
  homeHref = '/',
}: ClosedAccessScreenProps) {
  const reasonText = reason?.trim() || 'This section is temporarily unavailable. Please check back shortly.';

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden rounded-[1.75rem] border border-primary/10 bg-gradient-surface shadow-elevated">
      <div className="pointer-events-none absolute inset-0 soft-dot-grid opacity-60" />
      <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-accent/10 px-4 py-1 text-xs uppercase tracking-[0.25em] text-accent-foreground">
          <Crown className="h-3.5 w-3.5" /> Feature Access Control
        </div>

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/15 bg-card shadow-glow">
          <Lock className="h-9 w-9 text-primary" />
        </div>

        <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground md:text-4xl">{title}</h1>
        <div className="mx-auto mt-4 h-0.5 w-24 gold-divider" />
        <p className="mt-5 max-w-2xl rounded-2xl border border-primary/10 bg-card/80 px-5 py-4 text-sm text-muted-foreground shadow-soft md:text-base">
          {reasonText}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline">
            <Link to={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <Button asChild variant="premium">
            <Link to={homeHref}>
              <Home className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

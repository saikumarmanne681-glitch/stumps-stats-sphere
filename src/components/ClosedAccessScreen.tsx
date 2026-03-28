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
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden rounded-2xl border border-white/15 bg-slate-950 text-slate-100 shadow-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(99,102,241,0.35),transparent_45%),radial-gradient(circle_at_80%_15%,rgba(236,72,153,0.25),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(56,189,248,0.25),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-cyan-400/10" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/15 px-4 py-1 text-xs uppercase tracking-[0.25em] text-violet-100">
          <Crown className="h-3.5 w-3.5" /> Feature Access Control
        </div>

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/15 bg-white/5 shadow-[0_0_40px_rgba(167,139,250,0.45)]">
          <Lock className="h-9 w-9 text-violet-200" />
        </div>

        <h1 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">{title}</h1>
        <p className="mt-5 max-w-2xl rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-200 md:text-base">
          {reasonText}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="outline" className="border-white/20 bg-transparent text-slate-100 hover:bg-white/10">
            <Link to={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Link>
          </Button>
          <Button asChild className="bg-white text-slate-900 hover:bg-slate-200">
            <Link to={homeHref}>
              <Home className="mr-2 h-4 w-4" /> Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

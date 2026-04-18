import { Logo } from '@/components/Logo';
import { getTournamentBranding } from '@/lib/tournamentBranding';

interface TournamentLogoLockupProps {
  tournamentName: string;
}

export function TournamentLogoLockup({ tournamentName }: TournamentLogoLockupProps) {
  const branding = getTournamentBranding(tournamentName);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Logo name="tournament-cup" alt={`${tournamentName} tournament logo`} className="h-14 w-14 md:h-16 md:w-16" />
        <div className={`h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-gradient-to-br ${branding.accentClass} text-white flex items-center justify-center font-display text-xl md:text-2xl font-black shadow-sm`}>
          {branding.shortCode}
        </div>
      </div>
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{branding.tagline}</p>
    </div>
  );
}

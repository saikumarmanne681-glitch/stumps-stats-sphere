import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioTower, Sparkles, Users } from 'lucide-react';

type AudienceValue = 'all' | 'players' | 'management';

type AudienceOption = {
  value: AudienceValue;
  label: string;
};

type NewsHeroProps = {
  postCount: number;
  liveTimestamp: string;
  audienceFilter: AudienceValue;
  onAudienceFilterChange: (value: AudienceValue) => void;
  audienceOptions: AudienceOption[];
};

export const NewsHero = ({
  postCount,
  liveTimestamp,
  audienceFilter,
  onAudienceFilterChange,
  audienceOptions,
}: NewsHeroProps) => {
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 px-6 py-8 text-slate-50 shadow-lg md:px-10 md:py-10">
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-16 h-28 w-28 rounded-full bg-blue-300/20 blur-2xl" />

      <div className="relative space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge className="gap-2 border border-white/20 bg-white/10 text-white hover:bg-white/10">
            <Sparkles className="h-3.5 w-3.5" />
            Newsroom Pulse
          </Badge>
          <div className="flex flex-wrap items-center gap-2 text-xs text-blue-100/90 md:text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <RadioTower className="h-3.5 w-3.5" />
              Live {liveTimestamp}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <Users className="h-3.5 w-3.5" />
              {postCount} posts
            </span>
          </div>
        </div>

        <div className="max-w-3xl space-y-2">
          <h1 className="font-display text-3xl leading-tight text-white md:text-4xl">Club Newsroom</h1>
          <p className="max-w-2xl text-sm text-blue-100/85 md:text-base">
            Stay synced with official updates from the administration team. Filter by audience and browse the latest announcements in one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {audienceOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={audienceFilter === option.value ? 'secondary' : 'ghost'}
              className={
                audienceFilter === option.value
                  ? 'bg-white text-slate-900 hover:bg-white/90'
                  : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
              }
              onClick={() => onAudienceFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
};

import { cn } from '@/lib/utils';

type MotionVariant = 'dashboard' | 'pending' | 'celebration';

const motionSources: Record<MotionVariant, string> = {
  dashboard: 'https://assets10.lottiefiles.com/packages/lf20_qp1q7mct.json',
  pending: 'https://assets2.lottiefiles.com/packages/lf20_x62chJ.json',
  celebration: 'https://assets9.lottiefiles.com/packages/lf20_touohxv0.json',
};

export function LottieMotion({
  variant = 'dashboard',
  className,
  speed = 1,
}: {
  variant?: MotionVariant;
  className?: string;
  speed?: number;
}) {
  return (
    <div className={cn('relative isolate overflow-hidden rounded-[1.75rem] border border-primary/15 bg-white/55 shadow-[0_20px_60px_-32px_rgba(59,130,246,0.45)] backdrop-blur-xl', className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.85),transparent_45%),linear-gradient(135deg,rgba(14,165,233,0.10),rgba(168,85,247,0.16),rgba(251,191,36,0.12))]" />
      <div className="relative flex h-full w-full items-center justify-center">
        {typeof window !== 'undefined' && customElements.get('lottie-player') ? (
          <lottie-player
            autoplay
            loop
            mode="normal"
            src={motionSources[variant]}
            speed={String(speed)}
            style={{ width: '100%', height: '100%', minHeight: '100px' }}
          />
        ) : (
          <div className="flex items-center gap-3 px-6 py-8">
            <span className="h-4 w-4 animate-bounce rounded-full bg-primary/70" />
            <span className="h-4 w-4 animate-bounce rounded-full bg-sky-400/70 [animation-delay:120ms]" />
            <span className="h-4 w-4 animate-bounce rounded-full bg-amber-400/70 [animation-delay:240ms]" />
          </div>
        )}
      </div>
    </div>
  );
}

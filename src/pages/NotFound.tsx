import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, CalendarDays, FileText, Home as HomeIcon, Newspaper, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

const quickLinks = [
  { to: "/leaderboards", label: "Leaderboards", hint: "Standings, batting & bowling charts", icon: Trophy },
  { to: "/schedules", label: "Schedules", hint: "Upcoming fixtures and slots", icon: CalendarDays },
  { to: "/news-room", label: "News Room", hint: "Latest official announcements", icon: Newspaper },
  { to: "/documents-portal", label: "Documents", hint: "Forms, certificates & records", icon: FileText },
];

/** Stumps + ball motif built purely from design tokens (no dark surfaces). */
function StumpsMotif() {
  return (
    <div className="relative mx-auto h-28 w-40 sm:h-32 sm:w-48" aria-hidden="true">
      <span className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
      <svg viewBox="0 0 160 120" className="relative h-full w-full">
        <defs>
          <linearGradient id="nf-stump" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--gold-light))" />
            <stop offset="100%" stopColor="hsl(var(--gold))" />
          </linearGradient>
          <linearGradient id="nf-ball" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary-glow))" />
            <stop offset="100%" stopColor="hsl(var(--primary))" />
          </linearGradient>
        </defs>
        {/* pitch line */}
        <rect x="18" y="98" width="124" height="4" rx="2" fill="hsl(var(--primary) / 0.18)" />
        {/* stumps — middle one knocked back */}
        <rect x="52" y="34" width="7" height="64" rx="3.5" fill="url(#nf-stump)" />
        <rect
          x="74"
          y="34"
          width="7"
          height="64"
          rx="3.5"
          fill="url(#nf-stump)"
          transform="rotate(16 77 98)"
        />
        <rect x="96" y="34" width="7" height="64" rx="3.5" fill="url(#nf-stump)" />
        {/* bails */}
        <rect x="48" y="28" width="22" height="5" rx="2.5" fill="hsl(var(--gold) / 0.75)" transform="rotate(-12 59 30)" />
        <rect x="86" y="26" width="22" height="5" rx="2.5" fill="hsl(var(--gold) / 0.75)" transform="rotate(10 97 28)" />
        {/* ball */}
        <g className="motion-safe:animate-float">
          <circle cx="126" cy="60" r="14" fill="url(#nf-ball)" />
          <path d="M116 52c7 5 7 11 0 16" stroke="hsl(var(--primary-foreground) / 0.75)" strokeWidth="1.6" fill="none" />
          <path d="M136 52c-7 5-7 11 0 16" stroke="hsl(var(--primary-foreground) / 0.75)" strokeWidth="1.6" fill="none" />
        </g>
        <circle cx="126" cy="60" r="20" fill="none" stroke="hsl(var(--primary) / 0.25)" strokeDasharray="4 6" className="motion-safe:animate-spin-slow" style={{ transformOrigin: "126px 60px" }} />
      </svg>
    </div>
  );
}

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Page not found (404) | Stumps Stats Sphere";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <span className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
      <span className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
      <span className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

      <section className="glass-panel relative w-full max-w-3xl overflow-hidden px-5 py-8 text-center animate-rise-in sm:px-8 sm:py-10 lg:max-w-5xl lg:px-12 lg:py-14">
        <span className="pointer-events-none absolute inset-0 soft-dot-grid opacity-50" />

        <div className="relative">
          <div className="flex items-center justify-center gap-2">
            <Logo name="main-logo" size={34} className="h-8 w-8 sm:h-10 sm:w-10" />
            <span className="font-display text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground sm:text-sm">
              Stumps Stats Sphere
            </span>
          </div>

          <StumpsMotif />

          <p className="font-display text-6xl font-extrabold leading-none tracking-tight text-gradient-gold sm:text-7xl lg:text-8xl">
            404
          </p>
          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Caught behind! This page is out.
          </h1>
          <div className="mx-auto mt-4 h-0.5 w-24 gold-divider" />
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            The link you followed has been moved, retired, or never existed. Head back to the pavilion and pick a
            destination below — your stats, fixtures and documents are all still in play.
          </p>

          <p className="mx-auto mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wider">Requested</span>
            <code className="truncate font-mono text-foreground/80">{location.pathname}</code>
          </p>

          <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="premium" size="lg" className="w-full sm:w-auto">
              <Link to="/" aria-label="Back to Stumps Stats Sphere home page">
                <HomeIcon className="mr-2 h-4 w-4" /> Back to Home
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
          </div>

          <div className="mt-9 text-left">
            <p className="mb-3 text-center font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Popular destinations
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map(({ to, label, hint, icon: Icon }, index) => (
                <Link
                  key={to}
                  to={to}
                  aria-label={`Go to ${label} — ${hint}`}
                  className="premium-card group flex items-start gap-3 !p-4 text-left animate-rise-in"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-bold text-foreground">{label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default NotFound;

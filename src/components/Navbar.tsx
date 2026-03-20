import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ClipboardList, Database, Home, LayoutDashboard, LogIn, LogOut, Menu, Radio, Shield, Sparkles, Trophy, Users, Vote } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAdmin, isPlayer, isManagement } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navButtonClass = 'justify-start rounded-full px-3.5 text-foreground/80 hover:bg-primary/8 hover:text-primary';

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => {
    const close = () => mobile && setOpen(false);

    return (
      <div className={mobile ? 'flex flex-col gap-1.5' : 'flex flex-wrap items-center gap-1.5'}>
        <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
          <Link to="/"><Home className="h-4 w-4" /> Home</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
          <Link to="/leaderboards"><Trophy className="h-4 w-4" /> Leaderboards</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
          <Link to="/live"><Radio className="h-4 w-4" /> Live</Link>
        </Button>

        {user && (
          <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
            <Link to="/management"><Users className="h-4 w-4" /> Board</Link>
          </Button>
        )}

        {user && (
          <>
            <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
              <Link to="/elections"><Vote className="h-4 w-4" /> Elections</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
              <Link to="/tournaments"><ClipboardList className="h-4 w-4" /> Tournaments</Link>
            </Button>
          </>
        )}

        {!user && (
          <Button size="sm" className="rounded-full px-4" asChild onClick={close}>
            <Link to="/login"><LogIn className="h-4 w-4" /> Login</Link>
          </Button>
        )}

        {isAdmin && (
          <>
            <Button variant="outline" size="sm" className="rounded-full" asChild onClick={close}>
              <Link to="/admin"><LayoutDashboard className="h-4 w-4" /> Admin</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
              <Link to="/admin/match-center"><Radio className="h-4 w-4" /> Scoring</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-4 w-4" /> Scorelists</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
              <Link to="/admin/management"><Users className="h-4 w-4" /> Mgmt</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
              <Link to="/admin/backups"><Database className="h-4 w-4" /> Backup</Link>
            </Button>
          </>
        )}

        {isPlayer && (
          <Button variant="outline" size="sm" className="rounded-full" asChild onClick={close}>
            <Link to="/player"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
          </Button>
        )}

        {isManagement && (
          <>
            <Button variant="outline" size="sm" className="rounded-full" asChild onClick={close}>
              <Link to="/management"><LayoutDashboard className="h-4 w-4" /> Management</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navButtonClass} asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-4 w-4" /> Scorelists</Link>
            </Button>
          </>
        )}

        {user && (
          <div className={`flex items-center gap-2 ${mobile ? 'mt-3 border-t border-border/70 pt-3' : 'ml-1 border-l border-border/60 pl-2'}`}>
            <div className="rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs text-muted-foreground">
              Hi, <strong className="text-foreground">{user.name}</strong>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-foreground/80 hover:bg-primary/8 hover:text-primary"
              onClick={() => {
                logout();
                navigate('/');
                close();
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary)),rgba(125,211,252,0.95))] text-primary-foreground shadow-[0_14px_30px_-18px_rgba(37,99,235,0.6)]">🏏</div>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold tracking-tight text-foreground">Stumps Stats Sphere</p>
            <p className="truncate text-[10px] uppercase tracking-[0.28em] text-muted-foreground">Cricket portal</p>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-2.5 py-2 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.22)] backdrop-blur-xl">
          <div className="flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Refined UI
          </div>
          <NavItems />
        </div>

        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm border-border/70 bg-background/95 pt-10 backdrop-blur-xl">
              <NavItems mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

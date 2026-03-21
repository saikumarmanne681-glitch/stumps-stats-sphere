import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ClipboardList, Database, Home, LayoutDashboard, LogIn, LogOut, Menu, Radio, Shield, Trophy, Users, Vote } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAdmin, isPlayer, isManagement } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navBtnClass = 'justify-center rounded-full px-4 text-foreground/80 hover:bg-primary/8 hover:text-primary';

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => {
    const close = () => mobile && setOpen(false);

    return (
      <div className={mobile ? 'flex flex-col gap-2 text-center' : 'flex flex-wrap items-center justify-center gap-2'}>
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/"><Home className="h-4 w-4" /> Home</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/leaderboards"><Trophy className="h-4 w-4" /> Leaderboards</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/live"><Radio className="h-4 w-4" /> Live</Link>
        </Button>

        {user && (
          <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
            <Link to="/management"><Users className="h-4 w-4" /> Board</Link>
          </Button>
        )}

        {user && (
          <>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/elections"><Vote className="h-4 w-4" /> Elections</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/tournaments"><ClipboardList className="h-4 w-4" /> Tournaments</Link>
            </Button>
          </>
        )}

        {!user && (
          <Button size="sm" className="px-5" asChild onClick={close}>
            <Link to="/login"><LogIn className="h-4 w-4" /> Login</Link>
          </Button>
        )}

        {isAdmin && (
          <>
            <Button variant="outline" size="sm" className="rounded-full" asChild onClick={close}>
              <Link to="/admin"><LayoutDashboard className="h-4 w-4" /> Admin</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/match-center"><Radio className="h-4 w-4" /> Scoring</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-4 w-4" /> Scorelists</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/management"><Users className="h-4 w-4" /> Mgmt</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
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
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-4 w-4" /> Scorelists</Link>
            </Button>
          </>
        )}

        {user && (
          <div className={`flex items-center gap-2 ${mobile ? 'mt-4 justify-center border-t border-primary/10 pt-4' : 'justify-center border-t border-primary/10 pt-3 lg:ml-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0'}`}>
            <div className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-sm text-muted-foreground">
              Hi, <strong className="text-foreground">{user.name}</strong>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 hover:bg-destructive/10 hover:text-destructive"
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
    <nav className="sticky top-0 z-40 border-b border-primary/10 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[5rem] w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.1rem] bg-primary text-primary-foreground shadow-[0_14px_30px_-18px_rgba(22,101,52,0.55)]">
            🏏
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold tracking-tight text-foreground">Stumps Stats Sphere</p>
            <p className="truncate text-[11px] uppercase tracking-[0.25em] text-muted-foreground">Centered cricket portal</p>
          </div>
        </Link>

        <div className="hidden lg:flex max-w-[65%] items-center justify-center rounded-full border border-primary/10 bg-white px-3 py-2 shadow-sm">
          <NavItems />
        </div>

        <div className="lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[90vw] max-w-sm border-primary/10 bg-white/95 pt-12 backdrop-blur-xl">
              <NavItems mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogIn, LogOut, LayoutDashboard, Home, Trophy, Zap, Users, Shield, Database, Menu, Radio, Vote, ClipboardList, Sparkles } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAdmin, isPlayer, isManagement } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => {
    const close = () => mobile && setOpen(false);
    return (
      <div className={mobile ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
        <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
          <Link to="/"><Home className="h-4 w-4" /> Home</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
          <Link to="/leaderboards"><Trophy className="h-4 w-4" /> Leaderboards</Link>
        </Button>
        <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
          <Link to="/live"><Radio className="h-4 w-4" /> Live</Link>
        </Button>

        {user && (
          <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
            <Link to="/management"><Users className="h-4 w-4" /> Board</Link>
          </Button>
        )}

        {user && (
          <>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
              <Link to="/elections"><Vote className="h-4 w-4" /> Elections</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
              <Link to="/tournaments"><ClipboardList className="h-4 w-4" /> Tournaments</Link>
            </Button>
          </>
        )}

        {!user && (
          <Button size="sm" className="shadow-[0_18px_40px_-24px_rgba(34,211,238,0.85)]" asChild onClick={close}>
            <Link to="/login"><LogIn className="h-4 w-4" /> Login</Link>
          </Button>
        )}

        {isAdmin && (
          <>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white" asChild onClick={close}>
              <Link to="/admin"><LayoutDashboard className="h-4 w-4" /> Admin</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
              <Link to="/admin/match-center"><Zap className="h-4 w-4" /> Scoring</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-4 w-4" /> Scorelists</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
              <Link to="/admin/management"><Users className="h-4 w-4" /> Mgmt</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
              <Link to="/admin/backups"><Database className="h-4 w-4" /> Backup</Link>
            </Button>
          </>
        )}

        {isPlayer && (
          <Button variant="outline" size="sm" className="border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white" asChild onClick={close}>
            <Link to="/player"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link>
          </Button>
        )}

        {isManagement && (
          <>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white" asChild onClick={close}>
              <Link to="/management"><LayoutDashboard className="h-4 w-4" /> Management</Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-4 w-4" /> Scorelists</Link>
            </Button>
          </>
        )}

        {user && (
          <div className={`flex items-center gap-2 ${mobile ? 'mt-3 border-t border-white/10 pt-3' : 'ml-2'}`}>
            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-slate-200 shadow-sm backdrop-blur-xl">
              Hi, <strong className="text-white">{user.name}</strong>
            </div>
            <Button variant="ghost" size="sm" className="text-white/85 hover:bg-white/10 hover:text-white" onClick={() => { logout(); navigate('/'); close(); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.35rem] border border-white/15 bg-gradient-to-br from-cyan-400 via-primary to-fuchsia-500 text-lg shadow-[0_18px_45px_-22px_rgba(34,211,238,0.7)]">🏏</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-white">Stumps Stats Sphere</span>
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300/80">Immersive cricket operations hub</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
          <NavItems />
        </div>

        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 border-white/10 bg-slate-950/90 pt-10 text-white backdrop-blur-2xl">
              <NavItems mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

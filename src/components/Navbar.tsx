import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LogIn, LogOut, LayoutDashboard, Home, Trophy, Zap, Users, Shield, Database, Menu, Radio, Vote, ClipboardList, Layers3, Crown, Newspaper, FolderLock, Search } from 'lucide-react';
import { CommandPalette } from '@/components/CommandPalette';

export function Navbar() {
  const { user, logout, isAdmin, isPlayer, isManagement, isTeam } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const NavItems = ({ mobile = false }: { mobile?: boolean }) => {
    const close = () => mobile && setOpen(false);
    const navBtnClass = mobile ? 'w-full justify-start' : '';
    return (
      <div className={mobile ? 'flex max-h-[80vh] flex-col gap-2 overflow-y-auto pr-1' : 'flex items-center gap-1'}>
        {mobile && (
          <Button variant="outline" size="sm" className={navBtnClass} onClick={() => { close(); window.dispatchEvent(new CustomEvent('open-command-palette')); }}>
            <Search className="h-4 w-4 mr-1" /> Search / Commands
          </Button>
        )}
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/"><Home className="h-4 w-4 mr-1" /> Home</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/leaderboards"><Trophy className="h-4 w-4 mr-1" /> Leaderboards</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/live"><Radio className="h-4 w-4 mr-1" /> Live</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/seasons"><Layers3 className="h-4 w-4 mr-1" /> Seasons</Link>
        </Button>
        <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
          <Link to="/hall-of-glory"><Crown className="h-4 w-4 mr-1" /> Hall of Glory</Link>
        </Button>

        {user && (
          <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
            <Link to="/management"><Users className="h-4 w-4 mr-1" /> Board</Link>
          </Button>
        )}

        {(isPlayer || isManagement || isTeam) && (
          <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
            <Link to="/news-room"><Newspaper className="h-4 w-4 mr-1" /> News Room</Link>
          </Button>
        )}
        {(isManagement || isAdmin) && (
          <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
            <Link to="/documents-portal"><FolderLock className="h-4 w-4 mr-1" /> Documents</Link>
          </Button>
        )}

        {user && user.type !== 'management' && (
          <>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/elections"><Vote className="h-4 w-4 mr-1" /> Elections</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/tournaments"><ClipboardList className="h-4 w-4 mr-1" /> Tournaments</Link>
            </Button>
          </>
        )}

        {!user && (
          <Button size="sm" className={navBtnClass} asChild onClick={close}>
            <Link to="/login"><LogIn className="h-4 w-4 mr-1" /> Login</Link>
          </Button>
        )}

        {isAdmin && (
          <>
            <Button variant="outline" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin"><LayoutDashboard className="h-4 w-4 mr-1" /> Admin</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/match-center"><Zap className="h-4 w-4 mr-1" /> Scoring</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/scorelists"><Shield className="h-4 w-4 mr-1" /> Scorelists</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/management"><Users className="h-4 w-4 mr-1" /> Mgmt</Link>
            </Button>
            <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to="/admin/backups"><Database className="h-4 w-4 mr-1" /> Backup</Link>
            </Button>
          </>
        )}

        {isPlayer && (
          <Button variant="outline" size="sm" className={navBtnClass} asChild onClick={close}>
            <Link to="/player"><LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard</Link>
          </Button>
        )}

        {(isManagement || isTeam) && (
          <>
            <Button variant="outline" size="sm" className={navBtnClass} asChild onClick={close}>
              <Link to={isTeam ? "/management/teams-dashboard" : "/management"}><LayoutDashboard className="h-4 w-4 mr-1" /> {isTeam ? 'Team Dashboard' : 'Management'}</Link>
            </Button>
            {isManagement && (
              <Button variant="ghost" size="sm" className={navBtnClass} asChild onClick={close}>
                <Link to="/admin/scorelists"><Shield className="h-4 w-4 mr-1" /> Scorelists</Link>
              </Button>
            )}
          </>
        )}

        {user && (
          <div className={`flex items-center gap-2 ${mobile ? 'pt-2 border-t' : ''}`}>
            <span className="text-sm text-muted-foreground">
              Hi, <strong>{user.name}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Log out"
              title="Log out"
              onClick={() => { logout(); navigate('/'); close(); }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <nav className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-3 md:px-4 flex items-center justify-between h-14 gap-2">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏏</span>
          <span className="font-display text-xl font-bold text-primary">CRICKET CLUB</span>
        </Link>

        <CommandPalette />

        {/* Desktop Nav */}
        <div className="hidden xl:flex items-center gap-1 max-w-[70vw] overflow-x-auto">
          <NavItems />
        </div>

        {/* Mobile + tablet Hamburger */}
        <div className="xl:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
                title="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-10">
              <NavItems mobile />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

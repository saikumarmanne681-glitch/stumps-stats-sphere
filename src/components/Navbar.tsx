import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, LayoutDashboard, Home } from 'lucide-react';

export function Navbar() {
  const { user, logout, isAdmin, isPlayer } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🏏</span>
          <span className="font-display text-xl font-bold text-primary">CRICKET CLUB</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><Home className="h-4 w-4 mr-1" /> Home</Link>
          </Button>

          {!user && (
            <Button size="sm" asChild>
              <Link to="/login"><LogIn className="h-4 w-4 mr-1" /> Login</Link>
            </Button>
          )}

          {isAdmin && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin"><LayoutDashboard className="h-4 w-4 mr-1" /> Admin</Link>
            </Button>
          )}

          {isPlayer && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/player"><LayoutDashboard className="h-4 w-4 mr-1" /> Dashboard</Link>
            </Button>
          )}

          {user && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Hi, <strong>{user.name}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AdminAnnouncements } from '@/components/admin/AdminAnnouncements';
import { AdminTournaments } from '@/components/admin/AdminTournaments';
import { AdminSeasons } from '@/components/admin/AdminSeasons';
import { AdminPlayers } from '@/components/admin/AdminPlayers';
import { AdminMatches } from '@/components/admin/AdminMatches';
import { AdminMessages } from '@/components/admin/AdminMessages';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminSupportDashboard } from '@/components/admin/AdminSupport';
import { AdminPresence } from '@/components/admin/AdminPresence';
import { AdminScorelists } from '@/components/admin/AdminScorelists';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { Megaphone, Trophy, Calendar, Users, Gamepad2, MessageSquare, Settings, Headphones, Wifi, Shield, ScrollText, Zap } from 'lucide-react';

const AdminDashboard = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Operations command center</p>
              <h1 className="font-display text-3xl font-bold">⚙️ Admin Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage tournaments, communication, support, scorelists, live scoring, and security auditing from one place.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/match-center"><Zap className="h-4 w-4 mr-1" /> Open Live Scoring Panel</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/admin/scorelists"><Shield className="h-4 w-4 mr-1" /> Review Scorelists</Link>
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="matches" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="matches" className="flex items-center gap-1 text-xs">
              <Gamepad2 className="h-3 w-3" /> Matches & Scorecards
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1 text-xs">
              <Megaphone className="h-3 w-3" /> Announcements
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex items-center gap-1 text-xs">
              <Trophy className="h-3 w-3" /> Tournaments
            </TabsTrigger>
            <TabsTrigger value="seasons" className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" /> Seasons
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" /> Players
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1 text-xs">
              <MessageSquare className="h-3 w-3" /> Messages
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-1 text-xs">
              <Headphones className="h-3 w-3" /> Support
            </TabsTrigger>
            <TabsTrigger value="presence" className="flex items-center gap-1 text-xs">
              <Wifi className="h-3 w-3" /> Presence
            </TabsTrigger>
            <TabsTrigger value="scorelists" className="flex items-center gap-1 text-xs">
              <Shield className="h-3 w-3" /> Scorelists
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-1 text-xs">
              <ScrollText className="h-3 w-3" /> Audit Log
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 text-xs">
              <Settings className="h-3 w-3" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matches"><AdminMatches /></TabsContent>
          <TabsContent value="announcements"><AdminAnnouncements /></TabsContent>
          <TabsContent value="tournaments"><AdminTournaments /></TabsContent>
          <TabsContent value="seasons"><AdminSeasons /></TabsContent>
          <TabsContent value="players"><AdminPlayers /></TabsContent>
          <TabsContent value="messages"><AdminMessages /></TabsContent>
          <TabsContent value="support"><AdminSupportDashboard /></TabsContent>
          <TabsContent value="presence"><AdminPresence /></TabsContent>
          <TabsContent value="scorelists"><AdminScorelists /></TabsContent>
          <TabsContent value="audit"><AdminAuditLog /></TabsContent>
          <TabsContent value="settings"><AdminSettings /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Megaphone, Trophy, Calendar, Users, Gamepad2, MessageSquare, Settings, Headphones, Wifi, Shield, ScrollText } from 'lucide-react';

const AdminDashboard = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="font-display text-3xl font-bold mb-6">⚙️ Admin Dashboard</h1>

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

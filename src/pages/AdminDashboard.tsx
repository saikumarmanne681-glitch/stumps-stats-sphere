import { Navigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
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
import { Megaphone, Trophy, Calendar, Users, Gamepad2, MessageSquare, Settings, Headphones, Wifi, Shield, ScrollText, Zap, Newspaper, ListTodo, MailSearch, Award, Database, FileCheck2 } from 'lucide-react';
import { AdminNewsRoom } from '@/components/admin/AdminNewsRoom';
import { AdminMailDiagnostics } from '@/components/admin/AdminMailDiagnostics';
import { AdminSheetsConsole } from '@/components/admin/AdminSheetsConsole';
import { AdminApprovalsRealtime } from '@/components/admin/AdminApprovalsRealtime';
import { v2api } from '@/lib/v2api';
import { PendingActionsPanel } from '@/components/PendingActionsPanel';
import { CertificateBuilder } from '@/components/certificates/CertificateBuilder';
import { ApprovalPanel } from '@/components/certificates/ApprovalPanel';
import { normalizeCertificateStatus } from '@/lib/certificates';
import { Logo } from '@/components/Logo';
import { AdminForms } from '@/components/admin/AdminForms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';

const isLockedScorelist = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'y', 'locked'].includes(String(value ?? '').trim().toLowerCase());
};

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('matches');
  const [pendingScorelists, setPendingScorelists] = useState(0);
  const [pendingCertificates, setPendingCertificates] = useState(0);
  const dashboardTabs = [
    { value: 'matches', label: 'Matches & Scorecards', icon: Gamepad2 },
    { value: 'announcements', label: 'Announcements', icon: Megaphone },
    { value: 'tournaments', label: 'Tournaments', icon: Trophy },
    { value: 'seasons', label: 'Seasons', icon: Calendar },
    { value: 'players', label: 'Players', icon: Users },
    { value: 'messages', label: 'Messages', icon: MessageSquare },
    { value: 'support', label: 'Support', icon: Headphones },
    { value: 'presence', label: 'Presence', icon: Wifi },
    { value: 'scorelists', label: 'Scorelists', icon: Shield },
    { value: 'audit', label: 'Audit Log', icon: ScrollText },
    { value: 'mail-diagnostics', label: 'Mail Diagnostics', icon: MailSearch },
    { value: 'approvals-live', label: 'Approvals Live', icon: Shield },
    { value: 'newsroom', label: 'News Room', icon: Newspaper },
    { value: 'sheets', label: 'Sheets Console', icon: Settings },
    { value: 'settings', label: 'Settings', icon: Settings },
    { value: 'certificates', label: 'Certificates', icon: Award },
    { value: 'certificate-sheet', label: 'Certificate Sheet', icon: Database },
    { value: 'forms', label: 'Forms Empire', icon: FileCheck2 },
  ];

  useEffect(() => {
    const loadCounts = () => Promise.all([v2api.getScorelists(), v2api.getCertificates()]).then(([scorelistRows, certificateRows]) => {
      setPendingScorelists(scorelistRows.filter((item) => !isLockedScorelist(item.locked) && item.certification_status !== 'official_certified').length);
      setPendingCertificates(certificateRows.filter((item) => {
        const status = normalizeCertificateStatus(item.status);
        return status === 'PENDING_APPROVAL' || status === 'APPROVED';
      }).length);
    }).catch(() => {
      setPendingScorelists(0);
      setPendingCertificates(0);
    });

    loadCounts();
    const handleCertificatesChanged = () => { void loadCounts(); };
    window.addEventListener('certificates:changed', handleCertificatesChanged);
    return () => window.removeEventListener('certificates:changed', handleCertificatesChanged);
  }, []);

  if (!isAdmin) return <Navigate to="/login" />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-accent/10 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col items-start gap-2">
              <Logo name="admin" alt="System Administration Logo" className="h-[60px] w-[60px] md:h-[70px] md:w-[70px] lg:h-[80px] lg:w-[80px]" />
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Operations command center</p>
              <h1 className="font-display text-3xl font-bold">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-muted-foreground">Manage tournaments, communication, support, scorelists, live scoring, and security auditing from one place.</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/match-center"><Zap className="h-4 w-4 mr-1" /> Open Live Scoring Panel</Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link to="/admin/scorelists"><Shield className="h-4 w-4 mr-1" /> Review Scorelists</Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link to="/admin/work-queue"><ListTodo className="h-4 w-4 mr-1" /> Open Work Queue</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <PendingActionsPanel
            title="Pending Admin Actions"
            items={[
              {
                id: 'pending-scorelists',
                label: 'Scorelist certifications',
                description: 'Scorelists waiting for final review and certification.',
                count: pendingScorelists,
                to: '/admin/scorelists',
              },
              {
                id: 'work-queue',
                label: 'Work queue',
                description: 'Operational queue for approvals, escalations, and admin tasks.',
                count: pendingScorelists + pendingCertificates,
                to: '/admin/work-queue',
              },
              {
                id: 'certificate-queue',
                label: 'Certificate approvals',
                description: 'Certificates awaiting role approvals or final certification.',
                count: pendingCertificates,
                to: '/admin',
              },
              {
                id: 'live-scoring',
                label: 'Live scoring checks',
                description: 'Jump into the match center to validate active scoring sessions.',
                count: 0,
                to: '/admin/match-center',
              },
            ]}
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {isMobile ? (
            <div className="mb-4 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin sections</p>
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  {dashboardTabs.map((tab) => (
                    <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <TabsList className="mb-6 grid h-auto w-full auto-cols-max grid-flow-col justify-start gap-1 overflow-x-auto rounded-lg p-1">
              {dashboardTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1 whitespace-nowrap text-xs">
                  <tab.icon className="h-3 w-3" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

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
          <TabsContent value="mail-diagnostics"><AdminMailDiagnostics /></TabsContent>
          <TabsContent value="approvals-live"><AdminApprovalsRealtime /></TabsContent>
          <TabsContent value="newsroom"><AdminNewsRoom /></TabsContent>
          <TabsContent value="sheets"><AdminSheetsConsole /></TabsContent>
          <TabsContent value="settings"><AdminSettings /></TabsContent>
          <TabsContent value="certificates">
            <div className="space-y-6">
              <ApprovalPanel mode="admin" />
              <CertificateBuilder />
            </div>
          </TabsContent>
          <TabsContent value="certificate-sheet">
            <AdminSheetsConsole initialSheet="CERTIFICATES" lockSheetSelection />
          </TabsContent>
          <TabsContent value="forms">
            <div className="space-y-6">
              <AdminForms />
              <AdminSheetsConsole initialSheet="FORM_DEFINITIONS" lockSheetSelection />
              <AdminSheetsConsole initialSheet="FORM_ENTRIES" lockSheetSelection />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;

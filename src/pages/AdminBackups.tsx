import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/lib/DataContext';
import { Download, Database, FileJson, Loader2 } from 'lucide-react';
import { v2api } from '@/lib/v2api';
import { useToast } from '@/hooks/use-toast';

const AdminBackups = () => {
  const { isAdmin } = useAuth();
  const { players, tournaments, seasons, matches, batting, bowling, announcements, messages } = useData();
  const { toast } = useToast();
  const [exporting, setExporting] = useState('');

  if (!isAdmin) return <Navigate to="/login" />;

  const downloadFile = (data: any, filename: string, format: 'json' | 'csv') => {
    let content: string;
    let mimeType: string;
    
    if (format === 'json') {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    } else {
      if (Array.isArray(data) && data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map((row: any) => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','));
        content = [headers.join(','), ...rows].join('\n');
      } else {
        content = '';
      }
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportData = async (name: string, data: any, format: 'json' | 'csv') => {
    setExporting(name);
    await new Promise(r => setTimeout(r, 300));
    downloadFile(data, `cricket_${name}_${new Date().toISOString().split('T')[0]}`, format);
    toast({ title: `Exported ${name}` });
    setExporting('');
  };

  const exportFullBackup = async (format: 'json' | 'csv') => {
    setExporting('full');
    const [scorelists, auditEvents, tickets, supportMessages, csat, emailLinks, notifPrefs, presence, managementUsers, matchTimeline] = await Promise.all([
      v2api.getScorelists(),
      v2api.getAuditEvents(),
      v2api.getTickets(),
      v2api.getTicketMessages(),
      v2api.getCSAT(),
      v2api.getEmailLinks(),
      v2api.getNotificationPrefs(),
      v2api.getPresence(),
      v2api.getManagementUsers(),
      v2api.getMatchTimeline(),
    ]);
    
    if (format === 'json') {
      const backup = {
        players, tournaments, seasons, matches, batting, bowling, announcements, messages,
        scorelists, auditEvents, tickets, supportMessages, csat, emailLinks, notifPrefs,
        presence, managementUsers, matchTimeline,
        exportDate: new Date().toISOString(),
      };
      downloadFile(backup, `cricket_full_backup_${new Date().toISOString().split('T')[0]}`, 'json');
    } else {
      const datasets: Record<string, any[]> = {
        players, tournaments, seasons, matches, batting, bowling, announcements, messages,
        scorelists, auditEvents, tickets, supportMessages, csat, emailLinks, notifPrefs,
        presence, managementUsers, matchTimeline,
      };
      Object.entries(datasets).forEach(([name, data]) => {
        if (Array.isArray(data) && data.length > 0) {
          downloadFile(data, `cricket_${name}_${new Date().toISOString().split('T')[0]}`, 'csv');
        }
      });
    }
    toast({ title: 'Full backup exported (all modules included)' });
    setExporting('');
  };

  const exports = [
    { name: 'Players', data: players, icon: '👥' },
    { name: 'Matches', data: matches, icon: '🏏' },
    { name: 'Batting', data: batting, icon: '🏏' },
    { name: 'Bowling', data: bowling, icon: '🎯' },
    { name: 'Tournaments', data: tournaments, icon: '🏆' },
    { name: 'Seasons', data: seasons, icon: '📅' },
    { name: 'Announcements', data: announcements, icon: '📢' },
    { name: 'Messages', data: messages, icon: '💬' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <h1 className="font-display text-3xl font-bold">💾 Backup & Export</h1>
        <p className="text-sm text-muted-foreground">Full backup includes all v2 modules: Support tickets, CSAT, Email links, Presence, Management users, Scorelists, Audit events, Timeline.</p>

        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><Database className="h-5 w-5" /> Full Backup (All Modules)</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => exportFullBackup('json')} disabled={!!exporting} className="gap-1">
              {exporting === 'full' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
              Export JSON
            </Button>
            <Button variant="outline" onClick={() => exportFullBackup('csv')} disabled={!!exporting} className="gap-1">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exports.map(e => (
            <Card key={e.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{e.icon}</span>
                    <h3 className="font-display font-semibold">{e.name}</h3>
                  </div>
                  <Badge variant="outline">{e.data.length} records</Badge>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportData(e.name.toLowerCase(), e.data, 'json')} disabled={!!exporting} className="flex-1 gap-1">
                    <FileJson className="h-3 w-3" /> JSON
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportData(e.name.toLowerCase(), e.data, 'csv')} disabled={!!exporting} className="flex-1 gap-1">
                    <Download className="h-3 w-3" /> CSV
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminBackups;

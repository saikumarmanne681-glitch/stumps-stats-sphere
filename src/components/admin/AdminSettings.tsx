import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { setAppsScriptUrl, getAppsScriptUrl, isConnected, seedGoogleSheet } from '@/lib/googleSheets';
import { Database, Link, Unlink, Sprout, ExternalLink, Copy } from 'lucide-react';

export function AdminSettings() {
  const [url, setUrl] = useState(getAppsScriptUrl());
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!url.trim()) {
      toast({ title: 'Error', description: 'Enter the Apps Script Web App URL', variant: 'destructive' });
      return;
    }
    setAppsScriptUrl(url.trim());
    toast({ title: 'Connected!', description: 'Google Sheets URL saved. The app will now use your sheet.' });
  };

  const handleDisconnect = () => {
    setAppsScriptUrl('');
    setUrl('');
    toast({ title: 'Disconnected', description: 'Switched back to mock data mode.' });
  };

  const handleSeed = async () => {
    setSeeding(true);
    const result = await seedGoogleSheet();
    setSeeding(false);
    if (result.success) {
      toast({ title: '🌱 Seeded!', description: 'All tabs created with mock data in your Google Sheet.' });
    } else {
      toast({ title: 'Seed Failed', description: result.message, variant: 'destructive' });
    }
  };

  const handleCopyScript = () => {
    window.open('/google-apps-script.js', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Database className="h-5 w-5" /> Google Sheets Connection
          </CardTitle>
          <CardDescription>
            Connect your Google Apps Script Web App URL to use Google Sheets as your database.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">Status:</span>
            {isConnected() ? (
              <Badge className="bg-primary text-primary-foreground">🟢 Connected</Badge>
            ) : (
              <Badge variant="secondary">⚪ Using Mock Data</Badge>
            )}
          </div>

          <div>
            <Label>Apps Script Web App URL</Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/XXXXX/exec"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleConnect}>
              <Link className="h-4 w-4 mr-1" /> Connect
            </Button>
            {isConnected() && (
              <Button variant="outline" onClick={handleDisconnect}>
                <Unlink className="h-4 w-4 mr-1" /> Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seed Data */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Sprout className="h-5 w-5" /> Seed Google Sheet
          </CardTitle>
          <CardDescription>
            Create all 8 tabs (Players, Tournaments, Seasons, Matches, BattingScorecard, BowlingScorecard, Announcements, Messages) with headers and populate with sample mock data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleSeed}
            disabled={!isConnected() || seeding}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Sprout className="h-4 w-4 mr-1" />
            {seeding ? 'Seeding...' : '🌱 Seed Sheet with Mock Data'}
          </Button>
          {!isConnected() && (
            <p className="text-sm text-muted-foreground">Connect to Google Sheets first to enable seeding.</p>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            📋 Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">1</Badge>
              <div>
                <p className="font-medium">Get the Apps Script Code</p>
                <p className="text-muted-foreground">Click below to view the script, then copy it.</p>
                <Button variant="outline" size="sm" className="mt-1" onClick={handleCopyScript}>
                  <ExternalLink className="h-3 w-3 mr-1" /> View Apps Script Code
                </Button>
              </div>
            </div>

            <div className="flex gap-3">
              <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">2</Badge>
              <div>
                <p className="font-medium">Create a Google Apps Script project</p>
                <p className="text-muted-foreground">
                  Go to <a href="https://script.google.com" target="_blank" className="text-primary underline">script.google.com</a> → New project → paste the code into Code.gs
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">3</Badge>
              <div>
                <p className="font-medium">Deploy as Web App</p>
                <p className="text-muted-foreground">Click Deploy → New deployment → Web app → Execute as: Me → Who has access: Anyone → Deploy</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Badge variant="secondary" className="h-6 w-6 rounded-full p-0 flex items-center justify-center shrink-0">4</Badge>
              <div>
                <p className="font-medium">Paste the URL above and click Connect</p>
                <p className="text-muted-foreground">Then click "Seed Sheet with Mock Data" to populate your sheet with sample data.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

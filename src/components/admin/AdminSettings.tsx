import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { setAppsScriptUrl, getAppsScriptUrl, isConnected, seedGoogleSheet } from '@/lib/googleSheets';
import {
  DEFAULT_FROM_EMAIL,
  getAdminMailboxEmail,
  isAdminMailboxEnabled,
  isAdminMailboxVerified,
  setAdminMailboxEnabled,
  setAdminMailboxStatus,
  sendOtpEmail,
  sendWelcomeSubscriptionEmail,
  explainMailFailure,
} from '@/lib/mailer';
import { Database, Link, Unlink, Sprout, ExternalLink, Mail, ShieldCheck, Send, Server } from 'lucide-react';
import { UserEmailLink } from '@/lib/v2types';
import { Switch } from '@/components/ui/switch';
import { getAppEnvironment, ENV_LABELS } from '@/lib/environment';

export function AdminSettings() {
  const { updateAdminProfile, getAdminAlias } = useAuth();
  const [url, setUrl] = useState(getAppsScriptUrl());
  const [aliasName, setAliasName] = useState(getAdminAlias());
  const [adminPassword, setAdminPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState(getAdminMailboxEmail());
  const [adminEmailOtp, setAdminEmailOtp] = useState('');
  const [adminEmailRecord, setAdminEmailRecord] = useState<UserEmailLink | null>(null);
  const [adminMailEnabled, setAdminMailEnabled] = useState(isAdminMailboxEnabled());
  const [showAdminVerify, setShowAdminVerify] = useState(false);
  const [sendingAdminOtp, setSendingAdminOtp] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { toast } = useToast();
  const ADMIN_USER_ID = 'admin';

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const refreshAdminEmail = async () => {
    const links = await v2api.getEmailLinks();
    const link = links.find(l => l.user_id === ADMIN_USER_ID) || null;
    setAdminEmailRecord(link);
    if (link?.email) {
      setAdminEmail(link.email);
      setAdminMailboxStatus(link.email, !!link.is_verified);
    }
    if (link && !link.is_verified) setShowAdminVerify(true);
  };

  useEffect(() => {
    refreshAdminEmail().catch(() => undefined);
  }, []);

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

  const handleAdminProfileSave = () => {
    if (!aliasName.trim()) {
      toast({ title: 'Error', description: 'Alias name cannot be empty', variant: 'destructive' });
      return;
    }
    updateAdminProfile({ aliasName, password: adminPassword });
    setAdminPassword('');
    toast({ title: 'Admin profile updated', description: 'Alias and password were saved successfully.' });
  };

  const handleAdminEmailLink = async () => {
    if (!adminEmail.trim() || !adminEmail.includes('@')) {
      toast({ title: 'Enter a valid admin email', variant: 'destructive' });
      return;
    }
    const cleanEmail = adminEmail.trim().toLowerCase();
    const allLinks = await v2api.getEmailLinks();
    const duplicate = allLinks.find(l => String(l.email || '').trim().toLowerCase() === cleanEmail && l.is_verified && l.user_id !== ADMIN_USER_ID);
    if (duplicate) {
      toast({ title: 'This email is already linked to another account', variant: 'destructive' });
      return;
    }

    setSendingAdminOtp(true);
    const token = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60000).toISOString();
    const payload: UserEmailLink = {
      user_id: ADMIN_USER_ID,
      email: cleanEmail,
      is_verified: false,
      verification_token: token,
      token_expiry: expiry,
      verified_at: '',
      created_at: istNow(),
    };
    if (adminEmailRecord) await v2api.updateEmailLink(payload);
    else await v2api.addEmailLink(payload);

    setAdminMailboxStatus(cleanEmail, false);
    setAdminEmailRecord(payload);
    setShowAdminVerify(true);
    logAudit(ADMIN_USER_ID, 'link_admin_email', 'user_email', ADMIN_USER_ID, cleanEmail);
    const mailResult = await sendOtpEmail({ to: cleanEmail, otp: token, expiresAt: expiry, userName: getAdminAlias() });
    if (!mailResult.success) {
      toast({ title: 'Could not send verification email', description: explainMailFailure(mailResult.reason, mailResult.raw), variant: 'destructive' });
      setSendingAdminOtp(false);
      return;
    }
    toast({ title: 'Verification code sent', description: 'Check inbox/spam and verify to activate admin mails.' });
    setSendingAdminOtp(false);
  };

  const handleVerifyAdminEmail = async () => {
    const links = await v2api.getEmailLinks();
    const latest = links.find(l => l.user_id === ADMIN_USER_ID);
    if (!latest) return;
    if (adminEmailOtp.trim() !== String(latest.verification_token || '').trim()) {
      toast({ title: 'Invalid verification code', variant: 'destructive' });
      return;
    }
    const expiry = new Date(String(latest.token_expiry || ''));
    if (Date.now() > expiry.getTime()) {
      toast({ title: 'Code expired, request a new one', variant: 'destructive' });
      return;
    }
    const verifiedLink: UserEmailLink = { ...latest, is_verified: true, verified_at: istNow() };
    await v2api.updateEmailLink(verifiedLink);
    setAdminMailboxStatus(verifiedLink.email, true);
    logAudit(ADMIN_USER_ID, 'verify_admin_email', 'user_email', ADMIN_USER_ID, verifiedLink.email);
    const welcomeResult = await sendWelcomeSubscriptionEmail({
      to: verifiedLink.email,
      userName: getAdminAlias(),
      actions: [
        'Scorelist approval workflow alerts',
        'Administration security and system notices',
        'Portal operational email updates',
      ],
    });
    if (!welcomeResult.success) {
      toast({ title: 'Email verified, but welcome mail failed', description: explainMailFailure(welcomeResult.reason, welcomeResult.raw), variant: 'destructive' });
    }
    setAdminEmailRecord(verifiedLink);
    setShowAdminVerify(false);
    setAdminEmailOtp('');
    toast({ title: 'Admin email verified and active' });
  };

  const handleAdminMailboxToggle = (enabled: boolean) => {
    setAdminMailboxEnabled(enabled);
    setAdminMailEnabled(enabled);
    toast({
      title: enabled ? 'Admin mail delivery enabled' : 'Admin mail delivery paused',
      description: enabled
        ? 'Verified admin email will now receive administration alerts.'
        : 'Administration alerts to admin mailbox have been turned off.',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-display">👤 Admin Profile & Security</CardTitle>
          <CardDescription>Update admin alias (UI display name) and reset admin password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Admin Alias Name</Label>
            <Input value={aliasName} onChange={e => setAliasName(e.target.value)} placeholder="Administrator" />
          </div>
          <div>
            <Label>Reset Admin Password</Label>
            <Input
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <Button onClick={handleAdminProfileSave}>Save Admin Profile</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2"><Mail className="h-5 w-5" /> Admin Mailbox</CardTitle>
          <CardDescription>Link or change admin email and verify it to receive all administration mails.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Admin Email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                value={adminEmail}
                onChange={e => setAdminEmail(e.target.value)}
                placeholder="admin@yourdomain.com"
              />
              <Button onClick={handleAdminEmailLink} disabled={sendingAdminOtp}>
                <Send className="h-4 w-4 mr-1" /> {sendingAdminOtp ? 'Sending...' : (isAdminMailboxVerified() ? 'Change Email' : 'Link Email')}
              </Button>
            </div>
          </div>
          {showAdminVerify && (
            <div className="flex gap-2">
              <Input value={adminEmailOtp} onChange={e => setAdminEmailOtp(e.target.value)} maxLength={6} placeholder="Enter OTP" className="max-w-[180px]" />
              <Button variant="outline" onClick={handleVerifyAdminEmail}><ShieldCheck className="h-4 w-4 mr-1" /> Verify</Button>
            </div>
          )}
          <div className="flex items-center justify-between border rounded-md px-3 py-2">
            <div>
              <p className="text-sm font-medium">Receive all administration emails</p>
              <p className="text-xs text-muted-foreground">Includes scorelist workflow notifications and future admin alerts.</p>
            </div>
            <Switch checked={adminMailEnabled} onCheckedChange={handleAdminMailboxToggle} disabled={!isAdminMailboxVerified()} />
          </div>
          <p className="text-xs text-muted-foreground">
            Active sender/reply address: {isAdminMailboxVerified() ? adminEmailRecord?.email || adminEmail : DEFAULT_FROM_EMAIL}
          </p>
          <p className="text-xs text-muted-foreground">
            Note: Gmail can only send "From" aliases already configured in the Google account used by Apps Script.
          </p>
        </CardContent>
      </Card>

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
            <p className="mt-1 text-xs text-muted-foreground">Default sender/reply address configured in app: {DEFAULT_FROM_EMAIL}</p>
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

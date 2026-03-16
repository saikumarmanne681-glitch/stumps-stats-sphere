import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { v2api, istNow, logAudit } from '@/lib/v2api';
import { UserEmailLink, UserNotificationPreferences } from '@/lib/v2types';
import { generateId } from '@/lib/utils';
import { Loader2, Mail, CheckCircle, AlertCircle, Bell, Send, ShieldCheck } from 'lucide-react';

interface PlayerEmailSettingsProps {
  playerId: string;
}

export function PlayerEmailSettings({ playerId }: PlayerEmailSettingsProps) {
  const { toast } = useToast();
  const [emailLink, setEmailLink] = useState<UserEmailLink | null>(null);
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [verificationInput, setVerificationInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [lastResend, setLastResend] = useState(0);

  const refresh = async () => {
    const [links, prefs] = await Promise.all([v2api.getEmailLinks(), v2api.getNotificationPrefs()]);
    const myLink = links.find(l => l.user_id === playerId) || null;
    const myPrefs = prefs.find(p => p.user_id === playerId) || null;
    setEmailLink(myLink);
    setNotifPrefs(myPrefs);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [playerId]);

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleLinkEmail = async () => {
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }

    // Check for duplicate verified emails
    const allLinks = await v2api.getEmailLinks();
    const duplicate = allLinks.find(l => l.email === email && l.is_verified && l.user_id !== playerId);
    if (duplicate) {
      toast({ title: 'This email is already linked to another account', variant: 'destructive' });
      return;
    }

    setSending(true);
    const token = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const link: UserEmailLink = {
      user_id: playerId,
      email,
      is_verified: false,
      verification_token: token,
      token_expiry: expiry,
      verified_at: '',
      created_at: istNow(),
    };

    if (emailLink) {
      await v2api.updateEmailLink(link);
    } else {
      await v2api.addEmailLink(link);
    }

    logAudit(playerId, 'link_email', 'user_email', playerId, email);
    toast({ title: `📧 Verification code: ${token}`, description: 'In production, this would be emailed. Enter the code to verify.' });
    setShowVerify(true);
    setSending(false);
    setLastResend(Date.now());
    refresh();
  };

  const handleVerify = async () => {
    if (!emailLink) return;
    if (verificationInput !== emailLink.verification_token) {
      toast({ title: 'Invalid code', variant: 'destructive' });
      return;
    }
    // Check expiry
    const expiry = new Date(emailLink.token_expiry);
    if (Date.now() > expiry.getTime()) {
      toast({ title: 'Code expired, please resend', variant: 'destructive' });
      return;
    }

    await v2api.updateEmailLink({
      ...emailLink,
      is_verified: true,
      verified_at: istNow(),
    });
    logAudit(playerId, 'verify_email', 'user_email', playerId, emailLink.email);
    toast({ title: '✅ Email verified!' });
    setShowVerify(false);
    setVerificationInput('');
    refresh();
  };

  const handleResend = () => {
    if (Date.now() - lastResend < 60000) {
      toast({ title: 'Please wait before resending', variant: 'destructive' });
      return;
    }
    handleLinkEmail();
  };

  const handleNotifPrefChange = async (key: 'support_updates' | 'announcements' | 'security_alerts', value: boolean) => {
    const prefs: UserNotificationPreferences = {
      user_id: playerId,
      support_updates: notifPrefs?.support_updates ?? true,
      announcements: notifPrefs?.announcements ?? true,
      security_alerts: notifPrefs?.security_alerts ?? true,
      updated_at: istNow(),
      [key]: value,
    };

    if (notifPrefs) {
      await v2api.updateNotificationPrefs(prefs);
    } else {
      await v2api.addNotificationPrefs(prefs);
    }
    toast({ title: 'Preferences updated' });
    refresh();
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Email Linking */}
      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Mail className="h-5 w-5" /> Email Account</CardTitle></CardHeader>
        <CardContent>
          {emailLink?.is_verified ? (
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold">{emailLink.email}</p>
                <p className="text-xs text-muted-foreground">Verified on {emailLink.verified_at}</p>
              </div>
              <Badge className="bg-green-100 text-green-800">Verified</Badge>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" className="flex-1" />
                <Button onClick={handleLinkEmail} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                  Link Email
                </Button>
              </div>

              {showVerify && (
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-semibold">Enter verification code:</p>
                  <div className="flex gap-2">
                    <Input value={verificationInput} onChange={e => setVerificationInput(e.target.value)} placeholder="6-digit code" maxLength={6} className="w-40" />
                    <Button onClick={handleVerify} size="sm"><ShieldCheck className="h-4 w-4 mr-1" /> Verify</Button>
                    <Button variant="outline" size="sm" onClick={handleResend}>Resend</Button>
                  </div>
                </div>
              )}

              {emailLink && !emailLink.is_verified && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Pending verification for: {emailLink.email}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Preferences</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Support Updates</p>
                <p className="text-xs text-muted-foreground">Get notified about ticket replies and status changes</p>
              </div>
              <Switch checked={notifPrefs?.support_updates ?? true} onCheckedChange={v => handleNotifPrefChange('support_updates', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Announcements</p>
                <p className="text-xs text-muted-foreground">Club announcements and news</p>
              </div>
              <Switch checked={notifPrefs?.announcements ?? true} onCheckedChange={v => handleNotifPrefChange('announcements', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Security Alerts</p>
                <p className="text-xs text-muted-foreground">Login attempts and security notifications</p>
              </div>
              <Switch checked={notifPrefs?.security_alerts ?? true} onCheckedChange={v => handleNotifPrefChange('security_alerts', v)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

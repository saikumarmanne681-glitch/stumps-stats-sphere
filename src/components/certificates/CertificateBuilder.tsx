import { useEffect, useMemo, useState } from 'react';
import { useData } from '@/lib/DataContext';
import { v2api, logAudit } from '@/lib/v2api';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';
import { CERTIFICATE_TYPES, CertificateRecord, CertificateTemplateRecord, APPROVER_ROLES, approverLabel } from '@/lib/certificates';
import { CertificatePreview } from './CertificatePreview';
import { sendSystemEmail, getAdminNotificationRecipient } from '@/lib/mailer';
import { ManagementUser } from '@/lib/v2types';

const FALLBACK_TEMPLATES: CertificateTemplateRecord[] = [
  { template_id: 'TPL_CLASSIC_GOLD', type: 'all', template_name: 'Classic Gold', image_url: '', design_config: '' },
  { template_id: 'TPL_GREEN_ARENA', type: 'all', template_name: 'Green Arena', image_url: '', design_config: '' },
];

export function CertificateBuilder() {
  const { tournaments, seasons, matches, players } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CertificateTemplateRecord[]>([]);
  const [management, setManagement] = useState<ManagementUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CertificateRecord>>({
    type: CERTIFICATE_TYPES[0],
    recipient_type: 'player',
    template_id: 'TPL_CLASSIC_GOLD',
    status: 'DRAFT',
    match_id: '',
    details_json: '',
    performance_json: '',
  });

  useEffect(() => {
    v2api.getCertificateTemplates().then((rows) => setTemplates(rows.length ? rows : FALLBACK_TEMPLATES));
    v2api.getManagementUsers().then((rows) => setManagement(rows));
  }, []);

  const filteredTemplates = useMemo(() => {
    const all = templates.length ? templates : FALLBACK_TEMPLATES;
    return all.filter((template) => template.type === 'all' || template.type === form.type);
  }, [form.type, templates]);

  const recipients = useMemo(() => {
    if (form.recipient_type === 'team') {
      const names = new Set<string>();
      matches.forEach((match) => {
        if (match.team_a?.trim()) names.add(match.team_a.trim());
        if (match.team_b?.trim()) names.add(match.team_b.trim());
      });
      return [...names].map((name) => ({ id: name, name }));
    }
    return players.map((player) => ({ id: player.player_id, name: player.name }));
  }, [form.recipient_type, matches, players]);

  const selectedTemplate = filteredTemplates.find((item) => item.template_id === form.template_id) || filteredTemplates[0];
  const verificationUrl = `${window.location.origin}/verify?certificate_id=${encodeURIComponent(form.id || 'preview')}`;

  const updateField = (key: keyof CertificateRecord, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createCertificate = async (sendForApproval = false) => {
    if (!form.tournament || !form.season || !form.recipient_id || !form.recipient_name || !form.type) {
      toast({ title: 'Missing fields', description: 'Please fill tournament, season, recipient, and type.', variant: 'destructive' });
      return;
    }
    const now = new Date().toISOString();
    const id = form.id || generateId('CERT');
    const payload: CertificateRecord = {
      id,
      type: form.type,
      tournament: form.tournament,
      season: form.season,
      match_id: form.match_id || '',
      recipient_type: form.recipient_type || 'player',
      recipient_id: form.recipient_id,
      recipient_name: form.recipient_name,
      template_id: form.template_id || selectedTemplate?.template_id || FALLBACK_TEMPLATES[0].template_id,
      status: sendForApproval ? 'PENDING_APPROVAL' : 'DRAFT',
      created_by: user?.username || 'admin',
      created_at: now,
      details_json: form.details_json || '',
      performance_json: form.performance_json || '',
      verification_code: generateId('VERIFY'),
      certified_at: '',
      certified_by: '',
    };

    setSaving(true);
    try {
      const existing = await v2api.getCertificates();
      const found = existing.find((item) => item.id === id);
      const ok = found ? await v2api.updateCertificate(payload) : await v2api.addCertificate(payload);
      if (!ok) throw new Error('Could not save certificate');

      if (sendForApproval) {
        await Promise.all(APPROVER_ROLES.map((role) => v2api.updateCertificateApproval({
          certificate_id: id,
          role,
          status: 'pending',
          approved_by: '',
          approved_at: '',
          remarks: '',
        })));

        // fallback explicit filter for clarity
        const pendingApprovers = management.filter((member) => {
          const d = String(member.designation || '').toLowerCase();
          return d.includes('treasurer') || d.includes('referee') || d.includes('tournament director');
        });
        await Promise.all(pendingApprovers
          .filter((member) => member.email)
          .map((member) => sendSystemEmail({
            to: member.email,
            subject: `Certificate approval required: ${id}`,
            htmlBody: `<p>Certificate <strong>${id}</strong> is waiting for your approval as ${member.designation}.</p>`,
            diagnostics: { triggerSource: 'certificate_approval_request', triggerEntityType: 'certificate', triggerEntityId: id, triggeredBy: user?.username || 'admin' },
          })));
      }

      logAudit(user?.username || 'admin', sendForApproval ? 'certificate_sent_for_approval' : 'certificate_saved_draft', 'certificate', id, JSON.stringify(payload));
      toast({ title: sendForApproval ? 'Sent for approval' : 'Saved', description: `Certificate ${id} ${sendForApproval ? 'queued for approval' : 'saved as draft'}.` });
      setForm((prev) => ({ ...prev, id, status: payload.status }));
    } catch (error) {
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Certificate Builder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tournament</Label>
              <Select value={form.tournament || ''} onValueChange={(value) => updateField('tournament', value)}>
                <SelectTrigger><SelectValue placeholder="Select tournament" /></SelectTrigger>
                <SelectContent>
                  {tournaments.map((item) => <SelectItem key={item.tournament_id} value={item.name}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Season</Label>
              <Select value={form.season || ''} onValueChange={(value) => updateField('season', value)}>
                <SelectTrigger><SelectValue placeholder="Select season" /></SelectTrigger>
                <SelectContent>
                  {seasons.map((item) => <SelectItem key={item.season_id} value={String(item.year)}>{item.year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Match (optional)</Label>
              <Select value={form.match_id || 'none'} onValueChange={(value) => updateField('match_id', value === 'none' ? '' : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific match</SelectItem>
                  {matches.map((item) => <SelectItem key={item.match_id} value={item.match_id}>{item.match_id} · {item.team_a} vs {item.team_b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Certificate type</Label>
              <Select value={form.type || CERTIFICATE_TYPES[0]} onValueChange={(value) => updateField('type', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Recipient type</Label>
              <Select value={form.recipient_type || 'player'} onValueChange={(value) => setForm((prev) => ({ ...prev, recipient_type: value as 'player' | 'team', recipient_id: '', recipient_name: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="player">Player</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Template</Label>
              <Select value={form.template_id || selectedTemplate?.template_id} onValueChange={(value) => updateField('template_id', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((template) => <SelectItem key={template.template_id} value={template.template_id}>{template.template_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Recipient</Label>
            <Select value={form.recipient_id || ''} onValueChange={(value) => {
              const found = recipients.find((item) => item.id === value);
              setForm((prev) => ({ ...prev, recipient_id: value, recipient_name: found?.name || prev.recipient_name }));
            }}>
              <SelectTrigger><SelectValue placeholder="Select recipient" /></SelectTrigger>
              <SelectContent>
                {recipients.map((recipient) => <SelectItem key={recipient.id} value={recipient.id}>{recipient.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Recipient display name</Label>
            <Input value={form.recipient_name || ''} onChange={(event) => updateField('recipient_name', event.target.value)} />
          </div>

          <div>
            <Label>Match details</Label>
            <Textarea value={form.details_json || ''} onChange={(event) => updateField('details_json', event.target.value)} placeholder="Venue, date, innings highlights..." />
          </div>

          <div>
            <Label>Performance stats (optional)</Label>
            <Textarea value={form.performance_json || ''} onChange={(event) => updateField('performance_json', event.target.value)} placeholder="Runs, wickets, strike rate, economy..." />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={saving} variant="outline" onClick={() => createCertificate(false)}>Save Draft</Button>
            <Button disabled={saving} onClick={() => createCertificate(true)}>Send for Approval</Button>
          </div>
          <p className="text-xs text-muted-foreground">Required approvers: {APPROVER_ROLES.map((role) => approverLabel(role)).join(', ')}.</p>
          {getAdminNotificationRecipient() && <p className="text-xs text-muted-foreground">Admin mailbox notifications are enabled.</p>}
        </CardContent>
      </Card>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Live Preview</h4>
        <CertificatePreview
          certificate={form}
          template={selectedTemplate}
          verificationUrl={verificationUrl}
          watermark={form.status === 'CERTIFIED'}
        />
      </div>
    </div>
  );
}


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
import { APPROVER_ROLES, CERTIFICATE_TYPES, CertificateApprovalRecord, CertificateRecord, CertificateTemplateRecord } from '@/lib/certificates';
import { CertificatePreview } from './CertificatePreview';
import { isCertificateCertified } from '@/lib/certificates';
import { getPublicVerifyCertificateUrl } from '@/lib/publicUrl';

const FALLBACK_TEMPLATES: CertificateTemplateRecord[] = [
  { template_id: 'TPL_CLASSIC_GOLD', type: 'all', template_name: 'Classic Gold', image_url: '', design_config: '' },
  { template_id: 'TPL_GREEN_ARENA', type: 'all', template_name: 'Green Arena', image_url: '', design_config: '' },
];

export function CertificateBuilder() {
  const { tournaments, seasons, matches, players } = useData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<CertificateTemplateRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const [library, setLibrary] = useState<CertificateRecord[]>([]);
  const [searchText, setSearchText] = useState('');
  const [form, setForm] = useState<Partial<CertificateRecord>>({
    type: CERTIFICATE_TYPES[0],
    recipient_type: 'player',
    template_id: 'TPL_CLASSIC_GOLD',
    status: 'PENDING_APPROVAL',
    match_id: '',
    recipient_name: '',
    linked_player_id: '',
    linked_team_name: '',
    details_json: '',
    performance_json: '',
  });

  useEffect(() => {
    v2api.getCertificateTemplates().then((rows) => setTemplates(rows.length ? rows : FALLBACK_TEMPLATES));
  }, []);

  const loadLibrary = async () => {
    const rows = await v2api.getCertificates();
    setLibrary(rows.filter((item) => isCertificateCertified(item)));
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const filteredTemplates = useMemo(() => {
    const all = templates.length ? templates : FALLBACK_TEMPLATES;
    return all.filter((template) => template.type === 'all' || template.type === form.type);
  }, [form.type, templates]);

  const teamOptions = useMemo(() => {
    const names = new Set<string>();
    matches.forEach((match) => {
      if (match.team_a?.trim()) names.add(match.team_a.trim());
      if (match.team_b?.trim()) names.add(match.team_b.trim());
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const selectedTemplate = filteredTemplates.find((item) => item.template_id === form.template_id) || filteredTemplates[0];
  const verificationUrl = getPublicVerifyCertificateUrl(form.id || 'preview');

  const updateField = (key: keyof CertificateRecord, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const createCertificate = async () => {
    if (!form.tournament || !form.season || !form.recipient_name || !form.type) {
      toast({ title: 'Missing fields', description: 'Please fill tournament, season, recipient name, and type.', variant: 'destructive' });
      return;
    }

    const now = new Date().toISOString();
    const id = form.id || generateId('CERT');
    const linkedPlayerId = String(form.linked_player_id || '').trim();
    const linkedTeamName = String(form.linked_team_name || '').trim();
    const recipientType: CertificateRecord['recipient_type'] = linkedTeamName && !linkedPlayerId ? 'team' : 'player';
    const recipientId = linkedPlayerId || linkedTeamName || '';
    if (!recipientId) {
      toast({
        title: 'Link recipient first',
        description: 'Please link either a player or a team. Unlinked certificates do not appear in player/team dashboards.',
        variant: 'destructive',
      });
      return;
    }

    const payload: CertificateRecord = {
      id,
      type: form.type,
      tournament: form.tournament,
      season: form.season,
      match_id: form.match_id || '',
      recipient_type: recipientType,
      recipient_id: recipientId,
      recipient_name: form.recipient_name,
      linked_player_id: linkedPlayerId,
      linked_team_name: linkedTeamName,
      template_id: form.template_id || selectedTemplate?.template_id || FALLBACK_TEMPLATES[0].template_id,
      status: 'PENDING_APPROVAL',
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

      const approvalRows = await v2api.getCertificateApprovals();
      await Promise.all(APPROVER_ROLES.map(async (role) => {
        const approvalPayload: CertificateApprovalRecord = {
          certificate_id: id,
          role,
          status: 'pending',
          approved_by: '',
          approved_at: '',
          remarks: '',
        };
        const existingApproval = approvalRows.find((item) => item.certificate_id === id && item.role === role);
        if (existingApproval) {
          await v2api.updateCertificateApproval(approvalPayload);
          return;
        }
        await v2api.addCertificateApproval(approvalPayload);
      }));

      logAudit(user?.username || 'admin', 'certificate_submitted_for_approval', 'certificate', id, JSON.stringify(payload));
      toast({ title: 'Certificate submitted', description: `Certificate ${id} is now waiting for approvals.` });
      setForm((prev) => ({ ...prev, id, status: payload.status }));
      window.dispatchEvent(new CustomEvent('certificates:changed'));
      await loadLibrary();
    } catch (error) {
      toast({ title: 'Save failed', description: error instanceof Error ? error.message : 'Unexpected error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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

          <div>
            <Label>Template</Label>
            <Select value={form.template_id || selectedTemplate?.template_id} onValueChange={(value) => updateField('template_id', value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {filteredTemplates.map((template) => <SelectItem key={template.template_id} value={template.template_id}>{template.template_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Link player (optional)</Label>
              <Select value={form.linked_player_id || 'none'} onValueChange={(value) => {
                const linkedPlayerId = value === 'none' ? '' : value;
                const linkedPlayer = players.find((item) => item.player_id === linkedPlayerId);
                setForm((prev) => ({
                  ...prev,
                  linked_player_id: linkedPlayerId,
                  recipient_id: linkedPlayerId || prev.linked_team_name || '',
                  recipient_type: prev.linked_team_name && !linkedPlayerId ? 'team' : 'player',
                  recipient_name: prev.recipient_name || linkedPlayer?.name || '',
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select player" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {players.map((player) => <SelectItem key={player.player_id} value={player.player_id}>{player.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link team (optional)</Label>
              <Select value={form.linked_team_name || 'none'} onValueChange={(value) => {
                const linkedTeamName = value === 'none' ? '' : value;
                setForm((prev) => ({
                  ...prev,
                  linked_team_name: linkedTeamName,
                  recipient_id: prev.linked_player_id || linkedTeamName || '',
                  recipient_type: linkedTeamName && !prev.linked_player_id ? 'team' : 'player',
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not linked</SelectItem>
                  {teamOptions.map((team) => <SelectItem key={team} value={team}>{team}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Recipient display name</Label>
            <Input value={form.recipient_name || ''} onChange={(event) => updateField('recipient_name', event.target.value)} placeholder="Displayed on certificate" />
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
            <Button disabled={saving} onClick={() => createCertificate()}>Send for Approval</Button>
          </div>
          <p className="text-xs text-muted-foreground">Certificates now enter the approval queue first, and appear in player/team dashboards only after full certification.</p>
        </CardContent>
      </Card>

      <div>
        <h4 className="mb-2 text-sm font-semibold">Live Preview</h4>
        <CertificatePreview
          certificate={form}
          template={selectedTemplate}
          verificationUrl={verificationUrl}
          watermark={form.status === 'CERTIFIED'}
          showDownload
          defaultExpanded
        />
      </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Certified Certificate Library</CardTitle>
          <Input
            placeholder="Search by certificate ID, recipient, tournament, team, player..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {library
            .filter((item) => {
              const query = searchText.trim().toLowerCase();
              if (!query) return true;
              const haystack = [
                item.id,
                item.recipient_name,
                item.recipient_id,
                item.tournament,
                item.season,
                item.linked_player_id,
                item.linked_team_name,
                item.type,
              ].join(' ').toLowerCase();
              return haystack.includes(query);
            })
            .sort((a, b) => new Date(b.certified_at || b.created_at || '').getTime() - new Date(a.certified_at || a.created_at || '').getTime())
            .map((certificate) => (
              <CertificatePreview
                key={certificate.id}
                certificate={certificate}
                verificationUrl={getPublicVerifyCertificateUrl(certificate.id)}
                watermark
                showDownload
                defaultExpanded={false}
              />
            ))}
          {library.length === 0 && <p className="text-sm text-muted-foreground">No certified certificates available yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

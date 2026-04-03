import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Save, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DynamicFormDefinition, DynamicFormEntry } from '@/lib/v2types';
import { v2api } from '@/lib/v2api';
import { generateId } from '@/lib/utils';
import { nowIso } from '@/lib/time';
import { parseFields, stringifyFields } from '@/lib/forms';
import { useToast } from '@/hooks/use-toast';

const emptyForm = (): DynamicFormDefinition => ({
  form_id: generateId('FORM'),
  title: '',
  slug: '',
  description: '',
  status: 'draft',
  audience: 'all_logged_in',
  schema_json: '[]',
  settings_json: JSON.stringify({ allow_multiple_submissions: true, require_login: true }),
  created_by: 'admin',
  updated_by: 'admin',
  created_at: nowIso(),
  updated_at: nowIso(),
  published_at: '',
});

export function AdminForms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [forms, setForms] = useState<DynamicFormDefinition[]>([]);
  const [entries, setEntries] = useState<DynamicFormEntry[]>([]);
  const [activeForm, setActiveForm] = useState<DynamicFormDefinition>(emptyForm());
  const [fieldsEditor, setFieldsEditor] = useState('[]');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [formRows, entryRows] = await Promise.all([v2api.getFormDefinitions(), v2api.getFormEntries()]);
    setForms(formRows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))));
    setEntries(entryRows.sort((a, b) => String(b.submitted_at).localeCompare(String(a.submitted_at))));
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const formEntries = useMemo(() => entries.filter((entry) => entry.form_id === activeForm.form_id), [activeForm.form_id, entries]);

  const saveForm = async (publish = false) => {
    if (!activeForm.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    let parsedSchema = [];
    try {
      parsedSchema = parseFields(fieldsEditor);
    } catch {
      toast({ title: 'Invalid schema JSON', variant: 'destructive' });
      return;
    }

    const next: DynamicFormDefinition = {
      ...activeForm,
      schema_json: stringifyFields(parsedSchema),
      slug: activeForm.slug?.trim() || activeForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      updated_at: nowIso(),
      updated_by: user?.name || user?.username || 'admin',
      status: publish ? 'published' : activeForm.status,
      published_at: publish ? nowIso() : activeForm.published_at,
    };

    const exists = forms.some((form) => form.form_id === next.form_id);
    const ok = exists ? await v2api.updateFormDefinition(next) : await v2api.addFormDefinition(next);
    if (!ok) {
      toast({ title: 'Unable to save form', variant: 'destructive' });
      return;
    }
    toast({ title: publish ? 'Form published' : 'Form saved' });
    setActiveForm(next);
    await load();
  };

  const openForm = (form: DynamicFormDefinition) => {
    setActiveForm(form);
    setFieldsEditor(form.schema_json || '[]');
  };

  const updateEntryStatus = async (entry: DynamicFormEntry, status: DynamicFormEntry['status']) => {
    const next: DynamicFormEntry = {
      ...entry,
      status,
      reviewed_at: nowIso(),
      reviewed_by: user?.name || user?.username || 'admin',
    };
    const ok = await v2api.updateFormEntry(next);
    if (!ok) {
      toast({ title: 'Failed to update entry', variant: 'destructive' });
      return;
    }
    toast({ title: `Entry ${status}` });
    setEntries((prev) => prev.map((row) => row.entry_id === next.entry_id ? next : row));
  };

  return (
    <Tabs defaultValue="builder" className="space-y-4">
      <TabsList>
        <TabsTrigger value="builder">Form Builder</TabsTrigger>
        <TabsTrigger value="entries">Entries & Approval</TabsTrigger>
      </TabsList>

      <TabsContent value="builder" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Admin Form Builder {loading && '• Loading...'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => { const fresh = emptyForm(); setActiveForm(fresh); setFieldsEditor('[]'); }}>
                <Plus className="mr-2 h-4 w-4" /> New Form
              </Button>
              <Button onClick={() => void saveForm(false)}><Save className="mr-2 h-4 w-4" /> Save Draft</Button>
              <Button variant="default" onClick={() => void saveForm(true)}><Send className="mr-2 h-4 w-4" /> Publish Form</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Title</Label><Input value={activeForm.title} onChange={(e) => setActiveForm((prev) => ({ ...prev, title: e.target.value }))} /></div>
              <div><Label>Slug</Label><Input value={activeForm.slug} onChange={(e) => setActiveForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="auto-generated-if-empty" /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Audience</Label>
                <Select value={activeForm.audience} onValueChange={(value) => setActiveForm((prev) => ({ ...prev, audience: value as DynamicFormDefinition['audience'] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_logged_in">All logged in</SelectItem>
                    <SelectItem value="players">Players only</SelectItem>
                    <SelectItem value="teams">Teams only</SelectItem>
                    <SelectItem value="management">Management only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Input value={activeForm.status} readOnly />
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={activeForm.description} onChange={(e) => setActiveForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
            <div>
              <Label>Fields JSON (supports conditional rules with `conditions` array)</Label>
              <Textarea className="min-h-[260px] font-mono text-xs" value={fieldsEditor} onChange={(e) => setFieldsEditor(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Existing forms</Label>
              <div className="flex flex-wrap gap-2">
                {forms.map((form) => (
                  <Button key={form.form_id} size="sm" variant="outline" onClick={() => openForm(form)}>
                    {form.title} <Badge variant="secondary" className="ml-2">{form.status}</Badge>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="entries" className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Submission Review Queue</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">Review, accept, or reject entries submitted by teams/players.</div>
            <div className="space-y-3">
              {formEntries.length === 0 && <p className="text-sm text-muted-foreground">No entries for selected form.</p>}
              {formEntries.map((entry) => (
                <div key={entry.entry_id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div>
                      <p className="font-medium">{entry.submitted_by_name} ({entry.submitted_by_role})</p>
                      <p className="text-xs text-muted-foreground">{entry.submitted_at}</p>
                    </div>
                    <Badge>{entry.status}</Badge>
                  </div>
                  <pre className="rounded bg-muted p-2 text-xs overflow-x-auto">{entry.payload_json}</pre>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void updateEntryStatus(entry, 'accepted')}><Check className="h-4 w-4 mr-1" /> Accept</Button>
                    <Button size="sm" variant="destructive" onClick={() => void updateEntryStatus(entry, 'rejected')}><Trash2 className="h-4 w-4 mr-1" /> Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

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
import { Checkbox } from '@/components/ui/checkbox';
import { DynamicFormDefinition, DynamicFormEntry, DynamicFormField, DynamicFormFieldOption, DynamicFormFieldType } from '@/lib/v2types';
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

const FIELD_TYPE_OPTIONS: { value: DynamicFormFieldType; label: string }[] = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & time' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Single choice' },
  { value: 'multi_select', label: 'Multiple choice' },
];

const OPTION_FIELD_TYPES = new Set<DynamicFormFieldType>(['select', 'radio', 'multi_select']);

const makeFieldKey = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const createEmptyOption = (): DynamicFormFieldOption => ({ label: '', value: '' });

const createEmptyField = (index: number): DynamicFormField => ({
  key: `field_${index + 1}`,
  type: 'short_text',
  label: '',
  required: false,
  placeholder: '',
  help_text: '',
  default_value: '',
  options: [],
  conditions: [],
});

const normalizeFieldForSave = (field: DynamicFormField, index: number): DynamicFormField => {
  const label = String(field.label || '').trim();
  const key = makeFieldKey(field.key || label || `field_${index + 1}`) || `field_${index + 1}`;
  const type = field.type || 'short_text';
  const options = OPTION_FIELD_TYPES.has(type)
    ? (field.options || [])
      .map((option) => ({
        label: String(option.label || '').trim(),
        value: String(option.value || option.label || '').trim(),
      }))
      .filter((option) => option.label && option.value)
    : [];

  return {
    key,
    type,
    label: label || `Field ${index + 1}`,
    required: Boolean(field.required),
    placeholder: String(field.placeholder || '').trim(),
    help_text: String(field.help_text || '').trim(),
    default_value: String(field.default_value || '').trim(),
    options,
    conditions: field.conditions || [],
  };
};

export function AdminForms() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [forms, setForms] = useState<DynamicFormDefinition[]>([]);
  const [entries, setEntries] = useState<DynamicFormEntry[]>([]);
  const [activeForm, setActiveForm] = useState<DynamicFormDefinition>(emptyForm());
  const [fields, setFields] = useState<DynamicFormField[]>([]);
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
    const parsedSchema = fields
      .map((field, index) => normalizeFieldForSave(field, index))
      .filter((field) => field.label.trim().length > 0);

    if (parsedSchema.length === 0) {
      toast({ title: 'Add at least one field', variant: 'destructive' });
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
    setFields(parseFields(form.schema_json || '[]'));
  };

  const updateField = (index: number, patch: Partial<DynamicFormField>) => {
    setFields((prev) => prev.map((field, fieldIndex) => {
      if (fieldIndex !== index) return field;
      const nextType = (patch.type || field.type) as DynamicFormFieldType;
      return {
        ...field,
        ...patch,
        key: patch.key !== undefined ? makeFieldKey(patch.key) : field.key,
        options: OPTION_FIELD_TYPES.has(nextType) ? field.options || [] : [],
      };
    }));
  };

  const updateOption = (fieldIndex: number, optionIndex: number, patch: Partial<DynamicFormFieldOption>) => {
    setFields((prev) => prev.map((field, currentFieldIndex) => {
      if (currentFieldIndex !== fieldIndex) return field;
      const options = (field.options || []).map((option, currentOptionIndex) => {
        if (currentOptionIndex !== optionIndex) return option;
        const nextLabel = patch.label !== undefined ? patch.label : option.label;
        const nextValue = patch.value !== undefined ? patch.value : option.value;
        return {
          label: nextLabel,
          value: nextValue,
        };
      });
      return { ...field, options };
    }));
  };

  const addField = () => setFields((prev) => [...prev, createEmptyField(prev.length)]);
  const removeField = (index: number) => setFields((prev) => prev.filter((_, fieldIndex) => fieldIndex !== index));
  const addOption = (fieldIndex: number) => setFields((prev) => prev.map((field, currentFieldIndex) => {
    if (currentFieldIndex !== fieldIndex) return field;
    return { ...field, options: [...(field.options || []), createEmptyOption()] };
  }));
  const removeOption = (fieldIndex: number, optionIndex: number) => setFields((prev) => prev.map((field, currentFieldIndex) => {
    if (currentFieldIndex !== fieldIndex) return field;
    return { ...field, options: (field.options || []).filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex) };
  }));

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
              <Button variant="secondary" onClick={() => { const fresh = emptyForm(); setActiveForm(fresh); setFields([]); }}>
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

            <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Label>Form fields</Label>
                  <p className="text-sm text-muted-foreground">Add normal fields one by one instead of editing schema JSON manually.</p>
                </div>
                <Button type="button" variant="outline" onClick={addField}><Plus className="mr-2 h-4 w-4" /> Add field</Button>
              </div>

              {fields.length === 0 && <p className="text-sm text-muted-foreground">No fields added yet.</p>}

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const supportsOptions = OPTION_FIELD_TYPES.has(field.type);
                  return (
                    <div key={`${field.key}-${index}`} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">Field {index + 1}</p>
                          <p className="text-xs text-muted-foreground">Column key: {field.key || 'auto-generated on save'}</p>
                        </div>
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeField(index)}>
                          <Trash2 className="mr-1 h-4 w-4" /> Remove
                        </Button>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Field label</Label>
                          <Input value={field.label} onChange={(e) => updateField(index, { label: e.target.value, key: field.key || makeFieldKey(e.target.value) })} placeholder="Example: Player name" />
                        </div>
                        <div>
                          <Label>Column key</Label>
                          <Input value={field.key} onChange={(e) => updateField(index, { key: e.target.value })} placeholder="player_name" />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                        <div>
                          <Label>Field type</Label>
                          <Select value={field.type} onValueChange={(value) => updateField(index, { type: value as DynamicFormFieldType })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
                            <Checkbox checked={field.required} onCheckedChange={(checked) => updateField(index, { required: Boolean(checked) })} />
                            Required
                          </label>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Placeholder</Label>
                          <Input value={field.placeholder || ''} onChange={(e) => updateField(index, { placeholder: e.target.value })} placeholder="Shown before typing" />
                        </div>
                        <div>
                          <Label>Default value</Label>
                          <Input value={field.default_value || ''} onChange={(e) => updateField(index, { default_value: e.target.value })} placeholder="Optional default value" />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label>Help text</Label>
                        <Textarea value={field.help_text || ''} onChange={(e) => updateField(index, { help_text: e.target.value })} placeholder="Short guidance shown below the field" />
                      </div>

                      {supportsOptions && (
                        <div className="mt-4 space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <Label>Options</Label>
                              <p className="text-xs text-muted-foreground">Add the choices users can select.</p>
                            </div>
                            <Button type="button" size="sm" variant="outline" onClick={() => addOption(index)}>
                              <Plus className="mr-1 h-4 w-4" /> Add option
                            </Button>
                          </div>

                          {(field.options || []).length === 0 && <p className="text-xs text-muted-foreground">No options yet.</p>}

                          {(field.options || []).map((option, optionIndex) => (
                            <div key={`${field.key}-option-${optionIndex}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                              <Input value={option.label} onChange={(e) => updateOption(index, optionIndex, { label: e.target.value })} placeholder="Option label" />
                              <Input value={option.value} onChange={(e) => updateOption(index, optionIndex, { value: e.target.value })} placeholder="Stored value" />
                              <Button type="button" size="sm" variant="ghost" onClick={() => removeOption(index, optionIndex)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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

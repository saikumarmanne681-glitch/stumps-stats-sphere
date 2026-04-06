import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { DynamicFormDefinition, DynamicFormEntry } from '@/lib/v2types';
import { v2api } from '@/lib/v2api';
import { initializeValues, isFormOpen, parseFields, parseFormSettings, shouldRenderField } from '@/lib/forms';
import { generateId } from '@/lib/utils';
import { nowIso } from '@/lib/time';
import { useToast } from '@/hooks/use-toast';

export default function FormsPortalPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [forms, setForms] = useState<DynamicFormDefinition[]>([]);
  const [entries, setEntries] = useState<DynamicFormEntry[]>([]);
  const [selectedFormId, setSelectedFormId] = useState('');
  const [values, setValues] = useState<Record<string, string | string[] | boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const rows = await v2api.getFormDefinitions();
      const entryRows = await v2api.getFormEntries();
      const published = rows.filter((item) => item.status === 'published');
      setForms(published);
      setEntries(entryRows);
      if (published.length) {
        setSelectedFormId((prev) => prev || published[0].form_id);
      }
    };
    void load();
  }, []);

  const selectedForm = useMemo(() => forms.find((form) => form.form_id === selectedFormId), [forms, selectedFormId]);
  const fields = useMemo(() => parseFields(selectedForm?.schema_json), [selectedForm?.schema_json]);
  const selectedFormResponses = useMemo(() => entries.filter((entry) => entry.form_id === selectedFormId), [entries, selectedFormId]);
  const selectedFormSettings = useMemo(() => selectedForm ? parseFormSettings(selectedForm.settings_json) : null, [selectedForm]);
  const selectedFormOpenState = useMemo(() => selectedForm ? isFormOpen(selectedForm, selectedFormResponses.length) : { open: false, reason: '' }, [selectedForm, selectedFormResponses.length]);

  useEffect(() => {
    if (!selectedForm) return;
    setValues(initializeValues(selectedForm));
  }, [selectedForm?.form_id]);

  const allowedForms = useMemo(() => forms.filter((form) => {
    if (!user) return false;
    if (form.audience === 'all_logged_in') return true;
    if (form.audience === 'players') return user.type === 'player';
    if (form.audience === 'teams') return user.type === 'team';
    if (form.audience === 'management') return user.type === 'management' || user.type === 'admin';
    return true;
  }), [forms, user]);


  useEffect(() => {
    if (!allowedForms.length) {
      setSelectedFormId('');
      return;
    }
    if (!allowedForms.some((form) => form.form_id === selectedFormId)) {
      setSelectedFormId(allowedForms[0].form_id);
    }
  }, [allowedForms, selectedFormId]);

  if (!user) return <Navigate to="/login" replace />;

  const setValue = (key: string, next: string | string[] | boolean) => setValues((prev) => ({ ...prev, [key]: next }));

  const submit = async () => {
    if (!selectedForm) return;
    if (!selectedFormOpenState.open) {
      toast({ title: selectedFormOpenState.reason || 'This form is currently closed.', variant: 'destructive' });
      return;
    }
    if (!selectedFormSettings?.allow_multiple_submissions) {
      const alreadySubmitted = entries.some((entry) => entry.form_id === selectedForm.form_id && entry.submitted_by_id === (user.player_id || user.team_id || user.management_id || user.username));
      if (alreadySubmitted) {
        toast({ title: 'You have already submitted this form.', variant: 'destructive' });
        return;
      }
    }
    const visibleRequired = fields.filter((field) => shouldRenderField(field, values) && field.required && !['heading', 'divider', 'html_block'].includes(field.type));
    const missing = visibleRequired.find((field) => {
      const value = values[field.key];
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'boolean') return !value;
      return !String(value || '').trim();
    });
    if (missing) {
      toast({ title: `Missing required field: ${missing.label}`, variant: 'destructive' });
      return;
    }

    const payload: DynamicFormEntry = {
      entry_id: generateId('ENTRY'),
      form_id: selectedForm.form_id,
      form_title: selectedForm.title,
      submitted_by_id: user.player_id || user.team_id || user.management_id || user.username,
      submitted_by_name: user.name || user.username,
      submitted_by_role: user.type,
      payload_json: JSON.stringify(values),
      status: 'pending',
      notes: '',
      submitted_at: nowIso(),
      reviewed_at: '',
      reviewed_by: '',
    };

    setSubmitting(true);
    const ok = await v2api.addFormEntry(payload);
    setSubmitting(false);
    if (!ok) {
      toast({ title: 'Submission failed', variant: 'destructive' });
      return;
    }
    toast({ title: 'Form submitted successfully' });
    setValues(initializeValues(selectedForm));
    setEntries((prev) => [...prev, payload]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Published Forms Portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Label>Select form</Label>
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger className="max-w-md"><SelectValue placeholder="Select a published form" /></SelectTrigger>
                <SelectContent>
                  {allowedForms.map((form) => <SelectItem key={form.form_id} value={form.form_id}>{form.title}</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedForm && <Badge>{selectedForm.audience}</Badge>}
            </div>
            {!selectedForm && <p className="text-sm text-muted-foreground">No published forms available for your role.</p>}
            {selectedForm && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-lg">{selectedForm.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedForm.description}</p>
                  {!selectedFormOpenState.open && (
                    <p className="mt-1 text-sm text-destructive">{selectedFormOpenState.reason || 'Form is currently closed.'}</p>
                  )}
                  {selectedFormSettings?.open_at && <p className="text-xs text-muted-foreground">Opens: {new Date(selectedFormSettings.open_at).toLocaleString()}</p>}
                  {selectedFormSettings?.close_at && <p className="text-xs text-muted-foreground">Closes: {new Date(selectedFormSettings.close_at).toLocaleString()}</p>}
                  {selectedFormSettings?.max_responses ? <p className="text-xs text-muted-foreground">Responses: {selectedFormResponses.length}/{selectedFormSettings.max_responses}</p> : null}
                </div>
                {fields.filter((field) => shouldRenderField(field, values)).map((field) => (
                  <div key={field.key} className="space-y-2">
                    {field.type === 'heading' ? (
                      <h3 className="text-lg font-semibold">{field.label}</h3>
                    ) : field.type === 'divider' ? (
                      <div className="h-px w-full bg-border" />
                    ) : field.type === 'html_block' ? (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm" dangerouslySetInnerHTML={{ __html: field.default_value || '' }} />
                    ) : (
                      <>
                    <Label>{field.label}{field.required ? ' *' : ''}</Label>
                    {field.type === 'long_text' ? (
                      <Textarea value={String(values[field.key] || '')} onChange={(e) => setValue(field.key, e.target.value)} placeholder={field.placeholder || ''} />
                    ) : field.type === 'select' || field.type === 'radio' ? (
                      <Select value={String(values[field.key] || '')} onValueChange={(next) => setValue(field.key, next)}>
                        <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select option'} /></SelectTrigger>
                        <SelectContent>
                          {(field.options || []).map((option) => <SelectItem key={`${field.key}-${option.value}`} value={option.value}>{option.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : field.type === 'multi_select' ? (
                      <div className="space-y-2">
                        {(field.options || []).map((option) => {
                          const current = Array.isArray(values[field.key]) ? values[field.key] as string[] : [];
                          const checked = current.includes(option.value);
                          return (
                            <label key={`${field.key}-${option.value}`} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(next) => {
                                  const currentValues = Array.isArray(values[field.key]) ? [...(values[field.key] as string[])] : [];
                                  setValue(field.key, next ? [...new Set([...currentValues, option.value])] : currentValues.filter((row) => row !== option.value));
                                }}
                              />
                              {option.label}
                            </label>
                          );
                        })}
                      </div>
                    ) : field.type === 'checkbox' ? (
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox checked={Boolean(values[field.key])} onCheckedChange={(next) => setValue(field.key, Boolean(next))} />
                        {field.help_text || 'Check to confirm'}
                      </label>
                    ) : field.type === 'yes_no' ? (
                      <Select value={String(values[field.key] || '')} onValueChange={(next) => setValue(field.key, next)}>
                        <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select'} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : field.type === 'rating' ? (
                      <Select value={String(values[field.key] || '')} onValueChange={(next) => setValue(field.key, next)}>
                        <SelectTrigger><SelectValue placeholder={field.placeholder || 'Rate 1-5'} /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((rating) => <SelectItem key={`${field.key}-${rating}`} value={String(rating)}>{rating}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : field.type === 'datetime' ? 'datetime-local' : 'text'}
                        value={String(values[field.key] || '')}
                        onChange={(e) => setValue(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                    {field.help_text && field.type !== 'checkbox' && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
                      </>
                    )}
                  </div>
                ))}
                <Button onClick={() => void submit()} disabled={submitting || !selectedFormOpenState.open}>{submitting ? 'Submitting...' : selectedFormOpenState.open ? 'Submit form' : 'Form closed'}</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

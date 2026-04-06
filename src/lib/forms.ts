import { DynamicFormCondition, DynamicFormDefinition, DynamicFormField, DynamicFormFieldOption, DynamicFormFieldType, DynamicFormSettings } from '@/lib/v2types';

const FALLBACK_FIELD_TYPES: DynamicFormFieldType[] = ['short_text', 'long_text', 'number', 'email', 'phone', 'url', 'date', 'time', 'datetime', 'yes_no', 'rating', 'heading', 'divider', 'html_block', 'checkbox', 'select', 'radio', 'multi_select'];

export const defaultFormSettings = (): DynamicFormSettings => ({
  allow_multiple_submissions: true,
  require_login: true,
  accepting_responses: true,
  open_at: '',
  close_at: '',
  max_responses: '',
});

export function parseFields(schemaJson?: string): DynamicFormField[] {
  if (!schemaJson) return [];
  try {
    const parsed = JSON.parse(schemaJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeField)
      .filter((field): field is DynamicFormField => !!field);
  } catch {
    return [];
  }
}

export function stringifyFields(fields: DynamicFormField[]) {
  return JSON.stringify(fields, null, 2);
}

export function parseFormSettings(settingsJson?: string): DynamicFormSettings {
  if (!settingsJson) return defaultFormSettings();
  try {
    const parsed = JSON.parse(settingsJson) as Partial<DynamicFormSettings>;
    const defaults = defaultFormSettings();
    return {
      ...defaults,
      ...parsed,
      allow_multiple_submissions: parsed.allow_multiple_submissions ?? defaults.allow_multiple_submissions,
      require_login: parsed.require_login ?? defaults.require_login,
      accepting_responses: parsed.accepting_responses ?? defaults.accepting_responses,
      open_at: String(parsed.open_at || ''),
      close_at: String(parsed.close_at || ''),
      max_responses: parsed.max_responses === '' || parsed.max_responses === undefined
        ? ''
        : Math.max(1, Number(parsed.max_responses) || 1),
    };
  } catch {
    return defaultFormSettings();
  }
}

function normalizeField(raw: unknown): DynamicFormField | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const key = String(row.key || '').trim();
  if (!key) return null;
  const type = normalizeFieldType(String(row.type || '').trim());
  const label = String(row.label || key).trim();
  const options = normalizeOptions(row.options);
  const conditions = normalizeConditions(row.conditions);
  const required = Boolean(row.required);
  const placeholder = String(row.placeholder || '').trim();
  const help_text = String(row.help_text || '').trim();
  const default_value = String(row.default_value || '').trim();
  return {
    key,
    type,
    label,
    required,
    placeholder,
    help_text,
    default_value,
    options,
    conditions,
  };
}

function normalizeFieldType(value: string): DynamicFormFieldType {
  return (FALLBACK_FIELD_TYPES.includes(value as DynamicFormFieldType) ? value : 'short_text') as DynamicFormFieldType;
}

function normalizeOptions(raw: unknown): DynamicFormFieldOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((option) => {
      if (!option || typeof option !== 'object') return null;
      const item = option as Record<string, unknown>;
      const label = String(item.label || '').trim();
      const value = String(item.value || label).trim();
      if (!label || !value) return null;
      return { label, value };
    })
    .filter((option): option is DynamicFormFieldOption => !!option);
}

function normalizeConditions(raw: unknown): DynamicFormCondition[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((condition) => {
      if (!condition || typeof condition !== 'object') return null;
      const item = condition as Record<string, unknown>;
      const field_key = String(item.field_key || '').trim();
      const operator = String(item.operator || '').trim() as DynamicFormCondition['operator'];
      const value = String(item.value || '').trim();
      if (!field_key || !value || !operator) return null;
      return { field_key, operator, value };
    })
    .filter((condition): condition is DynamicFormCondition => !!condition);
}

export function shouldRenderField(field: DynamicFormField, values: Record<string, string | string[] | boolean>) {
  if (!field.conditions || field.conditions.length === 0) return true;
  return field.conditions.every((condition) => evaluateCondition(condition, values));
}

export function evaluateCondition(condition: DynamicFormCondition, values: Record<string, string | string[] | boolean>) {
  const actual = values[condition.field_key];
  const normalizedExpected = condition.value.toLowerCase();

  if (Array.isArray(actual)) {
    const serialized = actual.map((item) => String(item).toLowerCase());
    if (condition.operator === 'equals') return serialized.includes(normalizedExpected);
    if (condition.operator === 'not_equals') return !serialized.includes(normalizedExpected);
    if (condition.operator === 'contains') return serialized.some((item) => item.includes(normalizedExpected));
    return true;
  }

  const actualText = String(actual ?? '').toLowerCase().trim();
  if (condition.operator === 'equals') return actualText === normalizedExpected;
  if (condition.operator === 'not_equals') return actualText !== normalizedExpected;
  if (condition.operator === 'contains') return actualText.includes(normalizedExpected);
  if (condition.operator === 'is_empty') return actualText.length === 0;
  if (condition.operator === 'is_not_empty') return actualText.length > 0;
  return true;
}

export function initializeValues(form: DynamicFormDefinition) {
  const fields = parseFields(form.schema_json);
  return fields.reduce<Record<string, string | string[] | boolean>>((acc, field) => {
    if (field.type === 'checkbox') {
      acc[field.key] = String(field.default_value || '').toLowerCase() === 'true';
      return acc;
    }
    if (field.type === 'multi_select') {
      acc[field.key] = field.default_value ? field.default_value.split(',').map((item) => item.trim()).filter(Boolean) : [];
      return acc;
    }
    if (field.type === 'yes_no') {
      const defaultText = String(field.default_value || '').toLowerCase();
      acc[field.key] = defaultText === 'yes' ? 'yes' : defaultText === 'no' ? 'no' : '';
      return acc;
    }
    acc[field.key] = field.default_value || '';
    return acc;
  }, {});
}

export function isFormOpen(form: DynamicFormDefinition, submittedCount = 0) {
  if (form.status !== 'published') return { open: false, reason: 'Form is not published yet.' };
  const settings = parseFormSettings(form.settings_json);
  if (!settings.accepting_responses) return { open: false, reason: 'Responses are currently disabled by admin.' };
  const now = Date.now();
  const openAt = settings.open_at ? new Date(settings.open_at).getTime() : 0;
  const closeAt = settings.close_at ? new Date(settings.close_at).getTime() : 0;
  if (openAt && now < openAt) return { open: false, reason: `Form opens at ${new Date(openAt).toLocaleString()}.` };
  if (closeAt && now > closeAt) return { open: false, reason: `Form closed at ${new Date(closeAt).toLocaleString()}.` };
  if (settings.max_responses && Number(settings.max_responses) > 0 && submittedCount >= Number(settings.max_responses)) {
    return { open: false, reason: 'Response limit reached for this form.' };
  }
  return { open: true, reason: '' };
}

import { DynamicFormCondition, DynamicFormDefinition, DynamicFormField, DynamicFormFieldOption, DynamicFormFieldType } from '@/lib/v2types';

const FALLBACK_FIELD_TYPES: DynamicFormFieldType[] = ['short_text', 'long_text', 'number', 'email', 'phone', 'date', 'time', 'datetime', 'checkbox', 'select', 'radio', 'multi_select'];

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
    acc[field.key] = field.default_value || '';
    return acc;
  }, {});
}

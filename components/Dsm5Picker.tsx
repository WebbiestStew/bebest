'use client';

import { Input, Select } from '@/components/FormInputs';
import { getDsm5Variants, findDsm5Code } from '@/lib/utils';

// Two-step diagnosis picker: type/pick the disorder itself, then — only when
// that disorder actually has more than one code (severity levels like
// Leve/Moderado/Grave, substance-specific variants, etc.) — a second step to
// pick exactly which one. Free typing still works for anything not in the
// list (matches the previous single-field behavior); this only adds a step
// when it can actually narrow down a code, instead of asking clinicians to
// scroll a flat list of 677 names to find the right severity level.
export function Dsm5Picker({
  label,
  required,
  error,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  error?: string;
  value: string;
  onChange: (name: string) => void;
}) {
  // Once a variant is picked, `value` itself is the full compound string
  // ("Base — Variante") — re-derive the base from it so the variant list
  // keeps showing instead of vanishing the moment one is selected.
  const base = value.includes(' — ') ? value.slice(0, value.indexOf(' — ')) : value;
  const variants = getDsm5Variants(base);
  const showVariantStep = variants.length > 1;
  const code = findDsm5Code(value);

  return (
    <div>
      <Input
        label={label}
        placeholder="Diagnóstico"
        list="dsm5-dx-list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={error}
        required={required}
      />
      {showVariantStep && (
        <div className="mt-3">
          <Select
            label={`${label} — especificar`}
            placeholder="Selecciona la variante…"
            options={variants.map((v) => ({ value: `${base} — ${v.label}`, label: v.label }))}
            value={value === base ? '' : value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
      {code && <div className="text-xs text-sage-deep font-mono mt-1.5">Código DSM-5-TR: {code}</div>}
    </div>
  );
}

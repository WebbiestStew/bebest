'use client';

// A live-updating "what this will look like on paper" panel next to a form —
// desktop only (a phone screen can't fit a form + a letter-sized preview
// side by side in any usable way). Also serves as the print/PDF layout:
// print:hidden on the real form + print:block here means printing (or
// "Save as PDF" from the print dialog, which is what browsers use for that)
// captures only this clean version, not the interactive inputs/buttons.
export function FormPrintPreview({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <aside className="hidden lg:block print:block">
      <div className="lg:sticky lg:top-8 bg-white border border-line rounded-2xl shadow-sm print:shadow-none print:border-0 p-8 print:p-0 max-h-[calc(100vh-4rem)] overflow-auto print:max-h-none print:overflow-visible">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <span className="text-xs font-mono text-ink-soft uppercase tracking-widest">Vista previa</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="text-xs font-medium text-sage-deep hover:underline underline-offset-2"
          >
            🖨️ Imprimir / Descargar PDF
          </button>
        </div>
        <div>
          <h1 className="font-serif text-2xl font-medium mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-ink-soft mb-6">{subtitle}</p>}
          <div className="space-y-5 text-sm text-ink">{children}</div>
        </div>
      </div>
    </aside>
  );
}

export function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0 print:break-inside-avoid">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-sage-deep mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">{children}</div>
    </div>
  );
}

export function PreviewField({
  label,
  value,
  full,
}: {
  label: string;
  value?: string | number | boolean | null;
  full?: boolean;
}) {
  if (value === undefined || value === null || value === '' || value === false) return null;
  const display = value === true ? 'Sí' : value;
  return (
    <div className={`flex flex-col gap-0.5 print:break-inside-avoid ${full ? 'col-span-2' : ''}`}>
      <span className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</span>
      <span className="text-ink break-words">{display}</span>
    </div>
  );
}

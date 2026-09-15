'use client';

import { useState } from 'react';
import { downloadPdf, normalizeText } from '@/lib/utils';
import { PdfDocument, PdfSectionData } from '@/components/PdfDocument';

// A live-updating "what this will look like on paper" panel next to a form —
// desktop only (a phone screen can't fit a form + a letter-sized preview
// side by side in any usable way). Two separate actions:
// - Imprimir: window.print() opens the browser's print dialog (actual paper,
//   or "Save as PDF" if the person picks that from the dialog themselves).
// - Descargar PDF: renders a real .pdf file with react-pdf and saves it
//   straight to disk, no dialog involved — this is what "I want to see the
//   whole thing on my computer" actually needs, since print-to-PDF depends
//   on the person choosing that option in a dialog built for paper.
// print:hidden on the real form + print:block here means printing captures
// only this clean version, not the interactive inputs/buttons.
export function FormPrintPreview({
  title,
  subtitle,
  filename,
  pdfSections,
  children,
  isAdmin,
}: {
  title: string;
  subtitle?: string;
  filename?: string;
  pdfSections?: PdfSectionData[];
  children: React.ReactNode;
  // Print/Descargar PDF are admin-only — the live "Vista previa" itself
  // stays visible to everyone (it's just a read-only mirror of the form,
  // desktop-only already), only the two export actions are gated. Required
  // rather than defaulted so every call site has to make the call
  // explicitly instead of silently leaving it exposed.
  isAdmin: boolean;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (!pdfSections) return;
    setIsDownloading(true);
    try {
      const slug = normalizeText(filename || title)
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      await downloadPdf(<PdfDocument title={title} subtitle={subtitle} sections={pdfSections} />, slug);
    } catch (error) {
      console.error('Error generating PDF:', error);
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al generar el PDF', isError: true } })
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <aside className="hidden lg:block print:block">
      <div className="lg:sticky lg:top-8 bg-white border border-line rounded-2xl shadow-sm print:shadow-none print:border-0 p-8 print:p-0 max-h-[calc(100vh-4rem)] overflow-auto print:max-h-none print:overflow-visible">
        <div className="flex items-center justify-between mb-6 print:hidden gap-3">
          <span className="text-xs font-mono text-ink-soft uppercase tracking-widest shrink-0">Vista previa</span>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="text-xs font-medium text-ink-soft hover:text-sage-deep hover:underline underline-offset-2 transition-colors duration-150"
              >
                🖨️ Imprimir
              </button>
              {pdfSections && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="text-xs font-medium text-sage-deep hover:underline underline-offset-2 disabled:opacity-50 disabled:cursor-wait transition-colors duration-150"
                >
                  {isDownloading ? 'Generando…' : '⬇️ Descargar PDF'}
                </button>
              )}
            </div>
          )}
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

'use client';

import { PruebaInterpretacion } from '@/lib/utils';
import { getPsychTest, scoreTest } from '@/lib/psychTests';
import { SubscaleBars } from './charts/SubscaleBars';

// Always-visible section for a patient's applied tests — previously this
// only showed as a small "Batería Pruebas" badge that opened a modal, easy
// to miss and one extra click away. Living on the page directly like
// Cronología/Documentos makes the actual score profiles (not just a badge
// saying tests exist) visible without hunting for them.
export function PsychTestResultsSection({
  items,
  patientId,
}: {
  items: PruebaInterpretacion[];
  patientId: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className="bg-panel border border-line rounded-lg p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
      <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-5">
        Pruebas psicológicas
      </div>
      <div className="space-y-5">
        {items.map((item, i) => {
          const test = item.testId ? getPsychTest(item.prueba) : undefined;
          const result = test && item.respuestas ? scoreTest(test, item.respuestas) : undefined;
          return (
            <div key={i} className="border border-line rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 text-sm font-medium text-ink flex items-center justify-between">
                <span>{item.prueba}</span>
                <span className="text-xs text-ink-soft font-normal shrink-0 ml-3">
                  {item.tipo === 'archivo' && '📎 Archivo'}
                  {item.tipo === 'texto' && '✏️ Texto'}
                  {item.tipo === 'estructurado' && '🧮 Aplicada en la app'}
                </span>
              </div>
              <div className="p-4">
                {item.tipo === 'archivo' && item.archivo && (
                  <a
                    href={`/api/patients/${patientId}/documentos/${item.archivo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-sage-deep hover:underline underline-offset-2"
                  >
                    📄 {item.archivo.filename}
                  </a>
                )}
                {item.tipo === 'texto' && <p className="text-sm text-ink leading-relaxed">{item.texto}</p>}
                {item.tipo === 'estructurado' &&
                  (result ? (
                    <SubscaleBars subscales={result.subscales} total={result.total} />
                  ) : (
                    item.texto && <p className="text-sm text-ink leading-relaxed">{item.texto}</p>
                  ))}
                {item.notas && (
                  <div className="mt-3 pt-3 border-t border-line">
                    <div className="text-xs text-ink-soft uppercase tracking-wider mb-1">Notas</div>
                    <p className="text-sm text-ink-soft leading-relaxed">{item.notas}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

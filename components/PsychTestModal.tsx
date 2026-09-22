'use client';

import { useMemo, useState } from 'react';
import { Button } from './Button';
import { SubscaleBars } from './charts/SubscaleBars';
import { PsychTestDefinition, TestResponses, scoreTest } from '@/lib/psychTests';

// Fills out one of the app's digitized psychological tests inline — the
// same shell conventions as ConfirmDialog (this app's only other modal),
// scaled up for a scrollable item list. Scores live as the therapist
// answers, via the same engine (lib/psychTests/scoring.ts) that powers the
// saved summary, so what's shown here never drifts from what gets stored.
export function PsychTestModal({
  test,
  initialResponses,
  onSave,
  onClose,
}: {
  test: PsychTestDefinition;
  initialResponses?: TestResponses;
  onSave: (responses: TestResponses, summary: string) => void;
  onClose: () => void;
}) {
  const [responses, setResponses] = useState<TestResponses>(initialResponses || {});

  const result = useMemo(() => scoreTest(test, responses), [test, responses]);
  const answeredCount = test.items.filter((i) => responses[i.id] !== undefined).length;

  const setAnswer = (itemId: number, optionIndex: number) => {
    setResponses((prev) => ({ ...prev, [itemId]: optionIndex }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="psych-test-modal-title"
        className="bg-panel border border-line rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4 border-b border-line shrink-0">
          <h3 id="psych-test-modal-title" className="font-serif text-xl font-medium mb-1">
            {test.name}
          </h3>
          {test.note && <p className="text-xs text-clay leading-relaxed mb-1">⚠️ {test.note}</p>}
          {test.reference && <p className="text-xs text-ink-soft/70 leading-relaxed">{test.reference}</p>}
          <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mt-3">
            {answeredCount}/{test.items.length} respondidas
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {test.items.map((item) => (
            <div key={item.id} className="pb-4 border-b border-line last:border-0 last:pb-0">
              <div className="text-sm text-ink mb-2">
                <span className="text-ink-soft font-mono text-xs mr-2">{item.id}.</span>
                {item.text || `Ítem ${item.id}`}
              </div>
              <div className="flex flex-wrap gap-2">
                {item.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswer(item.id, i)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors duration-150 ${
                      responses[item.id] === i
                        ? 'bg-sage-deep text-white border-sage-deep'
                        : 'border-line text-ink-soft hover:bg-sage-pale/30 hover:border-sage'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 pt-4 border-t border-line bg-gray-50 shrink-0 space-y-4">
          <div className="max-h-52 overflow-y-auto pr-1">
            <SubscaleBars subscales={result.subscales} total={result.total} />
          </div>
          {!result.complete && (
            <p className="text-xs text-clay">Faltan respuestas — puedes guardar de todas formas y completarla después.</p>
          )}
          <div className="flex items-center gap-3 justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={() => onSave(responses, result.summary)}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

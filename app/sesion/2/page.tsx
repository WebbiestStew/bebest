'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/FormInputs';
import { FormPrintPreview, PreviewSection, PreviewField } from '@/components/FormPrintPreview';
import { useAuth } from '@/lib/useAuth';
import { hasAdminAccess } from '@/lib/roles';
import { Patient } from '@/lib/types';
import {
  serializeBateriaPruebas,
  fileToBase64,
  parsePruebaInterpretaciones,
  serializePruebaInterpretaciones,
  PruebaInterpretacion,
} from '@/lib/utils';

// The standard battery applied at CPCCM/bebest, per the "VI. Pruebas
// aplicadas y resultados" section of the real Informe de Resultados —
// scores/graphs/interpretation stay on that signed document, this just
// tracks which tests were applied.
const PRUEBAS_OPTIONS = [
  'Inventario de Depresión de Beck',
  'SCL-90-R',
  'ISRA',
  'SCID-II',
  'Test de Creencias de Ellis',
];

interface FormErrors {
  paciente?: string;
  bateria?: string;
  pruebasOtro?: string;
  observaciones?: string;
}

export default function Sesion2Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    paciente: '',
    pruebasOtro: '',
    observaciones: '',
    terapeuta: '',
  });
  const [pruebas, setPruebas] = useState<string[]>([]);
  const [interpretaciones, setInterpretaciones] = useState<
    Record<string, { tipo: '' | 'archivo' | 'texto'; texto: string; file: File | null }>
  >({});
  const [patientFull, setPatientFull] = useState<Patient | null>(null);
  const [citas, setCitas] = useState<any[]>([]);
  const [todaysCita, setTodaysCita] = useState<any>(null);
  const [resultFiles, setResultFiles] = useState<File[]>([]);
  const [isUploadingResults, setIsUploadingResults] = useState(false);

  const togglePrueba = (value: string) => {
    setPruebas((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, citasRes, therapistsRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/citas'),
          fetch('/api/therapists'),
        ]);
        const patientsData = await patientsRes.json();
        const citasData = await citasRes.json();
        const therapistsData = await therapistsRes.json();
        setPatients(patientsData.patients || []);
        setCitas(citasData.citas || []);
        setTherapists(therapistsData.therapists || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (user) fetchData();
  }, [user]);

  if (isLoading) return null;
  if (!user) return null;

  const isAdmin = hasAdminAccess(user.rol);

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.paciente) newErrors.paciente = 'Este campo es obligatorio.';
    if (pruebas.length === 0) newErrors.bateria = 'Selecciona al menos una opción.';
    if (pruebas.includes('Otra')) {
      newErrors.pruebasOtro = formData.pruebasOtro.trim() ? undefined : 'Este campo es obligatorio.';
    }
    if (!formData.observaciones.trim()) newErrors.observaciones = 'Este campo es obligatorio.';
    const cleaned = Object.fromEntries(Object.entries(newErrors).filter(([, v]) => v)) as FormErrors;
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  };

  const bateriaFinal = () => {
    const final = pruebas.filter((p) => p !== 'Otra');
    if (pruebas.includes('Otra')) final.push(`Otra: ${formData.pruebasOtro.trim()}`);
    return serializeBateriaPruebas(final);
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    const p = patients.find(pat => pat.id === patientId);
    setFormData({
      ...formData,
      paciente: patientId,
      terapeuta: (p as any)?.terapeuta || (isAdmin ? '' : user.nombre),
    });
    setPatientFull(p || null);

    const today = new Date().toISOString().slice(0, 10);
    const match = citas.find(
      (c) => (c.paciente || [])[0] === patientId && (c.fecha || '').slice(0, 10) === today
    );
    setTodaysCita(match || null);
  };

  // Optional graph/result images or PDFs (e.g. the SCL-90-R chart) — goes into
  // the same general documentos bucket as INE/contrato/informe, since unlike
  // plan_no_suicidio/consentimiento this doesn't gate anything.
  const uploadResultFiles = async (patientId: string) => {
    if (resultFiles.length === 0) return;
    setIsUploadingResults(true);
    try {
      for (const file of resultFiles) {
        const base64 = await fileToBase64(file);
        await fetch(`/api/patients/${patientId}/documentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', base64 }),
        });
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Se guardó la sesión, pero algún archivo de resultados no se pudo subir.', isError: true },
        })
      );
    } finally {
      setIsUploadingResults(false);
    }
  };

  const setInterpretacion = (prueba: string, patch: Partial<{ tipo: '' | 'archivo' | 'texto'; texto: string; file: File | null }>) => {
    setInterpretaciones((prev) => {
      const current = prev[prueba] || { tipo: '' as const, texto: '', file: null };
      return { ...prev, [prueba]: { ...current, ...patch } };
    });
  };

  // Uploads any file chosen per-test (into the same general documentos
  // bucket as everything else) and assembles the final per-test
  // interpretation array — only for tests currently checked, so unchecking
  // a test drops whatever was entered for it.
  const buildInterpretaciones = async (patientId: string): Promise<string> => {
    const result: PruebaInterpretacion[] = [];
    for (const prueba of pruebas) {
      const entry = interpretaciones[prueba];
      if (!entry || !entry.tipo) continue;
      if (entry.tipo === 'texto') {
        if (entry.texto.trim()) result.push({ prueba, tipo: 'texto', texto: entry.texto.trim() });
      } else if (entry.tipo === 'archivo' && entry.file) {
        const base64 = await fileToBase64(entry.file);
        const res = await fetch(`/api/patients/${patientId}/documentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: entry.file.name, contentType: entry.file.type || 'application/octet-stream', base64 }),
        });
        if (res.ok) {
          const data = await res.json();
          const uploaded = (data.patient?.documentos || []).slice(-1)[0];
          if (uploaded) result.push({ prueba, tipo: 'archivo', archivo: { id: uploaded.id, filename: uploaded.filename } });
        }
      }
    }
    return serializePruebaInterpretaciones(result);
  };

  // Auto-linked to today's cita (see handlePatientChange) — closing the loop
  // between the scheduled appointment and the session actually done.
  const markCitaCompleted = async () => {
    if (todaysCita && todaysCita.estado !== 'Completada' && todaysCita.estado !== 'Cancelada') {
      await fetch(`/api/citas/${todaysCita.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Completada' }),
      });
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const bateriaInterpretacionesJson = await buildInterpretaciones(formData.paciente);
      await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bateria_pruebas: bateriaFinal(),
          ...(bateriaInterpretacionesJson ? { bateria_interpretaciones: bateriaInterpretacionesJson } : {}),
          observaciones_pruebas: formData.observaciones.trim(),
          ...(formData.terapeuta ? { terapeuta: formData.terapeuta } : {}),
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          expediente_completo: true,
        }),
      });
      await uploadResultFiles(formData.paciente);
      await markCitaCompleted();

      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Guardado correctamente.', isError: false },
        })
      );
      router.push('/sesion/3');
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Error al guardar', isError: true },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.paciente || pruebas.length === 0 || !formData.observaciones.trim()) {
      setErrors({
        paciente: !formData.paciente ? 'Este campo es obligatorio.' : undefined,
        bateria: pruebas.length === 0 ? 'Selecciona al menos una opción.' : undefined,
        observaciones: !formData.observaciones.trim() ? 'Este campo es obligatorio.' : undefined,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const bateriaInterpretacionesJson = await buildInterpretaciones(formData.paciente);
      await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bateria_pruebas: bateriaFinal(),
          ...(bateriaInterpretacionesJson ? { bateria_interpretaciones: bateriaInterpretacionesJson } : {}),
          observaciones_pruebas: formData.observaciones.trim(),
          ...(formData.terapeuta ? { terapeuta: formData.terapeuta } : {}),
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          expediente_completo: false,
        }),
      });
      await uploadResultFiles(formData.paciente);
      await markCitaCompleted();

      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: formData.paciente,
          paso_incompleto: 'Sesión 2 · Pruebas',
          campos_faltantes: 0,
        }),
      });

      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Guardado. Se notificó al administrador.', isError: false },
        })
      );
      router.push('/');
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Error al guardar', isError: true },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const bateriaPreview = pruebas.length
    ? pruebas
        .filter((p) => p !== 'Otra')
        .concat(pruebas.includes('Otra') ? [`Otra: ${formData.pruebasOtro}`] : [])
        .join(', ')
    : undefined;

  const interpretacionesPreview = pruebas
    .map((p) => {
      const entry = interpretaciones[p];
      if (!entry || !entry.tipo) return null;
      const label = p === 'Otra' ? formData.pruebasOtro.trim() || 'Otra' : p;
      if (entry.tipo === 'archivo') return entry.file ? `${label}: 📎 ${entry.file.name}` : null;
      if (entry.tipo === 'texto') return entry.texto.trim() ? `${label}: ${entry.texto.trim()}` : null;
      return null;
    })
    .filter(Boolean)
    .join(' · ') || undefined;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start max-w-6xl">
        <div className="max-w-2xl print:hidden">
        <BackButton onClick={() => router.push('/sesion/1')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Evaluación</div>
          <h1 className="font-serif text-4xl font-medium mb-2">Sesión 2 · Aplicación de pruebas</h1>
          <p className="text-ink-soft text-base">Batería de pruebas aplicadas al paciente.</p>
        </div>

        {/* Step Tracker */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-deep text-white flex items-center justify-center text-xs font-mono font-medium animate-scale-in transition-all duration-300">
              ✓
            </div>
            <span className="ml-2 text-xs text-ink-soft uppercase">Entrevista</span>
          </div>
          <div className="flex-1 h-px bg-line" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-deep text-white flex items-center justify-center text-xs font-mono scale-110 shadow-md transition-all duration-300">
              2
            </div>
            <span className="ml-2 text-xs text-ink-soft uppercase">Pruebas</span>
          </div>
          <div className="flex-1 h-px bg-line" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-pale text-sage-deep flex items-center justify-center text-xs font-mono transition-all duration-300">
              3
            </div>
            <span className="ml-2 text-xs text-ink-soft uppercase">Resultados</span>
          </div>
        </div>

        <form
          className="bg-panel border border-line rounded-2xl p-8 space-y-6 animate-fade-in-up"
          style={{ animationDelay: '120ms' }}
        >
          <Select
            label="Paciente"
            options={patients.map((p) => ({ value: p.id, label: p.paciente }))}
            value={formData.paciente}
            onChange={handlePatientChange}
            error={errors.paciente}
            required
          />

          {isAdmin ? (
            <Select
              label="Terapeuta"
              options={therapists.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              value={formData.terapeuta}
              onChange={(e) => setFormData({ ...formData, terapeuta: e.target.value })}
            />
          ) : (
            <Input label="Terapeuta" value={formData.terapeuta} disabled />
          )}

          {todaysCita && (
            <div className="-mt-3 text-xs text-sage-deep bg-sage-pale/40 rounded-lg px-3 py-2">
              📅 Vinculado a la cita de hoy a las {todaysCita.hora} — se marcará como completada al guardar.
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-ink-soft mb-2 block">
              Batería de Prueba aplicada
              <span className="text-clay ml-1">*</span>
              <span className="font-normal text-xs text-ink-soft ml-2">(puede seleccionar más de una opción)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-line rounded-lg overflow-hidden">
              {PRUEBAS_OPTIONS.map((p) => (
                <Checkbox key={p} label={p} checked={pruebas.includes(p)} onChange={() => togglePrueba(p)} />
              ))}
              <Checkbox label="Otra" checked={pruebas.includes('Otra')} onChange={() => togglePrueba('Otra')} />
            </div>
            {errors.bateria && <div className="text-xs text-red mt-1">{errors.bateria}</div>}
            {pruebas.includes('Otra') && (
              <div className="mt-4">
                <Input
                  label="Especifica"
                  value={formData.pruebasOtro}
                  onChange={(e) => setFormData({ ...formData, pruebasOtro: e.target.value })}
                  error={errors.pruebasOtro}
                />
              </div>
            )}
          </div>

          {pruebas.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-ink-soft block">
                Interpretación por prueba
                <span className="font-normal text-xs text-ink-soft ml-2">(opcional — sube el resultado o escribe tu lectura de cada una)</span>
              </label>
              {pruebas.map((p) => {
                const label = p === 'Otra' ? formData.pruebasOtro.trim() || 'Otra' : p;
                const entry = interpretaciones[p] || { tipo: '' as const, texto: '', file: null };
                return (
                  <div
                    key={p}
                    className="border border-line rounded-lg overflow-hidden animate-fade-in-up"
                  >
                    <div className="px-3.5 py-2.5 bg-gray-50 text-sm font-medium text-ink">{label}</div>
                    <div className="p-3.5 space-y-3">
                      <div>
                        <label className="text-sm font-medium text-ink-soft mb-2 block">¿Qué quieres agregar?</label>
                        {/* Two plain toggle buttons rather than the searchable
                            Select component — that's built for long lists
                            (patients, DSM codes) and looks/feels heavy for a
                            plain either/or choice between two options. */}
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              ['archivo', '📎 Subir archivo'],
                              ['texto', '✏️ Escribir interpretación'],
                            ] as const
                          ).map(([value, optLabel]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setInterpretacion(p, { tipo: value })}
                              className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors duration-150 ${
                                entry.tipo === value
                                  ? 'bg-sage-deep text-white border-sage-deep'
                                  : 'border-line text-ink-soft hover:bg-sage-pale/30 hover:border-sage'
                              }`}
                            >
                              {optLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Smooth auto-height reveal (grid-template-rows 0fr -> 1fr) rather
                          than a hard show/hide, so switching between the two options
                          (or picking one for the first time) feels like a real transition. */}
                      <div
                        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                          entry.tipo ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="pt-0.5">
                            {entry.tipo === 'archivo' && (
                              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
                                {entry.file ? `📄 ${entry.file.name}` : '📎 Elegir archivo (PDF o foto)'}
                                <input
                                  type="file"
                                  accept="application/pdf,image/*"
                                  className="hidden"
                                  onChange={(e) => setInterpretacion(p, { file: e.target.files?.[0] || null })}
                                />
                              </label>
                            )}
                            {entry.tipo === 'texto' && (
                              <Textarea
                                placeholder={`Tu interpretación de ${label}…`}
                                rows={3}
                                value={entry.texto}
                                onChange={(e) => setInterpretacion(p, { texto: e.target.value })}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Textarea
            label="Observaciones"
            placeholder="Notas sobre la aplicación de las pruebas…"
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            error={errors.observaciones}
            required
          />

          <div>
            <label className="text-sm font-medium text-ink-soft mb-2 block">
              Gráficas o resultados (opcional)
              <span className="font-normal text-xs text-ink-soft ml-2">ej. gráfica del SCL-90-R</span>
            </label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
              {resultFiles.length > 0
                ? `📄 ${resultFiles.length} archivo(s) seleccionado(s) — elegir más`
                : '📎 Subir gráficas o resultados (PDF o foto)'}
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                className="hidden"
                onChange={(e) => setResultFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
              />
            </label>
            {resultFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {resultFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-ink-soft">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setResultFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red hover:underline ml-2 shrink-0"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isUploadingResults && <div className="text-xs text-ink-soft mt-1">Subiendo archivos…</div>}
          </div>

          <div className="flex items-center gap-4 p-6 -m-8 border-t border-line bg-gray-50">
            <Button
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={handleContinue}
            >
              Guardar y continuar a Sesión 3
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveAndExit}
              disabled={isSubmitting}
            >
              Guardar y salir
            </Button>
          </div>
        </form>
        </div>

        <FormPrintPreview
          isAdmin={isAdmin}
          title="Sesión 2 · Pruebas"
          subtitle="Batería de pruebas aplicadas"
          filename={`sesion-2-${patientFull?.paciente || 'paciente'}`}
          pdfSections={[
            {
              title: 'Paciente',
              fields: [
                { label: 'Nombre', value: patientFull?.paciente, full: true },
                { label: 'Terapeuta', value: formData.terapeuta },
                { label: 'Cita de hoy', value: todaysCita?.hora },
              ],
            },
            {
              title: 'Pruebas aplicadas',
              fields: [
                { label: 'Batería', value: bateriaPreview, full: true },
                { label: 'Interpretación por prueba', value: interpretacionesPreview, full: true },
                { label: 'Observaciones', value: formData.observaciones, full: true },
                {
                  label: 'Archivos de resultados',
                  value: resultFiles.length ? resultFiles.map((f) => f.name).join(', ') : undefined,
                  full: true,
                },
              ],
            },
          ]}
        >
          <PreviewSection title="Paciente">
            <PreviewField label="Nombre" value={patientFull?.paciente} full />
            <PreviewField label="Terapeuta" value={formData.terapeuta} />
            {todaysCita && <PreviewField label="Cita de hoy" value={todaysCita.hora} />}
          </PreviewSection>
          <PreviewSection title="Pruebas aplicadas">
            <PreviewField label="Batería" value={bateriaPreview} full />
            <PreviewField label="Interpretación por prueba" value={interpretacionesPreview} full />
            <PreviewField label="Observaciones" value={formData.observaciones} full />
            <PreviewField
              label="Archivos de resultados"
              value={resultFiles.length ? resultFiles.map((f) => f.name).join(', ') : undefined}
              full
            />
          </PreviewSection>
        </FormPrintPreview>
        </div>
      </main>

      <Toast />
    </div>
  );
}

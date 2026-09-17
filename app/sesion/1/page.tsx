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
import { uploadPatientDocument } from '@/lib/utils';

interface FormErrors {
  paciente?: string;
  historia?: string;
}

export default function Sesion1Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    paciente: '',
    historia_clinica: '',
    terapeuta: '',
  });
  const [patientFull, setPatientFull] = useState<Patient | null>(null);
  const [citas, setCitas] = useState<any[]>([]);
  const [todaysCita, setTodaysCita] = useState<any>(null);
  const [entrevistaFiles, setEntrevistaFiles] = useState<File[]>([]);
  const [isUploadingEntrevistaFiles, setIsUploadingEntrevistaFiles] = useState(false);

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
    if (!formData.historia_clinica.trim()) newErrors.historia = 'Este campo es obligatorio.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    const p = patients.find(pat => pat.id === patientId);
    setFormData({
      ...formData,
      paciente: patientId,
      // Defaults to the patient's own assigned therapist — admins can
      // correct it (e.g. a coterapeuta covering this particular session);
      // non-admins see it locked to themselves regardless (enforced below
      // in the UI, same convention as Agenda's booking form).
      terapeuta: (p as any)?.terapeuta || (isAdmin ? '' : user.nombre),
    });
    setPatientFull(p || null);

    const today = new Date().toISOString().slice(0, 10);
    const match = citas.find(
      (c) => (c.paciente || [])[0] === patientId && (c.fecha || '').slice(0, 10) === today
    );
    setTodaysCita(match || null);
  };

  // Optional supporting files from the interview (e.g. a photo of handwritten
  // notes) — same general documentos bucket as Sesión 2's result files,
  // since this doesn't gate anything.
  const uploadEntrevistaFiles = async (patientId: string) => {
    if (entrevistaFiles.length === 0) return;
    setIsUploadingEntrevistaFiles(true);
    try {
      for (const file of entrevistaFiles) {
        await uploadPatientDocument(patientId, file);
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Se guardó la sesión, pero algún archivo no se pudo subir.', isError: true },
        })
      );
    } finally {
      setIsUploadingEntrevistaFiles(false);
    }
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
      const res = await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historia_clinica: formData.historia_clinica.trim(),
          ...(formData.terapeuta ? { terapeuta: formData.terapeuta } : {}),
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          etapa_actual: 'Evaluación',
          expediente_completo: true,
        }),
      });

      if (res.ok) {
        await uploadEntrevistaFiles(formData.paciente);
        await markCitaCompleted();
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: 'Guardado correctamente.', isError: false },
          })
        );
        router.push('/sesion/2');
      }
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
    if (!formData.paciente || !formData.historia_clinica.trim()) {
      setErrors({
        paciente: !formData.paciente ? 'Este campo es obligatorio.' : undefined,
        historia: !formData.historia_clinica.trim() ? 'Este campo es obligatorio.' : undefined,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          historia_clinica: formData.historia_clinica.trim(),
          ...(formData.terapeuta ? { terapeuta: formData.terapeuta } : {}),
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          expediente_completo: false,
        }),
      });
      await uploadEntrevistaFiles(formData.paciente);
      await markCitaCompleted();

      // Create alert
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: formData.paciente,
          paso_incompleto: 'Sesión 1 · Entrevista',
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

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start max-w-6xl">
        <div className="max-w-2xl print:hidden">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Evaluación</div>
          <h1 className="font-serif text-4xl font-medium mb-2">Sesión 1 · Entrevista con el paciente</h1>
          <p className="text-ink-soft text-base">Historia clínica del paciente.</p>
        </div>

        {/* Step Tracker */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-deep text-white flex items-center justify-center text-xs font-mono scale-110 shadow-md transition-all duration-300">
              1
            </div>
            <span className="ml-2 text-xs text-ink-soft uppercase">Entrevista</span>
          </div>
          <div className="flex-1 h-px bg-line" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-pale text-sage-deep flex items-center justify-center text-xs font-mono transition-all duration-300">
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
            <div className="text-xs text-sage-deep bg-sage-pale/40 rounded-lg px-3 py-2">
              📅 Vinculado a la cita de hoy a las {todaysCita.hora} — se marcará como completada al guardar.
            </div>
          )}

          <Textarea
            label="Historia Clínica"
            placeholder="Antecedentes, contexto familiar, motivo ampliado, observaciones de la entrevista…"
            value={formData.historia_clinica}
            onChange={(e) => setFormData({ ...formData, historia_clinica: e.target.value })}
            error={errors.historia}
            required
          />

          <div>
            <label className="text-sm font-medium text-ink-soft mb-2 block">Archivos (opcional)</label>
            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
              {entrevistaFiles.length > 0
                ? `📄 ${entrevistaFiles.length} archivo(s) seleccionado(s) — elegir más`
                : '📎 Subir archivos (PDF o foto)'}
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                className="hidden"
                onChange={(e) => setEntrevistaFiles((prev) => [...prev, ...Array.from(e.target.files || [])])}
              />
            </label>
            {entrevistaFiles.length > 0 && (
              <ul className="mt-2 space-y-1">
                {entrevistaFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-ink-soft">
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setEntrevistaFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-red hover:underline ml-2 shrink-0"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isUploadingEntrevistaFiles && <div className="text-xs text-ink-soft mt-1">Subiendo archivos…</div>}
          </div>

          <div className="flex items-center gap-4 p-6 -m-8 border-t border-line bg-gray-50">
            <Button
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              onClick={handleContinue}
            >
              Guardar y continuar a Sesión 2
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
          title="Sesión 1 · Entrevista"
          subtitle="Historia clínica del paciente"
          filename={`sesion-1-${patientFull?.paciente || 'paciente'}`}
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
              title: 'Historia clínica',
              fields: [
                { label: 'Notas', value: formData.historia_clinica, full: true },
                {
                  label: 'Archivos',
                  value: entrevistaFiles.length ? entrevistaFiles.map((f) => f.name).join(', ') : undefined,
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
          <PreviewSection title="Historia clínica">
            <PreviewField label="Notas" value={formData.historia_clinica} full />
            <PreviewField
              label="Archivos"
              value={entrevistaFiles.length ? entrevistaFiles.map((f) => f.name).join(', ') : undefined}
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

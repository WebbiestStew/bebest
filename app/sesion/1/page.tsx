'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/FormInputs';
import { FormPrintPreview, PreviewSection, PreviewField } from '@/components/FormPrintPreview';
import { useAuth } from '@/lib/useAuth';
import { Patient } from '@/lib/types';

interface FormErrors {
  paciente?: string;
  historia?: string;
}

export default function Sesion1Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    paciente: '',
    historia_clinica: '',
  });
  const [patientFull, setPatientFull] = useState<Patient | null>(null);
  const [citas, setCitas] = useState<any[]>([]);
  const [todaysCita, setTodaysCita] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, citasRes] = await Promise.all([fetch('/api/patients'), fetch('/api/citas')]);
        const patientsData = await patientsRes.json();
        const citasData = await citasRes.json();
        setPatients(patientsData.patients || []);
        setCitas(citasData.citas || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (user) fetchData();
  }, [user]);

  if (isLoading) return null;
  if (!user) return null;

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.paciente) newErrors.paciente = 'Este campo es obligatorio.';
    if (!formData.historia_clinica.trim()) newErrors.historia = 'Este campo es obligatorio.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    setFormData({ ...formData, paciente: patientId });
    const p = patients.find(pat => pat.id === patientId);
    setPatientFull(p || null);

    const today = new Date().toISOString().slice(0, 10);
    const match = citas.find(
      (c) => (c.paciente || [])[0] === patientId && (c.fecha || '').slice(0, 10) === today
    );
    setTodaysCita(match || null);
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
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          etapa_actual: 'Evaluación',
          expediente_completo: true,
        }),
      });

      if (res.ok) {
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
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          expediente_completo: false,
        }),
      });
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
          title="Sesión 1 · Entrevista"
          subtitle="Historia clínica del paciente"
          filename={`sesion-1-${patientFull?.paciente || 'paciente'}`}
          pdfSections={[
            {
              title: 'Paciente',
              fields: [
                { label: 'Nombre', value: patientFull?.paciente, full: true },
                { label: 'Cita de hoy', value: todaysCita?.hora },
              ],
            },
            {
              title: 'Historia clínica',
              fields: [{ label: 'Notas', value: formData.historia_clinica, full: true }],
            },
          ]}
        >
          <PreviewSection title="Paciente">
            <PreviewField label="Nombre" value={patientFull?.paciente} full />
            {todaysCita && <PreviewField label="Cita de hoy" value={todaysCita.hora} />}
          </PreviewSection>
          <PreviewSection title="Historia clínica">
            <PreviewField label="Notas" value={formData.historia_clinica} full />
          </PreviewSection>
        </FormPrintPreview>
        </div>
      </main>

      <Toast />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/FormInputs';
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

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        const data = await res.json();
        setPatients(data.patients || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };

    if (user) fetchPatients();
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

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-2xl">
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
      </main>

      <Toast />
    </div>
  );
}

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
  bateria?: string;
  observaciones?: string;
}

export default function Sesion2Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    paciente: '',
    bateria_pruebas: '',
    observaciones: '',
    reusar_pruebas: false,
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
    if (!formData.bateria_pruebas.trim()) newErrors.bateria = 'Este campo es obligatorio.';
    if (!formData.observaciones.trim()) newErrors.observaciones = 'Este campo es obligatorio.';
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
      await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bateria_pruebas: formData.bateria_pruebas.trim(),
          observaciones_pruebas: formData.observaciones.trim(),
          reusar_pruebas: formData.reusar_pruebas,
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          expediente_completo: true,
        }),
      });

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
    if (!formData.paciente || !formData.bateria_pruebas.trim() || !formData.observaciones.trim()) {
      setErrors({
        paciente: !formData.paciente ? 'Este campo es obligatorio.' : undefined,
        bateria: !formData.bateria_pruebas.trim() ? 'Este campo es obligatorio.' : undefined,
        observaciones: !formData.observaciones.trim() ? 'Este campo es obligatorio.' : undefined,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bateria_pruebas: formData.bateria_pruebas.trim(),
          observaciones_pruebas: formData.observaciones.trim(),
          reusar_pruebas: formData.reusar_pruebas,
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          expediente_completo: false,
        }),
      });

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

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-2xl">
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

          <Input
            label="Batería de Prueba aplicada"
            placeholder="Nombre de la prueba o pruebas aplicadas"
            value={formData.bateria_pruebas}
            onChange={(e) => setFormData({ ...formData, bateria_pruebas: e.target.value })}
            error={errors.bateria}
            required
          />

          <Checkbox
            label="Reusar las pruebas de una sesión anterior"
            sublabel="Opcional — marca esto si no es necesario volver a aplicar todo el set."
            checked={formData.reusar_pruebas}
            onChange={(e) => setFormData({ ...formData, reusar_pruebas: e.target.checked })}
          />

          <Textarea
            label="Observaciones"
            placeholder="Notas sobre la aplicación de las pruebas…"
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            error={errors.observaciones}
            required
          />

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
      </main>

      <Toast />
    </div>
  );
}

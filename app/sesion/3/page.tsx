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
  dx_principal?: string;
  dx_comorbilidad?: string;
  dx_otros?: string;
  plan?: string;
  checks?: string;
}

export default function Sesion3Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    paciente: '',
    dx_principal: '',
    dx_comorbilidad: '',
    dx_otros: '',
    plan_tratamiento: '',
    plan_no_suicidio: false,
    consentimiento: false,
    referido_psiquiatria: false,
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
    if (!formData.dx_principal.trim()) newErrors.dx_principal = 'Este campo es obligatorio.';
    if (!formData.dx_comorbilidad.trim()) newErrors.dx_comorbilidad = 'Este campo es obligatorio.';
    if (!formData.dx_otros.trim()) newErrors.dx_otros = 'Este campo es obligatorio.';
    if (!formData.plan_tratamiento.trim()) newErrors.plan = 'Este campo es obligatorio.';
    if (!formData.plan_no_suicidio || !formData.consentimiento || !formData.referido_psiquiatria) {
      newErrors.checks = 'Todos los checkpoints son obligatorios.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    setFormData({ ...formData, paciente: patientId });
    const p = patients.find(pat => pat.id === patientId);
    setPatientFull(p || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dx_principal: formData.dx_principal.trim(),
          dx_comorbilidad: formData.dx_comorbilidad.trim(),
          dx_otros_problemas: formData.dx_otros.trim(),
          plan_tratamiento: formData.plan_tratamiento.trim(),
          plan_no_suicidio: formData.plan_no_suicidio,
          consentimiento_informado: formData.consentimiento,
          referido_psiquiatria: formData.referido_psiquiatria,
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          etapa_actual: 'Tratamiento',
          expediente_completo: true,
        }),
      });

      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Evaluación completada correctamente.', isError: false },
        })
      );
      router.push('/pacientes');
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
        <BackButton onClick={() => router.push('/sesion/2')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Evaluación</div>
          <h1 className="font-serif text-4xl font-medium mb-2">Sesión 3 · Entrega de resultados</h1>
          <p className="text-ink-soft text-base">Informe clínico y documentos de cierre de la evaluación.</p>
        </div>

        {/* Step Tracker */}
        <div className="flex items-center gap-4 mb-8 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-deep text-white flex items-center justify-center text-xs font-mono font-medium transition-all duration-300">
              ✓
            </div>
            <span className="ml-2 text-xs text-ink-soft uppercase">Entrevista</span>
          </div>
          <div className="flex-1 h-px bg-line" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-deep text-white flex items-center justify-center text-xs font-mono font-medium transition-all duration-300">
              ✓
            </div>
            <span className="ml-2 text-xs text-ink-soft uppercase">Pruebas</span>
          </div>
          <div className="flex-1 h-px bg-line" />
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-sage-deep text-white flex items-center justify-center text-xs font-mono scale-110 shadow-md transition-all duration-300 animate-scale-in">
              3
            </div>
            <span className="ml-2 text-xs text-ink-soft uppercase">Resultados</span>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Dx Principal"
              placeholder="Diagnóstico principal"
              value={formData.dx_principal}
              onChange={(e) => setFormData({ ...formData, dx_principal: e.target.value })}
              error={errors.dx_principal}
              required
            />
            <Input
              label="Dx Comorbilidad"
              placeholder="Diagnóstico(s) asociado(s)"
              value={formData.dx_comorbilidad}
              onChange={(e) => setFormData({ ...formData, dx_comorbilidad: e.target.value })}
              error={errors.dx_comorbilidad}
              required
            />
          </div>

          <Input
            label="Dx Otros Problemas"
            placeholder="Otros problemas relevantes"
            value={formData.dx_otros}
            onChange={(e) => setFormData({ ...formData, dx_otros: e.target.value })}
            error={errors.dx_otros}
            required
          />

          <Textarea
            label="Plan de Tratamiento"
            placeholder="Plan de tratamiento propuesto…"
            value={formData.plan_tratamiento}
            onChange={(e) => setFormData({ ...formData, plan_tratamiento: e.target.value })}
            error={errors.plan}
            required
          />

          <div className="border-t border-line pt-6">
            <Checkbox
              label="Plan de No Suicidio"
              sublabel="Requerido antes de cerrar la evaluación."
              checked={formData.plan_no_suicidio}
              onChange={(e) => setFormData({ ...formData, plan_no_suicidio: e.target.checked })}
              required
            />
            <Checkbox
              label="Consentimiento Informado firmado"
              checked={formData.consentimiento}
              onChange={(e) => setFormData({ ...formData, consentimiento: e.target.checked })}
              required
            />
            <Checkbox
              label="Se tocó el tema de referir a Psiquiatría o Tx complementario"
              checked={formData.referido_psiquiatria}
              onChange={(e) => setFormData({ ...formData, referido_psiquiatria: e.target.checked })}
              required
            />
            {errors.checks && <div className="text-xs text-red mt-2">{errors.checks}</div>}
          </div>

          <div className="flex items-center gap-4 p-6 -m-8 border-t border-line bg-gray-50">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Guardar y finalizar evaluación
            </Button>
            <Button variant="secondary" onClick={() => router.push('/')} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </main>

      <Toast />
    </div>
  );
}

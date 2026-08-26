'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Textarea } from '@/components/FormInputs';
import { useAuth } from '@/lib/useAuth';
import { useEffect } from 'react';

interface FormErrors {
  nombre?: string;
  telefono?: string;
  terapeuta?: string;
  fecha_cita?: string;
  motivo?: string;
}

export default function RegistroPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [therapists, setTherapists] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    terapeuta: '',
    fecha_cita: '',
    motivo: '',
  });

  useEffect(() => {
    // Full roster regardless of who's filling out the form — /api/patients is
    // scoped to "my patients only" for non-admins, which would hide every
    // other therapist from this picker.
    const fetchTherapists = async () => {
      try {
        const res = await fetch('/api/therapists');
        const data = await res.json();
        setTherapists(data.therapists || []);
      } catch (error) {
        console.error('Error fetching therapists:', error);
      }
    };
    fetchTherapists();
  }, []);

  if (isLoading) return null;
  if (!user) return null;

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'Este campo es obligatorio.';
    if (!formData.telefono.trim()) newErrors.telefono = 'Este campo es obligatorio.';
    if (!formData.terapeuta) newErrors.terapeuta = 'Este campo es obligatorio.';
    if (!formData.fecha_cita) newErrors.fecha_cita = 'Este campo es obligatorio.';
    if (!formData.motivo.trim()) newErrors.motivo = 'Este campo es obligatorio.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente: formData.nombre.trim(),
          telefono: formData.telefono.trim(),
          terapeuta: formData.terapeuta,
          fecha_ingreso: formData.fecha_cita,
          motivo_consulta: formData.motivo.trim(),
          estatus_en_registro: 'ACTIVO',
          etapa_actual: 'Primer contacto',
          expediente_completo: true,
        }),
      });

      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: 'Ficha guardada correctamente.', isError: false },
          })
        );
        router.push('/');
      } else {
        const error = await response.json();
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: error.error || 'Error al guardar', isError: true },
          })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Error al guardar la ficha', isError: true },
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
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Primer contacto</div>
          <h1 className="font-serif text-4xl font-medium mb-2">Ficha de Registro</h1>
          <p className="text-ink-soft text-base">Llena esto la primera vez que un paciente agenda cita.</p>
        </div>

        <div
          className="bg-sage-pale border border-sage rounded-lg p-4 mb-6 flex gap-2 animate-fade-in-up"
          style={{ animationDelay: '60ms' }}
        >
          <span className="text-lg">💡</span>
          <div className="text-sm text-sage-deep">
            Todos los campos son obligatorios — no podrás guardar hasta completarlos.
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-panel border border-line rounded-2xl p-8 space-y-6 animate-fade-in-up"
          style={{ animationDelay: '110ms' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Nombre completo del paciente"
              placeholder="Nombre y apellidos"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              error={errors.nombre}
              required
            />
            <Input
              label="Teléfono de contacto"
              type="tel"
              placeholder="55 0000 0000"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              error={errors.telefono}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Terapeuta asignado"
              options={therapists.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              value={formData.terapeuta}
              onChange={(e) => setFormData({ ...formData, terapeuta: e.target.value })}
              error={errors.terapeuta}
              required
            />
            <Input
              label="Fecha de la cita (Agenda)"
              type="date"
              value={formData.fecha_cita}
              onChange={(e) => setFormData({ ...formData, fecha_cita: e.target.value })}
              error={errors.fecha_cita}
              required
            />
          </div>

          <Textarea
            label="Motivo de consulta"
            placeholder="¿Qué trae al paciente a consulta?"
            value={formData.motivo}
            onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
            error={errors.motivo}
            required
          />

          <div className="flex items-center gap-4 p-6 -m-8 border-t border-line bg-gray-50">
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Guardar ficha
            </Button>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Cancelar
            </Button>
            <span className="text-xs text-ink-soft ml-auto">Se guarda en la base de datos</span>
          </div>
        </form>
      </main>

      <Toast />
    </div>
  );
}

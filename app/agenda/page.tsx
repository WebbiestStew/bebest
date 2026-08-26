'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { hasAdminAccess } from '@/lib/roles';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/FormInputs';
import { useAuth } from '@/lib/useAuth';
import { Skeleton } from '@/components/Skeleton';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const estadoBadge: Record<string, string> = {
  Programada: 'bg-sage-pale text-sage-deep',
  Completada: 'bg-blue/10 text-blue',
  Cancelada: 'bg-red-pale text-red',
  'No asistió': 'bg-clay-pale text-clay',
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export default function AgendaPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [citas, setCitas] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    paciente_id: '',
    paciente_nombre: '',
    terapeuta: '',
    fecha: isoDate(new Date()),
    hora: '09:00',
    notas: '',
    repetir: false,
    repeatWeeks: 4,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completingCita, setCompletingCita] = useState<any>(null);
  const [sessionNote, setSessionNote] = useState('');

  const isAdmin = hasAdminAccess(user?.rol);

  const fetchAll = async () => {
    try {
      const [citasRes, patientsRes, therapistsRes] = await Promise.all([
        fetch('/api/citas'),
        fetch('/api/patients'),
        fetch('/api/therapists'),
      ]);
      const citasData = await citasRes.json();
      const patientsData = await patientsRes.json();
      const therapistsData = await therapistsRes.json();
      setCitas(citasData.citas || []);
      setPatients(patientsData.patients || []);
      setTherapists(therapistsData.therapists || []);
    } catch (error) {
      console.error('Error fetching agenda data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  useEffect(() => {
    if (user && !isAdmin) {
      setFormData((f) => ({ ...f, terapeuta: user.nombre }));
    }
  }, [user, isAdmin]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const citasByDay = useMemo(() => {
    const map = new Map<string, any[]>();
    weekDays.forEach((d) => map.set(isoDate(d), []));
    citas.forEach((c) => {
      const key = (c.fecha || '').slice(0, 10);
      if (map.has(key)) {
        map.get(key)!.push(c);
      }
    });
    map.forEach((list) => list.sort((a, b) => (a.hora || '').localeCompare(b.hora || '')));
    return map;
  }, [citas, weekDays]);

  const weekLabel = `${weekDays[0].toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.paciente_id) newErrors.paciente_id = 'Este campo es obligatorio.';
    if (!isAdmin && !formData.terapeuta) newErrors.terapeuta = 'Este campo es obligatorio.';
    if (isAdmin && !formData.terapeuta) newErrors.terapeuta = 'Este campo es obligatorio.';
    if (!formData.fecha) newErrors.fecha = 'Este campo es obligatorio.';
    if (!formData.hora) newErrors.hora = 'Este campo es obligatorio.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/citas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          repeatWeeks: formData.repetir ? formData.repeatWeeks : 1,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.citas?.length || 1;
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: count > 1 ? `${count} citas agendadas.` : 'Cita agendada.', isError: false },
          })
        );
        setFormData((f) => ({ ...f, paciente_id: '', paciente_nombre: '', notas: '', repetir: false, repeatWeeks: 4 }));
        setShowForm(false);
        fetchAll();
      } else {
        const error = await res.json();
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: error.error || 'Error al agendar', isError: true } }));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error al agendar', isError: true } }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (citaId: string, estado: string, notas_sesion?: string) => {
    try {
      const res = await fetch(`/api/citas/${citaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, ...(notas_sesion !== undefined ? { notas_sesion } : {}) }),
      });
      if (res.ok) {
        fetchAll();
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Sesión guardada.', isError: false } })
        );
      }
    } catch (error) {
      console.error('Error updating cita:', error);
    }
  };

  const handleStatusSelect = (cita: any, estado: string) => {
    if (estado === 'Completada' && cita.estado !== 'Completada') {
      setCompletingCita(cita);
      setSessionNote('');
    } else {
      handleStatusChange(cita.id, estado);
    }
  };

  const confirmSessionComplete = () => {
    if (!completingCita) return;
    handleStatusChange(completingCita.id, 'Completada', sessionNote.trim());
    setCompletingCita(null);
    setSessionNote('');
  };

  const handleDelete = async (citaId: string) => {
    try {
      const res = await fetch(`/api/citas/${citaId}`, { method: 'DELETE' });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Cita eliminada.', isError: false } }));
        fetchAll();
      }
    } catch (error) {
      console.error('Error deleting cita:', error);
    }
  };

  if (isLoading) return null;
  if (!user) return null;

  const today = isoDate(new Date());

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 animate-fade-in-up">
          <div>
            <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">
              {isAdmin ? 'Toda la consulta' : 'Tus citas'}
            </div>
            <h1 className="font-serif text-4xl font-medium mb-2">Agenda</h1>
            <p className="text-ink-soft text-base">Quién ves esta semana, día por día.</p>
          </div>
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancelar' : '+ Nueva cita'}
          </Button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-panel border border-line rounded-2xl p-6 sm:p-8 space-y-6 mb-8 animate-fade-in-up"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Select
                label="Paciente"
                options={patients.map((p) => ({ value: p.id, label: p.paciente }))}
                value={formData.paciente_id}
                onChange={(e) => {
                  const p = patients.find((pt) => pt.id === e.target.value);
                  setFormData({ ...formData, paciente_id: e.target.value, paciente_nombre: p?.paciente || '' });
                }}
                error={errors.paciente_id}
                required
              />
              {isAdmin ? (
                <Select
                  label="Terapeuta"
                  options={therapists.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                  value={formData.terapeuta}
                  onChange={(e) => setFormData({ ...formData, terapeuta: e.target.value })}
                  error={errors.terapeuta}
                  required
                />
              ) : (
                <Input label="Terapeuta" value={formData.terapeuta} disabled />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                error={errors.fecha}
                required
              />
              <Input
                label="Hora"
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                error={errors.hora}
                required
              />
            </div>

            <Textarea
              label="Notas (opcional)"
              placeholder="Motivo de la cita, recordatorios…"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
            />

            <div className="border border-line rounded-lg">
              <Checkbox
                label="Repetir semanalmente"
                sublabel="Crea la misma cita cada semana, en el mismo día y hora."
                checked={formData.repetir}
                onChange={(e) => setFormData({ ...formData, repetir: e.target.checked })}
              />
              {formData.repetir && (
                <div className="px-3 pb-3 -mt-1">
                  <Input
                    label="¿Cuántas semanas?"
                    type="number"
                    min={2}
                    max={52}
                    value={formData.repeatWeeks}
                    onChange={(e) => setFormData({ ...formData, repeatWeeks: parseInt(e.target.value, 10) || 2 })}
                    className="max-w-[140px]"
                  />
                </div>
              )}
            </div>

            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              {formData.repetir ? `Agendar ${formData.repeatWeeks} citas` : 'Agendar cita'}
            </Button>
          </form>
        )}

        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            ‹ Anterior
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(getMonday(new Date()))}>
            Hoy
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Siguiente ›
          </Button>
          <span className="text-sm text-ink-soft font-mono ml-2">{weekLabel}</span>
        </div>

        {isLoadingData ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {weekDays.map((day, i) => {
              const key = isoDate(day);
              const dayCitas = citasByDay.get(key) || [];
              const isToday = key === today;
              return (
                <div
                  key={key}
                  className={`bg-panel border rounded-lg p-5 animate-fade-in-up ${
                    isToday ? 'border-sage shadow-sm' : 'border-line'
                  }`}
                  style={{ animationDelay: `${100 + i * 30}ms` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-sm font-medium ${isToday ? 'text-sage-deep' : 'text-ink'}`}>
                      {DIAS[i]}
                    </span>
                    <span className="text-xs text-ink-soft font-mono">
                      {day.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </span>
                    {isToday && (
                      <span className="text-xs bg-sage-pale text-sage-deep px-2 py-0.5 rounded-full font-mono">
                        Hoy
                      </span>
                    )}
                  </div>

                  {dayCitas.length === 0 ? (
                    <p className="text-sm text-ink-soft italic">Sin citas</p>
                  ) : (
                    <div className="space-y-2">
                      {dayCitas.map((c) => (
                        <div
                          key={c.id}
                          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-line transition-colors duration-150 hover:bg-sage-pale/20"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-mono text-ink-soft shrink-0">{c.hora}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-ink truncate">{c.paciente_nombre}</div>
                              {isAdmin && <div className="text-xs text-ink-soft">{c.terapeuta}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={c.estado}
                              onChange={(e) => handleStatusSelect(c, e.target.value)}
                              className={`text-xs font-mono px-2 py-1 rounded-full border-0 cursor-pointer ${
                                estadoBadge[c.estado] || 'bg-gray-200 text-ink-soft'
                              }`}
                            >
                              <option value="Programada">Programada</option>
                              <option value="Completada">Completada</option>
                              <option value="No asistió">No asistió</option>
                              <option value="Cancelada">Cancelada</option>
                            </select>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-xs text-ink-soft hover:text-red transition-colors duration-150"
                              aria-label="Eliminar cita"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {completingCita && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setCompletingCita(null)}
        >
          <div
            className="bg-panel rounded-2xl p-6 sm:p-8 max-w-md w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-2">Sesión completada</div>
            <h2 className="font-serif text-2xl font-medium mb-1">{completingCita.paciente_nombre}</h2>
            <p className="text-sm text-ink-soft mb-5">
              ¿Qué se trabajó en esta sesión? Esto queda guardado en el historial del paciente.
            </p>
            <Textarea
              placeholder="Notas de la sesión (opcional)…"
              value={sessionNote}
              onChange={(e) => setSessionNote(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-3 mt-5">
              <Button variant="primary" onClick={confirmSessionComplete}>
                Guardar sesión
              </Button>
              <Button variant="secondary" onClick={() => setCompletingCita(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}

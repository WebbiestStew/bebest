'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { hasFullAccess } from '@/lib/roles';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Textarea, Checkbox } from '@/components/FormInputs';
import { useAuth } from '@/lib/useAuth';
import { Skeleton } from '@/components/Skeleton';
import { deleteWithUndo } from '@/lib/utils';

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
  const [reschedulingCita, setReschedulingCita] = useState<any>(null);
  const [rescheduleFecha, setRescheduleFecha] = useState('');
  const [rescheduleHora, setRescheduleHora] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [feedUrls, setFeedUrls] = useState<{ url: string; webcalUrl: string } | null>(null);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [copiedFeedLink, setCopiedFeedLink] = useState(false);

  const canSeeAll = hasFullAccess(user?.rol);

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
    if (user && !canSeeAll) {
      setFormData((f) => ({ ...f, terapeuta: user.nombre }));
    }
  }, [user, canSeeAll]);

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

  // Warns about (doesn't block) the same therapist already having another
  // cita at that exact date+hour — catches accidental double-booking without
  // stopping a deliberate one (e.g. a correction, or two therapists sharing
  // a slot on purpose).
  const conflictingCita = useMemo(() => {
    if (!formData.terapeuta || !formData.fecha || !formData.hora) return null;
    return (
      citas.find(
        (c) =>
          c.terapeuta === formData.terapeuta &&
          (c.fecha || '').slice(0, 10) === formData.fecha &&
          c.hora === formData.hora &&
          c.estado !== 'Cancelada'
      ) || null
    );
  }, [citas, formData.terapeuta, formData.fecha, formData.hora]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.paciente_id) newErrors.paciente_id = 'Este campo es obligatorio.';
    if (!canSeeAll && !formData.terapeuta) newErrors.terapeuta = 'Este campo es obligatorio.';
    if (canSeeAll && !formData.terapeuta) newErrors.terapeuta = 'Este campo es obligatorio.';
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

  const handleDelete = (citaId: string) => {
    const previousCitas = citas;
    setCitas((prev) => prev.filter((c) => c.id !== citaId));

    deleteWithUndo({
      message: 'Cita eliminada.',
      restore: () => setCitas(previousCitas),
      performDelete: async () => {
        try {
          const res = await fetch(`/api/citas/${citaId}`, { method: 'DELETE' });
          if (!res.ok) {
            setCitas(previousCitas);
            window.dispatchEvent(
              new CustomEvent('showToast', { detail: { message: 'Error al eliminar la cita', isError: true } })
            );
          }
        } catch (error) {
          console.error('Error deleting cita:', error);
          setCitas(previousCitas);
          window.dispatchEvent(
            new CustomEvent('showToast', { detail: { message: 'Error al eliminar la cita', isError: true } })
          );
        }
      },
    });
  };

  const openReschedule = (cita: any) => {
    setReschedulingCita(cita);
    setRescheduleFecha((cita.fecha || '').slice(0, 10));
    setRescheduleHora(cita.hora || '');
  };

  // Same non-blocking "someone's already got that slot" check the new-cita
  // form does above, just excluding the cita being moved from the comparison
  // (otherwise it would always conflict with itself).
  const rescheduleConflict =
    reschedulingCita &&
    citas.find(
      (c) =>
        c.id !== reschedulingCita.id &&
        c.terapeuta === reschedulingCita.terapeuta &&
        (c.fecha || '').slice(0, 10) === rescheduleFecha &&
        c.hora === rescheduleHora &&
        c.estado !== 'Cancelada'
    );

  const confirmReschedule = async () => {
    if (!reschedulingCita || !rescheduleFecha || !rescheduleHora) return;
    setIsRescheduling(true);
    try {
      const res = await fetch(`/api/citas/${reschedulingCita.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: rescheduleFecha, hora: rescheduleHora }),
      });
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Cita reagendada.', isError: false } }));
        setReschedulingCita(null);
        fetchAll();
      } else {
        window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error al reagendar', isError: true } }));
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('showToast', { detail: { message: 'Error al reagendar', isError: true } }));
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleShowFeed = async () => {
    setIsLoadingFeed(true);
    setCopiedFeedLink(false);
    try {
      const res = await fetch('/api/agenda-feed');
      const data = await res.json();
      if (res.ok) setFeedUrls(data);
    } catch (error) {
      console.error('Error fetching feed link:', error);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const handleCopyFeedLink = async () => {
    if (!feedUrls) return;
    try {
      await navigator.clipboard.writeText(feedUrls.webcalUrl);
      setCopiedFeedLink(true);
      setTimeout(() => setCopiedFeedLink(false), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
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
              {canSeeAll ? 'Toda la consulta' : 'Tus citas'}
            </div>
            <h1 className="font-serif text-4xl font-medium mb-2">Agenda</h1>
            <p className="text-ink-soft text-base">Quién ves esta semana, día por día.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleShowFeed} isLoading={isLoadingFeed} disabled={isLoadingFeed}>
              📱 Sincronizar con mi teléfono
            </Button>
            <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? 'Cancelar' : '+ Nueva cita'}
            </Button>
          </div>
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
              {canSeeAll ? (
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

            {conflictingCita && (
              <div className="text-sm text-clay bg-clay-pale/50 border border-clay/30 rounded-lg px-3 py-2">
                ⚠️ {formData.terapeuta} ya tiene una cita a esta hora con {conflictingCita.paciente_nombre} (
                {conflictingCita.estado}). Puedes agendar de todos modos si es intencional.
              </div>
            )}

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
                              {canSeeAll && <div className="text-xs text-ink-soft">{c.terapeuta}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={`/api/citas/${c.id}/ics`}
                              className="text-xs text-ink-soft hover:text-sage-deep transition-colors duration-150"
                              aria-label="Agregar al calendario del teléfono"
                              title="Agregar al calendario del teléfono"
                            >
                              📅
                            </a>
                            <button
                              onClick={() => openReschedule(c)}
                              className="text-xs text-ink-soft hover:text-sage-deep transition-colors duration-150"
                              aria-label="Reagendar cita"
                              title="Reagendar"
                            >
                              🔁
                            </button>
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

      {reschedulingCita && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setReschedulingCita(null)}
        >
          <div
            className="bg-panel rounded-2xl p-6 sm:p-8 max-w-md w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-2">Reagendar</div>
            <h2 className="font-serif text-2xl font-medium mb-5">{reschedulingCita.paciente_nombre}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha"
                type="date"
                value={rescheduleFecha}
                onChange={(e) => setRescheduleFecha(e.target.value)}
              />
              <Input
                label="Hora"
                type="time"
                value={rescheduleHora}
                onChange={(e) => setRescheduleHora(e.target.value)}
              />
            </div>
            {rescheduleConflict && (
              <div className="mt-4 text-sm text-clay bg-clay-pale/50 border border-clay/30 rounded-lg px-3 py-2">
                ⚠️ {reschedulingCita.terapeuta} ya tiene una cita a esta hora con {rescheduleConflict.paciente_nombre} (
                {rescheduleConflict.estado}). Puedes reagendar de todos modos si es intencional.
              </div>
            )}
            <div className="flex items-center gap-3 mt-5">
              <Button
                variant="primary"
                onClick={confirmReschedule}
                isLoading={isRescheduling}
                disabled={isRescheduling || !rescheduleFecha || !rescheduleHora}
              >
                Guardar
              </Button>
              <Button variant="secondary" onClick={() => setReschedulingCita(null)} disabled={isRescheduling}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {feedUrls && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setFeedUrls(null)}
        >
          <div
            className="bg-panel rounded-2xl p-6 sm:p-8 max-w-md w-full animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-2">Mi calendario</div>
            <h2 className="font-serif text-2xl font-medium mb-2">Sincronizar con tu teléfono</h2>
            <p className="text-sm text-ink-soft mb-4">
              Copia este enlace y agrégalo como calendario suscrito (no descargado) en tu teléfono. A diferencia del
              📅 de cada cita, esto se actualiza solo cuando cambies algo en la Agenda — no hay que volver a
              descargar nada.
            </p>
            <div className="bg-gray-50 border border-line rounded-lg p-3 text-xs font-mono text-ink-soft break-all mb-3">
              {feedUrls.webcalUrl}
            </div>
            <p className="text-xs text-ink-soft mb-5">
              <strong>iPhone:</strong> Ajustes → Calendario → Cuentas → Añadir cuenta → Otra → Añadir calendario con
              suscripción, y pega el enlace ahí.{' '}
              <strong>Android/Google Calendar:</strong> en calendar.google.com, &ldquo;Otros calendarios&rdquo; →
              &ldquo;Desde URL&rdquo;, y pega el enlace.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleCopyFeedLink}>
                {copiedFeedLink ? '✓ Copiado' : 'Copiar enlace'}
              </Button>
              <Button variant="secondary" onClick={() => setFeedUrls(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}

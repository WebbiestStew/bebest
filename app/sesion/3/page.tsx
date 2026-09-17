'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Checkbox, Textarea } from '@/components/FormInputs';
import { FormPrintPreview, PreviewSection, PreviewField } from '@/components/FormPrintPreview';
import { useAuth } from '@/lib/useAuth';
import { hasAdminAccess } from '@/lib/roles';
import { Patient } from '@/lib/types';
import {
  fileToBase64,
  parsePlanTratamiento,
  serializePlanTratamiento,
  PlanObjetivo,
  parseDxAdicionales,
  serializeDxAdicionales,
  DxAdicional,
  findDsm5Code,
} from '@/lib/utils';
import { DSM5_CODES } from '@/lib/dsm5Codes';
import { Dsm5Picker } from '@/components/Dsm5Picker';

interface FormErrors {
  paciente?: string;
  dx_principal?: string;
  dx_comorbilidad?: string;
  dx_otros?: string;
  plan?: string;
  checks?: string;
}

const EMPTY_OBJETIVO: PlanObjetivo = { objetivo: '', tecnicas: '' };
const EMPTY_OTRO: DxAdicional = { nombre: '' };

export default function Sesion3Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    paciente: '',
    terapeuta: '',
    dx_principal: '',
    dx_comorbilidad: '',
    dx_otros: '',
    plan_no_suicidio: false,
    consentimiento: false,
    referido_psiquiatria: false,
    psiquiatra_nombre: '',
    psiquiatra_contacto: '',
    psiquiatra_datos_pendientes: false,
    psiquiatra_notas: '',
  });
  const [planObjetivos, setPlanObjetivos] = useState<PlanObjetivo[]>([{ ...EMPTY_OBJETIVO }]);
  const [draggedObjetivo, setDraggedObjetivo] = useState<number | null>(null);
  const [dragOverObjetivo, setDragOverObjetivo] = useState<number | null>(null);
  const [otrosAdicionales, setOtrosAdicionales] = useState<DxAdicional[]>([{ ...EMPTY_OTRO }]);
  const [patientFull, setPatientFull] = useState<Patient | null>(null);
  const [isUploadingInforme, setIsUploadingInforme] = useState(false);
  const [informeDocumento, setInformeDocumento] = useState<{ filename: string; id: string } | null>(null);
  const [isUploadingPlanDoc, setIsUploadingPlanDoc] = useState(false);
  const [planDoc, setPlanDoc] = useState<{ filename: string; id: string } | null>(null);
  const [isUploadingConsentDoc, setIsUploadingConsentDoc] = useState(false);
  const [consentDoc, setConsentDoc] = useState<{ filename: string; id: string } | null>(null);
  const [todaysCita, setTodaysCita] = useState<any>(null);
  const [citas, setCitas] = useState<any[]>([]);

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
    if (!formData.dx_principal.trim()) newErrors.dx_principal = 'Este campo es obligatorio.';
    if (!formData.dx_comorbilidad.trim()) newErrors.dx_comorbilidad = 'Este campo es obligatorio.';
    if (!formData.dx_otros.trim()) newErrors.dx_otros = 'Este campo es obligatorio.';
    if (!planObjetivos.some((o) => o.objetivo.trim() && o.tecnicas.trim())) {
      newErrors.plan = 'Agrega al menos un objetivo con sus técnicas.';
    }
    if (!formData.plan_no_suicidio || !formData.consentimiento) {
      newErrors.checks = 'Todos los checkpoints son obligatorios.';
    }
    if (formData.plan_no_suicidio && !planDoc) {
      newErrors.checks = 'Sube el documento del Plan de No Suicidio antes de marcarlo.';
    }
    if (formData.consentimiento && !consentDoc) {
      newErrors.checks = 'Sube el documento del Consentimiento Informado antes de marcarlo.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePatientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    const p = patients.find(pat => pat.id === patientId);
    // Restore everything already saved for this patient — otherwise
    // reopening someone half-finished resets all of Sesión 3 to blank,
    // which previously meant redoing Dx/checkpoints/psiquiatra data from
    // scratch every time a therapist left and came back.
    setFormData({
      paciente: patientId,
      terapeuta: (p as any)?.terapeuta || (isAdmin ? '' : user.nombre),
      dx_principal: (p as any)?.dx_principal || '',
      dx_comorbilidad: (p as any)?.dx_comorbilidad || '',
      dx_otros: (p as any)?.dx_otros_problemas || '',
      plan_no_suicidio: !!(p as any)?.plan_no_suicidio,
      consentimiento: !!(p as any)?.consentimiento_informado,
      referido_psiquiatria: !!(p as any)?.referido_psiquiatria,
      psiquiatra_nombre: (p as any)?.psiquiatra_nombre || '',
      psiquiatra_contacto: (p as any)?.psiquiatra_contacto || '',
      psiquiatra_datos_pendientes: !!(p as any)?.psiquiatra_datos_pendientes,
      psiquiatra_notas: (p as any)?.psiquiatra_notas || '',
    });
    setPatientFull(p || null);
    setInformeDocumento(null);
    // Reflect docs already uploaded in an earlier visit — otherwise
    // reselecting this patient would show the checkbox permanently disabled
    // even though the file genuinely exists in Airtable. Airtable's upload
    // endpoint APPENDS to the attachment list rather than replacing it, so
    // "subir otro" leaves the old file in the array too — take the LAST
    // entry (the current one), not the first (the original upload).
    const existingPlanDocs = (p as any)?.plan_no_suicidio_doc || [];
    const existingConsentDocs = (p as any)?.consentimiento_informado_doc || [];
    const existingPlanDoc = existingPlanDocs[existingPlanDocs.length - 1];
    const existingConsentDoc = existingConsentDocs[existingConsentDocs.length - 1];
    setPlanDoc(existingPlanDoc ? { filename: existingPlanDoc.filename, id: existingPlanDoc.id } : null);
    setConsentDoc(existingConsentDoc ? { filename: existingConsentDoc.filename, id: existingConsentDoc.id } : null);
    const existingPlan = parsePlanTratamiento((p as any)?.plan_tratamiento);
    setPlanObjetivos(existingPlan.length ? existingPlan : [{ ...EMPTY_OBJETIVO }]);
    const existingOtros = parseDxAdicionales((p as any)?.dx_otros_adicionales);
    setOtrosAdicionales(existingOtros.length ? existingOtros : [{ ...EMPTY_OTRO }]);

    const today = new Date().toISOString().slice(0, 10);
    const match = citas.find(
      (c) => (c.paciente || [])[0] === patientId && (c.fecha || '').slice(0, 10) === today
    );
    setTodaysCita(match || null);
  };

  const updateObjetivo = (index: number, field: keyof PlanObjetivo, value: string) => {
    setPlanObjetivos((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addObjetivo = () => setPlanObjetivos((rows) => [...rows, { ...EMPTY_OBJETIVO }]);

  const removeObjetivo = (index: number) =>
    setPlanObjetivos((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));

  const reorderObjetivo = (from: number, to: number) => {
    if (from === to) return;
    setPlanObjetivos((rows) => {
      const copy = [...rows];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  };

  const updateOtroAdicional = (index: number, nombre: string) => {
    setOtrosAdicionales((rows) => rows.map((row, i) => (i === index ? { ...row, nombre } : row)));
  };

  const addOtroAdicional = () => setOtrosAdicionales((rows) => [...rows, { ...EMPTY_OTRO }]);

  const removeOtroAdicional = (index: number) =>
    setOtrosAdicionales((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));

  const uploadDoc = async (
    file: File,
    field: 'documentos' | 'plan_no_suicidio_doc' | 'consentimiento_informado_doc',
    setUploading: (v: boolean) => void,
    setDoc: (v: { filename: string; id: string } | null) => void
  ) => {
    if (!formData.paciente) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Selecciona un paciente primero.', isError: true } })
      );
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'El archivo supera el límite de 15MB', isError: true } })
      );
      return;
    }

    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`/api/patients/${formData.paciente}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', base64, field }),
      });
      if (res.ok) {
        const data = await res.json();
        // Take the real Airtable attachment (with its real id) back from the
        // response rather than trusting the local File object — Airtable
        // appends to the field's attachment list, so the one we just added
        // is the last entry.
        const uploaded = ((data.patient as any)?.[field] || []).slice(-1)[0];
        setDoc(uploaded ? { filename: uploaded.filename, id: uploaded.id } : { filename: file.name, id: '' });
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Documento subido correctamente.', isError: false } })
        );
      } else {
        const error = await res.json();
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: error.error || 'Error al subir el archivo', isError: true } })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al subir el archivo', isError: true } })
      );
    } finally {
      setUploading(false);
    }
  };

  const handleUploadInforme = (file: File) => uploadDoc(file, 'documentos', setIsUploadingInforme, setInformeDocumento);
  const handleUploadPlanDoc = (file: File) => uploadDoc(file, 'plan_no_suicidio_doc', setIsUploadingPlanDoc, setPlanDoc);
  const handleUploadConsentDoc = (file: File) =>
    uploadDoc(file, 'consentimiento_informado_doc', setIsUploadingConsentDoc, setConsentDoc);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await fetch(`/api/patients?id=${formData.paciente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(formData.terapeuta ? { terapeuta: formData.terapeuta } : {}),
          dx_principal: formData.dx_principal.trim(),
          dx_principal_codigo: findDsm5Code(formData.dx_principal) || '',
          dx_comorbilidad: formData.dx_comorbilidad.trim(),
          dx_comorbilidad_codigo: findDsm5Code(formData.dx_comorbilidad) || '',
          dx_otros_problemas: formData.dx_otros.trim(),
          dx_otros_problemas_codigo: findDsm5Code(formData.dx_otros) || '',
          dx_otros_adicionales: serializeDxAdicionales(
            otrosAdicionales.map((o) => ({
              nombre: o.nombre.trim(),
              codigo: findDsm5Code(o.nombre) || undefined,
            }))
          ),
          plan_tratamiento: serializePlanTratamiento(planObjetivos),
          plan_no_suicidio: formData.plan_no_suicidio,
          consentimiento_informado: formData.consentimiento,
          referido_psiquiatria: formData.referido_psiquiatria,
          ...(formData.referido_psiquiatria
            ? {
                psiquiatra_nombre: formData.psiquiatra_nombre.trim(),
                psiquiatra_contacto: formData.psiquiatra_contacto.trim(),
                psiquiatra_datos_pendientes: formData.psiquiatra_datos_pendientes,
              }
            : {}),
          ...(formData.psiquiatra_notas.trim() ? { psiquiatra_notas: formData.psiquiatra_notas.trim() } : {}),
          num_sesiones: ((patientFull as any)?.num_sesiones || 0) + 1,
          etapa_actual: 'Tratamiento',
          expediente_completo: true,
        }),
      });

      // Auto-linked to today's cita (see handlePatientChange) — closing the
      // loop between the scheduled appointment and the session actually done.
      if (todaysCita && todaysCita.estado !== 'Completada' && todaysCita.estado !== 'Cancelada') {
        await fetch(`/api/citas/${todaysCita.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: 'Completada' }),
        });
      }

      if (formData.referido_psiquiatria && formData.psiquiatra_datos_pendientes) {
        await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: formData.paciente,
            paso_incompleto: 'Datos del psiquiatra pendientes',
            campos_faltantes: 1,
          }),
        });
      }

      // The expediente is marked complete above, but a patient with zero
      // uploaded documents almost always means something physical (INE,
      // consentimiento, etc.) was never scanned in — flag it so the
      // therapist and admin follow up instead of it going unnoticed.
      if (!((patientFull as any)?.documentos?.length)) {
        await fetch('/api/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: formData.paciente,
            paso_incompleto: 'Sin documentos adjuntos',
            campos_faltantes: 1,
          }),
        });
      }

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

  const psiquiatraDatosPreview = formData.psiquiatra_datos_pendientes
    ? 'Pendientes'
    : [formData.psiquiatra_nombre, formData.psiquiatra_contacto].filter(Boolean).join(' — ');

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start max-w-6xl">
        <div className="max-w-2xl print:hidden">
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

          <datalist id="dsm5-dx-list">
            {DSM5_CODES.map((d) => (
              <option key={`${d.code}-${d.name}`} value={d.name} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Dsm5Picker
              label="Dx Principal"
              value={formData.dx_principal}
              onChange={(name) => setFormData({ ...formData, dx_principal: name })}
              error={errors.dx_principal}
              required
            />
            <Dsm5Picker
              label="Dx Comorbilidad"
              value={formData.dx_comorbilidad}
              onChange={(name) => setFormData({ ...formData, dx_comorbilidad: name })}
              error={errors.dx_comorbilidad}
              required
            />
          </div>
          <p className="text-xs text-ink-soft -mt-4">
            Empieza a escribir para ver sugerencias del DSM-5-TR con su código. Si el diagnóstico tiene niveles de
            gravedad (leve, moderado, grave) u otras variantes, aparece un segundo campo para elegir cuál — escribir
            libremente también funciona, solo sin código.
          </p>

          <Dsm5Picker
            label="Dx Otros Problemas"
            value={formData.dx_otros}
            onChange={(name) => setFormData({ ...formData, dx_otros: name })}
            error={errors.dx_otros}
            required
          />

          <div>
            <label className="text-sm font-medium text-ink-soft mb-2 block">Otros</label>
            <p className="text-xs text-ink-soft -mt-0.5 mb-2">
              Diagnósticos o problemas adicionales, cada uno con su propio código si aplica.
            </p>
            <div className="space-y-3">
              {otrosAdicionales.map((row, i) => (
                <div key={i} className="flex gap-2 items-start bg-gray-50 border border-line rounded-lg p-3">
                  <span className="text-xs font-mono text-ink-soft mt-3 shrink-0 w-4">{i + 1}.</span>
                  <div className="flex-1">
                    <Dsm5Picker
                      label={`Otros — Diagnóstico ${i + 1}`}
                      value={row.nombre}
                      onChange={(name) => updateOtroAdicional(i, name)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOtroAdicional(i)}
                    disabled={otrosAdicionales.length === 1}
                    className="text-ink-soft hover:text-red transition-colors duration-150 mt-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Quitar diagnóstico adicional"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOtroAdicional}
              className="mt-2 text-sm text-sage-deep hover:underline underline-offset-2"
            >
              + Agregar otro
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-ink-soft mb-2 block">
              Plan de Tratamiento
              <span className="text-clay ml-1">*</span>
            </label>
            <div className="space-y-3">
              {planObjetivos.map((row, i) => (
                <div
                  key={i}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverObjetivo !== i) setDragOverObjetivo(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedObjetivo !== null) reorderObjetivo(draggedObjetivo, i);
                    setDraggedObjetivo(null);
                    setDragOverObjetivo(null);
                  }}
                  className={`flex gap-2 items-start border rounded-lg p-3 transition-colors duration-150 ${
                    dragOverObjetivo === i && draggedObjetivo !== null && draggedObjetivo !== i
                      ? 'border-sage bg-sage-pale/30'
                      : 'bg-gray-50 border-line'
                  } ${draggedObjetivo === i ? 'opacity-40' : ''}`}
                >
                  <span
                    draggable
                    onDragStart={() => setDraggedObjetivo(i)}
                    onDragEnd={() => {
                      setDraggedObjetivo(null);
                      setDragOverObjetivo(null);
                    }}
                    className="text-ink-soft/50 hover:text-ink-soft mt-2.5 shrink-0 cursor-grab active:cursor-grabbing select-none"
                    aria-label="Arrastrar para reordenar"
                    title="Arrastrar para reordenar"
                  >
                    ⠿
                  </span>
                  <span className="text-xs font-mono text-ink-soft mt-3 shrink-0 w-4">{i + 1}.</span>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      placeholder="Objetivo"
                      value={row.objetivo}
                      onChange={(e) => updateObjetivo(i, 'objetivo', e.target.value)}
                    />
                    <Input
                      placeholder="Técnicas a utilizar"
                      value={row.tecnicas}
                      onChange={(e) => updateObjetivo(i, 'tecnicas', e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeObjetivo(i)}
                    disabled={planObjetivos.length === 1}
                    className="text-ink-soft hover:text-red transition-colors duration-150 mt-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Quitar objetivo"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addObjetivo}
              className="mt-2 text-sm text-sage-deep hover:underline underline-offset-2"
            >
              + Agregar objetivo
            </button>
            {errors.plan && <div className="text-xs text-red mt-1">{errors.plan}</div>}
          </div>

          <div className="border-t border-line pt-6 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
                  {isUploadingPlanDoc ? 'Subiendo…' : planDoc ? '🔄 Subir otro archivo' : '📎 Subir documento del Plan de No Suicidio'}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={isUploadingPlanDoc}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadPlanDoc(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {planDoc?.id && (
                  <a
                    href={`/api/patients/${formData.paciente}/documentos/${planDoc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-sage-deep hover:underline underline-offset-2"
                    title={planDoc.filename}
                  >
                    📄 Ver archivo
                  </a>
                )}
              </div>
              <Checkbox
                label="Plan de No Suicidio"
                sublabel={planDoc ? 'Requerido antes de cerrar la evaluación.' : 'Sube el documento para poder marcarlo.'}
                checked={formData.plan_no_suicidio}
                disabled={!planDoc}
                onChange={(e) => setFormData({ ...formData, plan_no_suicidio: e.target.checked })}
                required
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
                  {isUploadingConsentDoc ? 'Subiendo…' : consentDoc ? '🔄 Subir otro archivo' : '📎 Subir Consentimiento Informado firmado'}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={isUploadingConsentDoc}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadConsentDoc(file);
                      e.target.value = '';
                    }}
                  />
                </label>
                {consentDoc?.id && (
                  <a
                    href={`/api/patients/${formData.paciente}/documentos/${consentDoc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs text-sage-deep hover:underline underline-offset-2"
                    title={consentDoc.filename}
                  >
                    📄 Ver archivo
                  </a>
                )}
              </div>
              <Checkbox
                label="Consentimiento Informado firmado"
                sublabel={consentDoc ? undefined : 'Sube el documento para poder marcarlo.'}
                checked={formData.consentimiento}
                disabled={!consentDoc}
                onChange={(e) => setFormData({ ...formData, consentimiento: e.target.checked })}
                required
              />
            </div>

            <div>
              <Checkbox
                label="Se tocó el tema de referir a Psiquiatría o Tx complementario"
                sublabel="Déjalo sin marcar si no aplica — no es obligatorio."
                checked={formData.referido_psiquiatria}
                onChange={(e) => setFormData({ ...formData, referido_psiquiatria: e.target.checked })}
              />
              {formData.referido_psiquiatria && (
                <div className="mt-3 pl-3.5 border-l-2 border-sage-pale space-y-4">
                  <Checkbox
                    label="Aún no tengo los datos del psiquiatra — dejar pendiente"
                    sublabel="Se enviará una alerta para dar seguimiento."
                    checked={formData.psiquiatra_datos_pendientes}
                    onChange={(e) =>
                      setFormData({ ...formData, psiquiatra_datos_pendientes: e.target.checked })
                    }
                  />
                  {!formData.psiquiatra_datos_pendientes && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nombre del psiquiatra"
                        value={formData.psiquiatra_nombre}
                        onChange={(e) => setFormData({ ...formData, psiquiatra_nombre: e.target.value })}
                      />
                      <Input
                        label="Teléfono o correo de contacto"
                        value={formData.psiquiatra_contacto}
                        onChange={(e) => setFormData({ ...formData, psiquiatra_contacto: e.target.value })}
                      />
                    </div>
                  )}
                  <Textarea
                    label="Notas sobre la referencia (opcional)"
                    value={formData.psiquiatra_notas}
                    onChange={(e) => setFormData({ ...formData, psiquiatra_notas: e.target.value })}
                    rows={3}
                  />
                </div>
              )}
            </div>
            {errors.checks && <div className="text-xs text-red mt-2">{errors.checks}</div>}
          </div>

          <div className="border-t border-line pt-6">
            <h3 className="text-sm font-medium text-ink mb-1">Informe de resultados firmado</h3>
            <p className="text-xs text-ink-soft mb-4">
              Sube el documento físico ya firmado por el terapeuta, el/la supervisor/a y el paciente.
            </p>

            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
              {isUploadingInforme ? (
                'Subiendo…'
              ) : informeDocumento ? (
                <>📄 {informeDocumento.filename} — subir otro</>
              ) : (
                '📎 Subir documento firmado (PDF o foto)'
              )}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                disabled={isUploadingInforme}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadInforme(file);
                  e.target.value = '';
                }}
              />
            </label>
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
        </div>

        <FormPrintPreview
          isAdmin={isAdmin}
          title="Sesión 3 · Resultados"
          subtitle="Informe clínico y cierre de la evaluación"
          filename={`sesion-3-${patientFull?.paciente || 'paciente'}`}
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
              title: 'Diagnóstico',
              fields: [
                { label: 'Dx Principal', value: formData.dx_principal, full: true },
                { label: 'Código', value: findDsm5Code(formData.dx_principal) },
                { label: 'Dx Comorbilidad', value: formData.dx_comorbilidad, full: true },
                { label: 'Código', value: findDsm5Code(formData.dx_comorbilidad) },
                { label: 'Otros problemas', value: formData.dx_otros, full: true },
                { label: 'Código', value: findDsm5Code(formData.dx_otros) },
                ...otrosAdicionales
                  .filter((o) => o.nombre.trim())
                  .map((o, i) => ({
                    label: `Otros ${i + 1}`,
                    value: [o.nombre, findDsm5Code(o.nombre)].filter(Boolean).join(' — '),
                    full: true,
                  })),
              ],
            },
            {
              title: 'Plan de tratamiento',
              fields: planObjetivos
                .filter((o) => o.objetivo.trim() || o.tecnicas.trim())
                .map((o, i) => ({
                  label: `Objetivo ${i + 1}`,
                  value: [o.objetivo, o.tecnicas].filter(Boolean).join(' — '),
                  full: true,
                })),
            },
            {
              title: 'Checkpoints',
              fields: [
                { label: 'Plan de No Suicidio', value: formData.plan_no_suicidio },
                { label: 'Consentimiento Informado', value: formData.consentimiento },
                { label: 'Referido a Psiquiatría', value: formData.referido_psiquiatria },
                ...(formData.referido_psiquiatria
                  ? [
                      { label: 'Datos del psiquiatra', value: psiquiatraDatosPreview, full: true },
                      ...(formData.psiquiatra_notas
                        ? [{ label: 'Notas sobre la referencia', value: formData.psiquiatra_notas, full: true }]
                        : []),
                    ]
                  : []),
                { label: 'Informe firmado subido', value: !!informeDocumento },
              ],
            },
          ]}
        >
          <PreviewSection title="Paciente">
            <PreviewField label="Nombre" value={patientFull?.paciente} full />
            <PreviewField label="Terapeuta" value={formData.terapeuta} />
            {todaysCita && <PreviewField label="Cita de hoy" value={todaysCita.hora} />}
          </PreviewSection>
          <PreviewSection title="Diagnóstico">
            <PreviewField label="Dx Principal" value={formData.dx_principal} full />
            <PreviewField label="Código" value={findDsm5Code(formData.dx_principal)} />
            <PreviewField label="Dx Comorbilidad" value={formData.dx_comorbilidad} full />
            <PreviewField label="Código" value={findDsm5Code(formData.dx_comorbilidad)} />
            <PreviewField label="Otros problemas" value={formData.dx_otros} full />
            <PreviewField label="Código" value={findDsm5Code(formData.dx_otros)} />
            {otrosAdicionales
              .filter((o) => o.nombre.trim())
              .map((o, i) => (
                <PreviewField
                  key={i}
                  label={`Otros ${i + 1}`}
                  value={[o.nombre, findDsm5Code(o.nombre)].filter(Boolean).join(' — ')}
                  full
                />
              ))}
          </PreviewSection>
          <PreviewSection title="Plan de tratamiento">
            {planObjetivos
              .filter((o) => o.objetivo.trim() || o.tecnicas.trim())
              .map((o, i) => (
                <PreviewField key={i} label={`Objetivo ${i + 1}`} value={[o.objetivo, o.tecnicas].filter(Boolean).join(' — ')} full />
              ))}
          </PreviewSection>
          <PreviewSection title="Checkpoints">
            <PreviewField label="Plan de No Suicidio" value={formData.plan_no_suicidio} />
            <PreviewField label="Consentimiento Informado" value={formData.consentimiento} />
            <PreviewField label="Referido a Psiquiatría" value={formData.referido_psiquiatria} />
            {formData.referido_psiquiatria && (
              <>
                <PreviewField label="Datos del psiquiatra" value={psiquiatraDatosPreview} full />
                {formData.psiquiatra_notas && (
                  <PreviewField label="Notas sobre la referencia" value={formData.psiquiatra_notas} full />
                )}
              </>
            )}
            <PreviewField label="Informe firmado subido" value={!!informeDocumento} />
          </PreviewSection>
        </FormPrintPreview>
        </div>
      </main>

      <Toast />
    </div>
  );
}

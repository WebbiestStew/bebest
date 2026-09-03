'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Checkbox } from '@/components/FormInputs';
import { FormPrintPreview, PreviewSection, PreviewField } from '@/components/FormPrintPreview';
import { useAuth } from '@/lib/useAuth';
import { Patient } from '@/lib/types';
import {
  fileToBase64,
  parsePlanTratamiento,
  serializePlanTratamiento,
  PlanObjetivo,
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
    plan_no_suicidio: false,
    consentimiento: false,
    referido_psiquiatria: false,
    psiquiatra_nombre: '',
    psiquiatra_contacto: '',
    psiquiatra_datos_pendientes: false,
  });
  const [planObjetivos, setPlanObjetivos] = useState<PlanObjetivo[]>([{ ...EMPTY_OBJETIVO }]);
  const [patientFull, setPatientFull] = useState<Patient | null>(null);
  const [isUploadingInforme, setIsUploadingInforme] = useState(false);
  const [informeDocumento, setInformeDocumento] = useState<{ filename: string } | null>(null);
  const [isUploadingPlanDoc, setIsUploadingPlanDoc] = useState(false);
  const [planDoc, setPlanDoc] = useState<{ filename: string } | null>(null);
  const [isUploadingConsentDoc, setIsUploadingConsentDoc] = useState(false);
  const [consentDoc, setConsentDoc] = useState<{ filename: string } | null>(null);
  const [todaysCita, setTodaysCita] = useState<any>(null);
  const [citas, setCitas] = useState<any[]>([]);

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
    setFormData({ ...formData, paciente: patientId });
    const p = patients.find(pat => pat.id === patientId);
    setPatientFull(p || null);
    setInformeDocumento(null);
    // Reflect docs already uploaded in an earlier visit — otherwise
    // reselecting this patient would show the checkbox permanently disabled
    // even though the file genuinely exists in Airtable.
    const existingPlanDoc = (p as any)?.plan_no_suicidio_doc?.[0];
    const existingConsentDoc = (p as any)?.consentimiento_informado_doc?.[0];
    setPlanDoc(existingPlanDoc ? { filename: existingPlanDoc.filename } : null);
    setConsentDoc(existingConsentDoc ? { filename: existingConsentDoc.filename } : null);
    const existingPlan = parsePlanTratamiento((p as any)?.plan_tratamiento);
    setPlanObjetivos(existingPlan.length ? existingPlan : [{ ...EMPTY_OBJETIVO }]);

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

  const uploadDoc = async (
    file: File,
    field: 'documentos' | 'plan_no_suicidio_doc' | 'consentimiento_informado_doc',
    setUploading: (v: boolean) => void,
    setDoc: (v: { filename: string } | null) => void
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
        setDoc({ filename: file.name });
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
          dx_principal: formData.dx_principal.trim(),
          dx_principal_codigo: findDsm5Code(formData.dx_principal) || '',
          dx_comorbilidad: formData.dx_comorbilidad.trim(),
          dx_comorbilidad_codigo: findDsm5Code(formData.dx_comorbilidad) || '',
          dx_otros_problemas: formData.dx_otros.trim(),
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

          <Input
            label="Dx Otros Problemas"
            placeholder="Otros problemas relevantes"
            value={formData.dx_otros}
            onChange={(e) => setFormData({ ...formData, dx_otros: e.target.value })}
            error={errors.dx_otros}
            required
          />

          <div>
            <label className="text-sm font-medium text-ink-soft mb-2 block">
              Plan de Tratamiento
              <span className="text-clay ml-1">*</span>
            </label>
            <div className="space-y-3">
              {planObjetivos.map((row, i) => (
                <div key={i} className="flex gap-2 items-start bg-gray-50 border border-line rounded-lg p-3">
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
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
                {isUploadingPlanDoc ? (
                  'Subiendo…'
                ) : planDoc ? (
                  <>📄 {planDoc.filename} — subir otro</>
                ) : (
                  '📎 Subir documento del Plan de No Suicidio'
                )}
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
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
                {isUploadingConsentDoc ? (
                  'Subiendo…'
                ) : consentDoc ? (
                  <>📄 {consentDoc.filename} — subir otro</>
                ) : (
                  '📎 Subir Consentimiento Informado firmado'
                )}
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

        <FormPrintPreview title="Sesión 3 · Resultados" subtitle="Informe clínico y cierre de la evaluación">
          <PreviewSection title="Paciente">
            <PreviewField label="Nombre" value={patientFull?.paciente} full />
            {todaysCita && <PreviewField label="Cita de hoy" value={todaysCita.hora} />}
          </PreviewSection>
          <PreviewSection title="Diagnóstico">
            <PreviewField label="Dx Principal" value={formData.dx_principal} full />
            <PreviewField label="Código" value={findDsm5Code(formData.dx_principal)} />
            <PreviewField label="Dx Comorbilidad" value={formData.dx_comorbilidad} full />
            <PreviewField label="Código" value={findDsm5Code(formData.dx_comorbilidad)} />
            <PreviewField label="Otros problemas" value={formData.dx_otros} full />
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
                <PreviewField
                  label="Datos del psiquiatra"
                  value={
                    formData.psiquiatra_datos_pendientes
                      ? 'Pendientes'
                      : [formData.psiquiatra_nombre, formData.psiquiatra_contacto].filter(Boolean).join(' — ')
                  }
                  full
                />
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

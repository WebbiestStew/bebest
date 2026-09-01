'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Checkbox } from '@/components/FormInputs';
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
    informe_firmado_terapeuta: false,
    informe_firmado_supervisor: false,
    informe_firmado_paciente: false,
  });
  const [planObjetivos, setPlanObjetivos] = useState<PlanObjetivo[]>([{ ...EMPTY_OBJETIVO }]);
  const [patientFull, setPatientFull] = useState<Patient | null>(null);
  const [isUploadingInforme, setIsUploadingInforme] = useState(false);
  const [informeDocumento, setInformeDocumento] = useState<{ filename: string } | null>(null);

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
    if (!planObjetivos.some((o) => o.objetivo.trim() && o.tecnicas.trim())) {
      newErrors.plan = 'Agrega al menos un objetivo con sus técnicas.';
    }
    if (
      !formData.plan_no_suicidio ||
      !formData.consentimiento ||
      !formData.referido_psiquiatria ||
      !formData.informe_firmado_terapeuta ||
      !formData.informe_firmado_supervisor ||
      !formData.informe_firmado_paciente
    ) {
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
    setInformeDocumento(null);
    const existingPlan = parsePlanTratamiento((p as any)?.plan_tratamiento);
    setPlanObjetivos(existingPlan.length ? existingPlan : [{ ...EMPTY_OBJETIVO }]);
  };

  const updateObjetivo = (index: number, field: keyof PlanObjetivo, value: string) => {
    setPlanObjetivos((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const addObjetivo = () => setPlanObjetivos((rows) => [...rows, { ...EMPTY_OBJETIVO }]);

  const removeObjetivo = (index: number) =>
    setPlanObjetivos((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows));

  const handleUploadInforme = async (file: File) => {
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

    setIsUploadingInforme(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`/api/patients/${formData.paciente}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', base64 }),
      });
      if (res.ok) {
        setInformeDocumento({ filename: file.name });
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
      setIsUploadingInforme(false);
    }
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
          dx_principal_codigo: findDsm5Code(formData.dx_principal) || '',
          dx_comorbilidad: formData.dx_comorbilidad.trim(),
          dx_comorbilidad_codigo: findDsm5Code(formData.dx_comorbilidad) || '',
          dx_otros_problemas: formData.dx_otros.trim(),
          plan_tratamiento: serializePlanTratamiento(planObjetivos),
          plan_no_suicidio: formData.plan_no_suicidio,
          consentimiento_informado: formData.consentimiento,
          referido_psiquiatria: formData.referido_psiquiatria,
          informe_firmado_terapeuta: formData.informe_firmado_terapeuta,
          informe_firmado_supervisor: formData.informe_firmado_supervisor,
          informe_firmado_paciente: formData.informe_firmado_paciente,
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

          <datalist id="dsm5-dx-list">
            {DSM5_CODES.map((d) => (
              <option key={`${d.code}-${d.name}`} value={d.name} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Input
                label="Dx Principal"
                placeholder="Diagnóstico principal"
                list="dsm5-dx-list"
                value={formData.dx_principal}
                onChange={(e) => setFormData({ ...formData, dx_principal: e.target.value })}
                error={errors.dx_principal}
                required
              />
              {findDsm5Code(formData.dx_principal) && (
                <div className="text-xs text-sage-deep font-mono mt-1.5">
                  Código DSM-5-TR: {findDsm5Code(formData.dx_principal)}
                </div>
              )}
            </div>
            <div>
              <Input
                label="Dx Comorbilidad"
                placeholder="Diagnóstico(s) asociado(s)"
                list="dsm5-dx-list"
                value={formData.dx_comorbilidad}
                onChange={(e) => setFormData({ ...formData, dx_comorbilidad: e.target.value })}
                error={errors.dx_comorbilidad}
                required
              />
              {findDsm5Code(formData.dx_comorbilidad) && (
                <div className="text-xs text-sage-deep font-mono mt-1.5">
                  Código DSM-5-TR: {findDsm5Code(formData.dx_comorbilidad)}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-ink-soft -mt-4">
            Empieza a escribir para ver sugerencias del DSM-5-TR con su código — elegir una de la lista asegura
            que el código aparezca; escribir libremente también funciona, solo sin código.
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

          <div className="border-t border-line pt-6">
            <h3 className="text-sm font-medium text-ink mb-1">Informe de resultados firmado</h3>
            <p className="text-xs text-ink-soft mb-4">
              Sube el documento físico ya firmado y marca quién lo firmó.
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

            <div className="mt-2">
              <Checkbox
                label="Firmado por el terapeuta"
                checked={formData.informe_firmado_terapeuta}
                onChange={(e) => setFormData({ ...formData, informe_firmado_terapeuta: e.target.checked })}
                required
              />
              <Checkbox
                label="Firmado por el/la supervisor/a"
                checked={formData.informe_firmado_supervisor}
                onChange={(e) => setFormData({ ...formData, informe_firmado_supervisor: e.target.checked })}
                required
              />
              <Checkbox
                label="Firmado por el paciente"
                checked={formData.informe_firmado_paciente}
                onChange={(e) => setFormData({ ...formData, informe_firmado_paciente: e.target.checked })}
                required
              />
              {errors.checks && <div className="text-xs text-red mt-2">{errors.checks}</div>}
            </div>
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

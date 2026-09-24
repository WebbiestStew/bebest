'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { BackButton } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { hasFullAccess } from '@/lib/roles';
import { Patient } from '@/lib/types';
import { Skeleton } from '@/components/Skeleton';
import { Textarea, Input, Select } from '@/components/FormInputs';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  uploadPatientDocument,
  parseNotasGenerales,
  serializeNotasGenerales,
  parsePlanTratamiento,
  parseDxAdicionales,
  parseMotivoConsulta,
  parseBateriaPruebas,
  parsePruebaInterpretaciones,
  parseDxSnapshot,
  serializeDxSnapshot,
  downloadPdf,
  deleteWithUndo,
} from '@/lib/utils';
import { PdfDocument, PdfSectionData } from '@/components/PdfDocument';
import { PsychTestResultsSection } from '@/components/PsychTestResultsSection';

const estadoLabel: Record<string, string> = {
  ACTIVO: 'Activo',
  ALTA: 'Alta',
  BAJA: 'Baja',
  'SIN DATO': 'Sin dato',
  Reingreso: 'Reingreso',
};

const estadoBadge: Record<string, string> = {
  ACTIVO: 'bg-sage-pale text-sage-deep',
  ALTA: 'bg-blue/10 text-blue',
  BAJA: 'bg-red-pale text-red',
  'SIN DATO': 'bg-clay-pale text-clay',
  Reingreso: 'bg-clay-pale text-clay',
};

// Values are uppercase to match how registro/page.tsx actually stores this
// field (formData.sexo.toUpperCase() on submit) — title-case values here
// would silently fail to match the stored value and show as unselected.
const SEXO_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'PREFIERO NO DECIRLO', label: 'Prefiero no decirlo' },
];
const ESTADO_CIVIL_OPTIONS = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión Libre', 'Otros'];
const ESTATUS_EN_REGISTRO_OPTIONS = ['ACTIVO', 'ALTA', 'BAJA', 'SIN DATO', 'Reingreso'];

function initials(name: string) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function formatDate(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-MX', { timeZone: 'UTC' });
}

// Same UTC anchoring as formatDate, but spelled out ("7 de septiembre de
// 2026") — used on the individual session PDF, which previously showed the
// short numeric form while every other generated document in the app
// (Antes de la sesión, Informe de Resultados) already used the long form.
function formatDateLong(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-MX', { dateStyle: 'long', timeZone: 'UTC' });
}

// Unlike formatDate (used for stored yyyy-mm-dd dates, where the UTC anchor
// avoids an off-by-one-day shift), notas_generales timestamps are real
// moment-in-time ISO strings, so this deliberately renders in the viewer's
// own local time zone instead.
function formatDateTime(value?: string) {
  if (!value) return null;
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string) {
  if (type.startsWith('image/')) return '🖼️';
  if (type === 'application/pdf') return '📄';
  return '📎';
}

export default function PacienteDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string;
  const [patient, setPatient] = useState<(Patient & { id: string }) | null>(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [noteText, setNoteText] = useState('');
  const [noteFile, setNoteFile] = useState<File | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDownloadingBrief, setIsDownloadingBrief] = useState(false);
  const [isDownloadingExpediente, setIsDownloadingExpediente] = useState(false);
  const [isDownloadingInforme, setIsDownloadingInforme] = useState(false);
  const [isDownloadingAltaBaja, setIsDownloadingAltaBaja] = useState(false);
  const [downloadingSessionId, setDownloadingSessionId] = useState<string | null>(null);
  const [therapists, setTherapists] = useState<string[]>([]);
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [showReingresoPrompt, setShowReingresoPrompt] = useState(false);
  const [showReingresoConfirm, setShowReingresoConfirm] = useState(false);
  const [isStartingEvaluacion, setIsStartingEvaluacion] = useState(false);
  const [editFormData, setEditFormData] = useState({
    paciente: '',
    edad: '',
    sexo: '',
    estado_civil: '',
    ocupacion: '',
    telefono: '',
    email: '',
    terapeuta: '',
    coterapeuta: '',
    frecuencia: '',
    tipo_ingreso: '',
    institucion_procedencia: '',
    estatus_en_registro: '',
  });
  const [isSavingPatientEdit, setIsSavingPatientEdit] = useState(false);

  const startEditingPatient = () => {
    const pt = patient as any;
    setEditFormData({
      paciente: pt?.paciente || '',
      edad: pt?.edad != null ? String(pt.edad) : '',
      sexo: pt?.sexo || '',
      estado_civil: pt?.estado_civil || '',
      ocupacion: pt?.ocupacion || '',
      telefono: pt?.telefono || '',
      email: pt?.email || '',
      terapeuta: pt?.terapeuta || '',
      coterapeuta: pt?.coterapeuta || '',
      frecuencia: pt?.frecuencia || '',
      tipo_ingreso: pt?.tipo_ingreso || '',
      institucion_procedencia: pt?.institucion_procedencia || '',
      estatus_en_registro: pt?.estatus_en_registro || '',
    });
    setIsEditingPatient(true);
  };

  const handleSavePatientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.paciente.trim()) return;
    const wasReingreso = (patient as any)?.estatus_en_registro === 'Reingreso';
    setIsSavingPatientEdit(true);
    try {
      const res = await fetch(`/api/patients?id=${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente: editFormData.paciente.trim(),
          edad: editFormData.edad ? Number(editFormData.edad) : undefined,
          sexo: editFormData.sexo || undefined,
          estado_civil: editFormData.estado_civil || undefined,
          ocupacion: editFormData.ocupacion || undefined,
          telefono: editFormData.telefono || undefined,
          email: editFormData.email || undefined,
          terapeuta: editFormData.terapeuta || undefined,
          coterapeuta: editFormData.coterapeuta || '',
          frecuencia: editFormData.frecuencia || undefined,
          tipo_ingreso: editFormData.tipo_ingreso || undefined,
          institucion_procedencia: editFormData.institucion_procedencia || undefined,
          estatus_en_registro: editFormData.estatus_en_registro || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        setIsEditingPatient(false);
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Paciente actualizado.', isError: false } })
        );
        // Just flipped to Reingreso (from anything else) — offer the two
        // follow-up steps from the Re-ingreso flow: update their info, then
        // redo the evaluation from scratch.
        if (!wasReingreso && editFormData.estatus_en_registro === 'Reingreso') {
          setShowReingresoPrompt(true);
        }
      } else {
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Error al actualizar el paciente', isError: true } })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al actualizar el paciente', isError: true } })
      );
    } finally {
      setIsSavingPatientEdit(false);
    }
  };

  // "Proceso de Evaluación" for a Re-ingreso: the patient is being treated as
  // starting over, so their previous diagnosis/plan/test results are cleared
  // rather than left to sit alongside whatever comes out of a fresh Sesión
  // 1/2/3 — contact info, therapist assignment, and history are untouched.
  // fecha_ingreso is bumped to today so reportes counts them as a new intake
  // again, matching how Re-ingreso is meant to read in the numbers. The
  // outgoing diagnosis is archived into dx_1era_vez (see lib/utils.ts
  // DxSnapshot) right before being cleared, so "Dx. 1ª vez" stays visible on
  // the ficha even after the fields below are wiped for the new admission.
  const handleStartEvaluacionProceso = async () => {
    setIsStartingEvaluacion(true);
    try {
      const p = patient as any;
      // Freeze the outgoing diagnosis before it's cleared below — but only on
      // the FIRST Re-ingreso. A second/third Re-ingreso would otherwise
      // overwrite the true original diagnosis with whatever the most recent
      // admission's turned out to be.
      const dxSnapshot =
        !p?.dx_1era_vez && (p?.dx_principal || p?.dx_comorbilidad || p?.dx_otros_problemas)
          ? serializeDxSnapshot({
              principal: p.dx_principal,
              principalCodigo: p.dx_principal_codigo,
              comorbilidad: p.dx_comorbilidad,
              comorbilidadCodigo: p.dx_comorbilidad_codigo,
              otrosProblemas: p.dx_otros_problemas,
              otrosProblemasCodigo: p.dx_otros_problemas_codigo,
              otrosAdicionales: parseDxAdicionales(p.dx_otros_adicionales),
            })
          : undefined;

      const res = await fetch(`/api/patients?id=${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_ingreso: new Date().toISOString().slice(0, 10),
          etapa_actual: 'Primer contacto',
          expediente_completo: false,
          num_sesiones: 0,
          num_inasistencias: 0,
          ...(dxSnapshot ? { dx_1era_vez: dxSnapshot } : {}),
          dx_principal: '',
          dx_principal_codigo: '',
          dx_comorbilidad: '',
          dx_comorbilidad_codigo: '',
          dx_otros_problemas: '',
          dx_otros_problemas_codigo: '',
          dx_otros_adicionales: '',
          plan_tratamiento: '',
          bateria_pruebas: '',
          // bateria_interpretaciones, psiquiatra_notas, psiquiatra_telefono,
          // and psiquiatra_email are deliberately left out here — Airtable
          // rejects the whole update if a field name doesn't exist as a real
          // column yet, and all four are newer than the pacientes_2025_2026
          // schema. Nothing to actually clear on a patient who's never had
          // that column anyway; add them back once the columns exist.
          observaciones_pruebas: '',
          historia_clinica: '',
          plan_no_suicidio: false,
          consentimiento_informado: false,
          referido_psiquiatria: false,
          psiquiatra_nombre: '',
          psiquiatra_contacto: '',
          psiquiatra_datos_pendientes: false,
        }),
      });
      if (res.ok) {
        router.push('/sesion/1');
      } else {
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Error al reiniciar el expediente', isError: true } })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al reiniciar el expediente', isError: true } })
      );
    } finally {
      setIsStartingEvaluacion(false);
      setShowReingresoConfirm(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !user) return;
    setIsAddingNote(true);
    try {
      // The file (if any) goes into the same general `documentos` bucket as
      // every other upload on this patient — Airtable attachment fields
      // can't be created ad hoc per-note — and the note just remembers
      // which attachment is its, resolved via the existing
      // documentos-serving route.
      let archivo: { id: string; filename: string } | undefined;
      if (noteFile) {
        const uploadRes = await uploadPatientDocument(patientId, noteFile);
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const uploaded = (uploadData.patient?.documentos || []).slice(-1)[0];
          if (uploaded) archivo = { id: uploaded.id, filename: uploaded.filename };
        } else {
          window.dispatchEvent(
            new CustomEvent('showToast', { detail: { message: 'No se pudo subir el archivo de la nota', isError: true } })
          );
        }
      }

      const existing = parseNotasGenerales((patient as any)?.notas_generales);
      const updated = [
        { fecha: new Date().toISOString(), autor: user.nombre, texto: noteText.trim(), ...(archivo ? { archivo } : {}) },
        ...existing,
      ];
      const res = await fetch(`/api/patients?id=${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas_generales: serializeNotasGenerales(updated) }),
      });
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        setNoteText('');
        setNoteFile(null);
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Nota agregada.', isError: false } })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Error al guardar la nota', isError: true } })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al guardar la nota', isError: true } })
      );
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDownloadBrief = async () => {
    if (!patient) return;
    setIsDownloadingBrief(true);
    try {
      const p = patient as any;
      const plan = parsePlanTratamiento(p.plan_tratamiento);
      const ultimaSesion = sessionHistory[0];
      const notas = parseNotasGenerales(p.notas_generales).slice(0, 3);

      const sections: PdfSectionData[] = [
        {
          title: 'Paciente',
          fields: [
            { label: 'Nombre', value: p.paciente, full: true },
            { label: 'Edad', value: p.edad ?? null },
            { label: 'Etapa', value: p.etapa_actual },
            { label: 'Terapeuta', value: p.terapeuta },
            { label: 'Coterapeuta', value: p.coterapeuta },
            { label: 'Sesiones', value: p.num_sesiones ?? null },
            { label: 'Inasistencias', value: p.num_inasistencias ?? null },
          ],
        },
        {
          title: 'Diagnóstico',
          fields: [
            { label: 'Dx Principal', value: p.dx_principal, full: true },
            { label: 'Código', value: p.dx_principal_codigo },
            { label: 'Dx Comorbilidad', value: p.dx_comorbilidad, full: true },
            { label: 'Código', value: p.dx_comorbilidad_codigo },
            { label: 'Otros problemas', value: p.dx_otros_problemas, full: true },
            { label: 'Código', value: p.dx_otros_problemas_codigo },
            ...parseDxAdicionales(p.dx_otros_adicionales).map((o, i) => ({
              label: `Otros ${i + 1}`,
              value: [o.nombre, o.codigo].filter(Boolean).join(' — '),
              full: true,
            })),
          ],
        },
        {
          title: 'Plan de tratamiento',
          fields: plan.map((row, i) => ({
            label: `Objetivo ${i + 1}`,
            value: [row.objetivo, row.tecnicas].filter(Boolean).join(' — '),
            full: true,
          })),
        },
        {
          title: 'Última sesión registrada',
          fields: [
            { label: 'Fecha', value: ultimaSesion ? formatDate(ultimaSesion.fecha) : null },
            { label: 'Notas', value: ultimaSesion?.notas_sesion, full: true },
          ],
        },
        {
          title: 'Notas recientes',
          fields: notas.map((n) => ({
            label: `${formatDateTime(n.fecha)} — ${n.autor}`,
            value: n.texto,
            full: true,
          })),
        },
        {
          title: 'Checkpoints',
          fields: [
            {
              label: 'Plan de No Suicidio',
              value: p.plan_no_suicidio ? (p.plan_no_suicidio_doc || []).slice(-1)[0]?.filename || 'Sí' : null,
            },
            {
              label: 'Consentimiento Informado',
              value: p.consentimiento_informado
                ? (p.consentimiento_informado_doc || []).slice(-1)[0]?.filename || 'Sí'
                : null,
            },
            {
              label: 'Psiquiatría',
              value: p.referido_psiquiatria
                ? p.psiquiatra_datos_pendientes
                  ? 'Referido — datos pendientes'
                  : p.psiquiatra_nombre || 'Referido'
                : null,
              full: true,
            },
          ],
        },
      ];

      await downloadPdf(
        <PdfDocument
          title={`Antes de la sesión — ${p.paciente}`}
          subtitle={new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
          sections={sections}
          generatedNote="Consulta · Resumen previo a sesión"
        />,
        `antes-de-la-sesion-${p.paciente || 'paciente'}`
      );
    } catch (error) {
      console.error('Error generating brief PDF:', error);
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al generar el PDF', isError: true } })
      );
    } finally {
      setIsDownloadingBrief(false);
    }
  };

  const handleDownloadSession = async (cita: any) => {
    if (!patient) return;
    setDownloadingSessionId(cita.id);
    try {
      const p = patient as any;
      const sections: PdfSectionData[] = [
        {
          title: 'Sesión',
          fields: [
            { label: 'Paciente', value: p.paciente, full: true },
            { label: 'Fecha', value: formatDateLong(cita.fecha) },
            { label: 'Hora', value: cita.hora },
            { label: 'Terapeuta', value: cita.terapeuta },
            { label: 'Estado', value: cita.estado },
            { label: 'Notas de la sesión', value: cita.notas_sesion, full: true },
          ],
        },
      ];

      await downloadPdf(
        <PdfDocument
          title={`Sesión — ${p.paciente}`}
          subtitle={formatDateLong(cita.fecha) ?? undefined}
          sections={sections}
          generatedNote="Consulta · Resumen de una sesión"
        />,
        `sesion-${formatDate(cita.fecha)}-${p.paciente || 'paciente'}`
      );
    } catch (error) {
      console.error('Error generating session PDF:', error);
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al generar el PDF', isError: true } })
      );
    } finally {
      setDownloadingSessionId(null);
    }
  };

  // The full expediente, unlike "Antes de la sesión" above (a short brief),
  // is meant to stand in for the whole paper file — every field captured
  // across Ficha de Registro and Sesión 1/2/3 — for transfers, insurance, or
  // supervision review. All of it already lives on this one Patient record
  // (the schema is patient-centric, not session-centric), so this is
  // assembly, not new data collection.
  const handleDownloadExpediente = async () => {
    if (!patient) return;
    setIsDownloadingExpediente(true);
    try {
      const p = patient as any;
      const plan = parsePlanTratamiento(p.plan_tratamiento);
      const motivos = parseMotivoConsulta(p.motivo_consulta);
      const bateria = parseBateriaPruebas(p.bateria_pruebas);
      const notas = parseNotasGenerales(p.notas_generales);
      const numeroExtInt =
        [p.numero_exterior, p.numero_interior].filter(Boolean).join(p.numero_interior ? ' int. ' : '') ||
        p.numero_ext_int;

      const sections: PdfSectionData[] = [
        {
          title: 'Datos del cliente',
          fields: [
            { label: 'Nombre', value: p.paciente, full: true },
            { label: 'Fecha de nacimiento', value: p.fecha_nacimiento ? formatDate(p.fecha_nacimiento) : null },
            { label: 'Edad', value: p.edad ?? null },
            { label: 'Sexo', value: p.sexo },
            { label: 'Estado civil', value: p.estado_civil },
            { label: 'Ocupación', value: p.ocupacion },
            { label: 'Teléfono', value: p.telefono },
            { label: 'Email', value: p.email },
            { label: 'Cómo se enteró', value: p.como_se_entero },
            { label: 'Terapeuta', value: p.terapeuta },
            { label: 'Coterapeuta', value: p.coterapeuta },
            { label: 'Fecha de ingreso', value: p.fecha_ingreso ? formatDate(p.fecha_ingreso) : null },
            { label: 'Etapa actual', value: p.etapa_actual },
          ],
        },
        {
          title: 'Domicilio',
          fields: [
            { label: 'Calle', value: p.calle },
            { label: 'Número', value: numeroExtInt },
            { label: 'Colonia', value: p.colonia },
            { label: 'Municipio', value: p.municipio },
            { label: 'Estado', value: p.estado_direccion },
            { label: 'País', value: p.pais },
          ],
        },
        {
          title: 'Contacto de emergencia',
          fields: [
            { label: 'Nombre', value: p.contacto_emergencia_nombre, full: true },
            { label: 'Relación', value: p.contacto_emergencia_relacion },
            { label: 'Teléfono', value: p.contacto_emergencia_telefono },
            { label: 'Email', value: p.contacto_emergencia_email },
          ],
        },
        {
          title: 'Motivo de consulta',
          fields: [
            { label: 'Motivos señalados', value: motivos.join(', '), full: true },
            { label: 'Motivo de la solicitud', value: p.motivo_solicitud, full: true },
            ...(p.profesional_nombre
              ? [
                  { label: 'Profesional que canalizó', value: p.profesional_nombre, full: true },
                  { label: 'Tipo de profesional', value: p.profesional_tipo },
                  { label: 'Teléfono del profesional', value: p.profesional_telefono },
                ]
              : []),
          ],
        },
        {
          title: 'Historia clínica (Sesión 1)',
          fields: [{ label: 'Notas de la entrevista', value: p.historia_clinica, full: true }],
        },
        {
          title: 'Pruebas aplicadas (Sesión 2)',
          fields: [
            { label: 'Batería', value: bateria.join(', '), full: true },
            { label: 'Observaciones', value: p.observaciones_pruebas, full: true },
          ],
        },
        {
          title: 'Diagnóstico (Sesión 3)',
          fields: [
            { label: 'Dx Principal', value: p.dx_principal, full: true },
            { label: 'Código', value: p.dx_principal_codigo },
            { label: 'Dx Comorbilidad', value: p.dx_comorbilidad, full: true },
            { label: 'Código', value: p.dx_comorbilidad_codigo },
            { label: 'Otros problemas', value: p.dx_otros_problemas, full: true },
            { label: 'Código', value: p.dx_otros_problemas_codigo },
            ...parseDxAdicionales(p.dx_otros_adicionales).map((o: any, i: number) => ({
              label: `Otros ${i + 1}`,
              value: [o.nombre, o.codigo].filter(Boolean).join(' — '),
              full: true,
            })),
          ],
        },
        {
          title: 'Plan de tratamiento',
          fields: plan.map((row, i) => ({
            label: `Objetivo ${i + 1}`,
            value: [row.objetivo, row.tecnicas].filter(Boolean).join(' — '),
            full: true,
          })),
        },
        {
          title: 'Checkpoints de cierre',
          fields: [
            {
              label: 'Plan de No Suicidio',
              value: p.plan_no_suicidio ? (p.plan_no_suicidio_doc || []).slice(-1)[0]?.filename || 'Sí' : null,
            },
            {
              label: 'Consentimiento Informado',
              value: p.consentimiento_informado
                ? (p.consentimiento_informado_doc || []).slice(-1)[0]?.filename || 'Sí'
                : null,
            },
            {
              label: 'Psiquiatría',
              value: p.referido_psiquiatria
                ? p.psiquiatra_datos_pendientes
                  ? 'Referido — datos pendientes'
                  : [p.psiquiatra_nombre, p.psiquiatra_telefono, p.psiquiatra_email, p.psiquiatra_contacto]
                      .filter(Boolean)
                      .join(' — ') || 'Referido'
                : 'No referido',
              full: true,
            },
          ],
        },
        {
          title: 'Historial de sesiones',
          fields: sessionHistory.map((c: any) => ({
            label: formatDate(c.fecha) || 'Sesión',
            value: c.notas_sesion,
            full: true,
          })),
        },
        {
          title: 'Notas generales',
          fields: notas.map((n) => ({
            label: `${formatDateTime(n.fecha)} — ${n.autor}`,
            value: n.texto,
            full: true,
          })),
        },
        {
          title: 'Documentos adjuntos',
          fields: (p.documentos || []).map((d: any) => ({ label: 'Archivo', value: d.filename, full: true })),
        },
      ];

      await downloadPdf(
        <PdfDocument
          title={`Expediente completo — ${p.paciente}`}
          subtitle={new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
          sections={sections}
          generatedNote="Consulta · Expediente completo del paciente"
        />,
        `expediente-${p.paciente || 'paciente'}`
      );
    } catch (error) {
      console.error('Error generating expediente PDF:', error);
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al generar el PDF', isError: true } })
      );
    } finally {
      setIsDownloadingExpediente(false);
    }
  };

  // Reporte de Alta/Baja — a closing-summary document for when a patient's
  // estatus_en_registro is ALTA (successful discharge) or BAJA (dropped
  // out), same generic PdfDocument the brief/expediente PDFs use since there
  // was no physical template to mirror exactly. Title/wording follow which
  // of the two statuses is current.
  const handleDownloadAltaBaja = async () => {
    if (!patient) return;
    setIsDownloadingAltaBaja(true);
    try {
      const p = patient as any;
      const esAlta = p.estatus_en_registro === 'ALTA';
      const notas = parseNotasGenerales(p.notas_generales);

      const sections: PdfSectionData[] = [
        {
          title: 'Paciente',
          fields: [
            { label: 'Nombre', value: p.paciente, full: true },
            { label: 'Edad', value: p.edad ?? null },
            { label: 'Terapeuta', value: p.terapeuta },
            { label: 'Coterapeuta', value: p.coterapeuta },
            { label: 'Fecha de ingreso', value: p.fecha_ingreso ? formatDate(p.fecha_ingreso) : null },
            { label: esAlta ? 'Fecha de alta' : 'Fecha de baja', value: p.fecha_baja ? formatDate(p.fecha_baja) : null },
            { label: 'Sesiones realizadas', value: p.num_sesiones ?? 0 },
            { label: 'Inasistencias', value: p.num_inasistencias ?? 0 },
          ],
        },
        {
          title: 'Diagnóstico',
          fields: [
            { label: 'Dx Principal', value: p.dx_principal, full: true },
            { label: 'Código', value: p.dx_principal_codigo },
            { label: 'Dx Comorbilidad', value: p.dx_comorbilidad, full: true },
            { label: 'Código', value: p.dx_comorbilidad_codigo },
            { label: 'Otros problemas', value: p.dx_otros_problemas, full: true },
            { label: 'Código', value: p.dx_otros_problemas_codigo },
          ],
        },
        {
          title: esAlta ? 'Resumen del tratamiento' : 'Última nota registrada',
          fields: esAlta
            ? [{ label: 'Notas más recientes', value: notas[0]?.texto, full: true }]
            : [{ label: 'Última nota', value: notas[0]?.texto, full: true }],
        },
      ];

      await downloadPdf(
        <PdfDocument
          title={`${esAlta ? 'Reporte de Alta' : 'Reporte de Baja'} — ${p.paciente}`}
          subtitle={new Date().toLocaleDateString('es-MX', { dateStyle: 'long' })}
          sections={sections}
          generatedNote={`Consulta · ${esAlta ? 'Reporte de alta' : 'Reporte de baja'} del paciente`}
        />,
        `${esAlta ? 'reporte-de-alta' : 'reporte-de-baja'}-${p.paciente || 'paciente'}`
      );
    } catch (error) {
      console.error('Error generating alta/baja PDF:', error);
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al generar el PDF', isError: true } })
      );
    } finally {
      setIsDownloadingAltaBaja(false);
    }
  };

  // The real "Informe de Resultados de Evaluación Psicológica" the clinic
  // hands to patients/insurers — matches the physical CPCCM letterhead
  // section-for-section (I-VIII). Everything it needs already lives on this
  // one Patient record (Sesión 1's historia, Sesión 2's pruebas +
  // factores/recursos, Sesión 3's diagnóstico + plan) — same assembly-not-
  // collection pattern as the expediente above.
  const handleDownloadInforme = async () => {
    if (!patient) return;
    setIsDownloadingInforme(true);
    try {
      const p = patient as any;
      const { InformeResultadosDocument } = await import('@/components/InformeResultadosDocument');
      await downloadPdf(
        <InformeResultadosDocument
          data={{
            nombre: p.paciente,
            // The date the clinical work was actually done, not whatever day
            // this PDF happens to get (re)downloaded — falls back to today
            // for patients who finished Sesión 3 before this field existed.
            // UTC-anchored like formatDate() above, to avoid the same
            // off-by-one-day shift a stored yyyy-mm-dd is prone to.
            fecha: p.fecha_informe_completado
              ? new Date(p.fecha_informe_completado).toLocaleDateString('es-MX', { dateStyle: 'long', timeZone: 'UTC' })
              : new Date().toLocaleDateString('es-MX', { dateStyle: 'long' }),
            edad: p.edad,
            sexo: p.sexo,
            estadoCivil: p.estado_civil,
            ocupacion: p.ocupacion,
            motivoConsulta: parseMotivoConsulta(p.motivo_consulta),
            historiaProblema: p.historia_clinica,
            factoresPredisponentes: p.factores_predisponentes,
            recursosPaciente: p.recursos_paciente,
            pruebas: parsePruebaInterpretaciones(p.bateria_interpretaciones),
            dxPrincipal: { nombre: p.dx_principal, codigo: p.dx_principal_codigo },
            dxComorbilidad: { nombre: p.dx_comorbilidad, codigo: p.dx_comorbilidad_codigo },
            dxOtros: { nombre: p.dx_otros_problemas, codigo: p.dx_otros_problemas_codigo },
            dxAdicionales: parseDxAdicionales(p.dx_otros_adicionales),
            planTratamiento: parsePlanTratamiento(p.plan_tratamiento),
          }}
        />,
        `informe-de-resultados-${p.paciente || 'paciente'}`
      );
    } catch (error) {
      console.error('Error generating informe PDF:', error);
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al generar el PDF', isError: true } })
      );
    } finally {
      setIsDownloadingInforme(false);
    }
  };

  const handleFileUpload = async (file: File, field: string = 'documentos') => {
    if (file.size > 15 * 1024 * 1024) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'El archivo supera el límite de 15MB', isError: true } })
      );
      return;
    }
    setIsUploading(true);
    try {
      const res = await uploadPatientDocument(patientId, file, field);
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Archivo subido correctamente.', isError: false } })
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
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = (attachmentId: string, field: string = 'documentos') => {
    const previousPatient = patient;
    const doc = ((patient as any)?.[field] || []).find((d: any) => d.id === attachmentId);
    setPatient((prev: any) => ({
      ...prev,
      [field]: (prev?.[field] || []).filter((d: any) => d.id !== attachmentId),
    }));

    deleteWithUndo({
      message: `Archivo "${doc?.filename || 'archivo'}" eliminado.`,
      restore: () => setPatient(previousPatient),
      performDelete: async () => {
        try {
          const res = await fetch(
            `/api/patients/${patientId}/documentos?attachmentId=${attachmentId}&field=${field}`,
            { method: 'DELETE' }
          );
          if (res.ok) {
            const data = await res.json();
            setPatient(data.patient);
          } else {
            setPatient(previousPatient);
            window.dispatchEvent(
              new CustomEvent('showToast', { detail: { message: 'Error al eliminar el archivo', isError: true } })
            );
          }
        } catch (error) {
          setPatient(previousPatient);
          window.dispatchEvent(
            new CustomEvent('showToast', { detail: { message: 'Error al eliminar el archivo', isError: true } })
          );
        }
      },
    });
  };

  useEffect(() => {
    if (!patientId) return;

    const fetchPatient = async () => {
      try {
        const res = await fetch(`/api/patients/${patientId}`);
        if (res.ok) {
          const data = await res.json();
          setPatient(data.patient);
        } else if (res.status === 403) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error fetching patient:', error);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    const fetchSessionHistory = async () => {
      try {
        const res = await fetch('/api/citas');
        if (res.ok) {
          const data = await res.json();
          const completed = (data.citas || [])
            .filter((c: any) => (c.paciente || []).includes(patientId) && c.estado === 'Completada')
            .sort((a: any, b: any) => (b.fecha || '').localeCompare(a.fecha || ''));
          setSessionHistory(completed);
        }
      } catch (error) {
        console.error('Error fetching session history:', error);
      }
    };

    const fetchTherapists = async () => {
      try {
        const res = await fetch('/api/therapists');
        if (res.ok) {
          const data = await res.json();
          setTherapists(data.therapists || []);
        }
      } catch (error) {
        console.error('Error fetching therapists:', error);
      }
    };

    if (user) {
      fetchPatient();
      fetchSessionHistory();
      fetchTherapists();
    }
  }, [user, patientId, router]);

  if (isLoading || isLoadingPatient) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-bg">
        {user && <Navigation user={user} />}
        <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-3xl">
          <div className="mb-8 flex items-start gap-5">
            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
          <Skeleton className="h-48 rounded-lg mb-6" />
          <Skeleton className="h-40 rounded-lg" />
        </main>
      </div>
    );
  }
  if (!user) return null;
  if (!patient) return null;

  const p = patient as any;
  const canSeeAll = hasFullAccess(user.rol);

  const registroFields = [
    { label: 'Edad', value: p.edad ?? null },
    { label: 'Sexo', value: p.sexo },
    { label: 'Terapeuta', value: p.terapeuta },
    { label: 'Coterapeuta', value: p.coterapeuta },
    { label: 'Frecuencia', value: p.frecuencia },
    { label: 'Tipo de ingreso', value: p.tipo_ingreso },
    { label: 'Institución de procedencia', value: p.institucion_procedencia },
    { label: 'Fecha de ingreso', value: formatDate(p.fecha_ingreso) },
    ...(p.estatus_en_registro === 'BAJA'
      ? [{ label: 'Fecha de baja', value: formatDate(p.fecha_baja) }]
      : []),
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-3xl">
        <div className="flex items-center justify-between mb-1 print:hidden flex-wrap gap-2">
          <BackButton onClick={() => router.push('/pacientes')} />
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={startEditingPatient}>
              ✏️ Editar
            </Button>
            {canSeeAll && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadBrief}
                  disabled={isDownloadingBrief}
                  isLoading={isDownloadingBrief}
                >
                  📄 Antes de la sesión (PDF)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadExpediente}
                  disabled={isDownloadingExpediente}
                  isLoading={isDownloadingExpediente}
                >
                  📁 Expediente completo (PDF)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadInforme}
                  disabled={isDownloadingInforme}
                  isLoading={isDownloadingInforme}
                >
                  🧾 Informe de Resultados (PDF)
                </Button>
                {(p.estatus_en_registro === 'ALTA' || p.estatus_en_registro === 'BAJA') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownloadAltaBaja}
                    disabled={isDownloadingAltaBaja}
                    isLoading={isDownloadingAltaBaja}
                  >
                    {p.estatus_en_registro === 'ALTA' ? '📗 Reporte de Alta (PDF)' : '📕 Reporte de Baja (PDF)'}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-start gap-5 animate-fade-in-up">
          <div className="w-16 h-16 rounded-full bg-sage-pale text-sage-deep flex items-center justify-center text-xl font-mono font-medium shrink-0 animate-scale-in">
            {initials(p.paciente)}
          </div>
          <div className="flex-1">
            <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">
              Ficha de paciente
            </div>
            <h1 className="font-serif text-4xl font-medium mb-3">{p.paciente}</h1>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-mono transition-transform duration-150 hover:scale-105 ${
                  estadoBadge[p.estatus_en_registro] || 'bg-gray-200 text-ink-soft'
                }`}
              >
                {estadoLabel[p.estatus_en_registro] || 'Sin estado'}
              </span>
              {p.etapa_actual && (
                <span className="inline-block px-3 py-1 rounded-full text-xs font-mono bg-clay-pale text-clay transition-transform duration-150 hover:scale-105">
                  {p.etapa_actual}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <div className="bg-panel border border-line rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="text-xs text-ink-soft uppercase tracking-wider mb-1">Sesiones</div>
            <div className="font-serif text-2xl font-medium">{p.num_sesiones || 0}</div>
          </div>
          <div className="bg-panel border border-line rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="text-xs text-ink-soft uppercase tracking-wider mb-1">Inasistencias</div>
            <div className="font-serif text-2xl font-medium">{p.num_inasistencias || 0}</div>
          </div>
        </div>

        {/* Cronología de tratamiento — a session-number timeline rather than
            the old flat reverse-chron list, so progress through treatment
            reads at a glance. Runs oldest-to-newest (session 1 at top) since
            that's how a chronology is actually read; the PDF export below
            keeps sessionHistory's own newest-first order untouched. */}
        {sessionHistory.length > 0 && (() => {
          const orderedHistory = [...sessionHistory].reverse();
          // Reingreso does a full clinical reset but never touches past
          // citas, so old sessions were already showing here — they just
          // blended into the new ones with nothing marking the restart.
          // fecha_ingreso gets re-stamped to "today" on every reingreso, so
          // it doubles as the boundary: any session on/after it belongs to
          // the current admission.
          const fechaIngreso = p.fecha_ingreso ? String(p.fecha_ingreso).slice(0, 10) : null;
          const reingresoIndex = fechaIngreso
            ? orderedHistory.findIndex((c: any) => String(c.fecha || '').slice(0, 10) >= fechaIngreso)
            : -1;
          const showReingresoDivider = reingresoIndex > 0 && reingresoIndex < orderedHistory.length;

          return (
          <div
            className="bg-panel border border-line rounded-lg p-8 mb-6 animate-fade-in-up"
            style={{ animationDelay: '90ms' }}
          >
            <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-6">
              Cronología de tratamiento
            </div>
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-px bg-line" aria-hidden="true" />
              <div className="space-y-5">
                {orderedHistory.map((c, i) => (
                  <div key={c.id}>
                    {showReingresoDivider && i === reingresoIndex && (
                      <div className="relative flex items-center gap-3 mb-5 pl-11">
                        <span className="text-[11px] font-mono uppercase tracking-widest text-clay bg-clay-pale px-2.5 py-1 rounded-full shrink-0">
                          Reingreso · {formatDate(p.fecha_ingreso)}
                        </span>
                        <div className="h-px bg-clay-pale flex-1" />
                      </div>
                    )}
                    <div
                      className="relative flex gap-4 animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(i, 20) * 40}ms` }}
                    >
                    <div className="relative z-10 shrink-0 w-8 h-8 rounded-full bg-sage-deep text-white text-xs font-mono font-medium flex items-center justify-center transition-transform duration-150 hover:scale-110">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-1 pb-0.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono text-ink-soft">
                          {formatDate(c.fecha)}
                          {c.terapeuta && <span className="text-ink-soft/70"> · {c.terapeuta}</span>}
                          {p.coterapeuta && <span className="text-ink-soft/70"> · co: {p.coterapeuta}</span>}
                        </span>
                        {canSeeAll && (
                          <button
                            onClick={() => handleDownloadSession(c)}
                            disabled={downloadingSessionId === c.id}
                            className="text-xs font-medium text-sage-deep hover:underline underline-offset-2 shrink-0 disabled:opacity-50 print:hidden"
                          >
                            {downloadingSessionId === c.id ? 'Generando…' : '🖨️ Imprimir'}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-ink-soft">
                        {c.notas_sesion || <span className="italic text-ink-soft/60">Sin notas</span>}
                      </div>
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          );
        })()}

        {/* Notas generales */}
        <div
          className="bg-panel border border-line rounded-lg p-8 mb-6 animate-fade-in-up"
          style={{ animationDelay: '105ms' }}
        >
          <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-5">
            Notas
          </div>
          <div className="flex flex-col gap-3 mb-6">
            <Textarea
              placeholder="Agregar una nota sobre este paciente (una llamada, un comentario, un recordatorio)…"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddNote}
                disabled={!noteText.trim() || isAddingNote}
                isLoading={isAddingNote}
              >
                Agregar nota
              </Button>
              <label className="text-xs text-ink-soft hover:text-sage-deep transition-colors duration-150 cursor-pointer underline decoration-dotted underline-offset-2">
                {noteFile ? `📎 ${noteFile.name} — cambiar` : '📎 Adjuntar archivo (opcional)'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setNoteFile(e.target.files?.[0] || null)}
                />
              </label>
              {noteFile && (
                <button
                  type="button"
                  onClick={() => setNoteFile(null)}
                  className="text-xs text-ink-soft hover:text-red transition-colors duration-150"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
          {(() => {
            const notas = parseNotasGenerales(p.notas_generales);
            if (notas.length === 0) {
              return <p className="text-sm text-ink-soft italic">Sin notas aún.</p>;
            }
            return (
              <div className="space-y-4">
                {notas.map((n: any, i: number) => (
                  <div key={i} className="flex gap-4 pb-4 border-b border-line last:border-0 last:pb-0">
                    <div className="text-xs font-mono text-ink-soft shrink-0 w-32 pt-0.5">
                      {formatDateTime(n.fecha)}
                    </div>
                    <div className="text-sm text-ink flex-1">
                      <div className="text-xs text-ink-soft mb-1">{n.autor}</div>
                      {n.texto}
                      {n.archivo && (
                        <div className="mt-1">
                          <a
                            href={`/api/patients/${patientId}/documentos/${n.archivo.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sage-deep hover:underline underline-offset-2"
                          >
                            📎 {n.archivo.filename}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Datos del registro */}
        <div className="bg-panel border border-line rounded-lg p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-5">
            Datos del registro
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
            {registroFields.map((f) => (
              <div key={f.label}>
                <label className="text-xs text-ink-soft uppercase tracking-wider">{f.label}</label>
                <div className="text-sm mt-1 text-ink">{f.value || <span className="text-ink-soft italic">Sin capturar</span>}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnósticos */}
        <div className="bg-panel border border-line rounded-lg p-8 mb-6 animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-5">
            Diagnóstico
          </div>
          {(() => {
            const snapshot = parseDxSnapshot(p.dx_1era_vez);
            if (!snapshot) return null;
            return (
              <div className="mb-6 p-4 rounded-lg bg-clay-pale/40 border border-clay-pale">
                <div className="text-[11px] font-mono uppercase tracking-widest text-clay mb-3">
                  Dx. 1ª vez (antes del reingreso)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-ink-soft uppercase tracking-wider">Dx Principal</label>
                    <div className="text-sm mt-1 text-ink-soft">
                      {snapshot.principal || 'Sin capturar'}
                      {snapshot.principalCodigo && (
                        <span className="text-xs font-mono text-clay ml-2">({snapshot.principalCodigo})</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-ink-soft uppercase tracking-wider">Dx Comorbilidad</label>
                    <div className="text-sm mt-1 text-ink-soft">
                      {snapshot.comorbilidad || 'Sin capturar'}
                      {snapshot.comorbilidadCodigo && (
                        <span className="text-xs font-mono text-clay ml-2">({snapshot.comorbilidadCodigo})</span>
                      )}
                    </div>
                  </div>
                </div>
                {snapshot.otrosProblemas && (
                  <div className="mt-3">
                    <label className="text-xs text-ink-soft uppercase tracking-wider">Otros Problemas</label>
                    <div className="text-sm mt-1 text-ink-soft">
                      {snapshot.otrosProblemas}
                      {snapshot.otrosProblemasCodigo && (
                        <span className="text-xs font-mono text-clay ml-2">({snapshot.otrosProblemasCodigo})</span>
                      )}
                    </div>
                  </div>
                )}
                {(snapshot.otrosAdicionales || []).length > 0 && (
                  <div className="mt-3">
                    <label className="text-xs text-ink-soft uppercase tracking-wider">Otros</label>
                    <div className="text-sm mt-1 text-ink-soft space-y-1">
                      {(snapshot.otrosAdicionales || []).map((o, i) => (
                        <div key={i}>
                          {o.nombre}
                          {o.codigo && <span className="text-xs font-mono text-clay ml-2">({o.codigo})</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          {p.dx_1era_vez && (
            <div className="text-[11px] font-mono uppercase tracking-widest text-sage-deep mb-3">
              Dx. 2ª vez (actual)
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-xs text-ink-soft uppercase tracking-wider">Dx Principal</label>
              <div className="text-sm mt-2 text-ink-soft">{p.dx_principal || p.comorbilidad || p.diagnostico || 'Sin capturar'}</div>
            </div>
            <div>
              <label className="text-xs text-ink-soft uppercase tracking-wider">Dx Comorbilidad</label>
              <div className="text-sm mt-2 text-ink-soft">{p.dx_comorbilidad || 'Sin capturar'}</div>
            </div>
          </div>
          <div className="mb-6">
            <label className="text-xs text-ink-soft uppercase tracking-wider">Dx Otros Problemas</label>
            <div className="text-sm mt-2 text-ink-soft">
              {p.dx_otros_problemas || 'Sin capturar'}
              {p.dx_otros_problemas_codigo && (
                <span className="text-xs font-mono text-sage-deep ml-2">({p.dx_otros_problemas_codigo})</span>
              )}
            </div>
          </div>
          {(() => {
            const otros = parseDxAdicionales(p.dx_otros_adicionales);
            if (otros.length === 0) return null;
            return (
              <div>
                <label className="text-xs text-ink-soft uppercase tracking-wider">Otros</label>
                <div className="text-sm mt-2 text-ink-soft space-y-1">
                  {otros.map((o, i) => (
                    <div key={i}>
                      {o.nombre}
                      {o.codigo && <span className="text-xs font-mono text-sage-deep ml-2">({o.codigo})</span>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Documents */}
        <div className="bg-panel border border-line rounded-lg p-8 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-4">
            Documentos y Checkpoints
          </div>
          <div className="flex flex-wrap gap-2">
            {(() => {
              // Airtable's upload endpoint appends rather than replaces, so
              // "subir otro" on Sesión 3 leaves earlier uploads in the same
              // array — the last entry is the current one. These two were
              // previously plain badges with no way to actually open the
              // file back up once uploaded; now they link straight to it
              // via the same auth-checked document route "Archivos
              // adjuntos" below uses.
              const planFile = (p.plan_no_suicidio_doc || []).slice(-1)[0];
              const consentFile = (p.consentimiento_informado_doc || []).slice(-1)[0];
              return (
                <>
                  {planFile && (
                    <a
                      href={`/api/patients/${patientId}/documentos/${planFile.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-pale text-red text-xs font-mono px-3 py-1 rounded-full transition-transform duration-150 hover:scale-105 hover:underline"
                      title={planFile.filename}
                    >
                      📄 Plan de No Suicidio
                    </a>
                  )}
                  {consentFile && (
                    <a
                      href={`/api/patients/${patientId}/documentos/${consentFile.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-pale text-red text-xs font-mono px-3 py-1 rounded-full transition-transform duration-150 hover:scale-105 hover:underline"
                      title={consentFile.filename}
                    >
                      📄 Consentimiento Informado
                    </a>
                  )}
                </>
              );
            })()}
            {p.historia_clinica && (
              <span className="bg-sage-pale text-sage-deep text-xs font-mono px-3 py-1 rounded-full transition-transform duration-150 hover:scale-105">
                Historia Clínica
              </span>
            )}
            {p.plan_tratamiento && (
              <span className="bg-sage-pale text-sage-deep text-xs font-mono px-3 py-1 rounded-full transition-transform duration-150 hover:scale-105">
                Plan de Tx
              </span>
            )}
            {p.bateria_pruebas && (
              <span className="bg-sage-pale text-sage-deep text-xs font-mono px-3 py-1 rounded-full transition-transform duration-150 hover:scale-105">
                Batería Pruebas
              </span>
            )}
            {!p.plan_no_suicidio &&
              !p.consentimiento_informado &&
              !p.historia_clinica &&
              !p.plan_tratamiento &&
              !p.bateria_pruebas && (
                <span className="text-sm text-ink-soft italic">Aún no hay documentos capturados.</span>
              )}
          </div>
        </div>

        <PsychTestResultsSection items={parsePruebaInterpretaciones(p.bateria_interpretaciones)} patientId={patientId} />

        {/* File attachments */}
        {[
          { field: 'documentos_datos_personales', label: 'Datos personales' },
          { field: 'documentos_trabajo', label: 'Trabajo' },
          { field: 'documentos_sesiones', label: 'Archivos de sesión' },
          { field: 'documentos_altas_bajas', label: 'Reportes de alta / baja' },
          // Legacy/general bucket — anything uploaded before the sections
          // above existed lives here and stays visible, it just doesn't get
          // new uploads anymore.
          { field: 'documentos', label: 'General' },
        ].map(({ field, label }, idx) => {
          const docs = (p as any)[field] || [];
          return (
            <div
              key={field}
              className="bg-panel border border-line rounded-lg p-8 mt-6 animate-fade-in-up"
              style={{ animationDelay: `${280 + idx * 20}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-mono text-sage-deep uppercase tracking-widest">{label}</div>
                <label
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border border-line text-ink-soft transition-all duration-150 cursor-pointer hover:border-sage hover:text-sage-deep hover:bg-sage-pale/40 ${
                    isUploading ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {isUploading ? 'Subiendo…' : '+ Subir archivo'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, field);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {docs.length > 0 ? (
                <div className="space-y-2">
                  {docs.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line transition-colors duration-150 hover:bg-sage-pale/20"
                    >
                      <a
                        href={`/api/patients/${patientId}/documentos/${doc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <span className="text-xl shrink-0">{fileIcon(doc.type)}</span>
                        <div className="min-w-0">
                          <div className="text-sm text-ink truncate hover:text-sage-deep transition-colors">
                            {doc.filename}
                          </div>
                          <div className="text-xs text-ink-soft">{formatBytes(doc.size)}</div>
                        </div>
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, field)}
                        className="text-xs text-ink-soft hover:text-red transition-colors duration-150 shrink-0 px-2 py-1"
                        aria-label={`Eliminar ${doc.filename}`}
                      >
                        Eliminar
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-soft italic">Sin archivos en esta sección.</p>
              )}
            </div>
          );
        })}
      </main>

      {isEditingPatient && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsEditingPatient(false)}
        >
          <form
            onSubmit={handleSavePatientEdit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-patient-title"
            className="bg-panel border border-line rounded-2xl shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col animate-scale-in overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-8 pt-7 pb-6 border-b border-line shrink-0">
              <div>
                <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-1">
                  Ficha de paciente
                </div>
                <h3 id="edit-patient-title" className="font-serif text-2xl font-medium">
                  Editar a {(patient as any)?.paciente || 'paciente'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingPatient(false)}
                aria-label="Cerrar"
                className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-ink-soft hover:text-ink hover:bg-sage-pale/50 transition-colors duration-150 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto px-8 py-6 space-y-8">
              <div className="space-y-4">
                <h4 className="text-xs font-mono text-sage-deep uppercase tracking-widest">Datos personales</h4>

                <Input
                  label="Nombre"
                  value={editFormData.paciente}
                  onChange={(e) => setEditFormData({ ...editFormData, paciente: e.target.value })}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Edad"
                    type="number"
                    min={0}
                    value={editFormData.edad}
                    onChange={(e) => setEditFormData({ ...editFormData, edad: e.target.value })}
                  />
                  <Select
                    label="Sexo"
                    options={SEXO_OPTIONS}
                    value={editFormData.sexo}
                    onChange={(e) => setEditFormData({ ...editFormData, sexo: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Estado Civil"
                    options={ESTADO_CIVIL_OPTIONS.map((o) => ({ value: o, label: o }))}
                    value={editFormData.estado_civil}
                    onChange={(e) => setEditFormData({ ...editFormData, estado_civil: e.target.value })}
                  />
                  <Input
                    label="Profesión/ocupación"
                    value={editFormData.ocupacion}
                    onChange={(e) => setEditFormData({ ...editFormData, ocupacion: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Correo electrónico"
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                  <Input
                    label="Número de teléfono"
                    type="tel"
                    value={editFormData.telefono}
                    onChange={(e) => setEditFormData({ ...editFormData, telefono: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-line pt-6">
                <h4 className="text-xs font-mono text-sage-deep uppercase tracking-widest">Datos clínicos</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Terapeuta"
                    placeholder="Sin asignar"
                    options={therapists.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                    value={editFormData.terapeuta}
                    onChange={(e) => setEditFormData({ ...editFormData, terapeuta: e.target.value })}
                  />
                  <Select
                    label="Coterapeuta (opcional)"
                    placeholder="Ninguno"
                    options={therapists
                      .filter((t) => t !== editFormData.terapeuta)
                      .map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
                    value={editFormData.coterapeuta}
                    onChange={(e) => setEditFormData({ ...editFormData, coterapeuta: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Frecuencia"
                    value={editFormData.frecuencia}
                    onChange={(e) => setEditFormData({ ...editFormData, frecuencia: e.target.value })}
                  />
                  <Input
                    label="Tipo de ingreso"
                    value={editFormData.tipo_ingreso}
                    onChange={(e) => setEditFormData({ ...editFormData, tipo_ingreso: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Institución de procedencia"
                    value={editFormData.institucion_procedencia}
                    onChange={(e) => setEditFormData({ ...editFormData, institucion_procedencia: e.target.value })}
                  />
                  <Select
                    label="Estatus en registro"
                    options={ESTATUS_EN_REGISTRO_OPTIONS.map((o) => ({ value: o, label: estadoLabel[o] || o }))}
                    value={editFormData.estatus_en_registro}
                    onChange={(e) => setEditFormData({ ...editFormData, estatus_en_registro: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 justify-end px-8 py-5 border-t border-line bg-gray-50 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingPatient(false)}
                disabled={isSavingPatientEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingPatientEdit} disabled={isSavingPatientEdit}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </div>
      )}

      {showReingresoPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowReingresoPrompt(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-panel border border-line rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-serif text-xl font-medium mb-1">Paciente marcado como Reingreso</h3>
              <p className="text-sm text-ink-soft">
                {(patient as any)?.paciente} vuelve a la consulta. ¿Qué quieres hacer ahora?
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowReingresoPrompt(false);
                  startEditingPatient();
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-line hover:bg-sage-pale/30 hover:border-sage transition-colors duration-150"
              >
                <div className="text-sm font-medium text-ink">Actualizar datos</div>
                <div className="text-xs text-ink-soft">Revisar teléfono, terapeuta, dirección, etc.</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReingresoPrompt(false);
                  setShowReingresoConfirm(true);
                }}
                className="w-full text-left px-4 py-3 rounded-lg border border-line hover:bg-sage-pale/30 hover:border-sage transition-colors duration-150"
              >
                <div className="text-sm font-medium text-ink">Comenzar proceso de evaluación</div>
                <div className="text-xs text-ink-soft">Reinicia el expediente clínico y empieza Sesión 1 de nuevo.</div>
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowReingresoPrompt(false)}>
                Ahora no
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showReingresoConfirm}
        title="Reiniciar expediente clínico"
        message={`Esto borrará el diagnóstico, plan de tratamiento, pruebas aplicadas y demás datos clínicos anteriores de ${
          (patient as any)?.paciente || 'este paciente'
        } para empezar la evaluación desde cero. Su información de contacto y terapeuta asignado no se tocan. Esta acción no se puede deshacer.`}
        confirmLabel="Sí, reiniciar y continuar"
        danger
        isLoading={isStartingEvaluacion}
        onConfirm={handleStartEvaluacionProceso}
        onCancel={() => setShowReingresoConfirm(false)}
      />

      <Toast />
    </div>
  );
}

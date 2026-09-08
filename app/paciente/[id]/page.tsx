'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { BackButton } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { Patient } from '@/lib/types';
import { Skeleton } from '@/components/Skeleton';
import { Textarea } from '@/components/FormInputs';
import { Button } from '@/components/Button';
import {
  fileToBase64,
  parseNotasGenerales,
  serializeNotasGenerales,
  parsePlanTratamiento,
  parseDxAdicionales,
  parseMotivoConsulta,
  parseBateriaPruebas,
  downloadPdf,
} from '@/lib/utils';
import { PdfDocument, PdfSectionData } from '@/components/PdfDocument';

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
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isDownloadingBrief, setIsDownloadingBrief] = useState(false);
  const [isDownloadingExpediente, setIsDownloadingExpediente] = useState(false);

  const handleAddNote = async () => {
    if (!noteText.trim() || !user) return;
    setIsAddingNote(true);
    try {
      const existing = parseNotasGenerales((patient as any)?.notas_generales);
      const updated = [{ fecha: new Date().toISOString(), autor: user.nombre, texto: noteText.trim() }, ...existing];
      const res = await fetch(`/api/patients?id=${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas_generales: serializeNotasGenerales(updated) }),
      });
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        setNoteText('');
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
                  : [p.psiquiatra_nombre, p.psiquiatra_contacto].filter(Boolean).join(' — ') || 'Referido'
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

  const handleFileUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'El archivo supera el límite de 15MB', isError: true } })
      );
      return;
    }
    setIsUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch(`/api/patients/${patientId}/documentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream', base64 }),
      });
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

  const handleDeleteDocument = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/patients/${patientId}/documentos?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setPatient(data.patient);
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Archivo eliminado.', isError: false } })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'Error al eliminar el archivo', isError: true } })
      );
    }
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

    if (user) {
      fetchPatient();
      fetchSessionHistory();
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
          <div className="flex items-center gap-2">
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

        {/* Historial de sesiones */}
        {sessionHistory.length > 0 && (
          <div
            className="bg-panel border border-line rounded-lg p-8 mb-6 animate-fade-in-up"
            style={{ animationDelay: '90ms' }}
          >
            <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-5">
              Historial de sesiones
            </div>
            <div className="space-y-4">
              {sessionHistory.map((c) => (
                <div key={c.id} className="flex gap-4 pb-4 border-b border-line last:border-0 last:pb-0">
                  <div className="text-xs font-mono text-ink-soft shrink-0 w-24 pt-0.5">
                    {formatDate(c.fecha)}
                  </div>
                  <div className="text-sm text-ink-soft flex-1">
                    {c.notas_sesion || <span className="italic text-ink-soft/60">Sin notas</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddNote}
                disabled={!noteText.trim() || isAddingNote}
                isLoading={isAddingNote}
              >
                Agregar nota
              </Button>
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

        {/* File attachments */}
        <div
          className="bg-panel border border-line rounded-lg p-8 mt-6 animate-fade-in-up"
          style={{ animationDelay: '280ms' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-mono text-sage-deep uppercase tracking-widest">Archivos adjuntos</div>
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
                  if (file) handleFileUpload(file);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          {p.documentos && p.documentos.length > 0 ? (
            <div className="space-y-2">
              {p.documentos.map((doc: any) => (
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
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="text-xs text-ink-soft hover:text-red transition-colors duration-150 shrink-0 px-2 py-1"
                    aria-label={`Eliminar ${doc.filename}`}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft italic">
              Sin archivos. Sube consentimientos firmados, resultados de pruebas u otros documentos.
            </p>
          )}
        </div>
      </main>

      <Toast />
    </div>
  );
}

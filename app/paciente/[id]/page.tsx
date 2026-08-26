'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { BackButton } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { Patient } from '@/lib/types';
import { Skeleton } from '@/components/Skeleton';

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
        <BackButton onClick={() => router.push('/pacientes')} />

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
          <div>
            <label className="text-xs text-ink-soft uppercase tracking-wider">Dx Otros Problemas</label>
            <div className="text-sm mt-2 text-ink-soft">{p.dx_otros_problemas || 'Sin capturar'}</div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-panel border border-line rounded-lg p-8 animate-fade-in-up" style={{ animationDelay: '240ms' }}>
          <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-4">
            Documentos y Checkpoints
          </div>
          <div className="flex flex-wrap gap-2">
            {p.plan_no_suicidio && (
              <span className="bg-red-pale text-red text-xs font-mono px-3 py-1 rounded-full transition-transform duration-150 hover:scale-105">
                Plan de No Suicidio
              </span>
            )}
            {p.consentimiento_informado && (
              <span className="bg-red-pale text-red text-xs font-mono px-3 py-1 rounded-full transition-transform duration-150 hover:scale-105">
                Consentimiento Informado
              </span>
            )}
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
                    href={doc.url}
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

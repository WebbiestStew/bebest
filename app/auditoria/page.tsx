'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { BackButton } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { hasAdminAccess } from '@/lib/roles';
import { Skeleton } from '@/components/Skeleton';
import { formatDateTime } from '@/lib/utils';

// The audit_log table has no separate "resource type" column — every entry
// is just {usuario, accion, paciente_id, paciente_nombre, timestamp}, with
// `accion` doubling as both category and detail via an optional
// "prefijo:detalle" convention (e.g. "descargar_documento:contrato.pdf").
// This maps each known prefix to a label/badge; paciente_id/paciente_nombre
// are reused loosely as "the record this was about" even for non-patient
// actions (a created/deleted user, a deleted cita).
const ACCION_META: Record<string, { label: string; badge: string }> = {
  ver_paciente: { label: 'Vio la ficha', badge: 'bg-gray-100 text-ink-soft' },
  descargar_documento: { label: 'Descargó', badge: 'bg-gray-100 text-ink-soft' },
  editado_paciente: { label: 'Editó paciente', badge: 'bg-blue/10 text-blue' },
  eliminado_documento: { label: 'Eliminó documento', badge: 'bg-red-pale text-red' },
  cita_eliminada: { label: 'Eliminó cita', badge: 'bg-red-pale text-red' },
  usuario_creado: { label: 'Creó usuario', badge: 'bg-sage-pale text-sage-deep' },
  usuario_eliminado: { label: 'Eliminó usuario', badge: 'bg-red-pale text-red' },
};

const CATEGORY_LABEL: Record<string, string> = {
  todos: 'Todos',
  cambios: 'Cambios (editar/crear/eliminar)',
  accesos: 'Accesos (ver/descargar)',
};

function parseAccion(accion: string) {
  const idx = accion.indexOf(':');
  const prefix = idx === -1 ? accion : accion.slice(0, idx);
  const detalle = idx === -1 ? '' : accion.slice(idx + 1);
  const meta = ACCION_META[prefix] || { label: prefix, badge: 'bg-gray-100 text-ink-soft' };
  const isAccess = prefix === 'ver_paciente' || prefix === 'descargar_documento';
  return { ...meta, detalle, isAccess };
}

export default function AuditoriaPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [category, setCategory] = useState<'todos' | 'cambios' | 'accesos'>('cambios');

  useEffect(() => {
    if (!user) return;
    if (!hasAdminAccess(user.rol)) {
      router.push('/');
      return;
    }

    const fetchEntries = async () => {
      try {
        const res = await fetch('/api/audit');
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries || []);
        }
      } catch (error) {
        console.error('Error fetching audit log:', error);
      } finally {
        setIsLoadingEntries(false);
      }
    };

    fetchEntries();
  }, [user, router]);

  const parsed = useMemo(() => entries.map((e) => ({ ...e, ...parseAccion(e.accion || '') })), [entries]);
  const filtered = parsed.filter((e) => {
    if (category === 'todos') return true;
    if (category === 'accesos') return e.isAccess;
    return !e.isAccess;
  });

  if (isLoading || isLoadingEntries) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-bg">
        {user && <Navigation user={user} />}
        <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-3xl">
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-9 w-96 mb-3" />
          <Skeleton className="h-4 w-72 mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        </main>
      </div>
    );
  }
  if (!user || !hasAdminAccess(user.rol)) return null;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-4xl">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">
            Solo administradores
          </div>
          <h1 className="font-serif text-4xl font-medium mb-2">Historial de cambios</h1>
          <p className="text-ink-soft text-base">
            Quién editó, creó, eliminó, vio o descargó qué y cuándo.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-4 flex-wrap animate-fade-in-up" style={{ animationDelay: '40ms' }}>
          {(['cambios', 'accesos', 'todos'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors duration-150 ${
                category === c ? 'bg-sage-deep text-white' : 'bg-panel border border-line text-ink-soft hover:bg-sage-pale/40'
              }`}
            >
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-panel border-2 border-dashed border-line rounded-lg p-10 text-center text-ink-soft animate-fade-in-up">
            Sin registros todavía.
          </div>
        ) : (
          <div
            className="bg-panel border border-line rounded-lg overflow-hidden animate-fade-in-up"
            style={{ animationDelay: '80ms' }}
          >
            <div className="divide-y divide-line">
              {filtered.slice(0, 200).map((e) => (
                <div key={e.id} className="p-4 flex items-start gap-4">
                  <div className="text-xs font-mono text-ink-soft shrink-0 w-36 pt-0.5">
                    {e.timestamp ? formatDateTime(e.timestamp) : ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-ink">{e.usuario || 'Alguien'}</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono ${e.badge}`}>
                        {e.label}
                      </span>
                      {e.paciente_nombre && <span className="text-xs text-ink-soft">· {e.paciente_nombre}</span>}
                    </div>
                    {e.detalle && <div className="text-xs text-ink-soft break-words">{e.detalle}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Toast />
    </div>
  );
}

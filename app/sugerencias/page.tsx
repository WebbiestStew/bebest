'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { Skeleton } from '@/components/Skeleton';
import { hasAdminAccess } from '@/lib/roles';

const estadoBadge: Record<string, string> = {
  Nueva: 'bg-clay-pale text-clay',
  Revisada: 'bg-blue/10 text-blue',
  Hecha: 'bg-sage-pale text-sage-deep',
};

function initials(name: string) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 24) {
    return date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function SugerenciasPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mensaje, setMensaje] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [justSent, setJustSent] = useState(false);

  const fetchSugerencias = async () => {
    try {
      const res = await fetch('/api/sugerencias');
      const data = await res.json();
      setSugerencias(data.sugerencias || []);
    } catch (error) {
      console.error('Error fetching sugerencias:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) fetchSugerencias();
  }, [user]);

  const handleStatusChange = async (id: string, estado: string) => {
    try {
      const res = await fetch(`/api/sugerencias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado }),
      });
      if (res.ok) {
        setSugerencias((prev) => prev.map((s) => (s.id === id ? { ...s, estado } : s)));
      }
    } catch (error) {
      console.error('Error updating sugerencia:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensaje.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/sugerencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, pagina: pathname }),
      });
      if (res.ok) {
        setMensaje('');
        setJustSent(true);
        setTimeout(() => setJustSent(false), 3000);
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: '¡Gracias! Tu sugerencia fue enviada.', isError: false } })
        );
        fetchSugerencias();
      } else {
        const error = await res.json();
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: error.error || 'No se pudo enviar', isError: true } })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', { detail: { message: 'No se pudo enviar. Intenta de nuevo.', isError: true } })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;
  if (!user) return null;

  const isAdmin = hasAdminAccess(user.rol);
  const pending = sugerencias.filter((s) => s.estado !== 'Hecha').length;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-2xl">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 text-center sm:text-left animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sage-pale mb-4 animate-scale-in">
            <span className="text-2xl">💡</span>
          </div>
          <h1 className="font-serif text-4xl font-medium mb-2">¿Tienes una idea?</h1>
          <p className="text-ink-soft text-base">
            Cuéntanos qué te gustaría que la app hiciera, o qué no te está funcionando. Lo leemos todo.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-panel border border-line rounded-2xl p-6 sm:p-8 mb-10 animate-fade-in-up"
          style={{ animationDelay: '80ms' }}
        >
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Escribe aquí… por ejemplo: 'me gustaría poder buscar pacientes por diagnóstico' o 'esta pantalla se siente lenta'."
            rows={5}
            className="w-full px-4 py-3.5 text-base border border-line rounded-lg bg-white text-ink transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage resize-vertical"
            autoFocus
          />
          <div className="flex items-center gap-4 mt-4">
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting || !mensaje.trim()}>
              Enviar sugerencia
            </Button>
            {justSent && (
              <span className="text-sm text-sage-deep animate-fade-in">✓ Enviada, ¡gracias!</span>
            )}
          </div>
        </form>

        <div className="animate-fade-in-up" style={{ animationDelay: '140ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-sm font-mono text-sage-deep uppercase tracking-widest">
              Lo que ha compartido el equipo
            </div>
            {isAdmin && !isLoadingData && sugerencias.length > 0 && (
              <span className="text-xs bg-clay-pale text-clay px-2 py-0.5 rounded-full font-mono">
                {pending} pendiente{pending === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {isLoadingData ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : sugerencias.length === 0 ? (
            <div className="bg-panel border-2 border-dashed border-line rounded-lg p-8 text-center text-ink-soft">
              Aún no hay sugerencias. ¡Sé el primero!
            </div>
          ) : (
            <div className="space-y-3">
              {sugerencias.map((s, i) => (
                <div
                  key={s.id}
                  className={`bg-panel border border-line rounded-lg p-4 flex gap-3 animate-fade-in-up transition-opacity duration-200 ${
                    s.estado === 'Hecha' ? 'opacity-60' : ''
                  }`}
                  style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
                >
                  <div className="w-8 h-8 rounded-full bg-sage-pale text-sage-deep flex items-center justify-center text-xs font-mono font-medium shrink-0">
                    {initials(s.usuario_nombre)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm text-ink leading-relaxed ${s.estado === 'Hecha' ? 'line-through decoration-ink-soft/40' : ''}`}>
                      {s.mensaje}
                    </p>
                    <div className="text-xs text-ink-soft mt-1.5">
                      {s.usuario_nombre} · {formatWhen(s.fecha_hora)}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isAdmin ? (
                      <select
                        value={s.estado}
                        onChange={(e) => handleStatusChange(s.id, e.target.value)}
                        className={`text-xs font-mono px-2 py-1 rounded-full border-0 cursor-pointer ${
                          estadoBadge[s.estado] || 'bg-gray-200 text-ink-soft'
                        }`}
                      >
                        <option value="Nueva">Nueva</option>
                        <option value="Revisada">Revisada</option>
                        <option value="Hecha">Hecha</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-block text-xs font-mono px-2 py-1 rounded-full ${
                          estadoBadge[s.estado] || 'bg-gray-200 text-ink-soft'
                        }`}
                      >
                        {s.estado}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Toast />
    </div>
  );
}

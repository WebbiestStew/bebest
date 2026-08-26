'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { BackButton } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { Alert } from '@/lib/types';
import { Skeleton } from '@/components/Skeleton';
import { hasAdminAccess } from '@/lib/roles';

export default function AlertasPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<(Alert & { id: string })[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);

  useEffect(() => {
    if (!user) return;

    if (!hasAdminAccess(user.rol)) {
      router.push('/');
      return;
    }

    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/alerts');
        const data = await res.json();
        setAlerts(data.alerts || []);
      } catch (error) {
        console.error('Error fetching alerts:', error);
      } finally {
        setIsLoadingAlerts(false);
      }
    };

    fetchAlerts();
  }, [user, router]);

  if (isLoading || isLoadingAlerts) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-bg">
        {user && <Navigation user={user} />}
        <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-2xl">
          <Skeleton className="h-3 w-32 mb-3" />
          <Skeleton className="h-9 w-96 mb-3" />
          <Skeleton className="h-4 w-72 mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </main>
      </div>
    );
  }
  if (!user || !hasAdminAccess(user.rol)) return null;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} alertCount={alerts.length} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-2xl">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Solo administradores</div>
          <h1 className="font-serif text-4xl font-medium mb-2">Alertas de expedientes incompletos</h1>
          <p className="text-ink-soft text-base">
            Cuando un psicólogo guarda y sale sin terminar un formulario, aparece aquí.
          </p>
        </div>

        {alerts.length === 0 ? (
          <div
            className="bg-panel border-2 border-dashed border-line rounded-lg p-10 text-center text-ink-soft animate-fade-in-up"
            style={{ animationDelay: '80ms' }}
          >
            <div className="text-3xl mb-2">✓</div>
            No hay alertas pendientes. Todos los expedientes están completos.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={alert.id}
                className="bg-panel border-l-4 border-red rounded-lg p-4 border border-red-pale transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 15) * 40}ms` }}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-base">{(alert as any).Paciente_nombre || 'Paciente'} — expediente incompleto</div>
                  <div className="text-xs text-ink-soft">{new Date((alert as any).Fecha_hora).toLocaleString('es-MX')}</div>
                 </div>
                <div className="text-xs text-ink-soft mb-2">
                  Paso: {(alert as any).Paso_incompleto} · Guardado por: {(alert as any).Usuario_nombre || 'Usuario'}
                </div>
                <div className="inline-block text-xs bg-blue text-white px-3 py-1 rounded-full font-mono">
                  ✉ Correo enviado a admin@consulta.com
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Toast />
    </div>
  );
}

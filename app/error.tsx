'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    console.error(error);
  }, [error]);

  const content = (
    <main className="flex-1 overflow-auto relative flex items-center justify-center p-6 sm:p-12">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[26rem] h-[26rem] bg-red-pale/40 rounded-full blur-3xl animate-pulse-soft" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-clay-pale/25 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: '900ms' }}
        />
      </div>

      <div className="relative z-10 text-center max-w-md animate-fade-in-up">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-pale mb-6 animate-scale-in"
          style={{ animationDelay: '80ms' }}
        >
          <span className="text-4xl">⚠️</span>
        </div>

        <div className="text-sm font-mono text-red uppercase tracking-widest mb-3">Algo salió mal</div>
        <h1 className="font-serif text-5xl font-medium mb-3">Esta pantalla tuvo un error</h1>
        <p className="text-ink-soft text-base leading-relaxed mb-8">
          No es algo que hayas hecho tú — puede ser un problema temporal. Tus datos guardados no se pierden.
          Intenta de nuevo, y si sigue pasando, cuéntanos qué estabas haciendo.
        </p>

        <div className="flex items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '140ms' }}>
          <Button variant="primary" onClick={() => reset()}>
            Reintentar
          </Button>
          {user ? (
            <Button variant="secondary" onClick={() => { window.location.href = '/'; }}>
              Volver al inicio
            </Button>
          ) : (
            <Link href="/login">
              <Button variant="secondary">Ir a iniciar sesión</Button>
            </Link>
          )}
        </div>

        {user && (
          <p className="text-sm text-ink-soft mt-8 animate-fade-in" style={{ animationDelay: '220ms' }}>
            ¿Sigue sin funcionar?{' '}
            <Link href="/sugerencias" className="text-sage-deep underline decoration-dotted underline-offset-2">
              Cuéntanos qué pasó
            </Link>
          </p>
        )}
      </div>
    </main>
  );

  if (isLoading) {
    return <div className="flex flex-col md:flex-row h-screen bg-bg" />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      {user && <Navigation user={user} />}
      {content}
      <Toast />
    </div>
  );
}

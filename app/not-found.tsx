'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';

export default function NotFound() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const content = (
    <main className="flex-1 overflow-auto relative flex items-center justify-center p-6 sm:p-12">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[26rem] h-[26rem] bg-sage-pale/40 rounded-full blur-3xl animate-pulse-soft" />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 bg-clay-pale/25 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: '900ms' }}
        />
      </div>

      <div className="relative z-10 text-center max-w-md animate-fade-in-up">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-sage-pale mb-6 animate-scale-in"
          style={{ animationDelay: '80ms' }}
        >
          <span className="text-4xl">🧭</span>
        </div>

        <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-3">Error 404</div>
        <h1 className="font-serif text-5xl font-medium mb-3">Esta página no existe</h1>
        <p className="text-ink-soft text-base leading-relaxed mb-8">
          Puede que el enlace esté roto o que la página se haya movido. Revisa la dirección o vuelve al inicio.
        </p>

        <div className="flex items-center justify-center gap-3 animate-fade-in-up" style={{ animationDelay: '140ms' }}>
          {user ? (
            <>
              <Button variant="primary" onClick={() => router.push('/')}>
                Volver al inicio
              </Button>
              <Button variant="secondary" onClick={() => router.back()}>
                Atrás
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button variant="primary">Ir a iniciar sesión</Button>
            </Link>
          )}
        </div>
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

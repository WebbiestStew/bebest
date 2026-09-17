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

      {/* Desert horizon, western-movie style, with a tumbleweed rolling across */}
      <div className="absolute inset-x-0 bottom-0 h-32 sm:h-40 overflow-hidden pointer-events-none">
        <svg viewBox="0 0 800 160" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <circle cx="670" cy="36" r="24" className="fill-clay-pale" opacity="0.8" />
          <path
            d="M0,112 Q100,88 220,102 T440,96 T660,106 T800,98 L800,160 L0,160 Z"
            className="fill-sage-pale"
            opacity="0.55"
          />
          <path
            d="M0,132 Q120,112 260,126 T520,120 T800,128 L800,160 L0,160 Z"
            className="fill-sage-pale"
            opacity="0.9"
          />
          <line x1="0" y1="132" x2="800" y2="132" className="stroke-line" strokeWidth="1" />
          <g className="fill-sage-deep" opacity="0.6">
            <path d="M56,132 v-24 a3.5,3.5 0 0 1 7,0 v7 h6 v-11 a3.5,3.5 0 0 1 7,0 v28 z" />
            <path d="M726,132 v-17 a3,3 0 0 1 6,0 v21 h-6 z" />
          </g>
        </svg>

        <div className="tumbleweed-track absolute inset-x-0" style={{ bottom: '64px', height: 0 }}>
          <div className="tumbleweed-mover absolute">
            <svg width="26" height="26" viewBox="0 0 26 26" className="tumbleweed-spin block">
              <g className="stroke-ink-soft" strokeWidth="1.4" fill="none" opacity="0.75">
                <circle cx="13" cy="13" r="9" />
                <path d="M13,2 L13,24 M2,13 L24,13 M5,5 L21,21 M21,5 L5,21 M13,5 Q17,13 13,21 Q9,13 13,5" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      <style>{`
        /* .tumbleweed-track is the positioning context (its width = the scene's
           full width), so the mover animates via "left" (a percentage of the
           PARENT's box) rather than transform: translateX (which CSS always
           resolves against the element's OWN box — at 26px wide that made the
           previous version barely move at all, just spin in place). */
        @keyframes tumbleweed-move {
          0%   { left: -30px; margin-top: 0; }
          50%  { left: 50%; margin-top: -7px; }
          100% { left: calc(100% + 10px); margin-top: 0; }
        }
        @keyframes tumbleweed-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(1080deg); }
        }
        .tumbleweed-mover {
          animation: tumbleweed-move 14s linear infinite;
        }
        .tumbleweed-spin {
          animation: tumbleweed-spin 2.4s linear infinite;
        }
      `}</style>

      <div className="relative z-10 text-center max-w-md animate-fade-in-up">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-sage-pale mb-6 animate-scale-in"
          style={{ animationDelay: '80ms' }}
        >
          <span className="text-4xl">🌵</span>
        </div>

        <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-3">Error 404</div>
        <h1 className="font-serif text-5xl font-medium mb-3">Órale, aquí no hay nada</h1>
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

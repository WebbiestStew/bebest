'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/FormInputs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeFadingOut, setWelcomeFadingOut] = useState(false);
  const [logoSvg, setLogoSvg] = useState<string | null>(null);
  const logoContainerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // The cursive logo animates itself via native SVG <animate> (SMIL) — that
  // only actually plays once the markup lives in this document (an <img
  // src="...svg"> loads it as an opaque external resource and never runs
  // the animation; confirmed by testing both). Fetching the raw markup and
  // inlining it is the one embedding that reliably animates everywhere.
  useEffect(() => {
    fetch('/bebest-logo-cursive.svg')
      .then((res) => res.text())
      .then(setLogoSvg)
      .catch(() => {});
  }, []);

  // SMIL's own autoplay clock doesn't reliably start once the SVG is
  // inserted via innerHTML (a real, known browser quirk, not specific to
  // this file — confirmed setCurrentTime() correctly renders any given
  // instant, but the timeline never advances on its own afterward). Driving
  // it explicitly frame-by-frame sidesteps that entirely instead of hoping
  // autoplay behaves — this always works since it uses the exact same
  // rendering path.
  useEffect(() => {
    if (!logoSvg) return;
    const svg = logoContainerRef.current?.querySelector('svg') as
      | (SVGSVGElement & { setCurrentTime: (t: number) => void })
      | null;
    if (!svg || typeof svg.setCurrentTime !== 'function') return;

    const TOTAL_DURATION = 3.05; // last segment begins 2.64s + runs 0.36s
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      try {
        svg.setCurrentTime(Math.min(elapsed, TOTAL_DURATION));
      } catch {
        // Ignore — some browsers throw if called before the timeline is ready.
      }
      if (elapsed < TOTAL_DURATION) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [logoSvg]);

  // A brief animated "you're in" moment instead of an instant jump to the
  // dashboard — covers the whole screen so the login form/inputs disappear
  // immediately (no dangling state), holds for a beat, then fades into the
  // real navigation.
  const goToApp = () => {
    setShowWelcome(true);
    setTimeout(() => setWelcomeFadingOut(true), 1100);
    setTimeout(() => router.push('/'), 1450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Correo o contraseña incorrectos');
      } else if (data.requires2FA) {
        setStep('otp');
      } else {
        goToApp();
      }
    } catch (err) {
      setError('Error al iniciar sesión. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Código incorrecto');
      } else {
        goToApp();
      }
    } catch (err) {
      setError('Error al verificar el código. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/resend-2fa', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo reenviar el código');
      }
    } catch {
      setError('No se pudo reenviar el código');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-sage-pale/50 to-bg flex items-center justify-center p-6">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sage-pale/30 rounded-full blur-3xl animate-pulse-soft"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-clay-pale/20 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: '900ms' }}
        ></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="relative inline-block">
            {/* Soft brand-colored glow behind the mark — the rest of the page
                stays on the existing sage/clay palette, this is the one spot
                that borrows the logo's own lime green. */}
            <div
              className="absolute inset-0 -m-6 rounded-full blur-2xl"
              style={{ backgroundColor: 'rgba(197, 224, 91, 0.25)' }}
              aria-hidden="true"
            />
            {/* This SVG animates itself on load (a ~7.85s progressive
                "write-on" reveal via native SVG <animate> — see
                public/bebest-logo-cursive.svg), so it needs no CSS
                entrance animation layered on top; kept the continuous
                float for after it settles. Has to be inlined into the
                document rather than loaded via <img src>/<object> —
                neither actually runs the SMIL animation, only a same-
                document <svg> does (confirmed by testing both). Falls
                back to the plain static logo until the fetch lands. */}
            {logoSvg ? (
              <div
                ref={logoContainerRef}
                role="img"
                aria-label="bebest by CPCCM"
                className="relative h-16 sm:h-20 w-auto mx-auto animate-float [&>svg]:h-full [&>svg]:w-auto"
                dangerouslySetInnerHTML={{ __html: logoSvg }}
              />
            ) : (
              <img
                src="/bebest-logo.png"
                alt="bebest by CPCCM"
                className="relative h-16 sm:h-20 w-auto mx-auto animate-float"
              />
            )}
          </div>
          <p className="text-ink-soft text-base mt-4">Sistema de Gestión de Pacientes</p>
        </div>

        {/* Login Card */}
        <div
          className="bg-panel border border-line rounded-2xl p-8 shadow-sm animate-fade-in-up"
          style={{ animationDelay: '120ms' }}
        >
          {step === 'credentials' ? (
            <>
              <div className="mb-6">
                <h2 className="font-serif text-2xl font-medium text-ink mb-1">Inicia sesión</h2>
                <p className="text-sm text-ink-soft">Accede a tu cuenta para continuar</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Correo electrónico</label>
                  <Input
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-ink">Contraseña</label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-sage-deep hover:underline underline-offset-2"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="w-full"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-pale border border-red/20 rounded-lg animate-fade-in-up">
                    <div className="text-red mt-0.5">⚠</div>
                    <div className="text-sm text-red">{error}</div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={isLoading || !email || !password}
                  className="w-full h-11 font-medium"
                >
                  {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-serif text-2xl font-medium text-ink mb-1">Verifica tu identidad</h2>
                <p className="text-sm text-ink-soft">
                  Enviamos un código de 6 dígitos a <span className="font-medium text-ink">{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-ink mb-2">Código de verificación</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={isLoading}
                    className="w-full text-center text-2xl tracking-[0.5em] font-mono"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-pale border border-red/20 rounded-lg animate-fade-in-up">
                    <div className="text-red mt-0.5">⚠</div>
                    <div className="text-sm text-red">{error}</div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  disabled={isLoading || code.length !== 6}
                  className="w-full h-11 font-medium"
                >
                  {isLoading ? 'Verificando...' : 'Verificar código'}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setCode('');
                      setError('');
                    }}
                    className="text-ink-soft hover:text-ink transition-colors duration-150"
                  >
                    ← Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="text-sage-deep hover:underline underline-offset-2 disabled:opacity-50"
                  >
                    {isResending ? 'Reenviando…' : 'Reenviar código'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>


        {/* Footer */}
        <p className="text-center text-xs text-ink-soft mt-8 animate-fade-in" style={{ animationDelay: '260ms' }}>
          © 2026 Consulta. Sistema confidencial de gestión clínica.
        </p>
      </div>

      {showWelcome && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-bg via-sage-pale/50 to-bg transition-opacity duration-300 ${
            welcomeFadingOut ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="relative flex items-center justify-center w-40 h-40">
            <span
              className="absolute w-24 h-24 rounded-full border-2 animate-welcome-ring"
              style={{ borderColor: 'rgba(197, 224, 91, 0.5)' }}
              aria-hidden="true"
            />
            <span
              className="absolute w-24 h-24 rounded-full border-2 animate-welcome-ring"
              style={{ borderColor: 'rgba(197, 224, 91, 0.5)', animationDelay: '500ms' }}
              aria-hidden="true"
            />
            <div
              className="absolute w-32 h-32 rounded-full blur-2xl"
              style={{ backgroundColor: 'rgba(197, 224, 91, 0.3)' }}
              aria-hidden="true"
            />
            <div className="relative animate-welcome-pop">
              <img
                src="/bebest-logo.png"
                alt="bebest by CPCCM"
                className="h-16 sm:h-20 w-auto animate-float"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Input } from '@/components/FormInputs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

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
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Error al iniciar sesión. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
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
          <div className="inline-block mb-4 p-3 bg-sage-pale rounded-xl animate-scale-in" style={{ animationDelay: '80ms' }}>
            <div className="text-2xl">🔐</div>
          </div>
          <h1 className="font-serif text-5xl font-semibold text-ink mb-2">Consulta</h1>
          <p className="text-ink-soft text-base">Sistema de Gestión de Pacientes</p>
        </div>

        {/* Login Card */}
        <div
          className="bg-panel border border-line rounded-2xl p-8 shadow-sm animate-fade-in-up"
          style={{ animationDelay: '120ms' }}
        >
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
              <label className="block text-sm font-medium text-ink mb-2">Contraseña</label>
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
        </div>

        {/* Info Box */}
        <div
          className="mt-6 p-4 bg-sage-pale/60 border border-sage/20 rounded-xl animate-fade-in-up"
          style={{ animationDelay: '180ms' }}
        >
          <div className="text-xs font-mono text-sage-deep uppercase tracking-wider mb-1">Demo</div>
          <p className="text-sm text-sage-deep leading-relaxed">
            Usa <span className="font-mono font-medium">diego@bebest.com</span> con tu contraseña
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-ink-soft mt-8 animate-fade-in" style={{ animationDelay: '260ms' }}>
          © 2026 Consulta. Sistema confidencial de gestión clínica.
        </p>
      </div>
    </div>
  );
}

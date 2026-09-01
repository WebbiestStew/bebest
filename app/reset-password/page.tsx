'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/FormInputs';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || 'No se pudo restablecer la contraseña.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="p-4 bg-red-pale border border-red/20 rounded-lg text-sm text-red">
        Este enlace no es válido. Solicita uno nuevo desde{' '}
        <Link href="/forgot-password" className="underline">
          recuperar contraseña
        </Link>
        .
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-4 bg-sage-pale/60 border border-sage/20 rounded-lg text-sm text-sage-deep">
        Contraseña actualizada. Te llevamos a iniciar sesión…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-ink mb-2">Nueva contraseña</label>
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
      <div>
        <label className="block text-sm font-medium text-ink mb-2">Confirma la contraseña</label>
        <Input
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
          className="w-full"
        />
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-pale border border-red/20 rounded-lg">
          <div className="text-red mt-0.5">⚠</div>
          <div className="text-sm text-red">{error}</div>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        isLoading={isLoading}
        disabled={isLoading || !password || !confirmPassword}
        className="w-full h-11 font-medium"
      >
        Restablecer contraseña
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg via-sage-pale/50 to-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-12">
          <div className="inline-block mb-4 p-3 bg-sage-pale rounded-xl">
            <div className="text-2xl">🔑</div>
          </div>
          <h1 className="font-serif text-4xl font-semibold text-ink mb-2">Consulta</h1>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="font-serif text-2xl font-medium text-ink mb-1">Restablecer contraseña</h2>
            <p className="text-sm text-ink-soft">Elige una nueva contraseña para tu cuenta.</p>
          </div>

          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

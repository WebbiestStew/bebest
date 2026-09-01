'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Input } from '@/components/FormInputs';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message || 'Si ese correo tiene una cuenta, te enviamos un enlace.');
    } catch {
      setMessage('Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h2 className="font-serif text-2xl font-medium text-ink mb-1">Recuperar contraseña</h2>
            <p className="text-sm text-ink-soft">Te enviaremos un enlace para restablecerla.</p>
          </div>

          {message ? (
            <div className="p-4 bg-sage-pale/60 border border-sage/20 rounded-lg text-sm text-sage-deep">
              {message}
            </div>
          ) : (
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
              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={isLoading || !email}
                className="w-full h-11 font-medium"
              >
                Enviar enlace
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-ink-soft hover:text-ink transition-colors duration-150">
              ← Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { BackButton, Button } from '@/components/Button';
import { Input } from '@/components/FormInputs';
import { useAuth } from '@/lib/useAuth';
import { roleLabel } from '@/lib/roles';

const HARDCODED_ADMIN_ID = 'admin_001';

export default function PerfilPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) return null;
  if (!user) return null;

  const isHardcodedAdmin = user.id === HARDCODED_ADMIN_ID;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        window.dispatchEvent(
          new CustomEvent('showToast', { detail: { message: 'Contraseña actualizada.', isError: false } })
        );
      } else {
        setError(data.error || 'Error al cambiar la contraseña');
      }
    } catch (error) {
      setError('Error al cambiar la contraseña');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-lg">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Mi cuenta</div>
          <h1 className="font-serif text-4xl font-medium mb-2">{user.nombre}</h1>
          <p className="text-ink-soft text-base">
            {user.email} · {roleLabel(user.rol)}
          </p>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-8 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
          <h2 className="font-serif text-xl font-medium mb-1">Cambiar contraseña</h2>

          {isHardcodedAdmin ? (
            <p className="text-sm text-ink-soft mt-3">
              Esta cuenta usa una contraseña fija definida en la configuración del servidor (una variable de
              entorno), no en la base de datos, así que no se puede cambiar desde aquí. Para actualizarla, quien
              administre el hosting debe generar un nuevo hash y reemplazar la variable{' '}
              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">ADMIN_PASSWORD_HASH</code>.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <Input
                label="Contraseña actual"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="Nueva contraseña"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmar nueva contraseña"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {error && <div className="text-sm text-red">{error}</div>}
              <Button type="submit" variant="primary" isLoading={isSaving} disabled={isSaving}>
                Guardar nueva contraseña
              </Button>
            </form>
          )}
        </div>
      </main>

      <Toast />
    </div>
  );
}

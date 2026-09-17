'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select } from '@/components/FormInputs';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/lib/useAuth';
import { Skeleton } from '@/components/Skeleton';
import { hasAdminAccess, roleLabel } from '@/lib/roles';

interface FormErrors {
  nombre?: string;
  email?: string;
  password?: string;
}

interface EditFormErrors {
  nombre?: string;
  email?: string;
}

function initials(name: string) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function AdminUsuariosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'user',
    escuela: '',
    generacion: '',
  });
  const [userToDelete, setUserToDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'user',
    escuela: '',
    generacion: '',
  });
  const [editErrors, setEditErrors] = useState<EditFormErrors>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      // The primary admin account is hardcoded (not stored in Airtable), so it
      // never comes back from /api/users — prepend it here for a complete list.
      const primaryAdmin = {
        id: 'admin_001',
        Nombre: 'Diego',
        Email: 'diego@bebest.com',
        Rol: 'admin',
        isPrimary: true,
      };
      setUsers([primaryAdmin, ...(data.users || [])]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (hasAdminAccess(user?.rol)) fetchUsers();
  }, [user]);

  if (isLoading) return null;
  if (!user || !hasAdminAccess(user.rol)) return null;

  const validateForm = () => {
    const newErrors: FormErrors = {};
    if (!formData.nombre.trim()) newErrors.nombre = 'Este campo es obligatorio.';
    if (!formData.email.trim()) newErrors.email = 'Este campo es obligatorio.';
    if (!formData.password.trim()) newErrors.password = 'Este campo es obligatorio.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          email: formData.email.trim(),
          password: formData.password,
          rol: formData.rol,
          escuela: formData.escuela.trim(),
          generacion: formData.generacion.trim(),
        }),
      });

      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: `Usuario "${formData.nombre}" creado correctamente.`, isError: false },
          })
        );
        setFormData({ nombre: '', email: '', password: '', rol: 'user', escuela: '', generacion: '' });
        fetchUsers();
      } else {
        const error = await response.json();
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: error.error || 'Error al crear usuario', isError: true },
          })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Error al crear usuario', isError: true },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/users?id=${userToDelete.id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: `Usuario "${userToDelete.nombre}" eliminado.`, isError: false },
          })
        );
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      } else {
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: data.error || 'Error al eliminar usuario', isError: true },
          })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Error al eliminar usuario', isError: true },
        })
      );
    } finally {
      setIsDeleting(false);
      setUserToDelete(null);
    }
  };

  const startEditing = (u: any) => {
    setEditingUser(u);
    setEditFormData({
      nombre: u.Nombre || '',
      email: u.Email || '',
      password: '',
      rol: u.Rol || 'user',
      escuela: u.Escuela || '',
      generacion: u.Generacion || '',
    });
    setEditErrors({});
  };

  const validateEditForm = () => {
    const newErrors: EditFormErrors = {};
    if (!editFormData.nombre.trim()) newErrors.nombre = 'Este campo es obligatorio.';
    if (!editFormData.email.trim()) newErrors.email = 'Este campo es obligatorio.';
    setEditErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !validateEditForm()) return;

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/users?id=${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: editFormData.nombre.trim(),
          email: editFormData.email.trim(),
          rol: editFormData.rol,
          escuela: editFormData.escuela.trim(),
          generacion: editFormData.generacion.trim(),
          ...(editFormData.password.trim() ? { password: editFormData.password.trim() } : {}),
        }),
      });
      const data = await response.json();

      if (response.ok) {
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: `Usuario "${editFormData.nombre}" actualizado.`, isError: false },
          })
        );
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...data.user } : u)));
        setEditingUser(null);
      } else {
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: data.error || 'Error al actualizar usuario', isError: true },
          })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Error al actualizar usuario', isError: true },
        })
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12 max-w-3xl">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Administración</div>
          <h1 className="font-serif text-4xl font-medium mb-2">Usuarios</h1>
          <p className="text-ink-soft text-base">Todas las cuentas con acceso al sistema.</p>
        </div>

        {/* Existing users */}
        <div
          className="bg-panel border border-line rounded-lg overflow-hidden mb-10 animate-fade-in-up"
          style={{ animationDelay: '60ms' }}
        >
          <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Nombre
                </th>
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Correo
                </th>
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Rol
                </th>
                <th className="text-right text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoadingUsers ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                        <Skeleton className="h-3.5 w-32" />
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-40" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center text-ink-soft py-8">
                    No hay usuarios registrados
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <tr
                    key={u.id}
                    className="border-b border-line last:border-0 hover:bg-sage-pale/30 transition-colors duration-150 animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sage-pale text-sage-deep flex items-center justify-center text-xs font-mono font-medium shrink-0">
                          {initials(u.Nombre)}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-ink">
                            {u.Nombre}
                            {u.isPrimary && (
                              <span className="ml-2 text-xs text-ink-soft font-normal">(cuenta principal)</span>
                            )}
                          </span>
                          {(u.Escuela || u.Generacion) && (
                            <div className="text-xs text-ink-soft">
                              {[u.Escuela, u.Generacion].filter(Boolean).join(' · ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-soft">{u.Email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-mono ${
                          u.Rol === 'admin'
                            ? 'bg-clay-pale text-clay'
                            : u.Rol === 'developer'
                            ? 'bg-blue/10 text-blue'
                            : 'bg-sage-pale text-sage-deep'
                        }`}
                      >
                        {roleLabel(u.Rol)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!u.isPrimary && (
                        <button
                          onClick={() => startEditing(u)}
                          className="text-xs font-medium text-sage-deep hover:underline underline-offset-2 transition-colors duration-150 mr-4"
                        >
                          Editar
                        </button>
                      )}
                      {!u.isPrimary && u.id !== user.id && (
                        <button
                          onClick={() => setUserToDelete({ id: u.id, nombre: u.Nombre })}
                          className="text-xs font-medium text-red hover:underline underline-offset-2 transition-colors duration-150"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Create user */}
        <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <h2 className="font-serif text-2xl font-medium mb-1">Crear nuevo usuario</h2>
          <p className="text-ink-soft text-sm">Agrega nuevos psicólogos o administradores al sistema.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-panel border border-line rounded-2xl p-8 space-y-6 animate-fade-in-up"
          style={{ animationDelay: '140ms' }}
        >
          <Input
            label="Nombre completo"
            placeholder="Luis Medina"
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            error={errors.nombre}
            required
          />

          <Input
            label="Correo electrónico"
            type="email"
            placeholder="luis@consulta.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            required
          />

          <Input
            label="Contraseña temporal"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            error={errors.password}
            required
          />

          <Select
            label="Rol"
            options={[
              { value: 'user', label: 'Psicólogo' },
              { value: 'admin', label: 'Administrador' },
              { value: 'developer', label: 'Desarrollador (mismos permisos que Administrador)' },
            ]}
            value={formData.rol}
            onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Escuela (opcional)"
              placeholder="Universidad / institución"
              value={formData.escuela}
              onChange={(e) => setFormData({ ...formData, escuela: e.target.value })}
            />
            <Input
              label="Generación (opcional)"
              placeholder="2024-2026"
              value={formData.generacion}
              onChange={(e) => setFormData({ ...formData, generacion: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-4 p-6 -m-8 border-t border-line bg-gray-50">
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Crear usuario
            </Button>
            <span className="text-xs text-ink-soft ml-auto">El usuario podrá cambiar esta contraseña desde su cuenta una vez que inicie sesión</span>
          </div>
        </form>
      </main>

      <ConfirmDialog
        open={!!userToDelete}
        title="Eliminar usuario"
        message={`¿Eliminar a "${userToDelete?.nombre}"? Perderá acceso al sistema de inmediato. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
      />

      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setEditingUser(null)}
        >
          <form
            onSubmit={handleEditSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            className="bg-panel border border-line rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="edit-user-title" className="font-serif text-xl font-medium">
              Editar usuario
            </h3>

            <Input
              label="Nombre completo"
              value={editFormData.nombre}
              onChange={(e) => setEditFormData({ ...editFormData, nombre: e.target.value })}
              error={editErrors.nombre}
              required
            />

            <Input
              label="Correo electrónico"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              error={editErrors.email}
              required
            />

            <Input
              label="Nueva contraseña (opcional)"
              type="password"
              placeholder="Dejar en blanco para no cambiarla"
              value={editFormData.password}
              onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
            />

            <Select
              label="Rol"
              options={[
                { value: 'user', label: 'Psicólogo' },
                { value: 'admin', label: 'Administrador' },
                { value: 'developer', label: 'Desarrollador (mismos permisos que Administrador)' },
              ]}
              value={editFormData.rol}
              onChange={(e) => setEditFormData({ ...editFormData, rol: e.target.value })}
            />

            <Input
              label="Escuela (opcional)"
              value={editFormData.escuela}
              onChange={(e) => setEditFormData({ ...editFormData, escuela: e.target.value })}
            />

            <Input
              label="Generación (opcional)"
              value={editFormData.generacion}
              onChange={(e) => setEditFormData({ ...editFormData, generacion: e.target.value })}
            />

            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingUser(null)}
                disabled={isSavingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSavingEdit} disabled={isSavingEdit}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </div>
      )}

      <Toast/>
    </div>
  );
}

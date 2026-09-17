'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User } from '@/lib/types';
import { hasAdminAccess, roleLabel } from '@/lib/roles';
import { GlobalSearch } from '@/components/GlobalSearch';

interface NavProps {
  user: User | null;
}

export function Navigation({ user }: NavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetched here (rather than passed in per-page) so the badge shows up
  // consistently everywhere, not just on the Alertas page itself. Refetches
  // every couple minutes so it doesn't go stale on a long-open tab.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/alerts');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAlertCount((data.alerts || []).length);
      } catch (error) {
        console.error('Error fetching alert count:', error);
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 120000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  // Close the mobile drawer whenever the route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (!user || pathname === '/login') return null;

  const isAdmin = hasAdminAccess(user.rol);

  const navItems = [
    { href: '/', label: 'Inicio', icon: '🏠' },
    { href: '/agenda', label: 'Agenda', icon: '🗓️' },
    { href: '/registro', label: 'Ficha de Registro', icon: '📝' },
    { href: '/sesion/1', label: 'Sesión 1 · Entrevista', icon: '💬' },
    { href: '/sesion/2', label: 'Sesión 2 · Pruebas', icon: '📋' },
    { href: '/sesion/3', label: 'Sesión 3 · Resultados', icon: '🎯' },
    { href: '/paciente', label: 'Ver ficha de paciente', icon: '👤' },
    { href: '/pacientes', label: isAdmin ? 'Base de Datos' : 'Mis Pacientes', icon: '📊' },
    { href: '/reportes', label: 'Reportes', icon: '📈' },
    { href: '/sugerencias', label: 'Sugerencias', icon: '💡' },
    { href: '/alertas', label: 'Alertas', icon: '🔔', badge: alertCount },
    ...(isAdmin ? [{ href: '/admin/usuarios', label: 'Usuarios', icon: '👥' }] : []),
    ...(isAdmin ? [{ href: '/auditoria', label: 'Historial de cambios', icon: '🕓' }] : []),
  ];

  if (!mounted) return null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 bg-dark text-white flex items-center justify-between px-4 h-14 shrink-0 print:hidden">
        <span className="font-serif text-lg font-semibold">Consulta</span>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Abrir menú"
          className="p-2 -mr-2 rounded-lg transition-colors duration-150 hover:bg-white/10 active:scale-95"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 7H20M4 12H20M4 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Backdrop (mobile only, when drawer is open) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      <nav
        className={`bg-dark text-white w-64 min-h-screen p-6 flex flex-col animate-fade-in
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:translate-x-0 md:z-auto md:min-h-screen print:hidden`}
      >
        <div className="mb-6 flex items-start justify-between animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <div>
            <div className="font-serif text-2xl font-semibold mb-1">Consulta</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Panel interno</div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menú"
            className="md:hidden p-1.5 -mr-1.5 -mt-1 rounded-lg transition-colors duration-150 hover:bg-white/10 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 6L18 18M6 18L18 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <GlobalSearch />

        {user && (
          <div
            className="bg-opacity-20 bg-white rounded-lg p-3 mb-6 animate-fade-in-up"
            style={{ animationDelay: '40ms' }}
          >
            <div className="text-sm font-medium text-gray-100">{user.nombre}</div>
            <div className="text-xs text-gray-400 mb-3">{roleLabel(user.rol)}</div>
            <div className="flex items-center gap-3">
              <Link href="/perfil" className="text-xs text-gray-300 hover:text-white transition-colors duration-150">
                Mi cuenta
              </Link>
              <span className="text-gray-600">·</span>
              <button
                onClick={handleLogout}
                className="group text-xs text-gray-300 hover:text-white transition-colors duration-150"
              >
                Cerrar sesión{' '}
                <span className="inline-block transition-transform duration-150 group-hover:translate-x-0.5">→</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 animate-fade-in-up ${
                  isActive ? 'bg-opacity-20 bg-white' : 'hover:bg-opacity-10 hover:bg-white hover:translate-x-0.5'
                }`}
                style={{ animationDelay: `${70 + i * 30}ms` }}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sage rounded-full" />
                )}
                <span className="flex items-center gap-2">
                  <span className="text-xs w-1.5 h-1.5 bg-current rounded-full opacity-50" />
                  {item.label}
                </span>
                {item.badge ? (
                  <span className="bg-clay text-white text-xs font-mono px-2 py-0.5 rounded-full animate-pulse-soft">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div
          className="pt-6 border-t border-opacity-20 border-white text-xs text-gray-400 leading-relaxed animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          Prototipo beta — datos guardados localmente.
        </div>
      </nav>
    </>
  );
}

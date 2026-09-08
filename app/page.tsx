'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useAuth } from '@/lib/useAuth';
import { hasAdminAccess } from '@/lib/roles';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import { CountUp } from '@/components/CountUp';
import { Button } from '@/components/Button';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const TODAY = new Date().toLocaleDateString('es-MX', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const todayIso = new Date().toISOString().slice(0, 10);

const citaEstadoBadge: Record<string, string> = {
  Programada: 'bg-sage-pale text-sage-deep',
  Completada: 'bg-blue/10 text-blue',
  Cancelada: 'bg-red-pale text-red',
  'No asistió': 'bg-clay-pale text-clay',
};

// Dashboard personalization — every possible shortcut, plus which ones are
// currently shown, in what order, and at what size. Saved to localStorage
// (per-device, not clinical data) rather than Airtable: it's the same kind
// of preference as "which tab was open last," and the hardcoded admin login
// has no Airtable user record to attach a preference to anyway.
const LAYOUT_STORAGE_KEY = 'consulta_dashboard_layout_v1';

type TileSize = 'compact' | 'normal' | 'tall' | 'wide';

interface TileConfig {
  id: string;
  size: TileSize;
}

interface CatalogEntry {
  id: string;
  icon: string;
  title: string | ((isAdmin: boolean) => string);
  subtitle: string | ((isAdmin: boolean) => string);
  href: string;
  adminOnly?: boolean;
}

const CATALOG: CatalogEntry[] = [
  {
    id: 'registro',
    icon: '📝',
    title: 'Registrar paciente nuevo',
    subtitle: 'Agenda y ficha de registro del primer contacto.',
    href: '/registro',
  },
  {
    id: 'sesion1',
    icon: '💬',
    title: 'Sesión 1 · Entrevista',
    subtitle: 'Historia clínica del paciente.',
    href: '/sesion/1',
  },
  {
    id: 'sesion2',
    icon: '📋',
    title: 'Sesión 2 · Pruebas',
    subtitle: 'Batería de pruebas aplicadas.',
    href: '/sesion/2',
  },
  {
    id: 'sesion3',
    icon: '🎯',
    title: 'Sesión 3 · Resultados',
    subtitle: 'Diagnóstico y entrega de resultados.',
    href: '/sesion/3',
  },
  {
    id: 'paciente',
    icon: '👤',
    title: 'Ver ficha de un paciente',
    subtitle: 'Historial completo, diagnóstico y documentos.',
    href: '/paciente',
  },
  {
    id: 'pacientes',
    icon: '📊',
    title: (isAdmin) => (isAdmin ? 'Ver todos los pacientes' : 'Ver mis pacientes'),
    subtitle: (isAdmin) => (isAdmin ? 'Lista con el estado de cada paciente.' : 'Tus pacientes asignados.'),
    href: '/pacientes',
  },
  {
    id: 'reportes',
    icon: '📈',
    title: 'Ver reportes',
    subtitle: (isAdmin) => (isAdmin ? 'Estadísticas de toda la consulta.' : 'Estadísticas de tus pacientes.'),
    href: '/reportes',
  },
  {
    id: 'agenda',
    icon: '🗓️',
    title: 'Ver agenda',
    subtitle: 'Citas de la semana, día por día.',
    href: '/agenda',
  },
  {
    id: 'sugerencias',
    icon: '💡',
    title: 'Sugerencias',
    subtitle: 'Comparte una idea o reporta un problema.',
    href: '/sugerencias',
  },
  {
    id: 'alertas',
    icon: '🔔',
    title: 'Alertas',
    subtitle: 'Expedientes incompletos.',
    href: '/alertas',
    adminOnly: true,
  },
  {
    id: 'usuarios',
    icon: '👥',
    title: 'Usuarios',
    subtitle: 'Cuentas con acceso al sistema.',
    href: '/admin/usuarios',
    adminOnly: true,
  },
];

const DEFAULT_LAYOUT: TileConfig[] = [
  { id: 'registro', size: 'normal' },
  { id: 'sesion1', size: 'normal' },
  { id: 'paciente', size: 'normal' },
  { id: 'pacientes', size: 'normal' },
  { id: 'reportes', size: 'normal' },
  { id: 'agenda', size: 'normal' },
];

const SIZE_LABELS: Record<TileSize, string> = {
  compact: 'Pequeño',
  normal: 'Normal',
  tall: 'Grande',
  wide: 'Ancho',
};
const NEXT_SIZE: Record<TileSize, TileSize> = {
  compact: 'normal',
  normal: 'tall',
  tall: 'wide',
  wide: 'compact',
};
const SIZE_CLASSES: Record<TileSize, string> = {
  compact: 'p-4',
  normal: 'p-6',
  tall: 'p-6 sm:py-10',
  wide: 'p-6 sm:col-span-2',
};

function resolveText(value: string | ((isAdmin: boolean) => string), isAdmin: boolean) {
  return typeof value === 'function' ? value(isAdmin) : value;
}

export default function Inicio() {
  const { user, isLoading } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [todayCitas, setTodayCitas] = useState<any[]>([]);
  const [isLoadingCitas, setIsLoadingCitas] = useState(true);
  const [layout, setLayout] = useState<TileConfig[]>(DEFAULT_LAYOUT);
  const [isEditing, setIsEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((t) => t && typeof t.id === 'string')) {
          setLayout(parsed);
        }
      }
    } catch {
      // Corrupt/unavailable storage — just keep the default layout.
    }
  }, []);

  // Persist explicitly from each mutation below (not via a `[layout]` effect):
  // an effect watching `layout` would also fire once on mount with the
  // pre-load default value, racing the load-effect above and overwriting
  // any real saved layout with the default before the load ever lands.
  const persistLayout = (next: TileConfig[]) => {
    setLayout(next);
    try {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Private browsing / storage full — customization just won't persist.
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        const data = await res.json();
        setPatients(data.patients || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    if (user) fetchPatients();
  }, [user]);

  useEffect(() => {
    const fetchTodayCitas = async () => {
      try {
        const res = await fetch('/api/citas');
        const data = await res.json();
        const today = (data.citas || [])
          .filter((c: any) => (c.fecha || '').slice(0, 10) === todayIso && c.estado !== 'Cancelada')
          .sort((a: any, b: any) => (a.hora || '').localeCompare(b.hora || ''));
        setTodayCitas(today);
      } catch (error) {
        console.error('Error fetching today\'s citas:', error);
      } finally {
        setIsLoadingCitas(false);
      }
    };
    if (user) fetchTodayCitas();
  }, [user]);

  const stats = useMemo(() => {
    const total = patients.length;
    const activos = patients.filter((p) => p.estatus_en_registro === 'ACTIVO').length;
    const altas = patients.filter((p) => p.estatus_en_registro === 'ALTA').length;
    return { total, activos, altas };
  }, [patients]);

  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-bg">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="animate-spin inline-block">
              <svg className="w-8 h-8 text-sage" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="mt-2 text-ink-soft">Cargando...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will redirect to login
  }

  const isAdmin = hasAdminAccess(user.rol);
  const rawFirstName = (user.nombre || '').split(' ')[0];
  const firstName = rawFirstName ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1) : '';

  const resolvedTiles = layout
    .map((cfg) => {
      const entry = CATALOG.find((c) => c.id === cfg.id);
      if (!entry) return null; // stale id from an older catalog version
      if (entry.adminOnly && !isAdmin) return null;
      return {
        ...cfg,
        icon: entry.icon,
        title: resolveText(entry.title, isAdmin),
        subtitle: resolveText(entry.subtitle, isAdmin),
        href: entry.href,
      };
    })
    .filter((t): t is TileConfig & { icon: string; title: string; subtitle: string; href: string } => t !== null);

  const availableToAdd = CATALOG.filter((c) => (!c.adminOnly || isAdmin) && !layout.some((l) => l.id === c.id));

  const updateTileSize = (id: string) => {
    persistLayout(layout.map((t) => (t.id === id ? { ...t, size: NEXT_SIZE[t.size] } : t)));
  };
  const removeTile = (id: string) => {
    persistLayout(layout.filter((t) => t.id !== id));
  };
  const addTile = (id: string) => {
    persistLayout([...layout, { id, size: 'normal' }]);
    setShowPicker(false);
  };
  const moveTile = (id: string, dir: -1 | 1) => {
    const idx = layout.findIndex((t) => t.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= layout.length) return;
    const copy = [...layout];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    persistLayout(copy);
  };
  const resetLayout = () => persistLayout(DEFAULT_LAYOUT);

  const statCards = [
    { label: isAdmin ? 'Pacientes totales' : 'Tus pacientes', value: stats.total, accent: 'text-ink' },
    { label: 'Activos', value: stats.activos, accent: 'text-sage-deep' },
    { label: 'Altas', value: stats.altas, accent: 'text-blue' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto relative">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 right-0 w-[28rem] h-[28rem] bg-sage-pale/40 rounded-full blur-3xl" />
          <div className="absolute top-96 -right-40 w-96 h-96 bg-clay-pale/25 rounded-full blur-3xl" />
        </div>

        <div className="relative p-4 sm:p-8 lg:p-12 max-w-6xl">
          <div className="mb-8 animate-fade-in-up">
            <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2 capitalize">{TODAY}</div>
            <h1 className="font-serif text-4xl font-medium mb-2">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="text-ink-soft text-base max-w-lg">Elige una opción. Cada pantalla te pide solo lo necesario para ese paso.</p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 max-w-2xl">
            {statCards.map((s, i) => (
              <div
                key={s.label}
                className="bg-panel border border-line rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up"
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                <div className="text-xs text-ink-soft uppercase tracking-wider mb-1">{s.label}</div>
                {isLoadingStats ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <div className={`font-serif text-2xl font-medium ${s.accent}`}>
                    <CountUp value={s.value} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Hoy — quick view of today's appointments */}
          <div
            className="bg-panel border border-line rounded-lg p-6 mb-8 max-w-2xl animate-fade-in-up"
            style={{ animationDelay: '180ms' }}
          >
            <div className="text-xs font-mono text-sage-deep uppercase tracking-widest mb-4">
              Hoy
            </div>
            {isLoadingCitas ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : todayCitas.length === 0 ? (
              <p className="text-sm text-ink-soft italic">No tienes citas programadas para hoy.</p>
            ) : (
              <div className="space-y-1">
                {todayCitas.map((c) => {
                  const pacienteId = (c.paciente || [])[0];
                  const row = (
                    <div className="flex items-center gap-4 py-2.5 border-b border-line last:border-0">
                      <div className="text-sm font-mono text-ink-soft shrink-0 w-14">{c.hora}</div>
                      <div className="text-sm text-ink flex-1 truncate">{c.paciente_nombre}</div>
                      <span
                        className={`shrink-0 text-xs font-mono px-2.5 py-0.5 rounded-full ${
                          citaEstadoBadge[c.estado] || 'bg-gray-200 text-ink-soft'
                        }`}
                      >
                        {c.estado}
                      </span>
                    </div>
                  );
                  return pacienteId ? (
                    <Link key={c.id} href={`/paciente/${pacienteId}`} className="block hover:bg-sage-pale/20 -mx-2 px-2 rounded-lg transition-colors duration-150">
                      {row}
                    </Link>
                  ) : (
                    <div key={c.id}>{row}</div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <p className="text-sm text-ink-soft">
              {isEditing ? 'Cambia el tamaño, el orden, o agrega y quita accesos directos.' : ' '}
            </p>
            <div className="flex items-center gap-3">
              {isEditing && (
                <button
                  onClick={resetLayout}
                  className="text-xs text-ink-soft hover:text-red underline decoration-dotted underline-offset-2 transition-colors duration-150"
                >
                  Restablecer diseño
                </button>
              )}
              <Button
                variant={isEditing ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setIsEditing((v) => !v);
                  setShowPicker(false);
                }}
              >
                {isEditing ? '✓ Listo' : '🎛️ Personalizar'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resolvedTiles.map((t, i) => {
              const cardBody = (
                <div
                  className={clsx(
                    'group relative bg-panel border border-line rounded-xl h-full transition-all duration-250 ease-out animate-fade-in-up',
                    SIZE_CLASSES[t.size],
                    !isEditing && 'cursor-pointer hover:border-sage hover:-translate-y-1 hover:shadow-lg'
                  )}
                  style={{ animationDelay: `${200 + i * 60}ms` }}
                >
                  {isEditing && (
                    <div className="absolute -top-3 -right-3 flex items-center gap-1 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          moveTile(t.id, -1);
                        }}
                        aria-label="Mover antes"
                        className="w-7 h-7 rounded-full bg-white border border-line shadow-sm flex items-center justify-center text-xs text-ink-soft hover:bg-sage-pale hover:text-sage-deep active:scale-90 transition-all duration-150"
                      >
                        ‹
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          moveTile(t.id, 1);
                        }}
                        aria-label="Mover después"
                        className="w-7 h-7 rounded-full bg-white border border-line shadow-sm flex items-center justify-center text-xs text-ink-soft hover:bg-sage-pale hover:text-sage-deep active:scale-90 transition-all duration-150"
                      >
                        ›
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          updateTileSize(t.id);
                        }}
                        aria-label="Cambiar tamaño"
                        className="h-7 px-2.5 rounded-full bg-white border border-line shadow-sm flex items-center justify-center text-[10px] font-mono text-ink-soft hover:bg-sage-pale hover:text-sage-deep active:scale-90 transition-all duration-150 whitespace-nowrap"
                      >
                        {SIZE_LABELS[t.size]}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          removeTile(t.id);
                        }}
                        aria-label="Quitar"
                        className="w-7 h-7 rounded-full bg-white border border-line shadow-sm flex items-center justify-center text-xs text-red hover:bg-red-pale active:scale-90 transition-all duration-150"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <div className="w-8 h-8 rounded-lg bg-sage-pale text-sage-deep flex items-center justify-center mb-3 text-base transition-transform duration-250 group-hover:scale-110 group-hover:bg-sage-deep group-hover:text-white">
                    {t.icon}
                  </div>
                  <h3 className="font-serif text-lg font-medium mb-1 transition-colors group-hover:text-sage-deep">{t.title}</h3>
                  {t.size !== 'compact' && <p className="text-sm text-ink-soft leading-relaxed">{t.subtitle}</p>}
                </div>
              );

              return isEditing ? (
                <div key={t.id} className={clsx(t.size === 'wide' && 'sm:col-span-2')}>
                  {cardBody}
                </div>
              ) : (
                <Link key={t.id} href={t.href} className={clsx(t.size === 'wide' && 'sm:col-span-2')}>
                  {cardBody}
                </Link>
              );
            })}

            {isEditing && (
              <div className="relative">
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  className="w-full h-full min-h-[140px] border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center gap-2 text-ink-soft hover:border-sage hover:text-sage-deep hover:bg-sage-pale/20 active:scale-[0.98] transition-all duration-200"
                >
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-sm font-medium">Agregar acceso directo</span>
                </button>
                {showPicker && (
                  <div className="absolute top-full left-0 mt-2 w-72 bg-panel border border-line rounded-xl shadow-lg p-2 z-20 max-h-72 overflow-auto animate-fade-in-up">
                    {availableToAdd.length === 0 ? (
                      <div className="text-xs text-ink-soft p-3">Ya agregaste todos los accesos disponibles.</div>
                    ) : (
                      availableToAdd.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => addTile(c.id)}
                          className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-sage-pale/40 text-left transition-colors duration-150"
                        >
                          <span className="text-lg shrink-0">{c.icon}</span>
                          <span className="text-sm text-ink">{resolveText(c.title, isAdmin)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <Toast />
    </div>
  );
}

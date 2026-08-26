'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { hasAdminAccess } from '@/lib/roles';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Skeleton } from '@/components/Skeleton';
import { CountUp } from '@/components/CountUp';

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

export default function Inicio() {
  const { user, isLoading } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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
  const tiles = [
    {
      icon: '1',
      title: 'Registrar paciente nuevo',
      subtitle: 'Agenda y ficha de registro del primer contacto.',
      href: '/registro',
    },
    {
      icon: '2',
      title: 'Capturar una sesión',
      subtitle: 'Entrevista, pruebas o entrega de resultados.',
      href: '/sesion/1',
    },
    {
      icon: '3',
      title: 'Ver ficha de un paciente',
      subtitle: 'Historial completo, diagnóstico y documentos.',
      href: '/paciente',
    },
    {
      icon: '4',
      title: isAdmin ? 'Ver todos los pacientes' : 'Ver mis pacientes',
      subtitle: isAdmin ? 'Lista con el estado de cada paciente.' : 'Tus pacientes asignados.',
      href: '/pacientes',
    },
    {
      icon: '5',
      title: 'Ver reportes',
      subtitle: isAdmin ? 'Estadísticas de toda la consulta.' : 'Estadísticas de tus pacientes.',
      href: '/reportes',
    },
    {
      icon: '6',
      title: 'Ver agenda',
      subtitle: 'Citas de la semana, día por día.',
      href: '/agenda',
    },
  ];

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
              {greeting()}{firstName ? `, ${firstName}` : ''}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiles.map((t, i) => (
              <Link key={t.href} href={t.href}>
                <div
                  className="group bg-panel border border-line rounded-xl p-6 h-full cursor-pointer hover:border-sage hover:-translate-y-1 hover:shadow-lg transition-all duration-250 ease-out animate-fade-in-up"
                  style={{ animationDelay: `${200 + i * 60}ms` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-sage-pale text-sage-deep flex items-center justify-center mb-3 font-mono font-medium transition-transform duration-250 group-hover:scale-110 group-hover:bg-sage-deep group-hover:text-white">
                    {t.icon}
                  </div>
                  <h3 className="font-serif text-lg font-medium mb-1 transition-colors group-hover:text-sage-deep">
                    {t.title}
                  </h3>
                  <p className="text-sm text-ink-soft leading-relaxed">{t.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <Toast />
    </div>
  );
}

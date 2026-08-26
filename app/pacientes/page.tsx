'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { hasAdminAccess } from '@/lib/roles';
import { Button, BackButton } from '@/components/Button';
import { useAuth } from '@/lib/useAuth';
import { Patient } from '@/lib/types';
import { Skeleton } from '@/components/Skeleton';
import { CountUp } from '@/components/CountUp';

const estadoLabel: Record<string, string> = {
  ACTIVO: 'Activo',
  ALTA: 'Alta',
  BAJA: 'Baja',
  'SIN DATO': 'Sin dato',
  Reingreso: 'Reingreso',
};

const estadoBadge: Record<string, string> = {
  ACTIVO: 'bg-sage-pale text-sage-deep',
  ALTA: 'bg-blue/10 text-blue',
  BAJA: 'bg-red-pale text-red',
  'SIN DATO': 'bg-clay-pale text-clay',
  Reingreso: 'bg-clay-pale text-clay',
};

function initials(name: string) {
  return (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export default function PacientesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [terapeutaFilter, setTerapeutaFilter] = useState('');
  const [isLoading2, setIsLoading2] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        const data = await res.json();
        setPatients(data.patients || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setIsLoading2(false);
      }
    };

    if (user) fetchPatients();
  }, [user]);

  const terapeutas = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => p.terapeuta && set.add(p.terapeuta));
    return Array.from(set).sort();
  }, [patients]);

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch = (p.paciente || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = !estadoFilter || p.estatus_en_registro === estadoFilter;
      const matchesTerapeuta = !terapeutaFilter || p.terapeuta === terapeutaFilter;
      return matchesSearch && matchesEstado && matchesTerapeuta;
    });
  }, [patients, searchTerm, estadoFilter, terapeutaFilter]);

  const stats = useMemo(() => {
    const total = patients.length;
    const activos = patients.filter((p) => p.estatus_en_registro === 'ACTIVO').length;
    const altas = patients.filter((p) => p.estatus_en_registro === 'ALTA').length;
    const bajas = patients.filter((p) => p.estatus_en_registro === 'BAJA').length;
    return { total, activos, altas, bajas };
  }, [patients]);

  if (isLoading) return null;
  if (!user) return null;

  const isAdmin = hasAdminAccess(user.rol);
  const pageTitle = isAdmin ? 'Base de Datos' : 'Mis Pacientes';
  const pageSubtitle = isAdmin
    ? 'Todos los pacientes de la consulta, de todos los psicólogos. Haz clic en un renglón para abrir su ficha.'
    : 'Tus pacientes asignados. Haz clic en un renglón para abrir su ficha.';

  const statCards = [
    { label: 'Total', value: stats.total, accent: 'text-ink' },
    { label: 'Activos', value: stats.activos, accent: 'text-sage-deep' },
    { label: 'Altas', value: stats.altas, accent: 'text-blue' },
    { label: 'Bajas', value: stats.bajas, accent: 'text-red' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 flex items-end justify-between animate-fade-in-up">
          <div>
            <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Lista general</div>
            <h1 className="font-serif text-4xl font-medium mb-2">{pageTitle}</h1>
            <p className="text-ink-soft text-base">{pageSubtitle}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {statCards.map((s, i) => (
            <div
              key={s.label}
              className="bg-panel border border-line rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-fade-in-up"
              style={{ animationDelay: `${60 + i * 40}ms` }}
            >
              <div className="text-xs text-ink-soft uppercase tracking-wider mb-1">{s.label}</div>
              {isLoading2 ? (
                <Skeleton className="h-8 w-12 mt-1" />
              ) : (
                <div className={`font-serif text-3xl font-medium ${s.accent}`}>
                  <CountUp value={s.value} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
          <input
            type="text"
            placeholder="Buscar paciente…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[220px] max-w-sm px-4 py-2.5 border border-line rounded-lg text-base bg-panel transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage"
          />
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2.5 border border-line rounded-lg text-sm bg-panel text-ink-soft transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="ALTA">Alta</option>
            <option value="BAJA">Baja</option>
            <option value="SIN DATO">Sin dato</option>
          </select>
          {isAdmin && (
            <select
              value={terapeutaFilter}
              onChange={(e) => setTerapeutaFilter(e.target.value)}
              className="px-4 py-2.5 border border-line rounded-lg text-sm bg-panel text-ink-soft transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage"
            >
              <option value="">Todos los terapeutas</option>
              {terapeutas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <Button variant="secondary" className="ml-auto" onClick={() => router.push('/registro')}>
            + Nuevo paciente
          </Button>
        </div>

        <div className="text-xs text-ink-soft uppercase tracking-wider mb-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
          {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
        </div>

        <div
          className="bg-panel border border-line rounded-lg overflow-hidden animate-fade-in-up"
          style={{ animationDelay: '220ms' }}
        >
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Paciente
                </th>
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Terapeuta
                </th>
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Estado
                </th>
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Diagnóstico
                </th>
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  # Sesiones
                </th>
                <th className="text-left text-xs font-medium text-ink-soft uppercase letter-spacing px-4 py-3 bg-gray-50">
                  Expediente
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading2 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-32" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-3.5 w-6" /></td>
                    <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  </tr>
                ))
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-ink-soft py-8 animate-fade-in">
                    No hay pacientes que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient, i) => (
                  <tr
                    key={patient.id}
                    onClick={() => router.push(`/paciente/${patient.id}`)}
                    className="group border-b border-line last:border-0 hover:bg-sage-pale/40 cursor-pointer transition-colors duration-150 animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 15) * 20}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-sage-pale text-sage-deep flex items-center justify-center text-xs font-mono font-medium shrink-0 transition-transform duration-200 group-hover:scale-110">
                          {initials(patient.paciente)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-ink">{patient.paciente}</div>
                          <div className="text-xs text-ink-soft">
                            {[patient.edad ? `${patient.edad} años` : null, patient.sexo]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-soft">{patient.terapeuta || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-mono ${
                          estadoBadge[patient.estatus_en_registro] || 'bg-gray-200 text-ink-soft'
                        }`}
                      >
                        {estadoLabel[patient.estatus_en_registro] || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-soft max-w-sm whitespace-normal">
                      {patient.dx_principal || patient.comorbilidad || patient.diagnostico || (
                        <span className="text-ink-soft/60 italic">Sin capturar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{patient.num_sesiones || 0}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-mono ${
                          patient.expediente_completo
                            ? 'bg-sage-pale text-sage-deep'
                            : 'bg-clay-pale text-clay'
                        }`}
                      >
                        {patient.expediente_completo ? 'Completo' : 'Incompleto'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>

      <Toast />
    </div>
  );
}

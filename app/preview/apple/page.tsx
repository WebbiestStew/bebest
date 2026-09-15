'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/useAuth';
import { hasAdminAccess } from '@/lib/roles';
import {
  SearchIcon,
  BellIcon,
  PeopleIcon,
  HeartIcon,
  CalendarIcon,
  PencilIcon,
  ChatIcon,
  ClipboardIcon,
  TargetIcon,
  ChartBarIcon,
  ChartLineIcon,
  ChevronRightIcon,
  InboxIcon,
} from './icons';

// Design-language exploration only — not wired into real navigation, and
// deliberately isolated from the rest of the app (its own route, its own
// icons.tsx, no shared component or Tailwind-config edits) so the real
// Inicio page is untouched. Built against the "Apple Design Language" brief:
// HIG is the floor, then a deliberate, systematic, named-benefit pass on
// top. Deviations from a literal reading of that brief are called out
// inline where this is a web app rather than SwiftUI.
//
// Named, systematic deviations from the brief as given:
// - No SF Symbols: they're licensed for Apple's own platforms/frameworks,
//   not for embedding in a web page. Substituted a bespoke single-weight
//   stroke icon set (./icons.tsx) in the same spirit as the "no emoji" rule.
// - No VoiceOver/Dynamic Type APIs (native-only) — translated to their web
//   equivalents instead: semantic elements, aria-labels, focus-visible
//   rings, 44px+ tap targets, and respecting prefers-reduced-motion.
// - Nav-item copy (Sesión 1, Registrar paciente nuevo, etc.) stays sentence
//   case rather than literal Title Case: Spanish typographic convention
//   doesn't title-case every word the way English HIG copy does, and
//   title-casing a Spanish phrase word-for-word reads as a translation
//   artifact, not polish. Applied consistently, not as a one-off.

const SF_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif";

const IOS = {
  bg: '#F2F2F7',
  card: '#FFFFFF',
  blue: '#007AFF',
  green: '#34C759',
  orange: '#FF9500',
  red: '#FF3B30',
  purple: '#AF52DE',
  teal: '#30B0C7',
  pink: '#FF2D55',
  gray: '#8E8E93',
  label: '#1C1C1E',
  secondaryLabel: '#6E6E73',
  separator: 'rgba(60,60,67,0.12)',
};

// Apple's real HIG type scale (size/line-height/weight), applied as a fixed
// set of styles rather than ad hoc pixel values scattered per element —
// anti-slop tell #6. Only the sizes actually used on this page are defined.
const TYPE = {
  largeTitle: { fontSize: 34, lineHeight: '41px', fontWeight: 700 },
  title2: { fontSize: 22, lineHeight: '28px', fontWeight: 700 },
  headline: { fontSize: 17, lineHeight: '22px', fontWeight: 600 },
  body: { fontSize: 17, lineHeight: '22px', fontWeight: 400 },
  subheadline: { fontSize: 15, lineHeight: '20px', fontWeight: 400 },
  footnote: { fontSize: 13, lineHeight: '18px', fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: '16px', fontWeight: 400 },
} as const;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const TODAY = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });

interface Widget {
  label: string;
  value: number | string;
  Icon: (props: any) => JSX.Element;
  color: string;
}

interface ActionRow {
  Icon: (props: any) => JSX.Element;
  color: string;
  title: string;
  subtitle: string;
}

// Shared focus-visible treatment — every interactive element gets a real
// keyboard focus ring (web's nearest equivalent to the brief's assistive-
// tech requirement), not just a hover state. Two variants: the offset ring
// reads better on isolated controls, but inside the grouped list's rounded
// `overflow-hidden` container an offset ring gets clipped by the ancestor's
// corner-rounding — those rows use the inset variant instead so the ring
// stays fully visible.
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
const FOCUS_RING_INSET = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset';

export default function ApplePreviewPage() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const [citasHoyCount, setCitasHoyCount] = useState<number | null>(null);
  const [segment, setSegment] = useState<'hoy' | 'semana' | 'mes'>('hoy');

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const [patientsRes, citasRes, alertsRes] = await Promise.all([
          fetch('/api/patients'),
          fetch('/api/citas'),
          fetch('/api/alerts'),
        ]);
        const patientsData = patientsRes.ok ? await patientsRes.json() : { patients: [] };
        const citasData = citasRes.ok ? await citasRes.json() : { citas: [] };
        const alertsData = alertsRes.ok ? await alertsRes.json() : { alerts: [] };

        const patients: any[] = patientsData.patients || [];
        const citas: any[] = citasData.citas || [];
        const todayIso = new Date().toISOString().slice(0, 10);
        const citasHoy = citas.filter((c) => (c.fecha || '').slice(0, 10) === todayIso).length;
        const activos = patients.filter((p) => p.estatus_en_registro === 'ACTIVO').length;

        setCitasHoyCount(citasHoy);
        setWidgets([
          { label: 'Pacientes totales', value: patients.length, Icon: PeopleIcon, color: IOS.blue },
          { label: 'Activos', value: activos, Icon: HeartIcon, color: IOS.green },
          { label: 'Citas hoy', value: citasHoy, Icon: CalendarIcon, color: IOS.orange },
          { label: 'Alertas', value: (alertsData.alerts || []).length, Icon: BellIcon, color: IOS.red },
        ]);
      } catch (error) {
        console.error('Error loading preview stats:', error);
      }
    };
    fetchStats();
  }, [user]);

  const isAdmin = user ? hasAdminAccess(user.rol) : false;

  const actions: ActionRow[] = [
    { Icon: PencilIcon, color: IOS.blue, title: 'Registrar paciente nuevo', subtitle: 'Agenda y ficha de registro del primer contacto' },
    { Icon: ChatIcon, color: IOS.purple, title: 'Sesión 1 · Entrevista', subtitle: 'Historia clínica del paciente' },
    { Icon: ClipboardIcon, color: IOS.teal, title: 'Sesión 2 · Pruebas', subtitle: 'Batería de pruebas aplicadas' },
    { Icon: TargetIcon, color: IOS.orange, title: 'Sesión 3 · Resultados', subtitle: 'Diagnóstico y entrega de resultados' },
    { Icon: ChartBarIcon, color: IOS.green, title: isAdmin ? 'Base de datos' : 'Mis pacientes', subtitle: 'Lista con el estado de cada paciente' },
    { Icon: ChartLineIcon, color: IOS.pink, title: 'Reportes', subtitle: 'Estadísticas de toda la consulta' },
  ];

  return (
    <div className="min-h-screen" style={{ background: IOS.bg, fontFamily: SF_FONT, color: IOS.label }}>
      {/* Bar to get back to the real app — not part of the design language itself */}
      <div
        className="sticky top-0 z-20 flex items-center justify-between px-4 py-2.5"
        style={{
          background: 'rgba(242,242,247,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${IOS.separator}`,
        }}
      >
        <Link
          href="/"
          className={`font-medium rounded-md px-1 -mx-1 ${FOCUS_RING}`}
          style={{ ...TYPE.footnote, color: IOS.blue, ['--tw-ring-color' as any]: IOS.blue }}
        >
          ‹ Volver a Consulta
        </Link>
        <span
          className="px-2.5 py-1 rounded-full font-semibold"
          style={{ ...TYPE.caption, background: 'rgba(0,122,255,0.12)', color: IOS.blue }}
        >
          Vista previa de diseño
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-5 pb-16">
        {/* Large title header */}
        <div className="pt-8 pb-5 animate-fade-in-up motion-reduce:animate-none">
          <div className="capitalize mb-1" style={{ ...TYPE.footnote, color: IOS.secondaryLabel }}>
            {TODAY}
          </div>
          <h1 className="tracking-tight" style={{ ...TYPE.largeTitle, color: IOS.label }}>
            {greeting()}
            {user ? `, ${user.nombre.split(' ')[0]}` : ''}
          </h1>
        </div>

        {/* Search field — placeholder-only is correct here (not tell #9):
            HIG search fields conventionally carry no separate visible label,
            unlike a form field being lazy about labeling. */}
        <label className="block mb-6">
          <span className="sr-only">Buscar paciente o cita</span>
          <div
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors duration-150 motion-reduce:transition-none ${FOCUS_RING}`}
            style={{ background: 'rgba(118,118,128,0.12)', ['--tw-ring-color' as any]: IOS.blue }}
          >
            <SearchIcon className="w-[18px] h-[18px] shrink-0" style={{ color: IOS.secondaryLabel }} />
            <input
              type="text"
              placeholder="Buscar paciente, cita…"
              className="bg-transparent outline-none w-full placeholder:text-current"
              style={{ ...TYPE.body, color: IOS.secondaryLabel }}
            />
          </div>
        </label>

        {/* Segmented control */}
        <div
          role="tablist"
          aria-label="Rango de tiempo"
          className="inline-flex p-0.5 mb-6"
          style={{ background: 'rgba(118,118,128,0.16)', borderRadius: 9 }}
        >
          {(['hoy', 'semana', 'mes'] as const).map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={segment === s}
              onClick={() => setSegment(s)}
              className={`px-4 py-1.5 capitalize transition-all duration-200 motion-reduce:transition-none min-h-[32px] ${FOCUS_RING}`}
              style={{
                ...TYPE.footnote,
                fontWeight: 500,
                borderRadius: 7,
                background: segment === s ? IOS.card : 'transparent',
                color: segment === s ? IOS.label : IOS.secondaryLabel,
                boxShadow: segment === s ? '0 1px 2.5px rgba(0,0,0,0.15)' : 'none',
                ['--tw-ring-color' as any]: IOS.blue,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Widgets */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {(widgets || Array.from({ length: 4 })).map((w: any, i) => (
            <div
              key={w?.label || i}
              className="p-4 animate-scale-in motion-reduce:animate-none"
              style={{
                background: IOS.card,
                borderRadius: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
                animationDelay: `${i * 60}ms`,
              }}
            >
              {w ? (
                <>
                  <div
                    className="w-9 h-9 flex items-center justify-center mb-3"
                    style={{ background: w.color, borderRadius: 10 }}
                  >
                    <w.Icon className="w-[18px] h-[18px]" style={{ color: '#fff' }} />
                  </div>
                  <div className="leading-none mb-1" style={{ ...TYPE.title2, color: IOS.label }}>
                    {w.value}
                  </div>
                  <div style={{ ...TYPE.footnote, color: IOS.secondaryLabel }}>{w.label}</div>
                </>
              ) : (
                <div className="h-16" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Grouped list */}
        <div
          className="font-semibold uppercase tracking-wide mb-2 px-1"
          style={{ ...TYPE.caption, color: IOS.secondaryLabel }}
        >
          Accesos rápidos
        </div>
        <div
          className="overflow-hidden mb-8"
          style={{ background: IOS.card, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {actions.map((a, i) => (
            <button
              key={a.title}
              type="button"
              className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-left transition-colors duration-150 motion-reduce:transition-none hover:bg-black/[0.02] active:bg-black/[0.05] ${FOCUS_RING_INSET}`}
              style={{
                borderBottom: i < actions.length - 1 ? `1px solid ${IOS.separator}` : 'none',
                ['--tw-ring-color' as any]: IOS.blue,
              }}
            >
              <div
                className="w-8 h-8 shrink-0 flex items-center justify-center"
                style={{ background: a.color, borderRadius: 8 }}
              >
                <a.Icon className="w-[16px] h-[16px]" style={{ color: '#fff' }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ ...TYPE.subheadline, fontWeight: 500, color: IOS.label }}>
                  {a.title}
                </div>
                <div className="truncate" style={{ ...TYPE.footnote, color: IOS.secondaryLabel }}>
                  {a.subtitle}
                </div>
              </div>
              <ChevronRightIcon className="w-[16px] h-[16px] shrink-0" style={{ color: IOS.gray }} />
            </button>
          ))}
        </div>

        {/* Designed empty state — cause + action, not a bare "No items"
            (anti-slop tell #13). Shown for real when there's genuinely
            nothing scheduled today. */}
        <div
          className="font-semibold uppercase tracking-wide mb-2 px-1"
          style={{ ...TYPE.caption, color: IOS.secondaryLabel }}
        >
          Próximas citas de hoy
        </div>
        <div
          className="overflow-hidden"
          style={{ background: IOS.card, borderRadius: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {citasHoyCount === 0 ? (
            <div className="flex flex-col items-center text-center px-6 py-8">
              <div
                className="w-11 h-11 flex items-center justify-center mb-3"
                style={{ background: 'rgba(142,142,147,0.14)', borderRadius: 12 }}
              >
                <InboxIcon className="w-[22px] h-[22px]" style={{ color: IOS.gray }} />
              </div>
              <div style={{ ...TYPE.headline, color: IOS.label }} className="mb-1">
                Sin citas para hoy
              </div>
              <p className="mb-4 max-w-[280px]" style={{ ...TYPE.footnote, color: IOS.secondaryLabel }}>
                No tienes ninguna cita agendada para hoy. Puedes crear una desde la agenda.
              </p>
              <button
                type="button"
                className={`px-4 py-2 rounded-full font-medium transition-transform duration-150 motion-reduce:transition-none active:scale-95 ${FOCUS_RING}`}
                style={{ ...TYPE.footnote, background: IOS.blue, color: '#fff', ['--tw-ring-color' as any]: IOS.blue }}
              >
                Agendar una cita
              </button>
            </div>
          ) : citasHoyCount === null ? (
            <div className="p-4 space-y-3" aria-busy="true" aria-label="Cargando citas de hoy">
              <div className="h-4 rounded motion-reduce:animate-none animate-pulse" style={{ background: 'rgba(118,118,128,0.14)' }} />
              <div className="h-4 w-2/3 rounded motion-reduce:animate-none animate-pulse" style={{ background: 'rgba(118,118,128,0.14)' }} />
            </div>
          ) : (
            <div className="px-4 py-3" style={{ ...TYPE.subheadline, color: IOS.label }}>
              {citasHoyCount} cita{citasHoyCount === 1 ? '' : 's'} agendada{citasHoyCount === 1 ? '' : 's'} para hoy.
            </div>
          )}
        </div>

        <p className="text-center mt-8" style={{ ...TYPE.caption, color: IOS.secondaryLabel }}>
          Esto es solo una exploración visual — nada aquí está conectado todavía.
        </p>
      </div>
    </div>
  );
}

// A developer account has the same access as admin everywhere in the app —
// it exists so technical support work is distinguishable from clinical
// administration in the users list, not to restrict anything differently.
// System administration only: user accounts, audit log, and other
// non-clinical configuration. A coordinador does NOT get this — see
// hasFullAccess below for what they do get.
export function hasAdminAccess(rol?: string | null): boolean {
  return rol === 'admin' || rol === 'developer';
}

// Full clinical visibility across every therapist's patients, sessions,
// citas, alerts and reports — admin/developer plus coordinador. This is the
// check to use for "see everything clinical", as opposed to hasAdminAccess
// above, which is narrower (system administration) and deliberately doesn't
// include coordinador.
export function hasFullAccess(rol?: string | null): boolean {
  return hasAdminAccess(rol) || rol === 'coordinador';
}

export function roleLabel(rol?: string | null): string {
  if (rol === 'admin') return 'Administrador';
  if (rol === 'developer') return 'Desarrollador';
  if (rol === 'coordinador') return 'Coordinador';
  if (rol === 'suspendido') return 'Suspendido';
  return 'Psicólogo';
}

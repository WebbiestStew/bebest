// A developer account has the same access as admin everywhere in the app —
// it exists so technical support work is distinguishable from clinical
// administration in the users list, not to restrict anything differently.
export function hasAdminAccess(rol?: string | null): boolean {
  return rol === 'admin' || rol === 'developer';
}

export function roleLabel(rol?: string | null): string {
  if (rol === 'admin') return 'Administrador';
  if (rol === 'developer') return 'Desarrollador';
  return 'Psicólogo';
}

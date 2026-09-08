import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/session';
import { findRecords } from '@/lib/airtable';
import { Patient } from '@/lib/types';
import { normalizeText } from '@/lib/utils';

// Warns (doesn't block) about a possible duplicate while filling out the
// Ficha de Registro — the original CSV import already had a
// filas_originales_mismo_nombre column tracking exactly this problem, so
// it's a real, recurring issue for this clinic, not a hypothetical one.
// Checked against every patient regardless of the requesting user's own
// therapist scope (same "any logged-in staff member can see roster info
// across therapists" convention as /api/therapists) — a duplicate is most
// likely to happen precisely when two different therapists don't know
// about each other's intake.
export async function GET(request: NextRequest) {
  const user = await getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const nombre = (searchParams.get('nombre') || '').trim();
  const telefono = (searchParams.get('telefono') || '').trim();

  if (nombre.length < 4 && !telefono) {
    return NextResponse.json({ matches: [] });
  }

  try {
    const patients = await findRecords<Patient>('pacientes_2025_2026');
    const normalizedNombre = normalizeText(nombre);
    const digitsOnlyPhone = telefono.replace(/\D/g, '');

    const matches = patients.filter((p: any) => {
      const pNombre = normalizeText(p.paciente || '');
      const pPhone = (p.telefono || '').replace(/\D/g, '');

      const phoneMatch = digitsOnlyPhone.length >= 8 && pPhone === digitsOnlyPhone;
      const nameMatch =
        normalizedNombre.length >= 4 &&
        pNombre.length > 0 &&
        (pNombre === normalizedNombre || pNombre.includes(normalizedNombre) || normalizedNombre.includes(pNombre));

      return phoneMatch || nameMatch;
    });

    return NextResponse.json({
      matches: matches.slice(0, 5).map((p: any) => ({
        id: p.id,
        paciente: p.paciente,
        terapeuta: p.terapeuta,
        estatus_en_registro: p.estatus_en_registro,
        telefono: p.telefono,
      })),
    });
  } catch (error) {
    console.error('Error checking for duplicate patients:', error);
    return NextResponse.json({ matches: [] });
  }
}

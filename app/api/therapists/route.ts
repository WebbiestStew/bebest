import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserFromRequest } from '@/lib/session';
import { findRecords } from '@/lib/airtable';
import { Patient } from '@/lib/types';

// Returns the full list of therapist names from the patient roster, regardless
// of the requesting user's role — used to populate "assign a therapist" pickers,
// which need every therapist, not just the ones assigned to the current viewer.
export async function GET(request: NextRequest) {
  const user = getCurrentUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const patients = await findRecords<Patient>('pacientes_2025_2026');
    const names = new Set<string>();
    patients.forEach((p) => {
      if ((p as any).terapeuta) names.add((p as any).terapeuta);
    });

    return NextResponse.json({ therapists: Array.from(names).sort() });
  } catch (error) {
    console.error('Error fetching therapists:', error);
    return NextResponse.json({ error: 'Error al obtener terapeutas' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/session';
import { findRecords, getTableFieldOrder, ALL_TABLE_NAMES } from '@/lib/airtable';

// Raw dump of a single Airtable table — used to show the whole base (every
// table, not just the ones the app has its own UI for) to stakeholders.
// Admin-only since several of these tables are internal migration/staging
// data (LEEME, CALIDAD_DATOS, PLANTILLA_*) not meant for regular therapists.
export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const table = request.nextUrl.searchParams.get('table') || '';
  if (!(ALL_TABLE_NAMES as readonly string[]).includes(table)) {
    return NextResponse.json({ error: 'Tabla desconocida' }, { status: 400 });
  }

  try {
    const [fields, records] = await Promise.all([
      getTableFieldOrder(table),
      findRecords<Record<string, any>>(table),
    ]);

    return NextResponse.json({ fields, records });
  } catch (error) {
    console.error(`Error fetching table ${table}:`, error);
    return NextResponse.json({ error: 'Error al obtener la tabla' }, { status: 500 });
  }
}

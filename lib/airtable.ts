const AIRTABLE_API_URL = 'https://api.airtable.com/v0';
const BASE_ID = process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID;
const API_TOKEN = process.env.AIRTABLE_API_TOKEN;

const headers = {
  'Authorization': `Bearer ${API_TOKEN}`,
  'Content-Type': 'application/json',
};

// Helper to find records
export async function findRecords<T>(
  table: string,
  filterByFormula?: string
): Promise<(T & { id: string })[]> {
  try {
    const records: any[] = [];
    let offset: string | undefined;

    do {
      const params = new URLSearchParams({
        pageSize: '100',
        ...(filterByFormula ? { filterByFormula } : {}),
        ...(offset ? { offset } : {}),
      });

      const response = await fetch(
        `${AIRTABLE_API_URL}/${BASE_ID}/${table}?${params}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.statusText}`);
      }

      const data = await response.json();
      records.push(...(data.records || []));
      offset = data.offset;
    } while (offset);

    return records.map((record: any) => ({
      id: record.id,
      ...record.fields,
    })) as (T & { id: string })[];
  } catch (error) {
    console.error(`Error fetching records from ${table}:`, error);
    throw error;
  }
}

// Helper to create record
export async function createRecord<T>(
  table: string,
  fields: any
): Promise<T & { id: string }> {
  try {
    const response = await fetch(`${AIRTABLE_API_URL}/${BASE_ID}/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        records: [{ fields }],
        typecast: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();
    const record = data.records[0];

    return {
      id: record.id,
      ...record.fields,
    } as T & { id: string };
  } catch (error) {
    console.error(`Error creating record in ${table}:`, error);
    throw error;
  }
}

// Helper to update record
export async function updateRecord<T>(
  table: string,
  recordId: string,
  fields: any
): Promise<T & { id: string }> {
  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${BASE_ID}/${table}/${recordId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields, typecast: true }),
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      ...data.fields,
    } as T & { id: string };
  } catch (error) {
    console.error(`Error updating record in ${table}:`, error);
    throw error;
  }
}

// Helper to create several records in one go (chunked at Airtable's 10-per-request limit)
export async function createRecords<T>(table: string, fieldsList: any[]): Promise<(T & { id: string })[]> {
  const created: (T & { id: string })[] = [];
  for (let i = 0; i < fieldsList.length; i += 10) {
    const chunk = fieldsList.slice(i, i + 10);
    const response = await fetch(`${AIRTABLE_API_URL}/${BASE_ID}/${table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ records: chunk.map((fields) => ({ fields })), typecast: true }),
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();
    created.push(
      ...data.records.map((record: any) => ({ id: record.id, ...record.fields }))
    );
  }
  return created;
}

// Helper to upload a file to an attachment field on a record.
// Uses Airtable's dedicated content-upload endpoint, not the regular record API.
export async function uploadAttachment(
  table: string,
  recordId: string,
  field: string,
  file: { filename: string; contentType: string; base64: string }
): Promise<any> {
  const response = await fetch(
    `https://content.airtable.com/v0/${BASE_ID}/${recordId}/${field}/uploadAttachment`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contentType: file.contentType,
        file: file.base64,
        filename: file.filename,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Airtable upload error: ${errorBody}`);
  }

  return response.json();
}

// Helper to get single record by ID
export async function getRecord<T>(
  table: string,
  recordId: string
): Promise<(T & { id: string }) | null> {
  try {
    const response = await fetch(
      `${AIRTABLE_API_URL}/${BASE_ID}/${table}/${recordId}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      ...data.fields,
    } as T & { id: string };
  } catch (error) {
    console.error(`Error fetching record from ${table}:`, error);
    return null;
  }
}

// Every table in the base, in the same order they appear as tabs in Airtable.
// Kept as a fixed allowlist so any route exposing raw table data can't be made
// to query an arbitrary/unintended table name.
export const ALL_TABLE_NAMES = [
  'LEEME',
  'PACIENTES_2025_2026',
  'PACIENTES_2025',
  'PACIENTES_2026',
  'ACTIVOS_FUERA_MUESTRA',
  'BAJAS_FECHA_BAJA_2025_2026',
  'REGISTRO_2025_2026_FILTRADO',
  'SEGUIMIENTO_LIMPIO',
  'CALIDAD_DATOS',
  'PLANTILLA_CITAS',
  'PLANTILLA_INGRESOS',
  'RESUMEN',
  'GRAFICAS',
  'users',
  'alerts',
  'citas',
  'sugerencias',
] as const;

// Returns field names in the table's actual column order (via the Meta API),
// since plain records only include fields that have a value — the union of
// keys across fetched rows isn't a reliable or stable column order.
export async function getTableFieldOrder(table: string): Promise<string[]> {
  const response = await fetch(
    `${AIRTABLE_API_URL}/meta/bases/${BASE_ID}/tables`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Airtable Meta API error: ${response.statusText}`);
  }

  const data = await response.json();
  const match = (data.tables || []).find((t: any) => t.name === table);
  return match ? match.fields.map((f: any) => f.name) : [];
}

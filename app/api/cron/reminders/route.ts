import { NextRequest, NextResponse } from 'next/server';
import { findRecords, getRecord, updateRecord } from '@/lib/airtable';
import { Cita, Patient } from '@/lib/types';
import { sendAppointmentReminderEmail } from '@/lib/email';

// Not user-triggered — meant to be hit once a day by a scheduler (see
// vercel.json's `crons` entry, or any external cron service pointed at this
// URL) rather than from the app itself, so it authenticates with a shared
// secret instead of a logged-in session. Accepts either a `secret` query
// param or an `Authorization: Bearer <CRON_SECRET>` header (Vercel Cron can
// be configured to send the latter automatically).
function isAuthorized(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) return false;
  const fromQuery = request.nextUrl.searchParams.get('secret');
  const authHeader = request.headers.get('authorization');
  const fromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return fromQuery === configured || fromHeader === configured;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const allCitas = await findRecords<Cita>('citas');
    const due = (allCitas as any[]).filter(
      (c) => c.estado === 'Programada' && (c.fecha || '').slice(0, 10) === tomorrowStr && !c.recordatorio_enviado
    );

    let sent = 0;
    let skippedNoEmail = 0;

    for (const cita of due) {
      const patientId = (cita.paciente || [])[0];
      const patient = patientId ? await getRecord<Patient>('pacientes_2025_2026', patientId) : null;
      const email = (patient as any)?.email;

      if (!email) {
        skippedNoEmail++;
        continue;
      }

      const ok = await sendAppointmentReminderEmail({
        to: email,
        pacienteNombre: cita.paciente_nombre,
        fecha: cita.fecha,
        hora: cita.hora,
        terapeuta: cita.terapeuta,
      });

      if (ok) {
        sent++;
        // Best-effort: if `citas` doesn't have a recordatorio_enviado column
        // yet, this throws and is swallowed — worst case, a cita gets a
        // duplicate reminder on a second run the same day, which is a far
        // smaller problem than silently failing the whole batch.
        try {
          await updateRecord('citas', cita.id, { recordatorio_enviado: true });
        } catch (error) {
          console.error(
            'Could not mark reminder as sent — does the citas table have a recordatorio_enviado (checkbox) column?',
            error
          );
        }
      }
    }

    return NextResponse.json({ checked: due.length, sent, skippedNoEmail });
  } catch (error) {
    console.error('Error sending appointment reminders:', error);
    return NextResponse.json({ error: 'Error al enviar recordatorios' }, { status: 500 });
  }
}

// User & Auth types
export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'admin' | 'user' | 'developer' | 'coordinador' | 'suspendido';
  created_at?: string;
}

// Patient types
// Field names match the actual Airtable table (pacientes_2025_2026), which was
// bulk-imported from the clinic's roster CSV using the CSV's own column names.
export interface Patient {
  id: string;
  // Roster fields (present on the 223 imported patients)
  paciente_key?: string;
  paciente: string;
  edad?: number;
  rango_edad?: string;
  sexo?: string;
  fecha_ingreso?: string;
  anio_ingreso?: number;
  mes_ingreso?: string;
  frecuencia?: string;
  terapeuta?: string;
  coterapeuta?: string;
  estatus_en_registro?: 'ACTIVO' | 'ALTA' | 'BAJA' | 'SIN DATO' | string;
  fecha_baja?: string;
  anio_baja?: number;
  mes_baja?: string;
  diagnostico?: string;
  comorbilidad?: string;
  institucion_procedencia?: string;
  tipo_ingreso?: string;
  coincide_con_seguimiento?: string;
  filas_originales_mismo_nombre?: number;
  // Intake fields (captured via the app's "Ficha de Registro" form, matching
  // the clinic's "Registro inicial de pacientes adultos" Google Form).
  // motivo_consulta stores a JSON array of selected concerns (see
  // parseMotivoConsulta/serializeMotivoConsulta in lib/utils.ts) — same
  // JSON-in-text-field pattern as plan_tratamiento, since Airtable has no
  // array field type and the real form is a "select all that apply" list.
  telefono?: string;
  motivo_consulta?: string;
  fecha_nacimiento?: string;
  estado_civil?: string;
  ocupacion?: string;
  email?: string;
  como_se_entero?: string;
  // Domicilio
  calle?: string;
  // numero_ext_int is the legacy combined field (kept, unused going forward —
  // same "don't delete old columns" pattern as other superseded fields here).
  numero_ext_int?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  municipio?: string;
  estado_direccion?: string;
  pais?: string;
  // Contacto de emergencia
  contacto_emergencia_nombre?: string;
  contacto_emergencia_relacion?: string;
  contacto_emergencia_telefono?: string;
  contacto_emergencia_email?: string;
  // Motivo de la solicitud + profesional que canalizó (Q23-27 only apply
  // when motivo_solicitud is "Solicitud por parte del Psiquiatra" or "Otros")
  motivo_solicitud?: string;
  profesional_nombre?: string;
  profesional_tipo?: string;
  profesional_telefono?: string;
  profesional_email?: string;
  profesional_autoriza_contacto?: boolean;
  // Contrato Terapéutico y Políticas para Pacientes (bebest) — the signed
  // physical copy, if uploaded, lives in `documentos` like the INE does.
  contrato_terapeutico_aceptado?: boolean;
  // Clinical fields (captured progressively via the Sesión 1/2/3 workflow)
  historia_clinica?: string;
  // JSON-serialized string[] of the standard test battery applied (Beck,
  // SCL-90-R, ISRA, SCID-II, Test de Creencias de Ellis, or "Otra: ...") —
  // see parseBateriaPruebas/serializeBateriaPruebas in lib/utils.ts. Scores
  // and interpretation stay on the signed physical "Informe de Resultados",
  // same as the rest of that document — this just tracks which were applied.
  bateria_pruebas?: string;
  observaciones_pruebas?: string;
  // Clinical formulation fields for the Informe de Resultados (Sections IV
  // and V of the physical document) — captured alongside the battery of
  // tests since that's where Diego's own note grouped them, even though the
  // physical document prints them before the tests section.
  factores_predisponentes?: string;
  recursos_paciente?: string;
  // Per-test file-or-interpretation follow-up — see PruebaInterpretacion in lib/utils.ts.
  bateria_interpretaciones?: string;
  dx_principal?: string;
  dx_principal_codigo?: string;
  dx_comorbilidad?: string;
  dx_comorbilidad_codigo?: string;
  dx_otros_problemas?: string;
  // Resolved DSM-5 code for dx_otros_problemas, same pattern as
  // dx_principal_codigo/dx_comorbilidad_codigo above.
  dx_otros_problemas_codigo?: string;
  // JSON-serialized DxAdicional[] (see lib/utils.ts) — an open-ended list of
  // further diagnoses/problems beyond the three fixed slots above, each with
  // its own optional resolved code. Same JSON-in-text-field pattern as
  // plan_tratamiento, since Airtable has no array-of-objects field type.
  dx_otros_adicionales?: string;
  // JSON-serialized DxSnapshot (see lib/utils.ts) — a frozen copy of the four
  // Dx fields above, taken the moment a Re-ingreso clears them for a new
  // admission. dx_principal etc. always reflect the CURRENT admission's
  // diagnosis (whichever number that is); this holds the original one.
  dx_1era_vez?: string;
  // JSON-serialized PlanObjetivo[] (see lib/utils.ts) — the real form is a
  // table of numbered objetivos each paired with técnicas, not a paragraph.
  // Stored as a string because Airtable has no array-of-objects field type.
  plan_tratamiento?: string;
  // Each requires its own uploaded supporting document before it can be
  // checked (see plan_no_suicidio_doc/consentimiento_informado_doc below).
  plan_no_suicidio?: boolean;
  consentimiento_informado?: boolean;
  plan_no_suicidio_doc?: { id: string; url: string; filename: string; size: number; type: string }[];
  consentimiento_informado_doc?: { id: string; url: string; filename: string; size: number; type: string }[];
  referido_psiquiatria?: boolean;
  // Psiquiatra referral details (Sesión 3) — shown when referido_psiquiatria
  // is checked. psiquiatra_datos_pendientes means "referral discussed, no
  // contact info yet" — checking it fires an admin alert to follow up.
  psiquiatra_nombre?: string;
  // Superseded by the two fields below (split into phone/email so each is
  // independently useful — e.g. dialable — instead of one free-text blob).
  // Kept rather than deleted, same as other superseded fields in this file,
  // since existing patients may already have it filled in.
  psiquiatra_contacto?: string;
  psiquiatra_telefono?: string;
  psiquiatra_email?: string;
  psiquiatra_datos_pendientes?: boolean;
  psiquiatra_notas?: string;
  // Stamped when Sesión 3 (diagnóstico + plan) is saved — the date the
  // clinical work behind the Informe de Resultados was actually done, not
  // whatever day someone happens to click "download" on the PDF later.
  fecha_informe_completado?: string;
  // Signed informe de resultados (Sesión 3) — the clinic works off the
  // physical signed document, uploaded via `documentos`. These three used to
  // be per-signer checkboxes in the UI (Round 1 of the form-updates thread);
  // Diego asked to remove them, so they're unused now — kept in the type
  // (and the Airtable columns) rather than deleted, same as other
  // superseded fields in this file.
  informe_firmado_terapeuta?: boolean;
  informe_firmado_supervisor?: boolean;
  informe_firmado_paciente?: boolean;
  // JSON-serialized NotaGeneral[] (see lib/utils.ts) — freeform timestamped
  // notes a therapist can add any time from the ficha itself, independent of
  // the Sesión 1/2/3 flow and of marking a cita "Completada" (which writes
  // to `notas_sesion` on the cita, not here). For things with no natural
  // home otherwise — a phone call, something a patient mentioned, a
  // reminder for next time.
  notas_generales?: string;
  num_sesiones?: number;
  num_inasistencias?: number;
  expediente_completo?: boolean;
  etapa_actual?: 'Primer contacto' | 'Evaluación' | 'Tratamiento';
  // `documentos` above stays as the general/legacy bucket for anything
  // uploaded before this split existed. New uploads go into one of these
  // four instead, since Airtable attachments can't carry their own
  // per-file category metadata — the only way to actually section them is
  // separate fields, same trick as plan_no_suicidio_doc above.
  documentos_datos_personales?: { id: string; url: string; filename: string; size: number; type: string }[];
  documentos_trabajo?: { id: string; url: string; filename: string; size: number; type: string }[];
  documentos_sesiones?: { id: string; url: string; filename: string; size: number; type: string }[];
  documentos_altas_bajas?: { id: string; url: string; filename: string; size: number; type: string }[];
  created_at?: string;
  updated_at?: string;
}

// Alert types
export interface Alert {
  id: string;
  paciente_id: string;
  paciente_nombre?: string;
  paso_incompleto: string;
  usuario_id: string;
  usuario_nombre?: string;
  fecha_hora: string;
  campos_faltantes: number;
  notificado: boolean;
  created_at?: string;
}

// Appointment types
export interface Cita {
  id: string;
  paciente_nombre: string;
  paciente?: string[];
  terapeuta: string;
  fecha: string;
  hora: string;
  notas?: string;
  notas_sesion?: string;
  estado: 'Programada' | 'Completada' | 'Cancelada' | 'No asistió';
  created_at?: string;
  // Set by app/api/cron/reminders/route.ts once the day-before reminder
  // email goes out, so the same appointment doesn't get reminded twice if
  // the cron fires more than once in a day.
  recordatorio_enviado?: boolean;
}

// Suggestion / feedback types
export interface Sugerencia {
  id: string;
  mensaje: string;
  usuario_nombre: string;
  usuario_rol: string;
  pagina?: string;
  fecha_hora: string;
  estado: 'Nueva' | 'Revisada' | 'Hecha';
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form submission state
export interface FormState {
  isSubmitting: boolean;
  error?: string;
  success?: boolean;
}

// User & Auth types
export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'user' | 'developer';
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
  numero_ext_int?: string;
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
  dx_principal?: string;
  dx_principal_codigo?: string;
  dx_comorbilidad?: string;
  dx_comorbilidad_codigo?: string;
  dx_otros_problemas?: string;
  // JSON-serialized PlanObjetivo[] (see lib/utils.ts) — the real form is a
  // table of numbered objetivos each paired with técnicas, not a paragraph.
  // Stored as a string because Airtable has no array-of-objects field type.
  plan_tratamiento?: string;
  plan_no_suicidio?: boolean;
  consentimiento_informado?: boolean;
  referido_psiquiatria?: boolean;
  // Signed informe de resultados (Sesión 3) — the clinic works off the
  // physical signed document (uploaded via `documentos`); these just track
  // who has signed it, one checkbox per signer.
  informe_firmado_terapeuta?: boolean;
  informe_firmado_supervisor?: boolean;
  informe_firmado_paciente?: boolean;
  num_sesiones?: number;
  num_inasistencias?: number;
  expediente_completo?: boolean;
  etapa_actual?: 'Primer contacto' | 'Evaluación' | 'Tratamiento';
  documentos?: { id: string; url: string; filename: string; size: number; type: string }[];
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

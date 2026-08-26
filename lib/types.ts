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
  // Intake fields (captured via the app's "Nuevo paciente" form)
  telefono?: string;
  motivo_consulta?: string;
  // Clinical fields (captured progressively via the Sesión 1/2/3 workflow)
  historia_clinica?: string;
  bateria_pruebas?: string;
  observaciones_pruebas?: string;
  reusar_pruebas?: boolean;
  dx_principal?: string;
  dx_comorbilidad?: string;
  dx_otros_problemas?: string;
  plan_tratamiento?: string;
  plan_no_suicidio?: boolean;
  consentimiento_informado?: boolean;
  referido_psiquiatria?: boolean;
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

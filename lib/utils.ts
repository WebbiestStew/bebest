import { Patient } from './types';

// Toast notification helper
export function showToast(message: string, isError: boolean = false) {
  const event = new CustomEvent('showToast', {
    detail: { message, isError },
  });
  window.dispatchEvent(event);
}

// Validate email
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validate phone (basic)
export function validatePhone(phone: string): boolean {
  const re = /^[\d\s\-\+\(\)]+$/;
  return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

// Format date for display
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Format datetime for display
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Check if patient record is complete
export function isPatientComplete(patient: Patient): boolean {
  const p = patient as any;
  return !!(
    p.dx_principal &&
    p.plan_tratamiento &&
    p.plan_no_suicidio &&
    p.consentimiento_informado &&
    p.referido_psiquiatria
  );
}

// Get missing fields for a patient at a given stage
export function getMissingFields(
  patient: Patient,
  stage: 'Primer contacto' | 'Evaluación' | 'Tratamiento'
): string[] {
  const missing: string[] = [];

  if (stage === 'Primer contacto') {
    if (!patient.nombre) missing.push('Nombre');
    if (!patient.telefono) missing.push('Teléfono');
    if (!patient.motivo_consulta) missing.push('Motivo de consulta');
  }

  if (stage === 'Evaluación') {
    if (!patient.historia_clinica) missing.push('Historia Clínica');
    if (!patient.bateria_pruebas) missing.push('Batería de Pruebas');
    if (!patient.observaciones_pruebas) missing.push('Observaciones de Pruebas');
  }

  if (stage === 'Tratamiento') {
    if (!patient.dx_principal) missing.push('Dx Principal');
    if (!patient.plan_tratamiento) missing.push('Plan de Tratamiento');
    if (!patient.plan_no_suicidio) missing.push('Plan de No Suicidio');
    if (!patient.consentimiento_informado) missing.push('Consentimiento Informado');
    if (!patient.referido_psiquiatria) missing.push('Referencia a Psiquiatría');
  }

  return missing;
}

// Delay helper (for debouncing, etc.)
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Retry helper for API calls
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 400
): Promise<T> {
  let lastError;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        await delay(delayMs * (i + 1));
      }
    }
  }
  throw lastError;
}

// Sanitize user input
export function sanitize(input: string): string {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

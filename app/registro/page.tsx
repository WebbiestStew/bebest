'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Toast } from '@/components/Toast';
import { Button, BackButton } from '@/components/Button';
import { Input, Select, Checkbox } from '@/components/FormInputs';
import { FormPrintPreview, PreviewSection, PreviewField } from '@/components/FormPrintPreview';
import { useAuth } from '@/lib/useAuth';
import { hasAdminAccess } from '@/lib/roles';
import { uploadPatientDocument, serializeMotivoConsulta } from '@/lib/utils';

const SEXO_OPTIONS = ['Masculino', 'Femenino', 'Prefiero no decirlo'];
const ESTADO_CIVIL_OPTIONS = ['Soltero/a', 'Casado/a', 'Divorciado/a', 'Viudo/a', 'Unión Libre', 'Otros'];
const ESTATUS_OPTIONS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'BAJA', label: 'Baja' },
  { value: 'Reingreso', label: 'Reingreso' },
];
const RELACION_OPTIONS = ['Padre', 'Madre', 'Hermano/a', 'Pareja', 'Amigo/a', 'Tutor', 'Otros'];
const MOTIVO_SOLICITUD_OPTIONS = [
  'Solicitud por parte del Psiquiatra',
  'Solicitud por parte de mi trabajo',
  'Solicitud por iniciativa propia',
  'Solicitud por parte de mi pareja/familia',
  'Otros',
];
const PROFESIONAL_TIPO_OPTIONS = ['Psiquiatra', 'Neurólogo', 'Nutriólogo', 'Otros'];
const ENTERO_OPTIONS = [
  'Recomendación de un familiar/amigo',
  'Facebook',
  'Instagram',
  'Google',
  'Página web',
  'Anuncio/panorámico',
  'Otro',
];
const PROBLEMAS_OPTIONS = [
  'Ansiedad/ataques de pánico',
  'Problemas de regulación emocional',
  'Control de impulsos',
  'Duelo (pérdida de un familiar, mascota)',
  'Tristeza persistente',
  'Problemas de baja tolerancia a la frustración',
  'Baja Autoestima',
  'Culpa',
  'Miedos/Fobias',
  'Trastorno Obsesivo Compulsivo',
  'Dificultades en la interacción social',
  'Problemas en la relación de pareja',
  'Problemas en relaciones familiares',
  'Autolesiones/conductas suicidas',
  'Problemas laborales/Estrés laboral',
  'Falta de motivación',
  'Situaciones de violencia/abuso',
  'Problemas de hábitos (Sueño/alimentación)',
  'Tics/hábitos nerviosos',
  'Dependencia afectiva',
  'Problemas de procrastinación',
  'Problemas en la temática de la sexualidad',
  'Crisis existencial/falta de sentido de vida',
];

// Only these motivo_solicitud answers show the "profesional que canaliza"
// section — matches the real form's "Ir a la pregunta 28" skip logic.
const MUESTRA_SECCION_PROFESIONAL = ['Solicitud por parte del Psiquiatra', 'Otros'];

// Age is auto-filled from DOB but stays editable (not read-only) — a manual
// correction should still be possible if the date is ever slightly off.
function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age >= 0 ? age : null;
}

export default function RegistroPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [therapists, setTherapists] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ineFile, setIneFile] = useState<File | null>(null);
  const [contratoFile, setContratoFile] = useState<File | null>(null);
  const [problemas, setProblemas] = useState<string[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<
    { id: string; paciente: string; terapeuta?: string; estatus_en_registro?: string; telefono?: string }[]
  >([]);

  const [formData, setFormData] = useState({
    terapeuta: '',
    coterapeuta: '',
    fecha_cita: '',
    nombre: '',
    fecha_nacimiento: '',
    edad: '',
    sexo: '',
    estado_civil: '',
    estado_civil_otro: '',
    ocupacion: '',
    email: '',
    telefono: '',
    calle: '',
    numero_exterior: '',
    numero_interior: '',
    colonia: '',
    municipio: '',
    estado_direccion: '',
    pais: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_email: '',
    contacto_emergencia_telefono: '',
    contacto_emergencia_relacion: '',
    contacto_emergencia_relacion_otro: '',
    problemasOtro: '',
    motivo_solicitud: '',
    motivo_solicitud_otro: '',
    profesional_nombre: '',
    profesional_tipo: '',
    profesional_tipo_otro: '',
    profesional_telefono: '',
    profesional_email: '',
    profesional_autoriza: '',
    entero: '',
    enteroDetalle: '',
    contratoAceptado: false,
    estatus_en_registro: 'ACTIVO',
  });

  useEffect(() => {
    // Full roster regardless of who's filling out the form — /api/patients is
    // scoped to "my patients only" for non-admins, which would hide every
    // other therapist from this picker.
    const fetchTherapists = async () => {
      try {
        const res = await fetch('/api/therapists');
        const data = await res.json();
        setTherapists(data.therapists || []);
      } catch (error) {
        console.error('Error fetching therapists:', error);
      }
    };
    fetchTherapists();
  }, []);

  // Debounced duplicate check — waits for a pause in typing rather than
  // firing on every keystroke, and only once there's enough of a name (or a
  // full phone number) to be worth checking.
  useEffect(() => {
    if (formData.nombre.trim().length < 4 && !formData.telefono.trim()) {
      setDuplicateMatches([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (formData.nombre.trim()) params.set('nombre', formData.nombre.trim());
        if (formData.telefono.trim()) params.set('telefono', formData.telefono.trim());
        const res = await fetch(`/api/patients/duplicates?${params}`);
        const data = await res.json();
        setDuplicateMatches(data.matches || []);
      } catch (error) {
        console.error('Error checking for duplicate patients:', error);
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [formData.nombre, formData.telefono]);

  if (isLoading) return null;
  if (!user) return null;

  const isAdmin = hasAdminAccess(user.rol);

  const showProfesional = MUESTRA_SECCION_PROFESIONAL.includes(formData.motivo_solicitud);

  const toggleProblema = (value: string) => {
    setProblemas((prev) => (prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value]));
  };

  const required = (v: string) => (v.trim() ? undefined : 'Este campo es obligatorio.');

  const validateForm = () => {
    const e: Record<string, string | undefined> = {};
    e.terapeuta = required(formData.terapeuta);
    e.fecha_cita = required(formData.fecha_cita);
    e.nombre = required(formData.nombre);
    e.fecha_nacimiento = required(formData.fecha_nacimiento);
    e.edad = required(formData.edad);
    e.sexo = required(formData.sexo);
    e.estado_civil = required(formData.estado_civil);
    if (formData.estado_civil === 'Otros') e.estado_civil_otro = required(formData.estado_civil_otro);
    e.ocupacion = required(formData.ocupacion);
    e.email = required(formData.email);
    e.telefono = required(formData.telefono);
    e.calle = required(formData.calle);
    e.numero_exterior = required(formData.numero_exterior);
    e.colonia = required(formData.colonia);
    e.municipio = required(formData.municipio);
    e.estado_direccion = required(formData.estado_direccion);
    e.pais = required(formData.pais);
    if (!ineFile) e.ine = 'Agrega la copia del INE (ambos lados).';
    e.contacto_emergencia_nombre = required(formData.contacto_emergencia_nombre);
    e.contacto_emergencia_email = required(formData.contacto_emergencia_email);
    e.contacto_emergencia_telefono = required(formData.contacto_emergencia_telefono);
    e.contacto_emergencia_relacion = required(formData.contacto_emergencia_relacion);
    if (formData.contacto_emergencia_relacion === 'Otros') {
      e.contacto_emergencia_relacion_otro = required(formData.contacto_emergencia_relacion_otro);
    }
    if (problemas.length === 0) e.problemas = 'Selecciona al menos una opción.';
    if (problemas.includes('Otros')) e.problemasOtro = required(formData.problemasOtro);
    e.motivo_solicitud = required(formData.motivo_solicitud);
    if (formData.motivo_solicitud === 'Otros') e.motivo_solicitud_otro = required(formData.motivo_solicitud_otro);
    if (showProfesional) {
      e.profesional_nombre = required(formData.profesional_nombre);
      e.profesional_tipo = required(formData.profesional_tipo);
      if (formData.profesional_tipo === 'Otros') e.profesional_tipo_otro = required(formData.profesional_tipo_otro);
      e.profesional_telefono = required(formData.profesional_telefono);
      if (!formData.profesional_autoriza) e.profesional_autoriza = 'Este campo es obligatorio.';
    }
    e.entero = required(formData.entero);
    if (formData.entero === 'Recomendación de un familiar/amigo' || formData.entero === 'Otro') {
      e.enteroDetalle = required(formData.enteroDetalle);
    }
    if (!formData.contratoAceptado) e.contratoAceptado = 'Debes leer y aceptar el contrato terapéutico.';

    const cleaned = Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Record<string, string>;
    setErrors(cleaned);
    return Object.keys(cleaned).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;

    const problemasFinal = [...problemas.filter((p) => p !== 'Otros')];
    if (problemas.includes('Otros')) problemasFinal.push(`Otros: ${formData.problemasOtro.trim()}`);

    const estadoCivilFinal =
      formData.estado_civil === 'Otros' ? `Otros: ${formData.estado_civil_otro.trim()}` : formData.estado_civil;
    const relacionFinal =
      formData.contacto_emergencia_relacion === 'Otros'
        ? `Otros: ${formData.contacto_emergencia_relacion_otro.trim()}`
        : formData.contacto_emergencia_relacion;
    const motivoSolicitudFinal =
      formData.motivo_solicitud === 'Otros'
        ? `Otros: ${formData.motivo_solicitud_otro.trim()}`
        : formData.motivo_solicitud;
    const profesionalTipoFinal =
      formData.profesional_tipo === 'Otros' ? `Otros: ${formData.profesional_tipo_otro.trim()}` : formData.profesional_tipo;
    const enteroFinal =
      formData.entero === 'Recomendación de un familiar/amigo' || formData.entero === 'Otro'
        ? `${formData.entero}: ${formData.enteroDetalle.trim()}`
        : formData.entero;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente: formData.nombre.trim(),
          telefono: formData.telefono.trim(),
          terapeuta: formData.terapeuta,
          ...(formData.coterapeuta ? { coterapeuta: formData.coterapeuta } : {}),
          fecha_ingreso: formData.fecha_cita,
          motivo_consulta: serializeMotivoConsulta(problemasFinal),
          edad: parseInt(formData.edad, 10),
          fecha_nacimiento: formData.fecha_nacimiento,
          sexo: formData.sexo.toUpperCase(),
          estado_civil: estadoCivilFinal,
          ocupacion: formData.ocupacion.trim(),
          email: formData.email.trim(),
          calle: formData.calle.trim(),
          numero_exterior: formData.numero_exterior.trim(),
          numero_interior: formData.numero_interior.trim(),
          colonia: formData.colonia.trim(),
          municipio: formData.municipio.trim(),
          estado_direccion: formData.estado_direccion.trim(),
          pais: formData.pais.trim(),
          contacto_emergencia_nombre: formData.contacto_emergencia_nombre.trim(),
          contacto_emergencia_email: formData.contacto_emergencia_email.trim(),
          contacto_emergencia_telefono: formData.contacto_emergencia_telefono.trim(),
          contacto_emergencia_relacion: relacionFinal,
          motivo_solicitud: motivoSolicitudFinal,
          ...(showProfesional
            ? {
                profesional_nombre: formData.profesional_nombre.trim(),
                profesional_tipo: profesionalTipoFinal,
                profesional_telefono: formData.profesional_telefono.trim(),
                profesional_email: formData.profesional_email.trim(),
                profesional_autoriza_contacto: formData.profesional_autoriza === 'Sí',
              }
            : {}),
          como_se_entero: enteroFinal,
          contrato_terapeutico_aceptado: formData.contratoAceptado,
          estatus_en_registro: formData.estatus_en_registro,
          etapa_actual: 'Primer contacto',
          expediente_completo: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        const uploadDoc = async (file: File) => {
          try {
            await uploadPatientDocument(data.patient.id, file);
          } catch {
            // Patient is already saved — a failed upload shouldn't block the
            // registration; the file can be added later from the patient page.
          }
        };

        if (ineFile) await uploadDoc(ineFile);
        if (contratoFile) await uploadDoc(contratoFile);

        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: 'Ficha guardada correctamente.', isError: false },
          })
        );
        router.push('/');
      } else {
        const error = await response.json();
        window.dispatchEvent(
          new CustomEvent('showToast', {
            detail: { message: error.error || 'Error al guardar', isError: true },
          })
        );
      }
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent('showToast', {
          detail: { message: 'Error al guardar la ficha', isError: true },
        })
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Derived display values — shared between the on-screen preview and the
  // downloadable PDF so the two never drift apart.
  const estadoCivilPreview =
    formData.estado_civil === 'Otros' ? formData.estado_civil_otro : formData.estado_civil;
  const relacionPreview =
    formData.contacto_emergencia_relacion === 'Otros'
      ? formData.contacto_emergencia_relacion_otro
      : formData.contacto_emergencia_relacion;
  const problemasPreview = problemas.length
    ? problemas.filter((p) => p !== 'Otros').concat(problemas.includes('Otros') ? [formData.problemasOtro] : []).join(', ')
    : undefined;
  const motivoSolicitudPreview =
    formData.motivo_solicitud === 'Otros' ? formData.motivo_solicitud_otro : formData.motivo_solicitud;
  const enteroPreview =
    formData.entero === 'Recomendación de un familiar/amigo' || formData.entero === 'Otro'
      ? `${formData.entero}: ${formData.enteroDetalle}`
      : formData.entero;
  const profesionalTipoPreview =
    formData.profesional_tipo === 'Otros' ? formData.profesional_tipo_otro : formData.profesional_tipo;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg">
      <Navigation user={user} />

      <main className="flex-1 overflow-auto p-4 sm:p-8 lg:p-12">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start max-w-6xl">
        <div className="max-w-2xl print:hidden">
        <BackButton onClick={() => router.push('/')} />

        <div className="mb-8 animate-fade-in-up">
          <div className="text-sm font-mono text-sage-deep uppercase tracking-widest mb-2">Primer contacto</div>
          <h1 className="font-serif text-4xl font-medium mb-2">Ficha de Registro</h1>
          <p className="text-ink-soft text-base">
            Registro inicial de pacientes adultos — llénala la primera vez que un paciente agenda cita.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-panel border border-line rounded-2xl p-8 space-y-6 animate-fade-in-up"
          style={{ animationDelay: '110ms' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Select
              label="Terapeuta asignado"
              options={therapists.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              value={formData.terapeuta}
              onChange={(e) => setFormData({ ...formData, terapeuta: e.target.value })}
              error={errors.terapeuta}
              required
            />
            <Select
              label="Coterapeuta (opcional)"
              placeholder="Ninguno"
              options={therapists
                .filter((t) => t !== formData.terapeuta)
                .map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
              value={formData.coterapeuta}
              onChange={(e) => setFormData({ ...formData, coterapeuta: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Fecha de registro"
              type="date"
              value={formData.fecha_cita}
              onChange={(e) => setFormData({ ...formData, fecha_cita: e.target.value })}
              error={errors.fecha_cita}
              required
            />
            <Select
              label="Estatus en registro"
              options={ESTATUS_OPTIONS}
              value={formData.estatus_en_registro}
              onChange={(e) => setFormData({ ...formData, estatus_en_registro: e.target.value })}
              required
            />
          </div>

          {/* Datos del cliente */}
          <div className="border-t border-line pt-6 space-y-6">
            <h3 className="text-sm font-medium text-ink">Datos del cliente</h3>

            <Input
              label="Nombre completo"
              placeholder="Nombres y apellidos"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              error={errors.nombre}
              required
            />

            {duplicateMatches.length > 0 && (
              <div className="text-sm text-clay bg-clay-pale/50 border border-clay/30 rounded-lg px-3 py-2 space-y-1.5">
                <div>⚠️ Ya existe un paciente parecido. ¿Es la misma persona?</div>
                {duplicateMatches.map((m) => (
                  <a
                    key={m.id}
                    href={`/paciente/${m.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs underline decoration-dotted underline-offset-2 hover:text-red"
                  >
                    {m.paciente} — {m.terapeuta || 'sin terapeuta'} ({m.estatus_en_registro || 'sin estado'})
                  </a>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Fecha de nacimiento"
                type="date"
                value={formData.fecha_nacimiento}
                onChange={(e) => {
                  const fecha_nacimiento = e.target.value;
                  const computedAge = calculateAge(fecha_nacimiento);
                  setFormData((f) => ({
                    ...f,
                    fecha_nacimiento,
                    edad: computedAge !== null ? String(computedAge) : f.edad,
                  }));
                }}
                error={errors.fecha_nacimiento}
                required
              />
              <Input
                label="Edad"
                type="number"
                min={0}
                placeholder="Se llena sola con la fecha de nacimiento"
                value={formData.edad}
                onChange={(e) => setFormData({ ...formData, edad: e.target.value })}
                error={errors.edad}
                required
              />
            </div>

            <Select
              label="Sexo"
              options={SEXO_OPTIONS.map((s) => ({ value: s, label: s }))}
              value={formData.sexo}
              onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
              error={errors.sexo}
              required
            />

            <div>
              <Select
                label="Estado Civil"
                options={ESTADO_CIVIL_OPTIONS.map((o) => ({ value: o, label: o }))}
                value={formData.estado_civil}
                onChange={(e) => setFormData({ ...formData, estado_civil: e.target.value })}
                error={errors.estado_civil}
                required
              />
              {formData.estado_civil === 'Otros' && (
                <div className="mt-4">
                  <Input
                    label="Especifica"
                    value={formData.estado_civil_otro}
                    onChange={(e) => setFormData({ ...formData, estado_civil_otro: e.target.value })}
                    error={errors.estado_civil_otro}
                  />
                </div>
              )}
            </div>

            <Input
              label="Profesión/ocupación"
              value={formData.ocupacion}
              onChange={(e) => setFormData({ ...formData, ocupacion: e.target.value })}
              error={errors.ocupacion}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={errors.email}
                required
              />
              <Input
                label="Número de teléfono"
                type="tel"
                placeholder="55 0000 0000"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                error={errors.telefono}
                required
              />
            </div>
          </div>

          {/* Domicilio */}
          <div className="border-t border-line pt-6 space-y-6">
            <h3 className="text-sm font-medium text-ink">Domicilio</h3>

            <Input
              label="Calle"
              value={formData.calle}
              onChange={(e) => setFormData({ ...formData, calle: e.target.value })}
              error={errors.calle}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Input
                label="Número exterior"
                value={formData.numero_exterior}
                onChange={(e) => setFormData({ ...formData, numero_exterior: e.target.value })}
                error={errors.numero_exterior}
                required
              />
              <Input
                label="Número interior"
                placeholder="Opcional"
                value={formData.numero_interior}
                onChange={(e) => setFormData({ ...formData, numero_interior: e.target.value })}
              />
              <Input
                label="Colonia"
                value={formData.colonia}
                onChange={(e) => setFormData({ ...formData, colonia: e.target.value })}
                error={errors.colonia}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Municipio"
                value={formData.municipio}
                onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                error={errors.municipio}
                required
              />
              <Input
                label="Estado"
                value={formData.estado_direccion}
                onChange={(e) => setFormData({ ...formData, estado_direccion: e.target.value })}
                error={errors.estado_direccion}
                required
              />
            </div>

            <Input
              label="País"
              value={formData.pais}
              onChange={(e) => setFormData({ ...formData, pais: e.target.value })}
              error={errors.pais}
              required
            />

            <div>
              <label className="text-sm font-medium text-ink-soft mb-2 block">
                Agregar copia de su INE por ambos lados
                <span className="text-clay ml-1">*</span>
              </label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
                {ineFile ? <>📄 {ineFile.name} — cambiar archivo</> : '📎 Subir INE (PDF o foto)'}
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => setIneFile(e.target.files?.[0] || null)}
                />
              </label>
              {errors.ine && <div className="text-xs text-red mt-1">{errors.ine}</div>}
            </div>
          </div>

          {/* Contacto de emergencia */}
          <div className="border-t border-line pt-6 space-y-6">
            <div>
              <h3 className="text-sm font-medium text-ink mb-1">Datos de contacto de Emergencia</h3>
              <p className="text-xs text-ink-soft">
                Se le llamará en caso de que el/la paciente presente una crisis o en caso de necesitar romper la
                confidencialidad por motivos psicoterapéuticos.
              </p>
            </div>

            <Input
              label="Nombre completo del contacto de emergencia"
              value={formData.contacto_emergencia_nombre}
              onChange={(e) => setFormData({ ...formData, contacto_emergencia_nombre: e.target.value })}
              error={errors.contacto_emergencia_nombre}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Correo electrónico"
                type="email"
                value={formData.contacto_emergencia_email}
                onChange={(e) => setFormData({ ...formData, contacto_emergencia_email: e.target.value })}
                error={errors.contacto_emergencia_email}
                required
              />
              <Input
                label="Teléfono de contacto"
                type="tel"
                value={formData.contacto_emergencia_telefono}
                onChange={(e) => setFormData({ ...formData, contacto_emergencia_telefono: e.target.value })}
                error={errors.contacto_emergencia_telefono}
                required
              />
            </div>

            <div>
              <Select
                label="Tipo de relación con el cliente"
                options={RELACION_OPTIONS.map((o) => ({ value: o, label: o }))}
                value={formData.contacto_emergencia_relacion}
                onChange={(e) => setFormData({ ...formData, contacto_emergencia_relacion: e.target.value })}
                error={errors.contacto_emergencia_relacion}
                required
              />
              {formData.contacto_emergencia_relacion === 'Otros' && (
                <div className="mt-4">
                  <Input
                    label="Especifica"
                    value={formData.contacto_emergencia_relacion_otro}
                    onChange={(e) =>
                      setFormData({ ...formData, contacto_emergencia_relacion_otro: e.target.value })
                    }
                    error={errors.contacto_emergencia_relacion_otro}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Motivo de consulta */}
          <div className="border-t border-line pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-ink mb-1">Motivo de consulta</h3>
              <p className="text-xs text-ink-soft">
                * El CPCCM no es un centro especializado en Trastornos de la Conducta Alimentaria, Adicciones,
                Esquizofrenia, Autismo, Trastornos de Aprendizaje o del Neurodesarrollo, por lo que en caso de que
                el motivo esté relacionado con alguna de estas problemáticas se derivará al especialista
                correspondiente.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-ink-soft mb-2 block">
                ¿Cuáles de los siguientes problemas les preocupan?
                <span className="text-clay ml-1">*</span>
                <span className="font-normal text-xs text-ink-soft ml-2">(puede seleccionar más de una opción)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 border border-line rounded-lg overflow-hidden">
                {PROBLEMAS_OPTIONS.map((p) => (
                  <Checkbox
                    key={p}
                    label={p}
                    checked={problemas.includes(p)}
                    onChange={() => toggleProblema(p)}
                  />
                ))}
                <Checkbox label="Otros" checked={problemas.includes('Otros')} onChange={() => toggleProblema('Otros')} />
              </div>
              {errors.problemas && <div className="text-xs text-red mt-1">{errors.problemas}</div>}
              {problemas.includes('Otros') && (
                <div className="mt-4">
                  <Input
                    label="Especifica"
                    value={formData.problemasOtro}
                    onChange={(e) => setFormData({ ...formData, problemasOtro: e.target.value })}
                    error={errors.problemasOtro}
                  />
                </div>
              )}
            </div>

            <div>
              <Select
                label="¿Qué motivó la solicitud de la consulta?"
                options={MOTIVO_SOLICITUD_OPTIONS.map((o) => ({ value: o, label: o }))}
                value={formData.motivo_solicitud}
                onChange={(e) => setFormData({ ...formData, motivo_solicitud: e.target.value })}
                error={errors.motivo_solicitud}
                required
              />
              {formData.motivo_solicitud === 'Otros' && (
                <div className="mt-4">
                  <Input
                    label="Especifica"
                    value={formData.motivo_solicitud_otro}
                    onChange={(e) => setFormData({ ...formData, motivo_solicitud_otro: e.target.value })}
                    error={errors.motivo_solicitud_otro}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Datos del profesional de la salud — condicional */}
          {showProfesional && (
            <div className="border-t border-line pt-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-ink mb-1">Datos del profesional de la salud</h3>
                <p className="text-xs text-ink-soft">Profesional de la salud que canalizó al CPCCM.</p>
              </div>

              <Input
                label="Nombre del Profesional de la Salud con el que asiste"
                value={formData.profesional_nombre}
                onChange={(e) => setFormData({ ...formData, profesional_nombre: e.target.value })}
                error={errors.profesional_nombre}
                required
              />

              <div>
                <Select
                  label="¿Qué tipo de profesional de la salud es?"
                  options={PROFESIONAL_TIPO_OPTIONS.map((o) => ({ value: o, label: o }))}
                  value={formData.profesional_tipo}
                  onChange={(e) => setFormData({ ...formData, profesional_tipo: e.target.value })}
                  error={errors.profesional_tipo}
                  required
                />
                {formData.profesional_tipo === 'Otros' && (
                  <div className="mt-4">
                    <Input
                      label="Especifica"
                      value={formData.profesional_tipo_otro}
                      onChange={(e) => setFormData({ ...formData, profesional_tipo_otro: e.target.value })}
                      error={errors.profesional_tipo_otro}
                    />
                  </div>
                )}
              </div>

              <Input
                label="Teléfono de contacto del profesional de la salud"
                type="tel"
                placeholder="Especificar si es del consultorio o personal"
                value={formData.profesional_telefono}
                onChange={(e) => setFormData({ ...formData, profesional_telefono: e.target.value })}
                error={errors.profesional_telefono}
                required
              />

              <Input
                label="Correo electrónico del profesional de la salud"
                type="email"
                value={formData.profesional_email}
                onChange={(e) => setFormData({ ...formData, profesional_email: e.target.value })}
              />

              <Select
                label="¿Autoriza que se establezca contacto con el profesional de la salud para el seguimiento del proceso psicoterapéutico?"
                options={[
                  { value: 'Sí', label: 'Sí' },
                  { value: 'No', label: 'No' },
                ]}
                value={formData.profesional_autoriza}
                onChange={(e) => setFormData({ ...formData, profesional_autoriza: e.target.value })}
                error={errors.profesional_autoriza}
                required
              />
            </div>
          )}

          {/* Cómo se enteró */}
          <div className="border-t border-line pt-6">
            <Select
              label="¿Cómo se enteró de nuestro Centro?"
              options={ENTERO_OPTIONS.map((o) => ({ value: o, label: o }))}
              value={formData.entero}
              onChange={(e) => setFormData({ ...formData, entero: e.target.value })}
              error={errors.entero}
              required
            />
            {(formData.entero === 'Recomendación de un familiar/amigo' || formData.entero === 'Otro') && (
              <div className="mt-4">
                <Input
                  label="Especifica"
                  value={formData.enteroDetalle}
                  onChange={(e) => setFormData({ ...formData, enteroDetalle: e.target.value })}
                  error={errors.enteroDetalle}
                />
              </div>
            )}
          </div>

          {/* Contrato Terapéutico */}
          <div className="border-t border-line pt-6">
            <h3 className="text-sm font-medium text-ink mb-1">Contrato Terapéutico y Políticas para Pacientes</h3>
            <p className="text-xs text-ink-soft mb-4">
              Cubre sesiones, confirmación/cancelación de citas, y consentimiento para actividades educativas y de
              investigación (grabación con supervisión, uso de datos clínicos para investigación, rotación de
              terapeutas). Entrega una copia impresa al paciente para que la lea antes de firmar.
            </p>

            <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-line rounded-lg text-sm text-ink-soft cursor-pointer transition-colors duration-150 hover:bg-sage-pale/30 hover:border-sage">
              {contratoFile ? <>📄 {contratoFile.name} — cambiar archivo</> : '📎 Subir contrato firmado (opcional)'}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setContratoFile(e.target.files?.[0] || null)}
              />
            </label>

            <div className="mt-2">
              <Checkbox
                label="He leído el Contrato Terapéutico y Políticas para Pacientes de bebest y estoy de acuerdo con lo mencionado"
                checked={formData.contratoAceptado}
                onChange={(e) => setFormData({ ...formData, contratoAceptado: e.target.checked })}
                error={errors.contratoAceptado}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-4 p-6 -m-8 border-t border-line bg-gray-50">
            <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={isSubmitting}>
              Guardar ficha
            </Button>
            <Button variant="secondary" onClick={() => router.push('/')}>
              Cancelar
            </Button>
            <span className="text-xs text-ink-soft ml-auto">Se guarda en la base de datos</span>
          </div>
        </form>
        </div>

        <FormPrintPreview
          isAdmin={isAdmin}
          title="Ficha de Registro"
          subtitle="Registro inicial de pacientes adultos"
          filename={`ficha-de-registro-${formData.nombre || 'paciente'}`}
          pdfSections={[
            {
              title: 'Cita',
              fields: [
                { label: 'Terapeuta', value: formData.terapeuta },
                { label: 'Coterapeuta', value: formData.coterapeuta },
                { label: 'Fecha de registro', value: formData.fecha_cita },
                { label: 'Estatus en registro', value: formData.estatus_en_registro },
              ],
            },
            {
              title: 'Datos del cliente',
              fields: [
                { label: 'Nombre', value: formData.nombre, full: true },
                { label: 'Fecha de nacimiento', value: formData.fecha_nacimiento },
                { label: 'Edad', value: formData.edad },
                { label: 'Sexo', value: formData.sexo },
                { label: 'Estado civil', value: estadoCivilPreview },
                { label: 'Ocupación', value: formData.ocupacion, full: true },
                { label: 'Correo', value: formData.email },
                { label: 'Teléfono', value: formData.telefono },
              ],
            },
            {
              title: 'Domicilio',
              fields: [
                { label: 'Calle', value: formData.calle, full: true },
                { label: 'Número exterior', value: formData.numero_exterior },
                { label: 'Número interior', value: formData.numero_interior },
                { label: 'Colonia', value: formData.colonia },
                { label: 'Municipio', value: formData.municipio },
                { label: 'Estado', value: formData.estado_direccion },
                { label: 'País', value: formData.pais },
              ],
            },
            {
              title: 'Contacto de emergencia',
              fields: [
                { label: 'Nombre', value: formData.contacto_emergencia_nombre, full: true },
                { label: 'Correo', value: formData.contacto_emergencia_email },
                { label: 'Teléfono', value: formData.contacto_emergencia_telefono },
                { label: 'Relación', value: relacionPreview },
              ],
            },
            {
              title: 'Motivo de consulta',
              fields: [
                { label: 'Problemas', value: problemasPreview, full: true },
                { label: 'Motivo de la solicitud', value: motivoSolicitudPreview, full: true },
                { label: 'Cómo se enteró', value: enteroPreview, full: true },
              ],
            },
            ...(showProfesional
              ? [
                  {
                    title: 'Profesional de la salud',
                    fields: [
                      { label: 'Nombre', value: formData.profesional_nombre, full: true },
                      { label: 'Tipo', value: profesionalTipoPreview },
                      { label: 'Teléfono', value: formData.profesional_telefono },
                      { label: 'Correo', value: formData.profesional_email },
                      { label: 'Autoriza contacto', value: formData.profesional_autoriza },
                    ],
                  },
                ]
              : []),
          ]}
        >
          <PreviewSection title="Cita">
            <PreviewField label="Terapeuta" value={formData.terapeuta} />
            <PreviewField label="Coterapeuta" value={formData.coterapeuta} />
            <PreviewField label="Fecha de registro" value={formData.fecha_cita} />
            <PreviewField label="Estatus en registro" value={formData.estatus_en_registro} />
          </PreviewSection>
          <PreviewSection title="Datos del cliente">
            <PreviewField label="Nombre" value={formData.nombre} full />
            <PreviewField label="Fecha de nacimiento" value={formData.fecha_nacimiento} />
            <PreviewField label="Edad" value={formData.edad} />
            <PreviewField label="Sexo" value={formData.sexo} />
            <PreviewField label="Estado civil" value={estadoCivilPreview} />
            <PreviewField label="Ocupación" value={formData.ocupacion} full />
            <PreviewField label="Correo" value={formData.email} />
            <PreviewField label="Teléfono" value={formData.telefono} />
          </PreviewSection>
          <PreviewSection title="Domicilio">
            <PreviewField label="Calle" value={formData.calle} full />
            <PreviewField label="Número exterior" value={formData.numero_exterior} />
            <PreviewField label="Número interior" value={formData.numero_interior} />
            <PreviewField label="Colonia" value={formData.colonia} />
            <PreviewField label="Municipio" value={formData.municipio} />
            <PreviewField label="Estado" value={formData.estado_direccion} />
            <PreviewField label="País" value={formData.pais} />
          </PreviewSection>
          <PreviewSection title="Contacto de emergencia">
            <PreviewField label="Nombre" value={formData.contacto_emergencia_nombre} full />
            <PreviewField label="Correo" value={formData.contacto_emergencia_email} />
            <PreviewField label="Teléfono" value={formData.contacto_emergencia_telefono} />
            <PreviewField label="Relación" value={relacionPreview} />
          </PreviewSection>
          <PreviewSection title="Motivo de consulta">
            <PreviewField label="Problemas" value={problemasPreview} full />
            <PreviewField label="Motivo de la solicitud" value={motivoSolicitudPreview} full />
            <PreviewField label="Cómo se enteró" value={enteroPreview} full />
          </PreviewSection>
          {showProfesional && (
            <PreviewSection title="Profesional de la salud">
              <PreviewField label="Nombre" value={formData.profesional_nombre} full />
              <PreviewField label="Tipo" value={profesionalTipoPreview} />
              <PreviewField label="Teléfono" value={formData.profesional_telefono} />
              <PreviewField label="Correo" value={formData.profesional_email} />
              <PreviewField label="Autoriza contacto" value={formData.profesional_autoriza} />
            </PreviewSection>
          )}
        </FormPrintPreview>
        </div>
      </main>

      <Toast />
    </div>
  );
}

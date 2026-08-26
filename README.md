# Consulta — Sistema de Gestión de Pacientes

Una aplicación web para la gestión de pacientes en consultorios de psicología. Construida con Next.js 14, TypeScript, Tailwind CSS y Airtable.

## ⚡ Características

- 🔐 Autenticación segura basada en credenciales
- 👥 Gestión de pacientes y sesiones de evaluación
- 📊 Panel de control con roles (Admin, Psicólogo)
- 📧 Alertas de expedientes incompletos
- 📱 Diseño responsivo (mobile, tablet, desktop)
- 🎨 Interfaz en español, simple y clara

## 🚀 Quick Start

### Requisitos previos

- Node.js 18+ y npm
- Cuenta de Airtable con API key
- (Opcional) Cuenta de Resend para envío de emails

### 1. Clonar y configurar el proyecto

```bash
# Clonar (o descargar)
cd bebest

# Instalar dependencias
npm install

# Copiar archivo de configuración
cp .env.local.example .env.local

# Editar .env.local con tus credenciales de Airtable
# NEXT_PUBLIC_AIRTABLE_BASE_ID=appXXXXXX
# AIRTABLE_API_TOKEN=patXXXXXX
```

### 2. Crear tablas en Airtable

Sigue las instrucciones en [AIRTABLE.md](AIRTABLE.md) para crear los tres estructuras de tabla:
- **Users** — Usuarios del sistema
- **Patients** — Registro de pacientes
- **Alerts** — Alertas de expedientes incompletos

**O** ejecuta el script de setup (requiere que las tablas ya existan):

```bash
node scripts/setup-airtable.js
```

Este script:
- Verifica las tablas existentes
- Crea el usuario admin por defecto

### 3. Ejecutar localmente

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

**Credenciales de demo:**
- Email: ``
- Password: ``

## 📋 Tablas de Airtable

### Users
| Campo | Tipo | Notas |
|---|---|---|
| Nombre | Single line text | |
| Email | Single line text | Único, usado para login |
| Password_hash | Single line text | Hash bcrypt |
| Rol | Single select | `admin`, `user` |

### Patients
| Campo | Tipo | Notas |
|---|---|---|
| Nombre | Single line text | Requerido |
| Teléfono | Phone number | Requerido |
| Terapeuta | Link to Users | Requerido |
| Fecha_primer_contacto | Date | |
| Motivo_consulta | Long text | Requerido |
| Estado | Single select | `Alta`, `Baja`, `Reingreso` |
| Num_sesiones | Number | Auto-incrementado por la app |
| Num_inasistencias | Number | Editable manualmente |
| Dx_principal | Single line text | |
| Dx_comorbilidad | Single line text | |
| Dx_otros_problemas | Single line text | |
| Historia_clinica | Long text | De Sesión 1 |
| Bateria_pruebas | Single line text | De Sesión 2 |
| Observaciones_pruebas | Long text | De Sesión 2 |
| Reusar_pruebas | Checkbox | Opcional, de Sesión 2 |
| Plan_tratamiento | Long text | De Sesión 3 |
| Plan_no_suicidio | Checkbox | De Sesión 3 |
| Consentimiento_informado | Checkbox | De Sesión 3 |
| Referido_psiquiatria | Checkbox | De Sesión 3 |
| Expediente_completo | Checkbox | false si se guardó incompleto |
| Etapa_actual | Single select | `Primer contacto`, `Evaluación`, `Tratamiento` |

### Alerts
| Campo | Tipo | Notas |
|---|---|---|
| Paciente | Link to Patients | |
| Paso_incompleto | Single line text | E.g. "Sesión 2 · Pruebas" |
| Usuario | Link to Users | Quién guardó incompleto |
| Fecha_hora | DateTime | |
| Campos_faltantes | Number | Cantidad de campos faltantes |
| Notificado | Checkbox | true una vez que se envió el email |

## 🔑 Variables de Entorno

```env
# Airtable
NEXT_PUBLIC_AIRTABLE_BASE_ID=appXXXXXX
AIRTABLE_API_TOKEN=patXXXXXX

# Supabase (opcional, no usado en la versión actual)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# App
NEXTAUTH_SECRET=tu_secreto_aqui
NEXTAUTH_URL=http://localhost:3000
```

## 📖 Flujo de Usuarios

### Admin (Fernanda)
- Ver todos los pacientes
- Crear nuevos usuarios
- Ver alertas de expedientes incompletos
- Acceder a todas las secciones

### Psicólogo (Luis, Ana, etc.)
- Ver solo sus pacientes
- Registrar nuevos pacientes (auto-asignados)
- Capturar sesiones
- No pueden ver alertas ni crear otros usuarios

## 🏗️ Estructura de Carpetas

```
bebest/
├── app/
│   ├── api/                  # Rutas API
│   ├── (pages)              # Páginas de la aplicación
│   └── layout.tsx           # Layout raíz
├── components/              # Componentes React reutilizables
├── lib/
│   ├── airtable.ts         # Cliente de Airtable
│   ├── auth.ts             # Funciones de autenticación
│   ├── types.ts            # Tipos TypeScript compartidos
│   ├── utils.ts            # Utilidades generales
│   └── session.ts          # Gestión de sesiones
├── scripts/
│   └── setup-airtable.js   # Script de setup
├── .env.local              # Variables de entorno (no commitear)
├── .env.local.example      # Template de variables
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── README.md
```

## 📦 Dependencias Principales

- **Next.js 14** — Framework React con App Router
- **TypeScript** — Tipado estático
- **Tailwind CSS** — Estilos utilitarios
- **Airtable** — Base de datos
- **bcryptjs** — Hash seguro de contraseñas

## 🚨 Notas de Seguridad

Este es un **beta para uso interno**. Antes de usar con datos reales de pacientes:

1. **No commits de .env.local** — Este archivo contiene credenciales. Agregarlo a `.gitignore` si no lo está.
2. **Variables de producción** — Cambiar `NEXTAUTH_SECRET` a un valor seguro generado aleatoriamente.
3. **HIPAA/Privacidad** — Airtable no ofrece cumplimiento HIPAA en planes estándar. Para PHI real, evaluar opciones de almacenamiento seguro.
4. **Logging** — No loguear valores de campos sensibles (diagnósticos, historias clínicas, etc.)

## 🔧 Desarrollo

### Scripts disponibles

```bash
npm run dev      # Inicia servidor de desarrollo (puerto 3000)
npm run build    # Compila la app
npm run start    # Inicia servidor de producción
npm run lint     # Ejecuta ESLint
```

### Agregar un nuevo usuario (como Admin)

1. Inicia sesión como admin
2. Ve a `/admin/usuarios`
3. Completa el formulario para crear un nuevo usuario
4. El nuevo usuario puede iniciar sesión inmediatamente

## 🐛 Troubleshooting

### "Error al conectarse con Airtable"
- Verifica que `AIRTABLE_API_TOKEN` y `NEXT_PUBLIC_AIRTABLE_BASE_ID` son correctos
- Asegúrate de que los tokens no tienen espacios en blanco

### "Correo o contraseña incorrectos" (pero el admin existe)
- Verifica que la tabla `Users` tiene el campo `Password_hash` correcto
- El script setup-airtable.js genera el hash. Si creaste el usuario manualmente, asegúrate de usar un hash bcrypt válido

### "Tabla no encontrada en Airtable"
- Verifica que el nombre de la tabla es exacto (mayúsculas/minúsculas)
- Las tablas deben ser: `Users`, `Patients`, `Alerts`

## 📝 Licencia

Interno — Solo para uso de la consulta.

## 👥 Equipo

Construido para Fernanda Ruiz, Luis Medina y Ana Torres.

---

**¿Necesitas ayuda?** Revisa la documentación de Airtable o contacta al equipo de desarrollo.

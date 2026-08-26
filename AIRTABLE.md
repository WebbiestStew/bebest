# Configuración de Airtable — Consulta

## Paso 1: Crear un Nuevo Base

1. Ve a [airtable.com](https://airtable.com) y inicia sesión
2. Haz clic en **"Create a base"**
3. Elige **"Start from scratch"**
4. Nómbralo: `Consulta` (o el nombre que prefieras)
5. Copia el **Base ID** desde la URL:
   - URL: `https://airtable.com/app**XXXXXXXXXXXXXX**/tbl...`
   - Base ID = `appXXXXXXXXXXXXXX`

## Paso 2: Crear las Tablas

### Tabla 1: Users

1. Haz clic en **"+"** para crear tabla
2. Nombre: `Users`
3. Campos:

| Field Name | Type | Options |
|---|---|---|
| Nombre | Single line text | Required |
| Email | Single line text | Required, Unique |
| Password_hash | Single line text | Required |
| Rol | Single select | Options: `admin`, `user` |

**Pasos detallados:**
- Default field is "Name" → Renómbralo a "Nombre"
- Add field (+) → "Email" → Single line text
- Add field (+) → "Password_hash" → Single line text
- Add field (+) → "Rol" → Single select → Add options: "admin", "user"

### Tabla 2: Patients

1. Haz clic en **"+"** para crear tabla
2. Nombre: `Patients`
3. Campos:

| Field Name | Type | Notes |
|---|---|---|
| Nombre | Single line text | Required |
| Teléfono | Phone number | |
| Terapeuta | Link to "Users" table | Required |
| Fecha_primer_contacto | Date | |
| Motivo_consulta | Long text | Required |
| Estado | Single select | Options: `Alta`, `Baja`, `Reingreso` |
| Num_sesiones | Number | Default: 0 |
| Num_inasistencias | Number | Default: 0 |
| Dx_principal | Single line text | |
| Dx_comorbilidad | Single line text | |
| Dx_otros_problemas | Single line text | |
| Historia_clinica | Long text | |
| Bateria_pruebas | Single line text | |
| Observaciones_pruebas | Long text | |
| Reusar_pruebas | Checkbox | |
| Plan_tratamiento | Long text | |
| Plan_no_suicidio | Checkbox | |
| Consentimiento_informado | Checkbox | |
| Referido_psiquiatria | Checkbox | |
| Expediente_completo | Checkbox | Default: true |
|  Etapa_actual | Single select | Options: `Primer contacto`, `Evaluación`, `Tratamiento` |

**Pasos:**
- Rename "Name" → "Nombre"
- Add field → "Teléfono" → Phone number
- Add field → "Terapeuta" → Link to another table → Select "Users"
- Add field → "Fecha_primer_contacto" → Date
- Add field → "Motivo_consulta" → Long text
- Add field → "Estado" → Single select → Options: Alta, Baja, Reingreso
- (Continúa agregando los demás campos según tipo) 

### Tabla 3: Alerts

1. Haz clic en **"+"** para crear tabla
2. Nombre: `Alerts`
3. Campos:

| Field Name | Type | Notes |
|---|---|---|
| Paciente | Link to "Patients" table | |
| Paso_incompleto | Single line text | E.g., "Sesión 2 · Pruebas" |
| Usuario | Link to "Users" table | Quién guardó incompleto |
| Fecha_hora | Date with time | |
| Campos_faltantes | Number | |
| Notificado | Checkbox | Default: false |

## Paso 3: Generar API Token

1. Ve a [airtable.com/account](https://airtable.com/account)
2. En la izquierda, haz clic en **"Developer hub"** (o "Personal access tokens" en versiones antiguas)
3. Haz clic en **"Create token"**
4. Dale un nombre: `Consulta App`
5. **Scopes requeridos:**
   - ✅ `data.records:read`
   - ✅ `data.records:write`
   - ✅ `schema.bases:read`
6. Haz clic en **"Create"**
7. **COPIA EL TOKEN** (solo lo verás una vez): `pat_xxxxxxxxxxxxx...`

## Paso 4: Guardar Credenciales

Abre `.env.local` en tu proyecto:

```env
NEXT_PUBLIC_AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_API_TOKEN=pat_xxxxxxxxxxxxx...
```

(NO commitees este archivo)

## Paso 5: Ejecutar Script de Setup

```bash
node scripts/setup-airtable.js
```

Este script:
- Verifica que las tablas existan
- Crea el usuario admin por defecto:
  - Email: `admin@consulta.com`
  - Password: `demo123`

## Verificación

1. En Airtable, ve a la tabla `Users`
2. Deberías ver un registro:
   - Nombre: Administrador
   - Email: admin@consulta.com
   - Password_hash: (hash bcrypt largo)
   - Rol: admin

## Troubleshooting

### "Error: Record not found" o "401 Unauthorized"

**Causas:**
- Token expirado o incorrecto
- Base ID incorrecto (copia-pega desde URL nuevamente)
- API scope insuficiente (verifica scopes en Developer Hub)

**Solución:**
- Crea un nuevo token
- Actualiza `.env.local`
- Reinicia `npm run dev`

### "Table not found"

- Ve a tu base en Airtable
- Verifica exactamente el nombre de la tabla (mayúsculas/minúsculas importan)
- El nombre debe ser EXACTO: `Users`, `Patients`, `Alerts`

### "Field not found" en la app

- Abre la tabla en Airtable
- Verifica que el nombre del field es exacto (incluyendo guiones)
- Ejemplo: `Dx_principal` (no `DxPrincipal` ni `dx-principal`)

## Rate Limiting

La API de Airtable tiene límites:
- **5 requests/segundo** (Airtable Standard)
- **30 requests/segundo** (Airtable Plus)

La app implementa retry logic automático en `lib/utils.ts` si se alcanza el límite.

## Seguridad

- ✅ **NO commitees `.env.local`** (ya está en `.gitignore`)
- ✅ Token solo en servidor (`AIRTABLE_API_TOKEN`)
- ✅ Base ID puede ser público (`NEXT_PUBLIC_AIRTABLE_BASE_ID`)
- ✅ Cada API call verifica sesión/rol del usuario

## Próximos Pasos

1. Ejecuta `npm install`
2. Ejecuta `npm run dev`
3. Abre http://localhost:3000/login
4. Inicia sesión con:
   - Email: `admin@consulta.com`
   - Password: `demo123`
5. Crea tus propios usuarios en `/admin/usuarios`

---

**¿Necesitas ayuda?** Consulta [Airtable API docs](https://airtable.com/developers/web/api/introduction)

# Decisiones Arquitectónicas — Consulta

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Base de Datos](#base-de-datos)
3. [Framework & UI](#framework--ui)
4. [Deploymen & Hosting](#deployment--hosting)
5. [Security](#security)

---

## Autenticación

### Elección: Credentials Provider + Airtable (sin Supabase Auth)

**Alternativas consideradas:**
- NextAuth.js con Credentials Provider + Airtable ✅ **ELEGIDA**
- Supabase Auth + Airtable (paralelo)

**Justificación:**
- **Simplicidad**: Una sola fuente de verdad (Airtable). No requiere API de Supabase Auth.
- **Compatibilidad**: El proyecto ya usa Airtable como DB principal. Agregar otro sistema de auth añadiría complejidad.
- **Control**: Manejo manual de hashes de contraseña (bcrypt) permite auditoría total.
- **Beta interna**: Para una herramienta interna con 3-4 usuarios, no se necesita la escalabilidad de Supabase Auth.

**Consideraciones futuras:**
- Para producción con >100 usuarios, considerar migrar a Supabase Auth o Auth0.
- El hash bcrypt con salt=10 es seguro para este caso de uso.

---

## Base de Datos

### Elección: Airtable REST API nur (ohne Supabase)

**Alternativas consideradas:**
- Airtable ✅ **ELEGIDA**
- Supabase Postgres
- Firebase Firestore

**Justificación:**
- **User requirement**: El cliente pidió explícitamente Airtable.
- **Tablero visual**: Los psicólogos pueden ver y editar datos directamente en Airtable si es necesario.
- **No-code extras**: Automaciones de Airtable (triggers, notificaciones nativas) se pueden agregar después.
- **Cost**: Plan gratuito/básico de Airtable funciona bien para 3-4 usuarios y <1000 registros/mes.

**Trade-offs:**
- API REST es más lenta que SQL/GraphQL, pero aceptable para <50 req/s (que es nuestro caso).
- Límite de API: 5 req/segundo con backoff. Implementamos retry logic en `lib/utils.ts`.
- Validation debe hacerse en la app (Airtable no tiene constraints complejos).

---

## Framework & UI

### Elección: Next.js 14 (App Router) + Tailwind + TypeScript

**Alternativas consideradas:**
- Next.js 14 ✅ **ELEGIDA**
- Remix
- SvelteKit

**Justificación:**
- **Server Components**: Middleware de seguridad (`middleware.ts`) chequea auth en requests.
- **API Routes**: Endpoint `/api/*` manejan lógica de backend sin necesidad de servidor separado.
- **Deployment fácil**: Vercel = un click. Perfectopara MVP.
- **TypeScript**: Previene bugs en validación de datos.
- **Tailwind**: Prototipo ya usa colores específicos; Tailwind config importa exactamente esos mismos tokens.

**Razón para no usar Remix/SvelteKit:**
- Overhead innecesario para un MVP de 10 páginas.
- Next.js es estándar en la industria.

---

## Deployment & Hosting

### Elección: Vercel (inicialmente local, listo para Vercel)

**Por qué Vercel:**
- Native Next.js support
- Environment variables seguras (no commitear `.env.local`)
- Preview deployments para PRs
- Free tier soporta este caso de uso

**Local development:**
- `npm run dev` → http://localhost:3000
- No requiere Docker; node + npm es suficiente.

**Para Vercel:**
```bash
git push origin main
# Vercel auto-detecta Next.js, builds, deploys
```

---

## Security

### 1. Password Hashing

```typescript
// lib/auth.ts
const hash = await bcryptjs.hash(password, 10); // 10 rounds = ~100ms per hash
```

- **No plaintext** en Airtable
- Rounds=10 es balance seguridad/performance
- Para ataques de fuerza bruta: Airtable API throttle + middleware de rate limit (futuro)

### 2. Session Management

```typescript
// app/api/auth/login/route.ts
response.cookies.set('consulta_session', JSON.stringify(user), {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60, // 7 días
});
```

- **httpOnly**: Cookie no accesible desde JavaScript (XSS protection)
- **secure**: Solo HTTPS en production
- **sameSite=lax**: CSRF protection

### 3. Authorization Checks

**Server-side:**
```typescript
// lib/session.ts
export function getCurrentUserFromRequest(request: NextRequest) {
  const session = request.cookies.get('consulta_session');
  // ...
}

// app/api/patients/route.ts
if (!isAdmin(request) && patient.Terapeuta !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

**Middleware:**
```typescript
// middleware.ts
if (request.nextUrl.pathname.startsWith('/admin')) {
  if (sessionData.rol !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
```

- **NUNCA** confiar en frontend para autorización
- Cada API route chequea sesión + rol
- URL directs a `/admin/usuarios` si no eres admin = redirect a home

### 4. Data Privacy

- **No logging de valores sensibles** (diagnósticos, historias clínicas)
- **Airtable no es HIPAA-ready** (ver README.md)
- **Para producción con PHI real**: Evaluar Postgres en Supabase (HIPAA compliant con BAA)

---

## Validación

### Client-side (UX)
- HTML5 validation (email, required, etc.)
- Estado de error inmediato en UI

### Server-side (Security)
```typescript
// app/api/patients/route.ts
const requiredFields = ['nombre', 'telefono', 'motivo_consulta'];
for (const field of requiredFields) {
  if (!body[field]) {
    return NextResponse.json({ error: 'Campo requerido' }, {status: 400 });
  }
}
```

NUNCA confiar solo en client-side validation.

---

## Testing & Monitoring

### Actual:
- Manual testing durante desarrollo
- Setup script chequea tablas de Airtable

### Para producción:
- E2E tests (Playwright)
- Error tracking (Sentry)
- Monitoring de Airtable API (dashboards)

---

## Futuro

1. **Emails reales** via Resend (no implementado en beta, solo alertas en UI)
2. **Auditoría**: Guardar log de quién cambió qué y cuándo
3. **Export PDF**: Ficha del paciente → PDF
4. **Reportes mensuales**: Query de sesiones por terapeuta, métricas
5. **Role-based UI**: Mostrar/ocultar botones según rol (ya implementado en Navigation)
6. **Multi-idioma**: Futura expansión a otros idiomas

---

## Resumen de Stack Final

| Aspecto | Tecnología | Razón |
|--------|-----------|-------|
| Framework | Next.js 14 | SSR, API routes, Vercel |
| Language | TypeScript | Type safety |
| Styles | Tailwind + CSS custom props | Design tokens ya definidos |
| Database | Airtable REST API | Requisito del cliente |
| Auth | Passwords hashados en Airtable | Simple, bajo overhead |
| Sessions | Cookies seguras (httpOnly) | Standard web |
| Deployment | Vercel | Next.js native |
| Email | (Pendiente Resend) | Alertas por ahora en UI |

---

**Versión**: 0.1.0 (Beta)  
**Última actualización**: Agosto 2026

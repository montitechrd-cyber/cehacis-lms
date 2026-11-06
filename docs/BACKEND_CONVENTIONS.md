# Convenciones del backend (contrato para todos los módulos)

Stack: Node 24 · Express 5 (los handlers async propagan errores solos; NO uses try/catch para reenviar a next) · TypeScript estricto (ESM, imports relativos con extensión `.js`) · Prisma 6 sobre MySQL 8 · Zod 3.

## Estructura
- Cada módulo vive en `server/src/modules/<modulo>/` y exporta por defecto un `Router` desde `<modulo>.routes.ts`. Ya está montado en `server/src/routes.ts` con su prefijo (`/api/<prefijo>`). Puedes dividir la lógica en `<modulo>.service.ts` u otros archivos dentro de TU carpeta.
- NO edites archivos fuera de tu carpeta salvo los indicados en tu brief. NO edites `schema.prisma`: si falta algo, decláralo en tu informe final.
- Documenta tus endpoints en `docs/api/<modulo>.md` (método, ruta, permiso, body, forma de la respuesta). El frontend se construye a partir de ese documento: sé exacto con las formas JSON.

## Utilidades existentes (úsalas, no las reimplementes)
- `lib/prisma.ts` → `prisma`
- `lib/errors.ts` → `AppError`, `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `notConfigured`
- `lib/validate.ts` → `body(req, schema)`, `query(req, schema)`, `parse(schema, data)`, `idParam(req, 'id')`, `zId`, `zOptId`, `zDate`, `zOptDate`, `zMoney`, `zText(max)`
- `lib/pagination.ts` → `getPage(req)` (lee `?page&pageSize&q&sort&order`), `paged(data, total, p)` → `{ data, meta: { total, page, pageSize, pages } }`, `orderBy(p, allowed, fallback)`
- `lib/audit.ts` → `audit(req, action, entity, entityId, meta)` — úsalo en toda creación/edición/borrado administrativo y acciones sensibles.
- `lib/notify.ts` → `notify(userIds, { type, title, body, link, email })` — notificación interna (+correo opcional). `link` es una ruta del frontend.
- `lib/mailer.ts` → `sendMail`, `emailLayout`, `escapeHtml`
- `lib/gamification.ts` → `awardPoints(userId, 'LESSON_COMPLETED' | ..., { type, id })` idempotente; `evaluateBadges(userId)`
- `lib/upload.ts` → `uploader({ maxMb, only })` (multer con validación de tipo/tamaño), `saveFile(file, ownerId, { isPublic, folderId })`, `fileUrl(id)` → `/api/files/:id`, `IMAGE_EXT`
- `lib/settings.ts` → `getBrand()`, `getSetting`, `setSetting`
- `middleware/auth.ts` → `requireAuth`, `requirePermission(...perms)`, `can(req, perm)`, `isAdmin(req)`, `assertCourseStaff(req, courseId)`, `assertCourseAccess(req, courseId)`, `taughtCourseIds(userId)`; `req.user = { id, email, role, permissions:Set, firstName, lastName }`
- Permisos disponibles: ver `config/permissions.ts`. Roles: SUPERADMIN, ACADEMIC_ADMIN, INSTRUCTOR, STUDENT.
- Integraciones: `integrations/ai/anthropic.ts` → `getAi()`; `integrations/payments/gateway.ts` → `getGateway()`, `integrationStatus()`; `integrations/video/provider.ts` → `detectMeetingProvider(url)`, `videoStatus()`.

## Reglas
1. **Toda** ruta no pública lleva `requireAuth` o `requirePermission`. Valida propiedad/alcance en el servidor: un facilitador solo actúa sobre sus cursos (`assertCourseStaff`), un estudiante solo sobre lo suyo.
2. Valida todo body/query con Zod vía `body()`/`query()`. Mensajes de error en español.
3. Respuestas: objeto JSON. Listas paginadas → `paged(...)`. Detalle → `{ data: ... }` o el objeto directo, pero sé consistente y documéntalo. Creación → `res.status(201)`.
4. Errores: lanza `AppError`/helpers; el manejador central da `{ error: { code, message, details } }`.
5. Decimal de Prisma: conviértelo a `Number()` en las respuestas (precios, notas, porcentajes).
6. No expongas `passwordHash`, tokens ni campos sensibles. Usa `select`/`include` explícitos para usuarios: `{ id, firstName, lastName, email, avatarUrl }`.
7. Nada de datos simulados en respuestas: si una integración no está configurada, devuelve su estado (`notConfigured` o un flag).
8. Textos para el usuario en español neutro.
9. Al terminar, ejecuta `npx tsc --noEmit -p tsconfig.json` desde `server/` y corrige SOLO los errores de tus archivos (otros módulos pueden estar a medio construir por otros agentes; ignora errores de imports de módulos ajenos que aún no existan).

## Modelo de datos
Lee `server/prisma/schema.prisma` completo antes de escribir: es la fuente de verdad (nombres de campos, enums, relaciones).

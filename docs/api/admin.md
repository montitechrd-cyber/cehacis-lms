# API Administración — `/api/admin`

Todas las rutas requieren sesión y el permiso indicado. Errores: `{ "error": { "code", "message", "details" } }`.
Listas paginadas: `{ "data": [...], "meta": { "total", "page", "pageSize", "pages" } }` (query `page`, `pageSize` ≤100, `q`, `sort`, `order=asc|desc`).
Recursos individuales: `{ "data": {...} }`. Operaciones sin recurso: `{ "ok": true }`. Toda mutación queda en auditoría.

## Usuarios (`users.manage`)

Objeto usuario (`UserDto`):
```json
{ "id": 1, "email": "a@b.com", "firstName": "Ana", "lastName": "Pérez", "phone": "+1809...|null", "avatarUrl": "...|null",
  "status": "ACTIVE|PENDING|SUSPENDED", "role": { "key": "STUDENT", "name": "Estudiante" },
  "lastLoginAt": "ISO|null", "failedLogins": 0, "isLocked": false, "createdAt": "ISO" }
```

- `GET /users?q&role=<roleKey>&status&page&pageSize&sort(createdAt|email|firstName|lastName|lastLoginAt|status)&order` → paginado de `UserDto` (excluye eliminados). `q` busca en email, nombre, apellido, teléfono.
- `GET /users/:id` → `{ data: UserDto & { student: {points,city,country}|null, instructor: {headline,isPublic}|null } }`
- `POST /users` body `{ email, firstName, lastName, phone?, role: "STUDENT|INSTRUCTOR|ACADEMIC_ADMIN|SUPERADMIN", password? }` → 201 `{ data: UserDto, emailSent: boolean, passwordMode: "provided"|"reset_link" }`. Sin `password` se genera una contraseña aleatoria inutilizable y se envía un enlace para crearla (vence en 72 h). Crea `StudentProfile`/`InstructorProfile` según el rol. 409 si el correo existe. Password: 8+ caracteres con letra y número.
- `PATCH /users/:id` body (todos opcionales) `{ firstName, lastName, phone|null, status, role }` → `{ data: UserDto }`. 400 si te cambias rol/estado a ti mismo, o si degradas/suspendes al último SUPERADMIN activo. Suspender revoca sesiones.
- `POST /users/:id/reset-password` → `{ ok, emailStatus: "SENT|LOGGED|FAILED", message }` (enlace válido 1 h).
- `POST /users/:id/unlock` → `{ ok: true }` (failedLogins=0, lockedUntil=null).
- `DELETE /users/:id` → `{ ok: true }`. Borrado lógico + revoca sesiones. 400 si eres tú o el último SUPERADMIN.

## Roles y permisos (`roles.manage`)

- `GET /roles` → `{ data: [{ id, key, name, description, isSystem, editable, usersCount, permissions: string[] }] }`
- `GET /permissions` → `{ data: [{ module: "courses", permissions: [{ key, description }] }] }`
- `PUT /roles/:id/permissions` body `{ permissionKeys: string[] }` → `{ ok: true, permissions: string[] }`. 400 para SUPERADMIN o claves inexistentes (`details.unknown`). Limpia la caché de roles.

## Configuración (`settings.manage`)

Brand: `{ name, legalName, tagline, logoUrl, primaryColor, inkColor, contactEmail, contactPhone, whatsapp, instagram, address, currency }`.
- `GET /settings/brand` → `{ data: Brand }`
- `PUT /settings/brand` body: cualquier subconjunto de Brand (se fusiona con lo existente). Colores `#RRGGBB`; `contactEmail` válido; `logoUrl` URL http(s) o ruta que empieza con `/`; `currency` 3 letras. → `{ data: Brand }`
- `POST /settings/logo` multipart campo `logo` (png/jpg/jpeg/webp/gif, ≤5 MB) → 201 `{ data: Brand, file: { id, url } }`. El archivo es público y actualiza `brand.logoUrl`.

## Integraciones (`settings.manage`) — solo estado, sin secretos

`GET /integrations` →
```json
{ "data": {
  "ai": { "configured": false, "provider": "anthropic", "model": "..." },
  "email": { "configured": false, "from": "CEHACIS <no-reply@cehacis.com>" },
  "payments": { "active": "SANDBOX|AZUL", "sandbox": {"configured":true,"note":""}, "azul": {"configured":false,"env":"sandbox","note":""} },
  "video": { "mode": "manual", "zoom": { "configured": false, "note": "" } },
  "storage": { "driver": "local", "path": "storage/uploads" } } }
```

## Auditoría (`audit.read`)

`GET /audit?userId&entity&action(contiene)&from&to(ISO o YYYY-MM-DD; "to" incluye el día completo)&page&pageSize(def. 50)` → paginado de
`{ id, action, entity, entityId, meta, ip, userAgent, createdAt, user: { id, firstName, lastName, email }|null }`.

## Bandeja de correo (`settings.manage`)

- `GET /outbox?status=QUEUED|SENT|FAILED|LOGGED&q&page` → paginado de `{ id, to, subject, status, error, sentAt, createdAt }` (sin html).
- `POST /outbox/:id/retry` → `{ data: <fila actualizada> }`. 503 `NOT_CONFIGURED` si no hay SMTP; 400 si ya está SENT.

## Mensajes de contacto (`settings.manage` o `users.manage`)

- `GET /contact-messages?status=NEW|READ|ANSWERED&q&page` → paginado de `{ id, name, email, phone, subject, message, status, createdAt }`.
- `PATCH /contact-messages/:id` body `{ status }` → `{ data: <mensaje> }`.

## FAQ (`settings.manage`)

Objeto: `{ id, question, answer, order, isPublished }`.
- `GET /faqs` → `{ data: Faq[] }` (todas, ordenadas)
- `POST /faqs` body `{ question, answer, isPublished? }` → 201 `{ data: Faq }` (se agrega al final)
- `PATCH /faqs/:id` body parcial → `{ data: Faq }`
- `DELETE /faqs/:id` → `{ ok: true }`
- `PUT /faqs/order` body `{ ids: number[] }` (orden deseado) → `{ ok: true }`

## Respaldo (`settings.manage`)

- `GET /backup/info` → `{ data: { lastBackup: { lastBackupAt: ISO|null, note: string|null, markedBy: {id,name}|null }, command: "mysqldump ...", uploadsPath: "storage/uploads", instructions: string[] } }`. La API nunca ejecuta mysqldump.
- `POST /backup/mark` body `{ note? }` → 201 `{ data: { lastBackupAt, note, markedBy } }`.

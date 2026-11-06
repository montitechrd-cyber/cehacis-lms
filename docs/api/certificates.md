# API Certificaciones — `/api/certificates`

Errores: `{ error: { code, message, details } }`. Rutas **[certificates.manage]** son administrativas. `finalGrade` siempre es número o `null`.

## Forma `Certificate`
```json
{ "id": 1, "code": "CEH-2026-7K3PQ2", "userId": 9, "courseId": 3, "programId": null, "templateId": 1,
  "recipientName": "Ana Pérez", "title": "Oratoria Efectiva", "hours": 40, "finalGrade": 92.5,
  "status": "VALID", "revokedReason": null, "issuedAt": "2026-11-03T14:00:00.000Z",
  "pdfUrl": "/api/certificates/1/pdf" }
```
`status`: `VALID` | `REVOKED`. El código es `CEH-<año>-<6 caracteres A-Z/2-9 sin 0,O,1,I>`.

## Pública
### `GET /verify/:code` (sin autenticación)
- 200 `{ "valid": true, "status": "VALID", "code": "...", "recipientName": "...", "title": "...", "hours": 40, "issuedAt": "...", "institution": "<razón social>" }` (si está revocado: `valid:false`, `status:"REVOKED"`, mismos campos).
- 404 `{ "valid": false }`.

## Estudiante
### `GET /me`
→ `{ data: [ Certificate & { course: { id, code, title, slug } | null } ] }`

### `GET /:id/pdf` (dueño o certificates.manage)
`application/pdf`, `Content-Disposition: attachment; filename="certificado-<code>.pdf"`. A4 horizontal con QR a `${APP_URL}/verificar/<code>`; marca de agua REVOCADO si corresponde.

### `GET /requirements/:courseId` (requireAuth)
```json
{
  "certificateEnabled": true, "passingScore": 70, "requireAllLessons": true, "minAttendancePct": 80,
  "finalAssessments": [ { "id": 5, "title": "Evaluación final" } ],
  "enrollment": null
}
```
Si el usuario está inscrito, `enrollment` es:
```json
{ "status": "ACTIVE", "progressPct": 60, "finalGrade": null,
  "lessons": { "completed": 6, "total": 10, "met": false },
  "assessments": [ { "id": 5, "title": "...", "attempts": 1, "bestPercentage": 82.5, "met": true } ],
  "attendance": { "attended": 3, "sessions": 4, "pct": 75, "met": false },
  "eligible": false,
  "certificate": { "id": 1, "code": "CEH-..." } }
```
`attendance.pct` es `null` si el curso aún no tiene sesiones pasadas. `met` en asistencia es true si `minAttendancePct` = 0. `assessments[].met` = mejor porcentaje ≥ `passingScore`. `certificate` = certificado VALID existente o `null`.

## Administración [certificates.manage]
### `GET /?q=&status=VALID|REVOKED&courseId=&page=&pageSize=`
→ `{ data: [ Certificate & { user: {id,firstName,lastName,email,avatarUrl}, course: {id,code,title,slug}|null } ], meta: { total, page, pageSize, pages } }`. `q` busca en código, nombre, título y correo.

### `POST /issue`
Emisión manual (no exige cumplir requisitos). Body: `{ "userId": 9, "courseId": 3?, "programId": 2?, "title"?: "...", "hours"?: 40, "finalGrade"?: 90 }` (se requiere `title`, `courseId` o `programId`; horas/nota se toman del curso/inscripción si faltan). → 201 `{ data: Certificate }`. Notifica al usuario (con correo) y registra auditoría.

### `POST /:id/revoke` — `{ "reason": "..." }` → `{ data: Certificate }` (409 si ya está revocado).
### `POST /:id/restore` — sin body → `{ data: Certificate }` (409 si ya es VALID).

## Plantillas [certificates.manage]
Forma `CertificateTemplate`: `{ id, name, heading, body, primaryColor, signatureName, signatureTitle, signatureFileId, logoFileId, isDefault, createdAt }` (más `_count: { certificates }` en GET).
- `GET /templates` → `{ data: CertificateTemplate[] }`; `GET /templates/:id` → `{ data }`.
- `POST /templates` → 201 `{ data }`. Body: `{ name, heading, body, primaryColor: "#RRGGBB", signatureName, signatureTitle, signatureFileId, logoFileId, isDefault }`. `body` admite `{nombre} {curso} {horas} {fecha} {calificacion}`. `isDefault:true` desmarca las demás.
- `PATCH /templates/:id` parcial → `{ data }`.
- `DELETE /templates/:id` → `{ ok: true }`; 409 si tiene certificados emitidos.
- `GET /templates/:id/preview` → PDF con datos ficticios y marca "VISTA PREVIA".

## Emisión automática
`issueCertificateIfEligible(userId, courseId)` (exportada desde `certificates.service.ts`): emite si el curso tiene `certificateEnabled`, la inscripción está `COMPLETED` y no existe certificado VALID. Usa la plantilla del curso o la predeterminada, notifica (correo, enlace `/campus/certificados`) y reevalúa insignias. Devuelve el certificado o `null`.

# API Aula virtual — `/api/classroom`

Todas las rutas requieren sesión (`requireAuth`). Errores: `{ error: { code, message, details } }`.
Estados de lección en el esquema: `completed | in_progress | available | locked`. Fechas en ISO 8601.

"Personal del curso" (staff) = `courses.manage` o facilitador asignado. El staff nunca ve bloqueos (vista previa) y sus vistas **no registran progreso** si no está inscrito. Los estudiantes no ven módulos/lecciones no publicados (se omiten del esquema y de la secuencia) ni cursos en `DRAFT`/`IN_DEVELOPMENT` (404). Los cursos `ARCHIVED` siguen accesibles para inscritos.

## GET /my-courses?status=active|completed
Sin `status`: ACTIVE + COMPLETED.
```json
[{
  "enrollment": { "id": 1, "status": "ACTIVE", "progressPct": 40, "enrolledAt": "...", "completedAt": null, "finalGrade": null },
  "course": { "id": 3, "title": "", "slug": "", "code": "", "imageUrl": null, "level": "BASIC", "modality": "VIRTUAL", "durationHours": 20, "category": { "id": 1, "name": "", "slug": "" } },
  "instructors": [{ "id": 2, "firstName": "", "lastName": "", "avatarUrl": null }],
  "lastLesson": { "id": 5, "title": "" },
  "nextLesson": { "id": 6, "title": "" }
}]
```
`category`, `lastLesson` y `nextLesson` pueden ser `null`. `nextLesson`: primera lección no completada y desbloqueada (solo inscripciones ACTIVE).

## POST /enroll/:courseId
Curso `PUBLISHED`. Gratis (`isFree` o precio 0) → `FREE`. Con suscripción ACTIVE vigente cuyo plan `includesAll` → `SUBSCRIPTION`. Respeta `capacity` (ACTIVE+COMPLETED). Reactiva inscripciones CANCELLED/PENDING_PAYMENT.
- 201 `{ "enrollment": { "id", "status": "ACTIVE", "source": "FREE|SUBSCRIPTION", "progressPct": 0, "enrolledAt" } }`
- 402 `PAYMENT_REQUIRED` "Este curso requiere compra" · 409 ya inscrito / cupo agotado · 404 curso no disponible.

## GET /courses/:courseId/outline
Requiere acceso al curso.
```json
{
  "course": { "id": 3, "title": "", "slug": "", "enforceSequence": true, "passingScore": 70 },
  "progressPct": 40,
  "currentLessonId": 6,
  "modules": [{
    "id": 1, "title": "", "order": 0, "availableFrom": null,
    "lessons": [{ "id": 5, "title": "", "order": 0, "durationMin": 10, "completionRule": "MANUAL",
      "status": "completed|in_progress|available|locked", "lockReason": null, "resourceTypes": ["VIDEO", "DOCUMENT"] }]
  }],
  "flat": [5, 6, 7]
}
```
`lockReason`: `"Disponible el 15 de noviembre de 2026"` o `"Completa «<título anterior>» para desbloquear"` (si `enforceSequence`).

## GET /lessons/:lessonId
Bloqueada para estudiante: **423** `{ error: { code: "LOCKED", message: "<lockReason>", details: { requiredLessonId: number|null } } }` (`requiredLessonId` es null si el bloqueo es por fecha).
```json
{
  "lesson": { "id": 5, "title": "", "summary": null, "content": "<html/markdown>", "durationMin": 10, "completionRule": "RESOURCES", "moduleId": 1, "moduleTitle": "" },
  "resources": [{
    "id": 9, "type": "VIDEO", "title": "", "description": null, "url": null, "isRequired": true, "isDownloadable": true, "viewed": false,
    "file": { "id": 4, "originalName": "", "mimeType": "", "size": 1234, "url": "/api/files/4" },
    "folder": { "id": 2, "name": "", "files": [ { "id": 4, "originalName": "", "mimeType": "", "size": 1, "url": "/api/files/4" } ] },
    "assessment": { "id": 1, "title": "", "type": "QUIZ", "passingScore": 70, "maxAttempts": 2, "attemptsUsed": 1, "bestPercentage": 80, "passed": true },
    "activity": { "id": 1, "title": "", "type": "INDIVIDUAL", "dueDate": null, "submitted": true, "status": "SUBMITTED" },
    "forum": { "id": 1, "title": "", "threadCount": 3 },
    "event": { "id": 1, "title": "", "startAt": "", "endAt": "", "meetingUrl": null, "recordingUrl": null }
  }],
  "progress": { "status": "NOT_STARTED|IN_PROGRESS|COMPLETED", "completedAt": null },
  "requirement": { "rule": "RESOURCES", "ok": false, "missing": ["Revisar el recurso «X»"] },
  "navigation": {
    "prev": { "id": 4, "title": "", "locked": false },
    "next": { "id": 6, "title": "", "locked": true, "lockReason": "Completa «…» para desbloquear" },
    "index": 2, "total": 10
  },
  "course": { "id": 3, "title": "", "slug": "", "enforceSequence": true }
}
```
`file/folder/assessment/activity/forum/event` son `null` cuando no aplican (`bestPercentage` null sin intentos; `activity.status` null sin entrega). `prev`/`next` pueden ser `null`. Los estudiantes no ven recursos cuya evaluación/actividad no está publicada.

## POST /lessons/:lessonId/view
Body: `{ "secondsSpent"?: 0..3600 }`. Upsert IN_PROGRESS (no degrada COMPLETED), suma tiempo, fija `lastLessonId`; la regla `VIEW` completa la lección. 423 si está bloqueada.
```json
{ "progress": { "status": "IN_PROGRESS", "completedAt": null, "timeSpentSec": 120 }, "completed": false, "enrollmentProgress": 40 }
```
Staff sin inscripción: `{ progress:{status:"NOT_STARTED",completedAt:null,timeSpentSec:0}, completed:false, enrollmentProgress:0 }`.

## POST /resources/:resourceId/view
Sin body. Registra el recurso como visto; si la lección es `RESOURCES` y se cumple, la completa. Misma respuesta que `/view`.

## POST /lessons/:lessonId/complete
Sin body. `MANUAL` siempre se completa; las otras reglas deben cumplirse, si no → 400 `{ error:{ code:"BAD_REQUEST", message, details:{ missing:[...] } } }`. Requiere inscripción (si no, 400).
```json
{ "completed": true, "enrollmentProgress": 50, "next": { "id": 6, "title": "" }, "courseCompleted": false }
```
`next` es null si no hay siguiente lección desbloqueada.

## GET /courses/:courseId/progress
```json
{
  "enrollment": { "id": 1, "status": "ACTIVE", "progressPct": 40, "finalGrade": null, "completedAt": null },
  "totals": { "lessonsTotal": 10, "lessonsCompleted": 4, "timeSpentSec": 3600 },
  "modules": [{
    "id": 1, "title": "", "order": 0, "lessonsTotal": 5, "lessonsCompleted": 3, "timeSpentSec": 1800,
    "assessments": [{ "id": 1, "title": "", "type": "QUIZ", "passingScore": 70, "attemptsUsed": 1, "bestPercentage": 85, "passed": true }],
    "activities": [{ "id": 1, "title": "", "type": "INDIVIDUAL", "dueDate": null, "submitted": true, "status": "GRADED", "score": 90, "maxScore": 100, "submittedAt": "" }]
  }],
  "courseLevel": { "assessments": [], "activities": [] }
}
```
`enrollment` es null para staff sin inscripción. `courseLevel`: evaluaciones/actividades no vinculadas a una lección de módulo.

## Gestión (permiso `students.manage` o `courses.teach` + `assertCourseStaff`)
Los facilitadores solo ven/gestionan sus cursos.

Objeto inscripción (`E`):
```json
{ "id": 1, "status": "ACTIVE", "source": "ADMIN", "progressPct": 0, "finalGrade": null, "enrolledAt": "", "completedAt": null, "groupId": null,
  "user": { "id": 1, "firstName": "", "lastName": "", "email": "", "avatarUrl": null },
  "group": { "id": 1, "name": "" },
  "course": { "id": 3, "title": "", "slug": "" } }
```
(`group` es `null` sin grupo.)

- **GET /enrollments?courseId=&status=&q=&page=&pageSize=** → `{ data: E[], meta: { total, page, pageSize, pages } }`. `q` busca nombre, apellido o correo. Sin `courseId`, los facilitadores ven solo sus cursos.
- **POST /enrollments** `{ userId, courseId, groupId? }` → 201 `E` (source ADMIN; notifica con correo; audita `enrollment.create`). 409 si ya está inscrito. No aplica `capacity`. Reactiva inscripciones canceladas.
- **PATCH /enrollments/:id** `{ status?: PENDING_PAYMENT|ACTIVE|COMPLETED|CANCELLED, groupId?: number|null }` → `E` (audita `enrollment.update`).
- **DELETE /enrollments/:id** (solo `courses.manage`) → `{ "ok": true }` (audita `enrollment.delete`). El progreso de lecciones se conserva.

## Funciones exportadas (`classroom.service.ts`)
`computeOutline`, `isLessonCompletable`, `tryCompleteLessons(userId, courseId)` (llamar tras aprobar una evaluación o entregar una actividad), `recalcEnrollment`, además de `buildOutline` y `completeLesson`.
Cierre de curso: lecciones al 100% (o `requireAllLessons=false` con evaluaciones FINAL), FINAL publicadas aprobadas, asistencia ≥ `minAttendancePct` → COMPLETED, `finalGrade`, puntos, notificación e `issueCertificateIfEligible`.

# API Catálogo académico — `/api/catalog`

Todas las rutas requieren sesión (cookie/Bearer). Errores: `{ error: { code, message, details } }`.
Convenciones de respuesta: detalle/creación/edición → `{ "data": ... }` (creación = HTTP 201); borrado y reordenamiento → `{ "ok": true }`; listados de cursos → `{ data: [...], meta: { total, page, pageSize, pages } }`; los demás listados → `{ data: [...] }`.

Permisos: **ADMIN** = `courses.manage`. **STAFF** = `courses.manage` o `courses.teach`; para los recursos de un curso, un facilitador solo actúa si está en `course_instructors` de ese curso (403 si no). Toda creación/edición/borrado/publicación se audita.

Tipos comunes: `CourseStatus = DRAFT|IN_DEVELOPMENT|PUBLISHED|ARCHIVED`, `CourseLevel = BASIC|INTERMEDIATE|ADVANCED`, `Modality = VIRTUAL|PRESENCIAL|HIBRIDA`, `UserBrief = { id, firstName, lastName, avatarUrl }`. Fechas en ISO 8601.

---

## Categorías

### GET /categories — sesión
```json
{ "data": [ { "id": 1, "name": "Liderazgo", "slug": "liderazgo", "description": null, "coursesCount": 4 } ] }
```
(`coursesCount` excluye cursos eliminados.)

### POST /categories — ADMIN
Body: `{ "name": "Gestión Pública" (2-100), "description"?: string|null (≤500) }`. El `slug` se genera del nombre sin acentos y es único (`-2`, `-3`…). → 201 `{ data: { id, name, slug, description, coursesCount: 0 } }`

### PATCH /categories/:id — ADMIN
Body parcial igual al anterior (si cambia `name` se regenera el slug). → `{ data: { id, name, slug, description, coursesCount } }`

### DELETE /categories/:id — ADMIN
→ `{ ok: true }`. **409** si tiene cursos.

---

## Cursos

### GET /courses — STAFF
Query: `q` (título/código/subtítulo), `status`, `categoryId`, `level`, `modality`, `page`, `pageSize` (≤100), `sort` = `title|createdAt|startDate|price` (def. `createdAt`), `order` = `asc|desc` (def. `desc`). Un facilitador (sin `courses.manage`) solo ve sus cursos. Excluye eliminados.
```json
{
  "data": [{
    "id": 1, "code": "CEH-001", "title": "…", "slug": "…", "status": "PUBLISHED", "level": "BASIC", "modality": "VIRTUAL",
    "price": 49.5, "isFree": false, "durationHours": 20, "startDate": "2026-01-10T00:00:00.000Z", "endDate": null,
    "imageUrl": "/api/files/12",
    "category": { "id": 1, "name": "Liderazgo" },
    "instructors": [{ "id": 5, "firstName": "Ana", "lastName": "Pérez", "avatarUrl": null }],
    "counts": { "modules": 3, "lessons": 12, "enrollments": 40 }
  }],
  "meta": { "total": 1, "page": 1, "pageSize": 20, "pages": 1 }
}
```
(`category` puede ser `null`.)

### GET /courses/:id — STAFF (facilitador asignado)
```json
{ "data": {
  "id": 1, "code": "CEH-001", "title": "", "slug": "", "subtitle": null, "description": null,
  "objectives": ["Objetivo 1"], "audience": null, "requirements": null, "imageUrl": null,
  "categoryId": 1, "category": { "id": 1, "name": "", "slug": "" },
  "level": "BASIC", "modality": "VIRTUAL", "durationHours": 0, "price": 0, "currency": "USD", "isFree": false,
  "status": "DRAFT", "startDate": null, "endDate": null, "capacity": null, "enforceSequence": false,
  "passingScore": 70, "requireAllLessons": true, "minAttendancePct": 0, "certificateEnabled": true,
  "certificateTemplateId": null, "certificateTemplate": { "id": 1, "name": "", "heading": "", "isDefault": true } ,
  "createdById": 1, "createdAt": "…", "updatedAt": "…", "deletedAt": null,
  "competencies": [{ "id": 1, "key": "comunicacion", "name": "Comunicación" }],
  "instructors": [{ "id": 5, "firstName": "", "lastName": "", "avatarUrl": null, "email": "", "isLead": true }],
  "modules": [{
    "id": 1, "courseId": 1, "title": "", "description": null, "order": 0, "isPublished": true, "availableFrom": null,
    "lessons": [{
      "id": 1, "moduleId": 1, "title": "", "summary": null, "order": 0, "durationMin": 10, "isPublished": true,
      "isPreview": false, "availableFrom": null, "completionRule": "MANUAL", "requiredAssessmentId": null, "requiredActivityId": null,
      "resources": [ <Resource> ]
    }]
  }],
  "groups": [{ "id": 1, "courseId": 1, "name": "", "instructorId": null, "instructor": <UserBrief|null>, "startDate": null, "endDate": null, "capacity": null, "createdAt": "…", "enrollmentsCount": 0 }],
  "counts": { "modules": 1, "lessons": 1, "enrollments": 0 }
} }
```
`certificateTemplate` es `null` si no hay. En el detalle del curso las lecciones **no incluyen `content`** (usa `GET /lessons/:id`).

**Resource** (forma común a todos los endpoints de recursos):
```json
{
  "id": 1, "lessonId": 1, "type": "VIDEO", "title": "", "description": null, "url": "https://youtu.be/…",
  "fileId": null, "folderId": null, "assessmentId": null, "forumId": null, "activityId": null, "eventId": null,
  "order": 0, "isRequired": false, "isDownloadable": true,
  "file": { "id": 3, "originalName": "guia.pdf", "mimeType": "application/pdf", "size": 1234, "url": "/api/files/3" },
  "folder": { "id": 2, "name": "Material", "filesCount": 4 },
  "assessment": { "id": 1, "title": "", "type": "QUIZ" },
  "forum": { "id": 1, "title": "" },
  "activity": { "id": 1, "title": "", "type": "INDIVIDUAL" },
  "event": { "id": 1, "title": "", "startAt": "…" }
}
```
(`file/folder/assessment/forum/activity/event` son `null` si no aplican. Para VIDEO con URL de YouTube/Vimeo, `url` se guarda tal cual; el frontend genera el embed.)

### POST /courses — ADMIN
Body (solo `title` obligatorio):
```json
{
  "title": "Liderazgo (3-200)", "subtitle": null, "description": null, "objectives": ["…"], "audience": null, "requirements": null,
  "categoryId": 1, "level": "BASIC", "modality": "VIRTUAL", "durationHours": 20, "price": 49.5, "isFree": false,
  "startDate": "2026-01-10", "endDate": "2026-03-10", "capacity": 30, "enforceSequence": false,
  "passingScore": 70, "requireAllLessons": true, "minAttendancePct": 0, "certificateEnabled": true, "certificateTemplateId": null,
  "status": "DRAFT", "competencyIds": [1, 2], "instructorIds": [5]
}
```
Reglas: `code` autogenerado (`CEH-001`, `CEH-002`…); `slug` único (sufijo `-2`…); `isFree: true` ⇒ `price` 0; `instructorIds` deben ser usuarios activos con rol INSTRUCTOR/ACADEMIC_ADMIN/SUPERADMIN (el primero queda como líder); no se puede crear ya con `status: PUBLISHED` (400); `endDate` ≥ `startDate`. → 201 `{ data: <curso completo> }` (misma forma que GET /courses/:id).

### PATCH /courses/:id — STAFF
Mismo esquema, todo opcional. `competencyIds`/`instructorIds`, si se envían, **reemplazan** la lista. Un facilitador asignado puede editar contenido, descripción, objetivos, etc., pero si envía `price`, `status`, `instructorIds` o `isFree` → **403**. Cambiar a `PUBLISHED` aplica la misma validación que el endpoint de estado. → `{ data: <curso completo> }`.

### POST /courses/:id/status — ADMIN
Body `{ "status": "DRAFT|IN_DEVELOPMENT|PUBLISHED|ARCHIVED" }`. Publicar exige ≥1 módulo con ≥1 lección publicada (**400** si no). → `{ data: { id, status } }`. Audita `course.publish` al publicar.

### POST /courses/:id/duplicate — ADMIN
Copia profunda (módulos, lecciones, recursos) en estado `DRAFT`, título `"<título> (copia)"`, nuevo código/slug. Se copian competencias, pero **no** facilitadores, grupos ni inscripciones. Recursos ASSESSMENT/FORUM/ACTIVITY/FOLDER no se copian; las lecciones con regla ASSESSMENT/ACTIVITY pasan a `MANUAL`; los recursos de archivo comparten el mismo `fileId`. → 201 `{ data: <curso completo> }`.

### DELETE /courses/:id — ADMIN
Con inscripciones: borrado lógico (`deletedAt` + `ARCHIVED`) → `{ ok: true, mode: "soft" }`. Sin inscripciones: borrado real → `{ ok: true, mode: "hard" }`.

### POST /courses/:id/image — STAFF (asignado)
`multipart/form-data`, campo `image` (png/jpg/jpeg/webp/gif, ≤8 MB). Se guarda como archivo público. → `{ data: { id, imageUrl: "/api/files/12", fileId: 12 } }`.

### GET /instructors-options — ADMIN
```json
{ "data": [{ "id": 5, "firstName": "Ana", "lastName": "Pérez", "email": "ana@…" }] }
```

---

## Programas formativos

Campos: `title` (3-200), `summary` (≤500), `description`, `imageUrl`, `price`, `status` (`CourseStatus`).

**Program**:
```json
{ "id": 1, "title": "", "slug": "", "summary": null, "description": null, "imageUrl": null, "price": 0, "status": "DRAFT",
  "createdAt": "…", "updatedAt": "…",
  "courses": [{ "id": 1, "code": "CEH-001", "title": "", "slug": "", "status": "PUBLISHED", "level": "BASIC", "modality": "VIRTUAL",
                "price": 0, "isFree": false, "durationHours": 0, "imageUrl": null, "order": 0 }] }
```

- `GET /programs` — STAFF → `{ data: [ { …campos del programa sin courses, "coursesCount": 3 } ] }`
- `GET /programs/:id` — STAFF → `{ data: <Program> }` (cursos ordenados)
- `POST /programs` — ADMIN → 201 `{ data: <Program> }`
- `PATCH /programs/:id` — ADMIN (parcial) → `{ data: <Program> }`
- `DELETE /programs/:id` — ADMIN → `{ ok: true }`
- `PUT /programs/:id/courses` — ADMIN. Body `{ "courseIds": [3, 1, 2] }` (reemplaza cursos y orden) → `{ data: <Program> }`

---

## Módulos

**Module**: `{ id, courseId, title, description, order, isPublished, availableFrom }`

- `POST /courses/:courseId/modules` — STAFF. Body `{ title (2-200), description?, isPublished?, availableFrom? }` → 201 `{ data: <Module> }` (se añade al final).
- `PATCH /modules/:id` — STAFF. Parcial → `{ data: <Module> }`
- `DELETE /modules/:id` — STAFF → `{ ok: true }` (borra sus lecciones en cascada)
- `PUT /courses/:courseId/modules/order` — STAFF. Body `{ "ids": [3,1,2] }`; todos deben ser módulos del curso (los omitidos quedan al final) → `{ ok: true, ids: [3,1,2] }`

---

## Lecciones

Body de creación (`PATCH` parcial):
```json
{
  "title": "(2-200)", "summary": null, "content": "<p>HTML enriquecido, máx 500.000 caracteres</p>", "durationMin": 10,
  "isPublished": true, "isPreview": false, "availableFrom": null,
  "completionRule": "VIEW|MANUAL|RESOURCES|ASSESSMENT|ACTIVITY", "requiredAssessmentId": null, "requiredActivityId": null
}
```
`content` se **sanitiza** en el servidor: se eliminan `<script>`, `<style>`, `<object>`, `<embed>`, `<form>`, atributos `on*`, URLs `javascript:`/`vbscript:`/`data:` (salvo imágenes) e `<iframe>` que no sean de `youtube.com`, `youtube-nocookie.com` o `player.vimeo.com` (https). Regla `ASSESSMENT` exige `requiredAssessmentId`; `ACTIVITY` exige `requiredActivityId`; ambos deben ser del mismo curso (400 si no). Con otras reglas los ids se ponen en `null`. `completionRule` por defecto `MANUAL`.

**Lesson** (detalle):
```json
{ "id": 1, "moduleId": 1, "title": "", "summary": null, "content": "<p>…</p>", "order": 0, "durationMin": 10, "isPublished": true,
  "isPreview": false, "availableFrom": null, "completionRule": "MANUAL", "requiredAssessmentId": null, "requiredActivityId": null,
  "createdAt": "…", "updatedAt": "…", "module": { "id": 1, "courseId": 1, "title": "" }, "resources": [ <Resource> ] }
```

- `POST /modules/:moduleId/lessons` — STAFF → 201 `{ data: <Lesson> }`
- `GET /lessons/:id` — STAFF → `{ data: <Lesson> }`
- `PATCH /lessons/:id` — STAFF → `{ data: <Lesson> }`
- `DELETE /lessons/:id` — STAFF → `{ ok: true }`
- `PUT /modules/:moduleId/lessons/order` — STAFF. Body `{ ids }` → `{ ok: true, ids }`
- `POST /lessons/:id/move` — STAFF. Body `{ "moduleId": 2, "order": 0 }` (módulo del mismo curso; `order` = posición 0-based destino) → `{ data: <Lesson> }`

---

## Recursos de lección

Body: `{ type, title (1-200), description?, url?, fileId?, folderId?, assessmentId?, forumId?, activityId?, eventId?, isRequired? (def false), isDownloadable? (def true) }`

Validación por `type` (400 si no se cumple; los campos que no aplican al tipo se guardan en `null`):

| type | requiere |
|---|---|
| LINK, EMBED, LIVE_SESSION, RECORDING | `url` http(s) (LIVE_SESSION admite además `eventId` del curso) |
| VIDEO, AUDIO, PRESENTATION, DOCUMENT | `url` http(s) **o** `fileId` |
| FILE | `fileId` |
| FOLDER | `folderId` (carpeta del curso) |
| ASSESSMENT / FORUM / ACTIVITY | `assessmentId` / `forumId` / `activityId` del mismo curso |

- `POST /lessons/:lessonId/resources` — STAFF → 201 `{ data: <Resource> }`
- `PATCH /resources/:id` — STAFF (parcial; se revalida el recurso completo) → `{ data: <Resource> }`
- `DELETE /resources/:id` — STAFF → `{ ok: true }`
- `PUT /lessons/:lessonId/resources/order` — STAFF. Body `{ ids }` → `{ ok: true, ids }`

---

## Carpetas y archivos (por curso)

**Folder**: `{ id, name, courseId, createdAt, files: [{ id, originalName, mimeType, size, createdAt, url: "/api/files/:id" }] }`

- `GET /courses/:courseId/folders` — STAFF → `{ data: [<Folder>] }`
- `POST /courses/:courseId/folders` — STAFF. Body `{ name }` → 201 `{ data: <Folder> }`
- `PATCH /folders/:id` — STAFF. Body `{ name }` → `{ data: <Folder> }`
- `DELETE /folders/:id` — STAFF → `{ ok: true }` (elimina también sus archivos)
- `POST /folders/:id/files` — STAFF. `multipart/form-data`, campo `files` (hasta 10) → 201 `{ data: <Folder> }`
- `DELETE /folders/:id/files/:fileId` — STAFF → `{ ok: true }`

---

## Grupos (por curso)

**Group**: `{ id, courseId, name, instructorId, instructor: <UserBrief|null>, startDate, endDate, capacity, createdAt, enrollmentsCount }`

- `GET /courses/:courseId/groups` — STAFF → `{ data: [<Group>] }`
- `POST /courses/:courseId/groups` — STAFF. Body `{ name (1-120), instructorId?, startDate?, endDate?, capacity? }` → 201 `{ data: <Group> }`
- `PATCH /groups/:id` — STAFF (parcial) → `{ data: <Group> }`
- `DELETE /groups/:id` — STAFF → `{ ok: true }` (las inscripciones quedan sin grupo)
- `PUT /groups/:id/members` — STAFF. Body `{ "enrollmentIds": [1,2,3] }` (inscripciones del curso). **Reemplaza** los integrantes: las listadas se asignan al grupo y las demás salen de él. 400 si excede `capacity` → `{ data: <Group> }`

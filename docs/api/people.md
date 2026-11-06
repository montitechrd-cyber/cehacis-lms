# API Personas — `/api/people`

Todas las rutas requieren sesión. Errores: `{ error: { code, message, details } }`. Fechas en ISO 8601. Listas paginadas: `{ data: [...], meta: { total, page, pageSize, pages } }` (query `?page&pageSize&q&sort&order`).

Alcance de estudiantes: `students.manage` ve todos; `students.view_assigned` (facilitador) solo estudiantes inscritos en sus cursos y, dentro del expediente, solo datos de esos cursos. Sin ninguno de los dos: 403.

Forma de usuario breve (`UserBrief`): `{ id, firstName, lastName, email, avatarUrl }`.

---

## Estudiantes

### `GET /students`
Permiso: `students.manage` o `students.view_assigned`.
Query: `q` (nombre/apellido/correo), `status` (`ACTIVE|PENDING|SUSPENDED`), `courseId`, `page`, `pageSize`, `sort` (`createdAt|firstName|lastName|email|lastLoginAt`), `order`.
```json
{ "data": [{
  "id": 12, "firstName": "Ana", "lastName": "Pérez", "email": "ana@x.com", "phone": "809...", "avatarUrl": null,
  "status": "ACTIVE", "createdAt": "...", "lastLoginAt": "...|null",
  "points": 120, "level": { "number": 2, "name": "Aprendiz" } ,
  "enrollments": { "active": 2, "completed": 1 }
}], "meta": { "total": 1, "page": 1, "pageSize": 20, "pages": 1 } }
```
`level` puede ser `null`. Para facilitadores, `enrollments` cuenta solo sus cursos.

### `POST /students` — `students.manage`
Body: `{ firstName, lastName, email, phone?, password?, documentId?, birthDate?, occupation?, city?, country? }`.
Sin `password` se genera una temporal aleatoria (nunca se devuelve) y se envía un correo con enlace para crear la contraseña (`PasswordReset`, vence en 72 h).
`201` → `{ "data": { id, firstName, lastName, email, avatarUrl, phone, status, createdAt }, "invitationSent": true }` (`invitationSent` = `true` si se usó contraseña temporal). `409` si el correo existe.

### `GET /students/:id` — expediente completo (mismo alcance)
```json
{
  "profile": { "id": 12, "firstName": "", "lastName": "", "email": "", "avatarUrl": null, "phone": null, "status": "ACTIVE",
    "createdAt": "", "lastLoginAt": null, "emailVerifiedAt": null,
    "documentId": null, "birthDate": null, "occupation": null, "city": null, "country": null, "bio": null },
  "stats": { "enrolled": 3, "completed": 1, "avgGrade": 87.5, "attendancePct": 90, "points": 120, "level": { "number": 2, "name": "Aprendiz" }, "certificates": 1 },
  "enrollments": [{ "id": 1, "status": "ACTIVE", "progressPct": 40, "finalGrade": null, "enrolledAt": "", "completedAt": null,
    "course": { "id": 3, "title": "", "code": "" }, "group": { "id": 1, "name": "" } }],
  "grades": [{ "assessment": { "id": 5, "title": "", "type": "QUIZ", "course": { "id": 3, "title": "" } }, "bestPercentage": 85, "passed": true, "attempts": 2 }],
  "activities": [{ "activity": { "id": 2, "title": "", "course": { "id": 3, "title": "" } }, "status": "GRADED", "score": 90, "submittedAt": "" }],
  "attendance": [{ "event": { "id": 9, "title": "", "startAt": "", "course": { "id": 3, "title": "" } }, "status": "PRESENT" }],
  "attendanceSummary": { "present": 8, "late": 1, "absent": 1, "excused": 0, "pct": 90 },
  "competencies": [{ "competency": { "id": 1, "name": "" }, "latest": { "score": 4.2, "scaleMax": 5, "source": "RUBRIC", "isReviewed": true, "recordedAt": "" }, "count": 3 }],
  "certificates": [{ "id": 1, "code": "", "title": "", "issuedAt": "", "status": "VALID" }],
  "achievements": [{ "badge": { "name": "", "icon": "award" }, "awardedAt": "" }],
  "payments": [{ "order": { "id": 1, "number": "", "total": 100, "status": "PAID", "createdAt": "" } }],
  "notes": [{ "id": 1, "note": "", "isPrivate": true, "createdAt": "", "author": { "id": 2, "firstName": "", "lastName": "" }, "course": { "id": 3, "title": "" } }]
}
```
- `payments` solo se incluye si el solicitante tiene `payments.manage` o `students.manage`.
- `competencies` considera solo registros revisados (`isReviewed`), la más reciente de cada competencia.
- `attendanceSummary.pct` = (presente + tarde) / total de registros × 100.
- `notes`: `students.manage` ve todas; un facilitador ve las no privadas y las suyas.
- `avgGrade`: promedio de `finalGrade` de las inscripciones con nota (`null` si no hay).

### `PATCH /students/:id` — `students.manage`
Body (todo opcional): `{ firstName, lastName, email, phone, status: "ACTIVE"|"SUSPENDED", documentId, birthDate, occupation, city, country, bio }`. Suspender revoca sus sesiones.
`200` → `{ "data": { id, firstName, lastName, email, avatarUrl, phone, status } }`.

### `DELETE /students/:id` — `students.manage`
Baja lógica (`deletedAt`, estado `SUSPENDED`, sesiones revocadas). `200` → `{ "ok": true }`.

### `POST /students/:id/notes`
Permiso: `students.manage` o facilitador con el alumno inscrito en sus cursos.
Body: `{ note, courseId?, isPrivate }` (`isPrivate` por defecto `true`; un facilitador solo puede usar sus propios `courseId`).
`201` → `{ "data": { id, note, isPrivate, createdAt, author:{id,firstName,lastName}, course:{id,title}|null } }`.

### `DELETE /notes/:noteId`
Autor de la nota o `students.manage`. `200` → `{ "ok": true }`.

### `GET /me/profile` · `PATCH /me/profile`
Sesión propia; crea el perfil si no existe. PATCH body: `{ documentId?, birthDate?, occupation?, city?, country?, bio? }` (cadena vacía/`null` borra el campo).
Respuesta: `{ "data": { id, firstName, lastName, email, avatarUrl, phone, documentId, birthDate, occupation, city, country, bio, points } }`.

---

## Facilitadores

`UserBrief` + datos de perfil. `specialties` es siempre `string[]`.

### `GET /instructors`
Permiso: `instructors.manage`, `courses.manage` o cualquier usuario que no sea estudiante (para selects). Query: `q`, `page`, `pageSize` (por defecto 100).
```json
{ "data": [{ "id": 4, "firstName": "", "lastName": "", "email": "", "avatarUrl": null, "status": "ACTIVE",
  "profile": { "headline": "", "specialties": ["Oratoria"], "yearsExperience": 8, "isPublic": true } ,
  "courses": 3, "rating": 4.6 }], "meta": { ... } }
```
`profile` puede ser `null`; `rating` es `null` si no tiene evaluaciones.

### `POST /instructors` — `instructors.manage`
Body: `{ firstName, lastName, email, phone?, password?, headline?, bio?, specialties?: string[], yearsExperience?, linkedinUrl?, isPublic? }`. Misma lógica de contraseña temporal que estudiantes.
`201` → `{ "data": { id, firstName, lastName, email, avatarUrl, phone, status, createdAt }, "invitationSent": boolean }`.

### `GET /instructors/:id`
Permiso: `instructors.manage` o el propio facilitador.
```json
{
  "profile": { "id": 4, "firstName": "", "lastName": "", "email": "", "avatarUrl": null, "phone": null, "status": "ACTIVE", "createdAt": "", "lastLoginAt": null,
    "headline": null, "bio": null, "specialties": [], "yearsExperience": null, "linkedinUrl": null, "isPublic": true },
  "courses": [{ "id": 3, "title": "", "code": "", "status": "PUBLISHED", "enrollments": 25 }],
  "groups": [{ "id": 1, "name": "", "startDate": null, "endDate": null, "capacity": 30, "course": { "id": 3, "title": "" }, "enrollments": 12 }],
  "students": 40,
  "evaluations": { "avg": 4.6, "count": 12, "recent": [{ "rating": 5, "comment": "", "createdAt": "", "course": { "id": 3, "title": "" } }] },
  "upcomingEvents": [{ "id": 9, "title": "", "type": "CLASS", "startAt": "", "endAt": "", "course": { "id": 3, "title": "" } }],
  "availability": [{ "id": 1, "weekday": 1, "startTime": "09:00", "endTime": "12:00" }]
}
```
`students` = estudiantes únicos (ACTIVE/COMPLETED) en sus cursos. `recent` (hasta 10) no incluye al evaluador.

### `PATCH /instructors/:id`
`instructors.manage` o el propio facilitador (este último no puede cambiar `email` ni `status`: 403).
Body (todo opcional): `{ firstName, lastName, phone, email, status: "ACTIVE"|"SUSPENDED", headline, bio, specialties, yearsExperience, linkedinUrl, isPublic }`. `200` → `{ "data": { id, firstName, lastName, email, avatarUrl, phone, status } }`.

### `PUT /instructors/:id/courses` — `instructors.manage`
Body: `{ courseIds: number[] }`. Reemplaza las asignaciones (`isLead: true`). `200` → `{ "ok": true, "courseIds": [...] }`.

### `GET /instructors/:id/students`
`instructors.manage` o el propio facilitador. Query: `q`, `page`, `pageSize`.
```json
{ "data": [{ "id": 1, "status": "ACTIVE", "progressPct": 40, "enrolledAt": "",
  "user": { "id": 12, "firstName": "", "lastName": "", "email": "", "avatarUrl": null },
  "course": { "id": 3, "title": "", "code": "" }, "group": { "id": 1, "name": "" } }], "meta": { ... } }
```

### `POST /instructors/:id/evaluations`
Estudiante inscrito (ACTIVE/COMPLETED) en un curso que ese facilitador imparte, o `instructors.manage`.
Body: `{ courseId, rating: 1-5, comment? }`. Una evaluación por curso por evaluador (`409` si repite). `400` si el facilitador no imparte el curso.
`201` → `{ "data": { id, rating, comment, courseId, createdAt } }`.

### `GET /instructors/:id/evaluations`
`instructors.manage` o el propio facilitador. Paginado. Si lo consulta el propio facilitador, `evaluator` es `null` (anónimo).
```json
{ "data": [{ "id": 1, "rating": 5, "comment": "", "createdAt": "", "course": { "id": 3, "title": "" }, "evaluator": { "id": 12, "firstName": "", "lastName": "" } }],
  "meta": { ... }, "summary": { "avg": 4.6, "count": 12 } }
```

---

## Reseñas de curso

### `POST /courses/:courseId/reviews`
Estudiante inscrito (ACTIVE/COMPLETED). Body: `{ rating: 1-5, comment? }`. Upsert propio; siempre queda `isApproved: false` hasta moderación.
`201` → `{ "data": { id, courseId, rating, comment, isApproved, createdAt } }`.

### `GET /courses/:courseId/reviews`
Personal del curso (`courses.manage` o facilitador asignado). Paginado.
```json
{ "data": [{ "id": 1, "rating": 5, "comment": "", "isApproved": false, "createdAt": "", "user": { "id": 12, "firstName": "", "lastName": "", "email": "", "avatarUrl": null } }],
  "meta": { ... }, "summary": { "avg": 4.5, "count": 8 } }
```

### `PATCH /reviews/:id` — `courses.manage`
Body: `{ isApproved: boolean }`. `200` → `{ "data": { id, courseId, rating, comment, isApproved } }`.

---

## Auditoría
`student.create|update|delete|note_create|note_delete`, `instructor.create|update|set_courses|evaluation_create`, `review.approve|review.reject`.

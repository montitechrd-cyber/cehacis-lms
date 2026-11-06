# API Portal público — `/api/public`

Sin autenticación; solo datos publicables. Recursos: `{ "data": ... }`; listas paginadas: `{ "data": [], "meta": { total, page, pageSize, pages } }`.

## `GET /brand` → `{ data: { name, legalName, tagline, logoUrl, primaryColor, inkColor, contactEmail, contactPhone, whatsapp, instagram, address, currency } }`

## `GET /stats` → `{ data: { publishedCourses, categories, instructorsPublic, competencies } }` (conteos reales; competencias activas)

## `GET /categories` → `{ data: [{ id, name, slug, description, coursesCount }] }` (cursos publicados)

## `GET /courses`
Query: `q` (título, subtítulo, código, descripción), `categoryId`, `level=BASIC|INTERMEDIATE|ADVANCED`, `modality=VIRTUAL|PRESENCIAL|HIBRIDA`, `free=true|false`, `sort=newest|price_asc|price_desc|title` (def. newest), `page`, `pageSize` (def. 12, máx. 100).
Paginado de `CourseCard`:
```json
{ "id": 1, "code": "ORA-101", "title": "...", "slug": "...", "subtitle": "...|null", "imageUrl": "...|null",
  "level": "BASIC", "modality": "VIRTUAL", "durationHours": 20, "price": 120.5, "isFree": false, "currency": "USD",
  "startDate": "ISO|null", "category": { "id": 1, "name": "", "slug": "" },
  "instructors": [{ "id": 5, "firstName": "", "lastName": "", "avatarUrl": null, "headline": null }],
  "competencies": [{ "id": 3, "name": "" }],
  "lessonsCount": 12, "modulesCount": 4, "rating": { "avg": 4.5, "count": 8 } }
```
`category` puede ser `null`. Solo cursos `PUBLISHED` no eliminados; módulos/lecciones contados solo si están publicados; reseñas solo aprobadas; solo facilitadores activos con perfil público.

## `GET /courses/:slug` → `{ data: CourseCard & {...} }`
Campos adicionales: `description, objectives (json), audience, requirements, endDate, capacity, seatsLeft (null si no hay capacidad), passingScore, certificateEnabled, minAttendancePct,`
`outline: [{ title, lessons: [{ title, durationMin, isPreview }] }]`,
`previewLessons: [{ id, title, content }]`,
`reviews: [{ rating, comment, createdAt, name: "Ana P." }]` (5 últimas aprobadas),
`relatedCourses: CourseCard[]` (3 de la misma categoría),
`programs: [{ id, title, slug, summary, imageUrl, price }]` (programas publicados que lo incluyen). 404 si no existe.

## `GET /programs` → `{ data: Program[] }`
`Program`: `{ id, title, slug, summary, imageUrl, price, coursesCount, totalHours, courses: CourseCard[] }` (programas PUBLISHED con al menos un curso publicado).
## `GET /programs/:slug` → `{ data: Program & { description } }` (404 si no existe)

## `GET /instructors` → `{ data: Instructor[] }`
`Instructor`: `{ id, firstName, lastName, avatarUrl, headline, bio, specialties: [], yearsExperience, linkedinUrl, courses: [{ title, slug }] }` (perfil público, usuario activo; cursos publicados).
## `GET /instructors/:id` → `{ data: Instructor }` (404 si no es público)

## `GET /faqs` → `{ data: [{ id, question, answer }] }` (publicadas, ordenadas)

## `POST /contact`
Body `{ name, email, phone?, subject, message, website? }`. Límite 5 por hora por IP (429 `RATE_LIMIT`). `website` es un honeypot: si viene relleno responde 200 sin guardar.
→ 201 `{ "ok": true, "message": "Gracias por escribirnos..." }`. Guarda el mensaje, notifica a usuarios con `users.manage`/`settings.manage` y envía correo a `brand.contactEmail` (queda en la bandeja si SMTP no está configurado).

## GET /api/public/competencies
Competencias activas agrupadas por `group`, con el número de cursos publicados que entrenan cada una (usado en «Qué entrenamos» de la portada).

```json
{ "data": [ { "name": "Comunicación", "competencies": [ { "id": 1, "key": "comunicacion_verbal", "name": "Comunicación verbal", "description": "…", "courses": 2 } ] } ] }
```

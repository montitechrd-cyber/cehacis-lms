# API Calendario y asistencia — `/api/calendar`

Todas las rutas requieren sesión. Errores: `{ error: { code, message, details } }`. Fechas ISO 8601 (UTC).

Visibilidad de eventos:
- Administración (`calendar.manage` + `courses.manage`): todos.
- Facilitador: eventos de sus cursos, donde es instructor o participante, y públicos.
- Estudiante: eventos de cursos donde está inscrito (ACTIVE/COMPLETED; si el evento tiene grupo, solo su grupo), públicos y donde es participante.

`meetingUrl`, `meetingProvider` y `recordingUrl` solo se devuelven (si no, `null`) a quien tiene acceso real al evento (administración, instructor, participante, personal del curso, inscrito del curso/grupo). Un evento público visto por un tercero no los incluye.

## Evento (`EventItem`)
```json
{
  "id": 9, "title": "", "description": null,
  "type": "CLASS | WORKSHOP | INDIVIDUAL_SESSION | VIRTUAL_CLASS | EXAM | DEADLINE | OTHER",
  "course": { "id": 3, "title": "" }, "group": { "id": 1, "name": "" },
  "instructor": { "id": 4, "firstName": "", "lastName": "", "avatarUrl": null },
  "startAt": "", "endAt": "", "location": null,
  "meetingUrl": null, "meetingProvider": "zoom|meet|teams|jitsi|otro|null", "recordingUrl": null,
  "isPublic": false, "reminderMinutes": 60, "participants": 0, "canManage": true
}
```
`course`, `group`, `instructor` pueden ser `null`. `participants` es el conteo de participantes explícitos.

## Eventos

### `GET /events?from&to&courseId&type`
Devuelve `{ "data": [EventItem] }` ordenado por inicio (máx. 1000). `from`/`to` filtran por solapamiento con el rango.

### `GET /events/:id`
`{ "data": EventItem & { "participantList"?: UserBrief[] } }` (`participantList` solo para quien gestiona el evento). 404 si no es visible.

### `POST /events` — `calendar.manage`
Query opcional: `?force=true`.
Body:
```json
{ "title": "", "description": "", "type": "CLASS", "courseId": 3, "groupId": 1, "instructorId": 4,
  "startAt": "2026-11-10T14:00:00Z", "endAt": "2026-11-10T16:00:00Z",
  "location": "", "meetingUrl": "https://zoom.us/j/...", "recordingUrl": "", "isPublic": false,
  "reminderMinutes": 60, "participantIds": [12, 13] }
```
- Obligatorios: `title`, `startAt`, `endAt` (> `startAt`). `type` por defecto `CLASS`. `participantIds` típico en `INDIVIDUAL_SESSION`.
- Facilitador: solo para sus cursos, o `INDIVIDUAL_SESSION` sin curso donde él es instructor (por defecto queda como instructor).
- `meetingProvider` se detecta de `meetingUrl`.
- Si el instructor ya tiene un evento solapado → `409` con `error.code = "EVENT_CONFLICT"` y `error.details = { conflicts: [{ id, title, startAt, endAt }] }`; reenviar con `?force=true` para crearlo igualmente.
- Si el instructor tiene disponibilidad registrada y el evento queda fuera, no falla: `warnings` incluye el aviso.
- Notifica (interna + correo) a inscritos del curso/grupo, participantes e instructor.

`201` → `{ "data": EventItem, "warnings": ["..."] }`.

### `PATCH /events/:id`
Mismo alcance (administración; o facilitador con `calendar.manage` sobre eventos de sus cursos o donde es instructor). Body: cualquier campo de `POST`; `participantIds` reemplaza la lista. Acepta `?force=true`; el chequeo de conflicto se hace si cambian horario o instructor. Notifica si cambia horario, lugar o enlace. `200` → `{ "data": EventItem, "warnings": [] }`.

### `DELETE /events/:id`
Mismo alcance. Notifica la cancelación si el evento no ha terminado. `200` → `{ "ok": true }`.

## Asistencia

Estados: `PRESENT | LATE | ABSENT | EXCUSED`. Personal del evento = instructor del evento, `courses.manage` o facilitador asignado al curso del evento (sin curso: administración).

### `GET /events/:id/attendance`
```json
{ "event": { "id": 9, "title": "", "type": "CLASS", "startAt": "", "endAt": "", "course": { "id": 3, "title": "" }, "group": null },
  "data": [{ "user": { "id": 12, "firstName": "", "lastName": "", "email": "", "avatarUrl": null },
             "source": "enrollment | participant", "status": "PRESENT | null", "notes": null, "recordedAt": null }] }
```
Roster: inscritos ACTIVE/COMPLETED del curso (filtrados por grupo si el evento tiene `groupId`) + participantes. `status: null` = sin registrar.

### `PUT /events/:id/attendance`
Body: `{ "records": [{ "userId": 12, "status": "PRESENT", "notes": "" }] }` (máx. 500; todos deben estar en el roster, si no `400` con `details.userIds`).
Upsert por (evento, usuario). `PRESENT`/`LATE` otorgan puntos `ATTENDANCE_PRESENT` (idempotente) y, si el evento tiene curso, se recalcula la inscripción. `200` → `{ "ok": true, "saved": 1 }`.

### `GET /attendance/me`
```json
{ "data": [{ "status": "PRESENT", "notes": null, "recordedAt": "", "event": { "id": 9, "title": "", "type": "CLASS", "startAt": "", "endAt": "", "course": { "id": 3, "title": "" } } }],
  "summary": { "present": 8, "late": 1, "absent": 1, "excused": 0, "total": 10, "pct": 90 } }
```
`pct` = (present + late) / total × 100.

### `GET /attendance/course/:courseId`
Personal del curso. Eventos pasados (inicio ≤ ahora) × inscritos ACTIVE/COMPLETED.
```json
{ "events": [{ "id": 9, "title": "", "type": "CLASS", "startAt": "", "groupId": null }],
  "students": [{ "user": { "id": 12, "firstName": "", "lastName": "", "email": "", "avatarUrl": null }, "enrollmentId": 1, "groupId": null,
    "cells": ["PRESENT", null, "NA"],
    "summary": { "present": 1, "late": 0, "absent": 0, "excused": 0, "pct": 50 } }] }
```
`cells[i]` corresponde a `events[i]`: estado, `null` = sin registro, `"NA"` = el evento es de otro grupo. `pct` = (present + late) / eventos aplicables × 100.

## Disponibilidad

### `GET /availability?instructorId=`
Sin `instructorId` devuelve la propia. Cualquier usuario no estudiante puede consultar la de un facilitador.
`{ "instructorId": 4, "data": [{ "id": 1, "weekday": 1, "startTime": "09:00", "endTime": "12:00" }] }` (`weekday` 0 = domingo … 6 = sábado).

### `PUT /availability`
Body: `{ "instructorId"?: 4, "slots": [{ "weekday": 1, "startTime": "09:00", "endTime": "12:00" }] }` — reemplaza todo. El propio facilitador, o para otro usuario: administración (`calendar.manage` + `courses.manage`) o `instructors.manage`. Misma respuesta que `GET`.

## Feed iCalendar

### `GET /me.ics`
Mis eventos (como instructor, participante, inscrito o facilitador del curso) de los próximos 90 días. `Content-Type: text/calendar; charset=utf-8`, líneas CRLF y plegadas a 75 octetos, texto escapado, `VALARM` según `reminderMinutes`. Los enlaces de reunión solo se incluyen si el usuario tiene acceso.

## Auditoría
`event.create|update|delete`, `attendance.record`, `availability.update` (cuando se edita la de otra persona).

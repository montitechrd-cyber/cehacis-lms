# API Gamificación — `/api/gamification`

Todas las rutas requieren sesión (`requireAuth`). Las marcadas **[gamification.manage]** exigen ese permiso.
Errores: `{ error: { code, message, details } }`. Fechas en ISO 8601.

## Reglas de puntos [gamification.manage]

### `GET /rules`
Crea perezosamente (0 puntos, inactiva) las reglas de `POINT_EVENTS` que no existan.
```json
{ "data": [ { "id": 1, "event": "LESSON_COMPLETED", "name": "Lección completada", "points": 10, "isActive": true, "dailyCap": null, "updatedAt": "..." } ] }
```
Eventos: LESSON_COMPLETED, MODULE_COMPLETED, COURSE_COMPLETED, ASSESSMENT_PASSED, PERFECT_SCORE, ACTIVITY_SUBMITTED, PEER_REVIEW_GIVEN, FORUM_POST, SIMULATION_COMPLETED, ATTENDANCE_PRESENT, CHALLENGE_COMPLETED, RECOGNITION_RECEIVED.

### `PUT /rules/:id`
Body (todo opcional): `{ "points": 10, "isActive": true, "dailyCap": 50 | null, "name": "..." }` (`dailyCap` 0 o null = sin tope). Respuesta `{ data: PointRule }`.

## Niveles
- `GET /levels` (cualquier usuario) → `{ data: [{ id, number, name, minPoints }] }` ordenado por `number`.
- `POST /levels` [manage] `{ number, name, minPoints }` → 201 `{ data }`. 409 si el número existe.
- `PATCH /levels/:id` [manage] campos parciales → `{ data }`.
- `DELETE /levels/:id` [manage] → `{ ok: true }`.

## Insignias
- `GET /badges` → `{ data: Badge[] }` (usuarios sin permiso solo ven las activas).
  `Badge = { id, key, name, description, icon, criteria:{type,min}, competencyId|null, points, isActive }`
- `POST /badges` [manage] → 201 `{ data: Badge }`
  ```json
  { "key": "voz-segura", "name": "Voz segura", "description": "...", "icon": "award",
    "criteria": { "type": "LESSONS_COMPLETED", "min": 10 }, "competencyId": null, "points": 0, "isActive": true }
  ```
  Tipos de criterio: `POINTS`, `COURSES_COMPLETED`, `LESSONS_COMPLETED`, `SIMULATIONS_COMPLETED`, `FORUM_POSTS`, `COMPETENCY_SCORE` (requiere `competencyId`), `CERTIFICATES`.
- `PATCH /badges/:id` [manage] parcial → `{ data }`. `DELETE /badges/:id` [manage] → `{ ok: true }`. 409 si la clave se repite.

## Retos
- `GET /challenges` → retos activos ahora. `GET /challenges?all=1` (requiere manage) → todos. `{ data: Challenge[] }`
  `Challenge = { id, title, description, startsAt, endsAt, points, criteria:{type,target}, competencyId|null, isActive }`
- `POST /challenges` [manage] → 201 `{ data }`
  ```json
  { "title": "Semana de práctica", "description": "...", "startsAt": "2026-11-02T00:00:00Z", "endsAt": "2026-11-09T00:00:00Z",
    "points": 50, "criteria": { "type": "LESSONS_COMPLETED", "target": 5 }, "competencyId": null, "isActive": true }
  ```
  Tipos: `LESSONS_COMPLETED`, `ASSESSMENTS_PASSED`, `FORUM_POSTS`, `SIMULATIONS_COMPLETED`, `ACTIVITIES_SUBMITTED`, `ATTENDANCE` (PRESENT/LATE). Cuentan solo dentro de `[startsAt, endsAt]`.
- `PATCH /challenges/:id` [manage], `DELETE /challenges/:id` [manage] → `{ ok: true }`.
- `POST /challenges/:id/claim` (sin body). Si `progress.current >= target` y no estaba completado: crea la finalización y otorga puntos (`CHALLENGE_COMPLETED`, ref `{type:'challenge', id}`; el valor lo define la regla de puntos).
  - 200 `{ "ok": true, "pointsAwarded": 25, "progress": { "current": 5, "target": 5 } }`
  - 400 `{ error: { code:'BAD_REQUEST', message, details:{ progress:{current,target} } } }` si no cumple.
  - 409 si ya lo reclamó.

## Estudiante

### `GET /me`
```json
{
  "points": 120,
  "level": { "number": 2, "name": "Orador", "minPoints": 100 },
  "nextLevel": { "number": 3, "name": "Líder", "minPoints": 300 },
  "progressToNext": 0.1,
  "rank": 7,
  "badges": [ { "id": 1, "key": "voz-segura", "name": "...", "description": "...", "icon": "award",
                "earned": false, "awardedAt": null, "progress": { "current": 4, "target": 10 } } ],
  "recent": [ { "id": 1, "userId": 9, "points": 10, "event": "LESSON_COMPLETED", "reason": "...", "refType": "lesson", "refId": 3, "createdAt": "..." } ],
  "challenges": [ { "id": 1, "title": "...", "description": "...", "endsAt": "...", "points": 50,
                    "progress": { "current": 3, "target": 5 }, "completed": false } ],
  "recognitions": [ { "id": 1, "fromId": 4, "toId": 9, "kind": "Escucha activa", "message": "...", "createdAt": "...",
                      "from": { "firstName": "Ana", "lastName": "Pérez" } } ]
}
```
`level`/`nextLevel` son `null` si no aplica; `progressToNext` ∈ [0,1] (1 si no hay siguiente nivel); `recent` = últimas 20 transacciones; `recognitions` = últimas 10 recibidas.

### `GET /leaderboard?period=week|month|all&courseId=`
`period` por defecto `all` (usa `students.points`); `week`/`month` suman `point_transactions` de los últimos 7 días / 1 mes. `courseId` limita a inscritos (ACTIVE/COMPLETED). Top 50.
```json
{ "data": [ { "rank": 1, "user": { "id": 9, "firstName": "...", "lastName": "...", "avatarUrl": null }, "points": 340, "level": { "number": 3, "name": "Líder" } } ],
  "me": { "rank": 7, "points": 120 } }
```
`me.rank` es `null` si el usuario no figura en el ranking (sin puntos en el período o no inscrito al curso).

## Reconocimientos
### `POST /recognitions`
Body `{ "toId": 12, "kind": "Escucha activa", "message": "..." }` (kind ≤60, message ≤500). Estudiante → compañero que comparta un curso; personal → estudiante. No a sí mismo. Máx. 5 por día por emisor (429 `RATE_LIMIT`). Otorga `RECOGNITION_RECEIVED` al receptor y lo notifica.
→ 201 `{ data: { id, fromId, toId, kind, message, createdAt } }`

### `GET /recognitions?userId=`
Reconocimientos recibidos por `userId` (por defecto el usuario autenticado), hasta 50, recientes primero.
→ `{ data: [ { id, fromId, toId, kind, message, createdAt, from: { id, firstName, lastName, avatarUrl } } ] }`

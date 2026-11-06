# API Comunidad y comunicación — `/api/community`

Todas las rutas requieren sesión. Respuestas: detalle/lista simple → `{ "data": ... }`; listas paginadas → `{ "data": [...], "meta": { "total", "page", "pageSize", "pages" } }`; acciones → `{ "ok": true }`; contadores → `{ "count": n }`. Errores: `{ "error": { "code", "message", "details" } }`.

**Contenido**: texto plano (trim, 1–10.000 caracteres). El frontend lo muestra siempre como texto, nunca como HTML. Campo de contenido vacío o demasiado largo → 400.

**Forma `User` (autores, miembros, contactos)**: `{ "id": 1, "firstName": "Ana", "lastName": "Pérez", "avatarUrl": string|null, "role": "STUDENT"|"INSTRUCTOR"|"ACADEMIC_ADMIN"|"SUPERADMIN" }`

**Moderadores**: permiso `community.moderate`. Administradores en todo; facilitadores solo en foros/contenido de sus cursos.

**Acceso a foros**: foro con curso → personal del curso o inscritos; foro de grupo → miembros del grupo (`enrollment.groupId`) o personal del curso; foros sin curso (GENERAL/EXPERIENCES/QA) → cualquier usuario autenticado.

---
## Foros

### `GET /forums?courseId=&type=`
Foros accesibles para mí (`type`: GENERAL|COURSE|GROUP|EXPERIENCES|QA). Sin paginar.
```json
{ "data": [{
  "id": 1, "title": "Foro general del curso", "description": string|null,
  "type": "COURSE", "courseId": 3|null, "groupId": null,
  "course": { "id": 3, "title": "...", "slug": "..." } | null,
  "group": { "id": 2, "name": "Grupo A" } | null,
  "isLocked": false, "createdAt": "ISO",
  "threadCount": 4, "postCount": 18, "lastActivity": "ISO"|null
}] }
```
### `GET /forums/:id`
`{ "data": { ...misma forma que arriba, "canModerate": boolean } }`

### `POST /forums`
Body: `{ "title": string(3-200), "description"?: string(≤2000), "type": ForumType, "courseId"?: number, "groupId"?: number }`. COURSE exige `courseId`; GROUP exige `groupId` (el `courseId` se deduce). Foros de curso/grupo: personal del curso (`assertCourseStaff`). Foros globales: rol administrador + `community.moderate`. → 201 `{ "data": <forma foro> }`.

### `PATCH /forums/:id`
Body: `{ "title"?, "description"?: string|null }` (mismo permiso que crear). → `{ "data": <foro> }`

### `DELETE /forums/:id` → `{ "ok": true }` (mismo permiso que crear; borra hilos y mensajes).

### `POST /forums/:id/lock`
Body `{ "isLocked": boolean }`. Moderador del foro o gestor. → `{ "data": { "id", "isLocked" } }`

---
## Hilos y mensajes

### `GET /forums/:id/threads?q=&page=&pageSize=`
Fijados primero, luego `lastPostAt` desc. Los HIDDEN solo se listan a moderadores.
```json
{ "data": [{
  "id": 10, "forumId": 1, "title": "...", "isPinned": false, "isLocked": false,
  "status": "VISIBLE", "isHidden": false, "createdAt": "ISO", "lastPostAt": "ISO",
  "postCount": 5, "author": <User>
}],
  "meta": { "total", "page", "pageSize", "pages" },
  "forum": { "id", "title", "type", "courseId": number|null, "isLocked": boolean },
  "canModerate": boolean }
```
### `POST /forums/:id/threads`
Body `{ "title": string(3-250), "content": string }`. 403 si el foro está bloqueado. Crea hilo + primer mensaje, otorga puntos `FORUM_POST` y notifica al personal del curso (si es foro de curso).
→ 201 `{ "data": { "id", "forumId", "title", "firstPostId", "createdAt" } }`

### `GET /threads/:id`
Hilo con mensajes en árbol. Los HIDDEN se ocultan (junto con sus respuestas) salvo a moderadores, que los ven con `isHidden: true`. Hilo oculto → 404 para no moderadores.
```json
{ "data": {
  "id": 10, "forumId": 1,
  "forum": { "id", "title", "type", "courseId", "isLocked" },
  "title": "...", "isPinned": false, "isLocked": false, "status": "VISIBLE", "isHidden": false,
  "createdAt": "ISO", "lastPostAt": "ISO", "author": <User>, "canModerate": boolean, "postCount": 5,
  "posts": [{
    "id": 100, "threadId": 10, "parentId": null, "content": "texto", "status": "VISIBLE",
    "isHidden": false, "editedAt": "ISO"|null, "createdAt": "ISO", "author": <User>,
    "replies": [ /* mismos nodos, recursivo */ ]
  }] } }
```
### `POST /threads/:id/posts`
Body `{ "content": string, "parentId"?: number }`. 403 si el hilo o el foro están bloqueados; `parentId` debe ser de ese hilo y no estar oculto. Actualiza `lastPostAt`, notifica al autor del hilo y al del mensaje padre (no a sí mismo; `link: /campus/comunidad/hilo/<id>`), otorga `FORUM_POST`.
→ 201 `{ "data": { ...nodo de post, "replies": [] } }`

### `PATCH /posts/:id`
Body `{ "content": string }`. Autor dentro de 30 min desde la creación, o moderador. Fija `editedAt`. → `{ "data": <post> }`

### `DELETE /posts/:id` → `{ "ok": true }` (autor o moderador; borra también las respuestas). Se audita si lo hace un moderador.

---
## Moderación y reportes

### `POST /threads/:id/pin` · body `{ "isPinned": boolean }` → `{ "data": { "id", "isPinned" } }` (moderador)
### `POST /threads/:id/lock` · body `{ "isLocked": boolean }` → `{ "data": { "id", "isLocked" } }` (moderador)

### `POST /moderation/:targetType/:id/status`
`targetType`: `FORUM_POST` | `THREAD` | `LESSON_COMMENT`. Body `{ "status": "VISIBLE"|"HIDDEN" }`. Moderador del curso/foro. → `{ "data": { "targetType", "targetId", "status" } }`. Auditado (`community.moderate.status`).

### `POST /reports`
Body `{ "targetType": "FORUM_POST"|"THREAD"|"LESSON_COMMENT", "targetId": number, "reason": string(3-500) }`. Debo tener acceso al contenido; no puedo reportar el mío (400); un reporte abierto por usuario y contenido (409). Notifica al personal del curso y administradores.
→ 201 `{ "data": { "id", "status": "OPEN", "createdAt" } }`

### `GET /moderation/reports?status=OPEN|RESOLVED|DISMISSED|ALL&page=` (permiso `community.moderate`; por defecto OPEN)
Facilitadores: solo reportes de contenido de sus cursos.
```json
{ "data": [{
  "id": 7, "targetType": "FORUM_POST", "targetId": 100, "reason": "...", "status": "OPEN",
  "createdAt": "ISO", "resolvedAt": "ISO"|null, "reporter": <User>, "resolvedBy": <User>|null,
  "target": { "exists": true, "courseId": number|null, "forumId": number|null, "threadId": number|null,
              "lessonId": number|null, "content": "texto", "status": "VISIBLE|HIDDEN|FLAGGED",
              "author": <User>, "link": "/campus/comunidad/hilo/10" } | { "exists": false }
}], "meta": { ... } }
```
(`link` de comentarios de lección: `/campus/leccion/<lessonId>`.)

### `PATCH /moderation/reports/:id`
Body `{ "status": "RESOLVED"|"DISMISSED", "hideContent"?: boolean }`. 409 si ya fue gestionado. Notifica al reportante. Auditado.
→ `{ "data": { "id", "status", "resolvedAt", "contentHidden": boolean } }`

---
## Comentarios de lección

### `GET /lessons/:lessonId/comments` (acceso al curso de la lección)
→ `{ "data": [ { "id", "lessonId", "parentId", "content", "status", "isHidden", "createdAt", "author": <User>, "replies": [...] } ], "meta": { "total", "canModerate" } }` (los HIDDEN solo para moderadores).

### `POST /lessons/:lessonId/comments`
Body `{ "content": string, "parentId"?: number }`. Notifica a facilitadores del curso y al autor del padre (`link: /campus/leccion/<lessonId>`). → 201 `{ "data": <comentario con "replies": []> }`

### `DELETE /comments/:id` → `{ "ok": true }` (autor o moderador; auditado si es moderador).

---
## Mensajería interna

### `GET /contacts?q=`
Con quién puedo escribir: estudiantes → facilitadores y compañeros de sus cursos + administrativos (SUPERADMIN/ACADEMIC_ADMIN); facilitadores → estudiantes y co-facilitadores de sus cursos + administrativos; administradores → todos. Máx. 100. → `{ "data": [<User>] }`

### `GET /conversations`
Mías, ordenadas por `updatedAt` desc.
```json
{ "data": [{ "id": 5, "subject": string|null, "updatedAt": "ISO", "participants": [<User>],
  "lastMessage": { "id", "body", "senderId", "createdAt" } | null, "unreadCount": 2 }] }
```
### `POST /conversations`
Body `{ "recipientIds": number[](1-20), "subject"?: string(≤200), "body": string }`. 403 si algún destinatario no está en mis contactos. Si es 1 a 1 y ya existe conversación entre ambos, se reutiliza. Notifica (tipo `MESSAGE`, `link: /campus/mensajes/<id>`).
→ 201 `{ "data": { "id": 5, "reused": boolean, "message": { "id", "body", "senderId", "createdAt" } } }`

### `GET /conversations/:id/messages?before=<messageId>`
Solo participantes. 50 por página; `before` es el id del mensaje más antiguo ya cargado. Marca la conversación como leída. Mensajes en orden ascendente.
```json
{ "data": [{ "id", "body", "senderId", "sender": <User>, "createdAt" }],
  "meta": { "hasMore": boolean, "nextBefore": number|null },
  "conversation": { "id", "subject", "participants": [<User>] } }
```
### `POST /conversations/:id/messages`
Body `{ "body": string }` → 201 `{ "data": { "id", "body", "senderId", "sender": <User>, "createdAt" } }`. Notifica a los demás participantes.

### `GET /messages/unread-count` → `{ "count": n }`

---
## Anuncios

Forma `Announcement`:
```json
{ "id": 1, "title": "...", "body": "...", "audience": "ALL|STUDENTS|INSTRUCTORS|COURSE", "courseId": number|null,
  "isPinned": false, "publishedAt": "ISO", "author": <User>, "course": { "id", "title", "slug" } | null }
```
### `GET /announcements?courseId=&page=&pageSize=`
Los que me aplican: ALL; STUDENTS si soy estudiante; INSTRUCTORS si soy facilitador; COURSE de cursos donde estoy inscrito o enseño; administradores ven todos. Fijados primero, `publishedAt` desc. → paginado de `Announcement`.

### `POST /announcements` (permiso `announcements.manage`)
Body `{ "title": string(3-200), "body": string(≤10000), "audience", "courseId"?: number, "isPinned"?: boolean=false, "notify"?: boolean=false }`. COURSE exige `courseId` (y ser personal del curso); audiencias ALL/STUDENTS/INSTRUCTORS solo para administradores. Con `notify` se envía notificación + correo a la audiencia (excepto al autor).
→ 201 `{ "data": { ...Announcement, "notified": number } }`

### `PATCH /announcements/:id` (autor o administrador) · body `{ "title"?, "body"?, "isPinned"? }` → `{ "data": Announcement }`
### `DELETE /announcements/:id` (autor o administrador) → `{ "ok": true }`

---
## Notificaciones

Forma: `{ "id", "userId", "type", "title", "body": string|null, "link": string|null, "readAt": "ISO"|null, "createdAt": "ISO" }`

- `GET /notifications?unread=1&page=&pageSize=` → paginado de las propias.
- `GET /notifications/unread-count` → `{ "count": n }`
- `POST /notifications/:id/read` → `{ "ok": true }`
- `POST /notifications/read-all` → `{ "ok": true, "updated": n }`

Tipos emitidos por este módulo: `FORUM_THREAD`, `FORUM_REPLY`, `LESSON_COMMENT`, `LESSON_COMMENT_REPLY`, `MESSAGE`, `ANNOUNCEMENT`, `CONTENT_REPORT`, `REPORT_REVIEWED`.

---
## Espacio del curso

### `GET /courses/:courseId/space` (acceso al curso)
Crea perezosamente el foro COURSE "Foro general del curso" si el curso no tiene foros.
```json
{ "data": {
  "course": { "id", "title", "slug" },
  "forums": [ <forma foro de GET /forums> ],        // foros del curso y de mi grupo (el personal ve todos los grupos)
  "announcements": [ <Announcement> ],               // hasta 5, audience COURSE, fijados primero
  "members": [ <User> ],                             // facilitadores primero, luego inscritos activos/completados (máx. 300)
  "canModerate": boolean
} }
```

## Auditoría
Acciones registradas: `community.forum.create|update|delete|lock|unlock`, `community.thread.pin|unpin|lock|unlock`, `community.moderate.status`, `community.post.edit|delete` (si actúa un moderador), `community.comment.delete` (moderador), `community.report.resolved|dismissed`, `community.announcement.create|update|delete`.

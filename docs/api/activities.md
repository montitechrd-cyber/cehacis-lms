# API: Talleres, prácticas y simulaciones presenciales — `/api/activities`

Todas las rutas requieren sesión. Respuestas directas (sin `data`) salvo listas paginadas `{ data, meta:{total,page,pageSize,pages} }`. Errores `{ error:{code,message,details} }`.

```ts
type ActivityType = 'INDIVIDUAL'|'GROUP'|'ROLE_PLAY'|'NEGOTIATION'|'DIFFICULT_CONVERSATION'|'PUBLIC_SPEAKING'|'CASE_STUDY'
type SubmissionType = 'VIDEO'|'AUDIO'|'FILE'|'TEXT'|'LINK'
type SubStatus = 'SUBMITTED'|'GRADED'|'RETURNED'
type FileOut = { id, name, mimeType, size, url }      // url = /api/files/:id
type Activity = { id, courseId, lessonId|null, title, description|null, instructions|null, scenario|null,
  roles: {name,brief}[], type: ActivityType, submissionTypes: SubmissionType[], dueDate|null, maxScore: number,
  rubricId|null, peerReview: boolean, peerReviewsRequired: number, isPublished: boolean, createdAt, updatedAt }
type Rubric = ver docs/api/competencies.md (rúbrica completa con criterios y niveles)
type Group = { id, activityId, name, members: [{ userId, role|null, user:{id,firstName,lastName,email,avatarUrl} }] }
type SubOut = { id, activityId, userId, groupId|null, text|null, linkUrl|null, status: SubStatus, score: number|null, submittedAt, gradedAt|null, files: FileOut[] }
```

Tipos de archivo por `submissionTypes`: VIDEO mp4/webm/mov · AUDIO mp3/m4a/wav/ogg/webm · FILE pdf/doc/docx/ppt/pptx/zip/png/jpg/jpeg/webp/gif · TEXT (campo `text`) · LINK (campo `linkUrl`). Si `submissionTypes` está vacío se aceptan todos.

---
## Gestión (permiso `activities.manage` + facilitador del curso / `courses.manage`)

### `GET /?courseId=` (obligatorio)
→ `Activity & { groupsCount, submissionsCount, pendingCount (SUBMITTED), gradedCount, returnedCount }[]`

### `POST /`
Body `{ courseId, lessonId?, title, description?, instructions?, scenario?, roles?: [{name,brief}], type='INDIVIDUAL', submissionTypes?: SubmissionType[] (def. ['FILE','TEXT']), dueDate?, maxScore=100, rubricId?, peerReview=false, peerReviewsRequired=0, isPublished=true, competencyIds?: number[] }`
→ `201 Activity & { competencyIds }`.

### `GET /:id`
→ `Activity & { competencies:[{id,key,name,group}], competencyIds:number[], rubric: Rubric|null, groups: Group[] }`

### `PATCH /:id`
Mismo body que POST (sin `courseId`), todo opcional; `competencyIds` reemplaza el conjunto. → `Activity`.

### `DELETE /:id`
→ `{ ok:true }`. **409** si hay entregas (sugiere despublicar).

### Grupos
- `POST /:id/groups` body `{ name, userIds: number[] }` → `201 Group`. Los usuarios deben estar inscritos activos y no estar en otro grupo de la actividad (409).
- `PATCH /groups/:gid` body `{ name?, userIds? }` (userIds reemplaza integrantes; 409 si el grupo ya entregó) → `Group`.
- `DELETE /groups/:gid` → `{ ok:true }` (409 si ya tiene entrega).
- `POST /:id/groups/auto` body `{ size }` → `201 Group[]`. Borra los grupos existentes y reparte al azar los inscritos activos en `ceil(n/size)` grupos balanceados "Grupo 1…". 409 si ya hay entregas de grupo.

### `GET /:id/submissions?status=&page=&pageSize=`
→ `{ data: [SubOut & { user:{id,firstName,lastName,email,avatarUrl}, group:{id,name}|null, feedbackCount, peerReviewCount }], meta }` (más recientes primero).

### `POST /submissions/:sid/grade`
Body:
```json
{ "rubricScores": [{ "criterionId": 1, "score": 4, "comment": "" }],
  "comment": "", "observations": "", "recommendations": "",
  "score": 85, "status": "GRADED" }
```
- `status`: `GRADED` (def.) o `RETURNED` (devuelve para reenvío).
- Con rúbrica y `rubricScores`: deben cubrirse **todos** los criterios, cada `score` en `0..maxScore` del criterio; nota = `Σ(score/maxScore·weight)/Σweight · activity.maxScore` (2 decimales). `score` se ignora.
- Sin `rubricScores`: `score` (0..activity.maxScore) es obligatorio al calificar (`GRADED`), opcional al devolver. Si la actividad tiene rúbrica, `GRADED` exige `rubricScores`.
- Crea un `Feedback` (target SUBMISSION) y `RubricScore` **por estudiante** (en entregas de grupo, por cada miembro). Con `GRADED`, por cada criterio con competencia registra `StudentCompetency` (source RUBRIC, nota normalizada a escala 5, `sourceRefId` = id de la entrega; recalificar reemplaza los registros previos). Notifica a los estudiantes (`/campus/practicas/<activityId>`) y recalcula progreso (`tryCompleteLessons`, `recalcEnrollment`).
→ `{ id, status, score: number|null, students: number[] }`

---
## Estudiante (inscrito en el curso)

### `GET /me?courseId=`
Actividades **publicadas** de cursos con inscripción activa/completada.
→ `[Activity & { course:{id,title}, mySubmission:{id,status,score,submittedAt,gradedAt}|null, hasGroup: boolean, isOverdue: boolean }]` (por fecha límite, nulas al final).

### `GET /:id/student`
```json
{ "activity": { ...Activity, "course":{"id":1,"title":""}, "submissionTypes":[...], "competencies":[{id,key,name,group}], "rubric": Rubric|null },
  "myGroup": Group|null,
  "mySubmission": SubOut|null,
  "canSubmit": true,
  "feedback": [{ "id":1, "comment":null, "observations":null, "recommendations":null, "totalScore":85, "createdAt":"ISO",
    "author":{"id","firstName","lastName","email","avatarUrl"},
    "rubricScores":[{ "id":1,"criterionId":1,"criterion":{"id","title","maxScore","weight"},"score":4,"comment":null }] }],
  "peerReviewsReceived": [{ "id":1, "score":80|null, "scores":[{criterionId,score}], "comment":null, "createdAt":"ISO" }],   // anónimas, sin reviewer
  "peerReviewsGiven": 0 }
```
`mySubmission` es la entrega propia o la de mi grupo. `canSubmit` = no hay entrega y no venció, o la entrega está `RETURNED`.

### `POST /:id/submissions`
`multipart/form-data`: `text?`, `linkUrl?`, `files` (hasta 5, 500 MB c/u).
- 400 si el tipo no está permitido por `submissionTypes`, si no hay contenido, o si pasó `dueDate` (salvo reenvío de entrega `RETURNED`). 409 si ya entregó y no está `RETURNED`.
- `type: GROUP`: la entrega se asocia a mi grupo (una por grupo; 400 si no tengo grupo). Reenvío de `RETURNED` reemplaza texto/enlace/archivos y vuelve a `SUBMITTED` (conserva el feedback previo).
- Otorga `ACTIVITY_SUBMITTED`, recalcula progreso (de todos los miembros si es grupo) y notifica a los facilitadores (`/admin/practicas/<activityId>`).
→ `201 SubOut`

### `GET /:id/peer-queue`
Requiere `peerReview` activo. → 
```json
{ "required": 2, "given": 0, "maxScore": 100, "rubric": Rubric|null,
  "items": [{ "id": 55, "text": null, "linkUrl": null, "submittedAt": "ISO", "files": [FileOut] }] }
```
Hasta `max(1, peerReviewsRequired)` entregas ajenas (no de mi grupo) aún no revisadas por mí, priorizando las menos revisadas. Anónimas (sin autor).

### `POST /submissions/:sid/peer-reviews`
Body `{ scores: [{ criterionId, score }], comment? }`. Con rúbrica deben cubrirse todos los criterios; sin rúbrica `comment` es obligatorio. 400 si es propia/de mi grupo, 409 si ya la evalué, 403 si no estoy inscrito.
Crea `PeerReview` (score ponderado sobre `maxScore`), otorga `PEER_REVIEW_GIVEN`, y registra competencia `PEER` (escala 5, `isReviewed:true`) por criterio con competencia, para los autores de la entrega.
→ `201 { id, submissionId, score: number|null, createdAt }`

### `GET /feedback/me`
Todo el feedback recibido (entregas e intentos de evaluación), recientes primero:
```json
[{ "id":1, "target":"SUBMISSION"|"ATTEMPT", "comment":null, "observations":null, "recommendations":null,
   "totalScore":85|null, "createdAt":"ISO",
   "author":{ "id","firstName","lastName","email","avatarUrl" },
   "course":{ "id","title" }|null,
   "activity":{ "id","title","maxScore","submissionId" }|null,
   "assessment":{ "id","title","attemptId" }|null,
   "rubricScores":[{ "id","criterionId","criterion":{"id","title","maxScore","weight"},"score":4,"comment":null }] }]
```

## Dependencias externas
Importa `tryCompleteLessons(userId, courseId)` y `recalcEnrollment(userId, courseId)` de `../classroom/classroom.service.js` (módulo ajeno).

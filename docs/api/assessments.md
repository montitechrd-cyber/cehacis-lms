# API de evaluaciones (`/api/assessments`)

Todas las rutas requieren sesión. Errores: `{ error: { code, message, details } }`. Decimales (notas, porcentajes) se devuelven como `number`. `maxAttempts = 0` significa intentos ilimitados.

Tipos de evaluación: `QUIZ | DIAGNOSTIC | SELF_ASSESSMENT | FINAL | PRACTICAL | PEER`.
Tipos de pregunta: `MULTIPLE_CHOICE | MULTIPLE_SELECT | TRUE_FALSE | OPEN | SCALE`.
Estados de intento: `IN_PROGRESS | SUBMITTED` (pendiente de calificación manual) `| GRADED`.

Reglas generales de calificación
- MC / TF: correcta = puntos completos. MS: todo o nada (el conjunto debe coincidir exactamente).
- SCALE: otorga puntos completos, `isCorrect = null` (no cuenta como incorrecta).
- OPEN: `pointsAwarded = null` hasta que el staff califique. Si hay alguna OPEN el intento queda `SUBMITTED` con `percentage` provisional (cota inferior: las abiertas cuentan 0) y `passed = null`.
- `passed = percentage >= passingScore` solo cuando el intento está `GRADED`.
- `DIAGNOSTIC` y `SELF_ASSESSMENT` no son de aprobación: `passed = true` siempre que el intento queda `GRADED`.
- PEER y PRACTICAL pueden llevar `rubricId`; su calificación manual la hace el staff con `POST /attempts/:attemptId/grade`.
- Si hay límite de tiempo y el envío llega pasados 60 s de gracia, se ignoran las respuestas enviadas y se califica lo guardado como borrador.
- Al quedar `GRADED`: puntos (`ASSESSMENT_PASSED` si aprobó, `PERFECT_SCORE` si 100 %), `tryCompleteLessons`, `recalcEnrollment` y competencias: SCALE con `competencyId` -> `StudentCompetency` fuente `SELF`, `score = valor/scaleMax*5`; preguntas puntuables con `competencyId` agrupadas por competencia -> fuente `ASSESSMENT`, `score = obtenidos/posibles*5`; `sourceRefId = attempt.id`, `scaleMax = 5`. Re-calificar reemplaza los registros del mismo intento.

---
## Gestión (staff del curso)
Permiso: `assessments.manage` o `assessments.grade` + facilitador asignado (o `courses.manage`).

### GET `/?courseId=:id`
`{ data: [ { id, courseId, lessonId, title, description, type, timeLimitMin, maxAttempts, passingScore, weight, shuffle, showResults, isPublished, availableFrom, availableUntil, rubricId, createdAt, updatedAt, questionCount, attemptCount } ] }`

### GET `/:id`
`{ data: { ...campos de evaluación, attemptCount, questions: [ { id, assessmentId, type, text, explanation, points, order, scaleMax, competencyId, options: [ { id, text, isCorrect, order } ] } ] } }`

### POST `/`  (201)
Body: `{ courseId, lessonId?, title, description?, type='QUIZ', timeLimitMin?(1..1440|null), maxAttempts=1, passingScore=70, weight=0, shuffle=false, showResults=true, isPublished=true, availableFrom?, availableUntil?, rubricId? }`
Resp: `{ data: <evaluación> }`. 400 si `availableFrom >= availableUntil`, lección fuera del curso o rúbrica inexistente.

### PATCH `/:id`
Body: cualquier subconjunto de los campos anteriores (sin `courseId`). Resp `{ data: <evaluación> }`.

### DELETE `/:id[?force=true]`
`{ ok: true }`. 409 si tiene intentos; `force=true` solo con `courses.manage` (403 si no).

### POST `/:id/questions`  (201)
Body: `{ type, text, explanation?, points=1, scaleMax?, competencyId?, options: [ { text, isCorrect? } ] }`
Validación: MC exactamente 1 correcta (>=2 opciones); MS >=1 correcta (>=2 opciones); TF exactamente 2 opciones y 1 correcta (p. ej. Verdadero/Falso); OPEN y SCALE sin opciones; SCALE requiere `scaleMax` 2..10.
Resp: `{ data: { id, assessmentId, type, text, explanation, points, order, scaleMax, competencyId, options: [ { id, text, isCorrect, order } ] } }`

### PATCH `/questions/:qid`
Body: subconjunto de los campos anteriores. Si viene `options` reemplaza todas (409 si ya hay respuestas de estudiantes). Cambiar a OPEN/SCALE limpia las opciones. Resp igual que POST.

### DELETE `/questions/:qid[?force=true]`
`{ ok: true }`. 409 si tiene respuestas (force con `courses.manage`).

### PUT `/:id/questions/order`
Body `{ ids: [qid,...] }` (todas las preguntas de la evaluación, sin repetir). Resp `{ ok: true, ids }`.

### GET `/:id/attempts?page&pageSize&q&status=&order=`
`{ data: [ { id, user:{id,firstName,lastName,email,avatarUrl}, status, startedAt, submittedAt, score, maxScore, percentage, passed, gradedById } ], meta:{ total, page, pageSize, pages } }`

### GET `/attempts/:attemptId`
```
{ attempt:{ id, assessmentId, status, startedAt, submittedAt, score, maxScore, percentage, passed, feedback, user:{...}, gradedBy:{...}|null },
  assessment:{ id, title, type, passingScore, rubricId, courseId },
  answers:[ { id, selectedOptionIds:number[]|null, textAnswer, scaleValue, isCorrect, pointsAwarded, feedback,
              question:{ id, type, text, explanation, points, scaleMax, competencyId, options:[{id,text,isCorrect}] } } ] }
```

### POST `/attempts/:attemptId/grade`
Body: `{ answers: [ { answerId, pointsAwarded, feedback? } ], feedback? }`. `pointsAwarded` 0..puntos de la pregunta (también permite ajustar autocalificadas). 400 si queda alguna OPEN sin puntos (`details.answerIds`); 409 si el intento sigue `IN_PROGRESS`.
Recalcula score/percentage/passed, `status = GRADED`, `gradedById`; notifica al estudiante (`/campus/evaluaciones/<assessmentId>`).
Resp: `{ attempt:{ id, status:'GRADED', score, maxScore, percentage, passed, gradedById } }`

### GET `/courses/:courseId/gradebook`
```
{ assessments:[{id,title,type,weight}], activities:[{id,title,maxScore}],
  rows:[ { user:{id,firstName,lastName,email}, enrollmentStatus, progressPct, finalGrade,
           cells:{ "a<id>": mejorPorcentaje|null, "act<id>": nota|null } } ] }
```
Inscritos `ACTIVE`/`COMPLETED`. Evaluaciones: mejor `percentage` entre intentos `GRADED`. Actividades: nota de la última entrega calificada.

---
## Estudiante
Requiere sesión + acceso al curso (inscrito o staff). Evaluaciones no publicadas -> 404.

### GET `/:id/overview`
```
{ assessment:{ id, courseId, title, description, type, timeLimitMin, maxAttempts, passingScore, questionCount, availableFrom, availableUntil },
  attempts:[{ id, status, percentage, passed, submittedAt }],
  attemptsRemaining: number|null (null = ilimitados), canStart: boolean, reason: string|null, inProgressAttemptId: number|null }
```

### POST `/:id/attempts`
Inicia el intento, o devuelve el que está `IN_PROGRESS` (200; uno nuevo -> 201). Un intento en curso vencido (+60 s) se envía automáticamente con lo guardado. 409 si fuera de ventana, sin intentos o sin preguntas.
```
{ attempt:{ id, startedAt, expiresAt: ISO|null },
  questions:[ { id, type, text, points, scaleMax, options:[{id,text}] } ],   // barajadas si shuffle (orden estable por intento), sin isCorrect
  answers:[ { questionId, selectedOptionIds, textAnswer, scaleValue } ] }    // borrador guardado (vacío en uno nuevo)
```

### PUT `/attempts/:attemptId/answers`
Body `{ answers: [ { questionId, selectedOptionIds?, textAnswer?, scaleValue? } ] }`. Solo el dueño e `IN_PROGRESS` (409 si ya se envió o venció). Resp `{ saved: n, savedAt }`.

### POST `/attempts/:attemptId/submit`
Mismo body; guarda y califica. Resp:
`{ attempt:{ id, status:'GRADED'|'SUBMITTED', submittedAt, score, maxScore, percentage, passed }, pendingManualGrading: boolean }`

### GET `/attempts/:attemptId/result`
Solo el dueño; 409 si sigue en curso.
```
{ attempt:{ id, status, startedAt, submittedAt, score, maxScore, percentage, passed, feedback },
  assessment:{ id, title, type, passingScore, showResults }, showResults: boolean, pendingManualGrading: boolean,
  questions?: [ { id, type, text, points, scaleMax, options:[{id,text,isCorrect}], selectedOptionIds, textAnswer, scaleValue,
                  isCorrect, pointsAwarded, feedback, explanation } ] }   // `questions` solo si showResults
```

### GET `/me/grades`
```
{ data:[ { course:{id,title,slug,imageUrl}, enrollmentStatus, progressPct, finalGrade,
           assessments:[ { id, title, type, weight, passingScore, maxAttempts, attemptsUsed,
                           status:'NOT_STARTED'|'IN_PROGRESS'|'SUBMITTED'|'GRADED', bestAttemptId, bestPercentage, passed, pendingGrading } ] } ] }
```
Dependencias externas: `classroom.service.js` (`tryCompleteLessons`, `recalcEnrollment`).

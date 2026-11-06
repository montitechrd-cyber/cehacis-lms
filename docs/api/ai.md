# API · Entrenador con IA (`/api/ai`)

Todas las rutas requieren sesión. Las claves de IA viven solo en el servidor. Errores: `{ error: { code, message, details } }`.
Si la IA no está configurada, los endpoints que la necesitan responden **503 `NOT_CONFIGURED`** con un mensaje claro. Siguen funcionando: `GET /status`, `GET /scenarios`, listados/detalle históricos, `GET /tutor/history`, `POST /recommendations` (por reglas) y la creación de simulaciones (no llama a la IA). Otros códigos: `429 AI_RATE_LIMIT`/`RATE_LIMIT`, `422 AI_REFUSAL`, `502 AI_ERROR`/`AI_FORMAT`.
Los endpoints `messages`, `finish`, `tutor` y `recommendations` tienen límite de 20 solicitudes/minuto por usuario.
La IA no emite diagnósticos psicológicos ni mediciones objetivas; toda evaluación incluye `disclaimer`.

Mensaje (`message`): `{ "id": 1, "role": "user"|"assistant", "content": "…", "createdAt": "ISO" }`.

## GET /status
```json
{ "configured": true, "provider": "anthropic", "model": "claude-…", "features": ["simulator","evaluator","recommendations","tutor"] }
```

## Escenarios
Escenario público (estudiantes): `{ id, key, title, description, objectives: string[], difficulty: "BASIC"|"INTERMEDIATE"|"ADVANCED", isActive, competencies: [{ id, key, name }] }`.
Escenario completo (solo `ai.manage`): añade `persona`, `context`, `openingLine`.

- `GET /scenarios` → `{ data: Scenario[] }` (solo activos). `?all=1` con `ai.manage`: todos, en forma completa.
- `POST /scenarios` (`ai.manage`) → 201 escenario completo. Body: `{ key (2..60, [a-z0-9_-]), title, description, persona, context, objectives: string[], difficulty, openingLine, isActive, competencyIds: number[] }`. 409 si la clave existe.
- `PATCH /scenarios/:id` (`ai.manage`) → body parcial igual al anterior; si llega `competencyIds` reemplaza la lista. Devuelve el escenario completo.
- `DELETE /scenarios/:id` (`ai.manage`) → `{ ok: true }`. 409 si tiene simulaciones (desactívalo con `isActive:false`).

## Simulaciones
Objeto `simulation`:
```json
{ "id": 7, "scenarioId": 2, "status": "ACTIVE"|"COMPLETED"|"ABANDONED", "provider": "anthropic", "model": "…",
  "evaluationStatus": "PENDING"|"AI_GENERATED"|"REVIEWED", "startedAt": "ISO", "endedAt": "ISO|null", "reviewedAt": "ISO|null",
  "scenario": { "id": 2, "key": "…", "title": "…", "description": "…", "objectives": ["…"], "difficulty": "BASIC" } }
```

### POST /simulations
Body `{ scenarioId }` → 201 `{ simulation, messages: [message] }` (un mensaje `assistant` con la `openingLine`). No llama a la IA.

### GET /simulations/me
Paginado (`?page&pageSize`): `{ data: [simulation & { turns: number }], meta }`.

### GET /simulations/:id
Dueño, o personal con `ai.review` (administradores; facilitadores solo de estudiantes inscritos en sus cursos).
```json
{ "simulation": { …simulation, "student": { "id","firstName","lastName","email","avatarUrl" }, "reviewedBy": { "id","firstName","lastName" } | null },
  "messages": [message],
  "evaluation": Evaluation | null,
  "reviewerNotes": "string|null" }
```

`Evaluation`:
```json
{ "dimensions": [{ "key": "claridad|empatia|asertividad|escucha_activa|argumentacion|persuasion|manejo_conflictos",
                   "score": 1-5, "evidence": "cita breve", "suggestion": "…" }],
  "summary": "…", "strengths": ["…"], "improvements": ["…"],
  "exercises": [{ "title": "…", "description": "…" }],
  "disclaimer": "Retroalimentación formativa generada por IA. No es un diagnóstico psicológico ni una medición objetiva; un facilitador puede revisarla y ajustarla.",
  "originalScores": { "claridad": 4, … }   // solo tras una revisión docente: puntajes originales de la IA
}
```

### POST /simulations/:id/messages
Solo el dueño, estado `ACTIVE`, máx. 30 intervenciones del usuario (400 al superarlas). Body `{ content: string (1..2000) }`. Escribir exactamente `/pausa` permite al personaje salir del rol.
→ `{ "message": { "role": "assistant", "content": "…", "createdAt": "ISO" } }`. 409 si ya finalizó; 503 sin IA.

### POST /simulations/:id/finish
Solo el dueño, estado `ACTIVE` (409 si no).
- Con ≥2 intervenciones: genera la evaluación (503 sin IA; la simulación sigue activa), pasa a `COMPLETED`, `evaluationStatus: "AI_GENERATED"`, registra competencias (`source AI`, `isReviewed false`), otorga puntos `SIMULATION_COMPLETED` y notifica (tipo `AI_REVIEW`, link `/panel/ia/revisiones/<id>`) a los facilitadores de los cursos del estudiante o, si no hay, a los `ACADEMIC_ADMIN`.
  → `{ "simulation", "evaluation": Evaluation, "message": "Simulación finalizada. …" }`
- Con <2 intervenciones: `COMPLETED` sin evaluación → `{ "simulation", "evaluation": null, "message": "La simulación fue muy corta …" }`.

## Revisión docente
### GET /reviews
Permiso `ai.review`. Query: `status=AI_GENERATED|REVIEWED` (sin filtro: ambos), `q` (nombre/correo del estudiante), `page`, `pageSize`. Facilitadores: solo estudiantes inscritos en sus cursos.
```json
{ "data": [{ "id": 7, "status": "COMPLETED", "evaluationStatus": "AI_GENERATED", "startedAt": "…", "endedAt": "…", "reviewedAt": null,
             "student": { "id","firstName","lastName","email","avatarUrl" }, "scenario": { "id","key","title" } }],
  "meta": { "total","page","pageSize","pages" } }
```

### POST /simulations/:id/review
Permiso `ai.review` (con alcance sobre el estudiante). Body:
```json
{ "dimensions": [{ "key": "claridad", "score": 4 }], "reviewerNotes": "1..4000 caracteres" }
```
Actualiza los puntajes indicados (guarda `originalScores`), pasa a `REVIEWED`, marca las competencias IA de la simulación como revisadas con el puntaje ajustado, crea un `Feedback` (`SIMULATION`) y notifica al estudiante (tipo `AI_REVIEW`, link `/campus/ia/simulaciones/<id>`). Auditoría `ai.review`.
→ `{ "simulation", "evaluation": Evaluation, "reviewerNotes": "…" }`. 409 si no hay evaluación.

## Tutor académico
### POST /tutor
Body `{ question: string (1..2000), courseId?: number, lessonId?: number }`. Con `lessonId` se usa el contenido de la lección (y su curso); con solo `courseId`, el temario y objetivos. Se valida acceso al curso (403 si no está inscrito). Sin ninguno, responde en términos generales. Usa las últimas 6 interacciones del usuario para ese curso como historial.
→ `{ "answer": "…" }`

### GET /tutor/history
Query `courseId?`. → `{ "data": [{ "id", "role": "user"|"assistant", "content", "courseId": number|null, "createdAt" }] }` (últimas 50, orden cronológico).

## POST /recommendations
Sin body. Usa competencias del usuario (menor puntaje primero), cursos publicados en los que no está inscrito y actividades prácticas pendientes de sus cursos activos.
```json
{ "source": "ia" | "reglas",
  "recommendations": [{ "type": "course"|"activity"|"exercise", "refId": 12 | null, "courseId": 12 | null, "title": "…", "reason": "…" }] }
```
Máx. 6. `refId`: id del curso (`course`) o de la actividad (`activity`); `null` en `exercise`. Para `activity`, `courseId` es el curso de la actividad. Con IA configurada se valida que los ids pertenezcan a las listas entregadas (se descartan los inventados); si la IA falla o no queda nada válido, se responde por reglas. Sin datos de competencias, las reglas sugieren una simulación/evaluación diagnóstica y cursos de nivel básico.

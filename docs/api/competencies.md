# API: Competencias y rúbricas — `/api/competencies`

Todas las rutas requieren sesión. Errores: `{ error: { code, message, details } }`. Las respuestas son el objeto/arreglo directo (sin envoltorio `data`).

Tipos comunes:

```ts
type Scale = { min: number; max: number; labels: string[] | null }   // labels.length === max-min+1
type Competency = { id, key, name, description: string|null, group: string|null, isActive: boolean, scale: Scale } // sin escala asignada => {min:1,max:5,labels:null}
type CompetencySource = 'RUBRIC'|'ASSESSMENT'|'SELF'|'INSTRUCTOR'|'PEER'|'AI'
```

## Competencias

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/` | sesión (`?all=1` solo tiene efecto con `competencies.manage`, `courses.teach` o `students.manage`) |
| POST | `/` | `competencies.manage` |
| PATCH | `/:id` | `competencies.manage` |
| DELETE | `/:id` | `competencies.manage` |

- `GET /` → `Competency[]` (solo activas salvo `?all=1`).
- `POST /` body `{ key (a-z0-9_-, único), name, description?, group?, isActive?, scaleId? }` → `201 Competency`. 409 si la clave existe.
- `PATCH /:id` mismo body, todos opcionales → `Competency`.
- `DELETE /:id` → `{ ok: true }`. **409** si tiene resultados registrados ("Desactívala en lugar de eliminarla": usa `PATCH {isActive:false}`).

## Escalas (`competencies.manage` para escribir; leer: sesión)

- `GET /scales` → `[{ id, name, min, max, labels: string[]|null }]`
- `POST /scales` body `{ name, min, max, labels?: string[] }` → `201` escala. `labels` debe tener `max-min+1` elementos; `max > min`.
- `PATCH /scales/:id` parcial `{ name?, min?, max?, labels? }` (se revalida el conjunto) → escala.

## Rúbricas (permiso `courses.teach` o `competencies.manage`)

Un facilitador (sin `competencies.manage`) solo ve/gestiona rúbricas de sus cursos, rúbricas sin curso y edita las que creó/son de su curso.

Forma de rúbrica completa:

```json
{
  "id": 1, "title": "", "description": null, "courseId": 3|null, "scaleId": null,
  "scale": { "min":1, "max":5, "labels": null } | null,
  "createdAt": "ISO",
  "criteria": [{
    "id": 10, "title": "", "description": null, "competencyId": 2|null,
    "competency": { "id":2, "key":"", "name":"" } | null,
    "weight": 1, "maxScore": 5, "order": 0,
    "levels": [{ "id": 1, "score": 5, "label": "Excelente", "description": null }]
  }]
}
```

- `GET /rubrics?courseId=` → `[{ id, title, description, courseId, scaleId, criteriaCount, createdAt }]` (con `courseId`: las de ese curso + generales sin curso).
- `GET /rubrics/:id` → rúbrica completa (criterios ordenados, niveles por puntuación asc).
- `POST /rubrics` body `{ title, description?, courseId?, scaleId?, criteria: [{ title, description?, competencyId?, weight=1, maxScore=5, levels:[{score,label,description?}] }] }` (≥1 criterio) → `201` rúbrica completa.
- `PUT /rubrics/:id`
  - Sin puntuaciones previas: mismo body que POST, **reemplazo completo** de criterios → rúbrica completa.
  - Con puntuaciones: body `{ title, description? }` → rúbrica; si se envía `criteria` → **409**.
- `DELETE /rubrics/:id` → `{ ok: true }`. 409 si tiene puntuaciones o está usada por actividades/evaluaciones.

## Historial del estudiante

- `GET /me` — del usuario actual (excluye `isReviewed=false`).
- `GET /students/:userId` — el propio estudiante, personal con `students.manage`, o facilitador con `students.view_assigned` que imparta un curso donde el alumno esté inscrito (si no: 403). Para el personal **incluye** registros `isReviewed=false` (con el flag); el estudiante propio no los ve.

```json
{ "competencies": [{
  "competency": { "id":1, "key":"", "name":"", "group":null },
  "latest": { "score": 4.2, "scaleMax": 5, "source": "RUBRIC", "recordedAt": "ISO" },
  "average": 3.8, "count": 5, "trend": 1.2,
  "history": [{ "id":1, "score":3, "scaleMax":5, "source":"INSTRUCTOR",
    "course": { "id":1, "title":"" } | null,
    "evaluator": { "id":1, "firstName":"", "lastName":"" } | null,
    "notes": null, "isReviewed": true, "recordedAt": "ISO" }]   // orden cronológico ascendente
}] }
```

`latest`, `average` y `trend` (último − primero, 0 si hay un solo registro) se calculan sobre registros revisados (o sobre todos si ninguno está revisado). Competencias ordenadas por nombre.

## Evaluación del facilitador

`POST /evaluations` — permiso `courses.teach` o `students.manage`. Un facilitador solo puede evaluar alumnos inscritos en sus cursos (y `courseId`, si se envía, debe ser de su curso).

Body `{ userId, courseId?, ratings: [{ competencyId, score, notes? }] }`. Cada `score` se valida contra `min..max` de la escala de la competencia (error 400 con `details["ratings.N.score"]`).

→ `201 { "created": 2, "ids": [11, 12] }`. Crea `StudentCompetency` con `source: INSTRUCTOR`, `scaleMax` = máx. de la escala; notifica al estudiante (`/campus/competencias`) y ejecuta `evaluateBadges`.

## Servicio exportado

`competencies.service.ts` → `recordCompetency({ userId, competencyId, score, scaleMax, source, courseId?, sourceRefId?, evaluatorId?, notes?, isReviewed? })` (por defecto `isReviewed: true`).

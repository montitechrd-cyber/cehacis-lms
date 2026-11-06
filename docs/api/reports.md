# API · Reportes y dashboard (`/api/reports`)

Todas las rutas requieren sesión. Errores: `{ error: { code, message, details } }`. Fechas en ISO 8601. Porcentajes en escala 0–100 (2 decimales) o `null` si no hay datos para calcularlos.

## GET /api/reports/dashboard
Permiso: `reports.view` **o** `reports.academic`.
Query: `from`, `to` (opcionales; `YYYY-MM-DD` o ISO; por defecto últimos 30 días; `to` solo-fecha incluye todo el día; máx. 5 años).

Los campos de ingresos solo se calculan si el usuario tiene `reports.view` o `payments.manage`; si no, son `null` (y `series.revenue` es `[]`).

```json
{
  "range": { "from": "2026-10-04T00:00:00.000Z", "to": "2026-11-03T00:00:00.000Z" },
  "kpis": {
    "totalStudents": 120,
    "activeStudents": 64,
    "totalCourses": 12,
    "publishedCourses": 8,
    "inDevelopmentCourses": 3,
    "enrollments": 40,
    "completions": 9,
    "completionRate": 31.5,
    "approvalRate": 82.1,
    "attendanceRate": 90.0,
    "revenue": 1250.00,
    "revenueReal": 800.00,
    "revenueTest": 450.00,
    "pendingPayments": 3,
    "satisfaction": { "courseAvg": 4.6, "instructorAvg": 4.8, "count": 22 }
  },
  "series": {
    "enrollments": [{ "date": "2026-10-04", "count": 2 }],
    "revenue": [{ "date": "2026-10-04", "amount": 100.0 }],
    "completions": [{ "date": "2026-10-04", "count": 0 }]
  },
  "topCourses": [{ "course": { "id": 1, "title": "Oratoria", "code": "ORA-101" }, "enrollments": 12, "completions": 3, "revenue": 600.0 }],
  "instructorPerformance": [{
    "instructor": { "id": 5, "firstName": "Ana", "lastName": "Pérez" },
    "courses": 2, "students": 30, "avgRating": 4.7, "completionRate": 40.0, "pendingGrading": 6
  }],
  "competencyAverages": [{ "competency": { "id": 3, "name": "Empatía" }, "avg": 3.8, "count": 25 }]
}
```
Notas:
- `revenue` = pedidos `PAID` con `paidAt` en el rango; `revenueTest`/`revenueReal` separan por `payments.isTest`. `pendingPayments` = pedidos `PENDING` (total actual). `topCourses[].revenue` es `null` sin permiso de ingresos.
- `series`: una entrada por día (por semana, fecha = lunes, si el rango > 92 días), con ceros incluidos. Fechas en UTC.
- `activeStudents`: estudiantes con `lastLoginAt` o `lastViewAt` de lección en el rango. `completionRate`: completadas / inscripciones no canceladas (histórico). `approvalRate`: intentos GRADED aprobados de evaluaciones `FINAL` en el rango; si no hay, de `QUIZ/FINAL/PRACTICAL`. `attendanceRate`: (PRESENT+LATE)/registros de sesiones del rango.
- `instructorPerformance`: `avgRating` histórico del facilitador; `pendingGrading` = intentos `SUBMITTED` + entregas `SUBMITTED` de sus cursos. Ordenado por estudiantes.
- `competencyAverages`: registros `isReviewed` del rango, normalizados a escala 0–5; ordenado de menor a mayor.

## GET /api/reports/instructor
Permiso: `courses.teach`. Panel del facilitador autenticado.
```json
{
  "courses": [{
    "id": 1, "title": "Oratoria", "code": "ORA-101", "status": "PUBLISHED",
    "enrolled": 18, "avgProgress": 42.5, "pendingGrading": 4, "attendanceRate": 88.0, "rating": 4.7
  }],
  "pendingGrading": { "attempts": 3, "submissions": 5, "total": 8 },
  "upcomingSessions": [{
    "id": 9, "title": "Clase 3", "type": "VIRTUAL_CLASS", "startAt": "ISO", "endAt": "ISO",
    "location": null, "meetingUrl": "https://...", "course": { "id": 1, "title": "Oratoria" }
  }],
  "attendanceRate": 88.0,
  "rating": { "avg": 4.7, "count": 11 }
}
```
`attendanceRate`, `rating.avg` y `rating` por curso son `null` si no hay datos. Sin cursos asignados: listas vacías.

## GET /api/reports/export/:report
Query: `format=xlsx|pdf` (por defecto `xlsx`), `from`, `to` (opcionales; solo filtran si se envían), `courseId`.
Respuesta: archivo binario con `Content-Disposition: attachment; filename="reporte-<report>-<YYYY-MM-DD>.<ext>"`. Auditoría `report.export`.
XLSX: encabezados en español, cabecera en negrita con relleno naranja `#EE7A2F`, anchos de columna, formatos de fecha/moneda/porcentaje. PDF: tabla con cabecera institucional "CEHACIS" y pie con paginación (máx. 3000 filas; el XLSX es completo).

| `:report` | Permiso | Parámetros | Contenido |
|---|---|---|---|
| `students` | `students.manage` o `reports.view` | `from/to` (fecha de registro), `courseId` (inscritos) | Estudiantes, estado, inscripciones, puntos, último acceso |
| `enrollments` | `reports.view`/`reports.academic`/`students.manage`/`courses.manage`; facilitadores (`courses.teach`) solo de sus cursos | `from/to` (inscripción), `courseId` | Inscripciones con estado, progreso, nota final |
| `payments` | `payments.manage` o `reports.view` | `from/to` (creación) | Pedidos: totales, estado, proveedor, prueba sí/no |
| `grades` | personal del curso (`assertCourseStaff`) | `courseId` **obligatorio** | Una fila por estudiante; una columna por evaluación publicada (mejor % calificado) + nota final |
| `attendance` | personal del curso | `courseId` **obligatorio**, `from/to` (sesiones; máx. 60) | Matriz estudiante × sesión + % asistencia |
| `competencies` | `reports.academic` | `from/to`, `courseId` | Registros de competencias revisados |
| `dashboard` | `reports.view` o `reports.academic` | `from/to` (por defecto 30 días) | **Solo `pdf`**: KPIs + cursos con más inscripciones (ingresos solo con permiso) |

Errores: 400 reporte desconocido / formato inválido / falta `courseId` / `dashboard` en xlsx; 403 sin permiso.

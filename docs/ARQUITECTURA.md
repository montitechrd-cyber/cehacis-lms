# Arquitectura de CEHACIS LMS

## Vista general

```
web/ (React 19 + Vite + Tailwind 4)          server/ (Node + Express 5 + TypeScript)          MySQL 8
┌───────────────────────────────┐   /api    ┌───────────────────────────────────────┐   Prisma   ┌──────────┐
│ Portal público  (PublicLayout)│ ────────▶ │ middleware: helmet, CORS, rate limit, │ ─────────▶ │ ~80      │
│ Campus virtual  (AppShell)    │  cookies  │ CSRF doble envío, loadUser (JWT)      │            │ tablas   │
│ Panel de gestión (AppShell)   │  httpOnly │ modules/* (un Router por dominio)     │            └──────────┘
└───────────────────────────────┘           │ integrations/ ai · payments · video   │──▶ Anthropic / AZUL / SMTP
                                            └───────────────────────────────────────┘
```

Monorepo con *npm workspaces* (`server`, `web`). En desarrollo Vite redirige `/api` al backend; en producción el backend sirve `web/dist`.

## Backend

- `src/app.ts`: composición de middleware y registro de rutas (`src/routes.ts`).
- `src/modules/<dominio>/`: cada dominio es un Router independiente con su servicio:
  `auth`, `admin`, `files`, `public`, `catalog`, `classroom`, `assessments`, `competencies`, `activities`, `people`, `calendar`, `community`, `gamification`, `certificates`, `commerce`, `reports`, `ai`.
- `src/lib/`: utilidades transversales (Prisma, errores, validación Zod, paginación, auditoría, notificaciones, correo, subida de archivos, gamificación, configuración).
- `src/integrations/`: adaptadores desacoplados por interfaz — `AiProvider` (Claude), `PaymentGateway` (Sandbox / AZUL), video.
- `src/jobs/scheduler.ts`: recordatorios de eventos y expiración de suscripciones.

### Contratos entre módulos
- `classroom.service`: `computeOutline`, `isLessonCompletable`, `tryCompleteLessons`, `recalcEnrollment` — los usan evaluaciones, actividades y asistencia para desbloquear lecciones y cerrar cursos.
- `certificates.service`: `issueCertificateIfEligible` — se invoca al completar un curso.
- `lib/gamification`: `awardPoints` (idempotente por evento + referencia), `evaluateBadges`.
- `competencies.service`: `recordCompetency` — historial de competencias (fuentes: autoevaluación, evaluación, rúbrica, facilitador, pares, IA).

### Aula virtual (reglas)
- Orden global: módulos por `order`, lecciones por `order`.
- Bloqueo: no publicada, `availableFrom` futuro, o (`enforceSequence`) lección anterior no completada → `423 LOCKED` con `requiredLessonId`.
- Finalización por lección (`completionRule`): `VIEW`, `MANUAL`, `RESOURCES` (recursos obligatorios vistos), `ASSESSMENT` (evaluación aprobada), `ACTIVITY` (actividad entregada).
- Cierre del curso: lecciones completas + evaluaciones finales aprobadas + asistencia mínima → `COMPLETED`, nota final ponderada, puntos y certificado automático.

## Modelo de datos

Fuente de verdad: `server/prisma/schema.prisma` (migraciones en `server/prisma/migrations`). Grupos de entidades:

| Dominio | Tablas |
|---|---|
| Identidad y seguridad | users, roles, permissions, role_permissions, sessions, password_resets, students, instructors, audit_logs, settings |
| Catálogo | categories, programs, program_courses, courses, course_instructors, course_competencies, course_groups, course_modules, lessons, lesson_resources, folders, files |
| Progreso | enrollments, lesson_progress, resource_progress |
| Evaluación | assessments, questions, question_options, assessment_attempts, answers |
| Competencias | rating_scales, competencies, student_competencies, rubrics, rubric_criteria, rubric_levels, feedback, rubric_scores |
| Prácticas | practical_activities, activity_competencies, activity_groups, activity_group_members, activity_submissions, submission_files, peer_reviews |
| Calendario | events, event_participants, attendance, instructor_availability, instructor_evaluations, course_reviews, academic_notes |
| Certificación | certificate_templates, certificates |
| Gamificación | levels, point_rules, point_transactions, badges, achievements, challenges, challenge_completions, recognitions |
| Comunidad | forums, forum_threads, forum_posts, lesson_comments, content_reports, conversations, conversation_participants, messages, announcements, notifications, email_outbox |
| Comercial | bundles, bundle_courses, subscription_plans, subscriptions, coupons, coupon_redemptions, orders, order_items, payments, invoices |
| IA | ai_scenarios, ai_scenario_competencies, ai_simulations, ai_interactions |
| Portal | faqs, contact_messages |

Claves foráneas con `onDelete` explícito, índices en columnas de filtrado frecuente, unicidad en correos, slugs, códigos de curso/certificado/cupón, números de pedido y factura, y pares (usuario, curso), (usuario, lección), (intento, pregunta).

## Seguridad

- **Contraseñas**: bcrypt (12 rondas), política mínima (8+, letra y número), bloqueo temporal tras 5 intentos, respuesta idéntica para correo inexistente (sin enumeración).
- **Sesión**: JWT de acceso (15 min) en cookie `httpOnly SameSite=Lax`; refresh token opaco (7 días) guardado con hash, **rotación de uso único** y revocación de todas las sesiones si se reutiliza uno rotado.
- **CSRF**: doble envío (`cehacis_csrf` + cabecera `X-CSRF-Token`) en toda mutación.
- **RBAC**: permisos en BD por rol (editables por el superadministrador), validados en cada endpoint (`requirePermission`) y por alcance (`assertCourseStaff`, `assertCourseAccess`); el frontend oculta lo no permitido pero nunca es la barrera.
- **Validación**: Zod en todos los cuerpos y consultas; HTML de lecciones saneado en servidor y en cliente; foros/mensajes como texto plano.
- **Archivos**: lista blanca de extensión **y** MIME, tamaño máximo configurable, nombres aleatorios, descarga autorizada por relación con el curso/entrega, `nosniff`.
- **Inyección SQL**: solo consultas parametrizadas de Prisma.
- **Cabeceras**: helmet; rate limiting global (300/min) y específico en autenticación, contacto e IA.
- **Auditoría**: `audit_logs` en altas, cambios, borrados, exportaciones, moderación, inicio de sesión y fallos.
- **Secretos**: solo en `server/.env` (ignorado por git); `.env.example` sin valores reales. La clave de IA nunca llega al navegador.

## Frontend

- `src/App.tsx`: rutas (públicas, `/campus`, `/panel`) con carga diferida y `RequireAuth` por permisos.
- `src/components/ui`: sistema de componentes propio (botones, formularios accesibles, tablas, modales, cajón, pestañas, estados, fila de pasos del aula, editor enriquecido, carga de archivos).
- `src/lib`: cliente HTTP con CSRF y renovación automática de sesión, autenticación, marca configurable, formatos `es-DO`, hooks de mutación y estado de tablas en la URL.
- `src/pages/{public,auth,campus,panel}` y `src/features/*`: pantallas por área.

## Ampliar el sistema

1. Modelo: añadir tablas en `schema.prisma` y `npm run db:migrate`.
2. API: nuevo `src/modules/<dominio>/<dominio>.routes.ts`, registrar en `src/routes.ts`, permisos nuevos en `src/config/permissions.ts` (el seed los sincroniza).
3. Web: página en `src/pages/...` y ruta en `src/App.tsx`; reutilizar `components/ui`.
4. Nuevo proveedor de IA o pasarela: implementar `AiProvider` / `PaymentGateway`.

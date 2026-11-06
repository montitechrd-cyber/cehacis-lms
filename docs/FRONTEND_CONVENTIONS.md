# Convenciones del frontend (contrato para todas las pantallas)

Stack: React 19 · TypeScript estricto · Vite 7 · Tailwind CSS v4 (tokens en `web/src/styles/index.css`, `@theme`) · React Router 7 (`react-router`) · TanStack Query 5 · lucide-react (iconos) · sonner (toasts) · recharts (gráficos) · Tiptap (editor). Alias `@/` = `web/src/`. Todo en español.

## Dirección visual (OBLIGATORIA) — "Cartel de ciclo de conferencias universitario"
Una universidad de máximo prestigio con lenguaje de cartel suizo: retícula estricta, grotesca de gran escala, reglas finas, campos planos de naranja institucional.
- Paleta (clases Tailwind): `bg-paper` (blanco), `bg-stone` / `bg-stone-2` (gris piedra), `border-line` / `border-line-strong`, `text-ink` (#141414), `text-graphite`, `text-muted`, `bg-orange` (#EE7A2F) **solo** para acción principal, campos de cartel y el indicador "ahora"; `text-orange-deep` para texto naranja sobre blanco (contraste). Estados: success/danger/warning/info y sus `-soft`.
- Tipografía: Schibsted Grotesk (ya global). Títulos grandes y apretados (`font-bold tracking-tight`, `text-display`, `text-title`). Cifras con `tnum`. Etiquetas pequeñas en mayúsculas con tracking SOLO en cabeceras de tabla / metadatos, nunca como "eyebrow" encima de un título.
- Contenedores: secciones con regla superior (`Section`, `border-t border-ink`), listas con divisores (`divide-y divide-line`), `Panel` (fondo piedra) para agrupar. Esquinas rectas (`rounded-sm` máx). **Prohibido**: sombras difusas, degradados, texto con degradado, glassmorphism, tarjetas iguales de icono+título+texto como estructura de página, tarjetas dentro de tarjetas, bordes laterales de color >1px, emojis como iconos, "eyebrows" sobre títulos, plantilla de "número grande + etiqueta + acento" (usa `Ledger`).
- Números de serie (`serial(n)` → "N.º 01") solo donde la secuencia informa (catálogo de cursos, módulos, lecciones).
- Estado de progreso por FORMA (usa `StatusMark` / `StepRow`), no solo color.
- Movimiento: una sola entrada por vista con `animate-rise` (con `style={{animationDelay}}` escalonado corto si listas), nada de efectos hover dispersos. Respeta prefers-reduced-motion (ya global).
- Responsive: funciona a 375 px (sin scroll horizontal; tablas dentro de `DataTable` ya hacen scroll propio), 768 y 1440.
- Accesibilidad: labels en todos los campos (usa los componentes), foco visible, `aria-*` en controles personalizados, textos alternativos.

## Componentes existentes (úsalos; no los dupliques)
- `@/components/ui/Button` → `Button` (variant: primary|ink|outline|ghost|danger|link; size sm|md|lg; loading; icon), `ButtonLink` (Link con estilo de botón), `IconButton` (label obligatorio)
- `@/components/ui/Form` → `Input`, `Textarea`, `Select` (options [{value,label}], placeholder), `Checkbox`, `Switch`, `Field` (render-prop), `FormActions`. Todos aceptan `label`, `hint`, `error`.
- `@/components/ui/Feedback` → `Spinner`, `PageLoader`, `Skeleton`, `SkeletonRows`, `EmptyState` (title, description, action), `ErrorState` (error, onRetry), `Alert` (tone info|success|warning|danger, title)
- `@/components/ui/Overlay` → `Modal` (open, onClose, title, description, footer, size sm|md|lg|xl), `ConfirmDialog`, `Drawer`
- `@/components/ui/Data` → `DataTable` (columns [{key, header, cell, sortable, align}], rows, rowKey, loading, empty, sort, onSort, onRowClick), `Pagination` (page, pages, total, onPage), `SearchInput` (debounce), `Toolbar`, `Tag` (tone) + `statusTone(status)`, `Avatar`, `ProgressRule`, `Tabs`, `Ledger` (KPIs como libro de registro), `Facts` (lista clave-valor)
- `@/components/ui/StepRow` → `StatusMark` (status completed|in_progress|available|locked), `StepRow` (fila de pasos con indicador "ahora")
- `@/components/ui/RichText` → `RichTextEditor` (value, onChange), `RichTextView` (html saneado con estilo `prose-lesson`), `sanitizeHtml`
- `@/components/ui/Upload` → `FileDrop` (files, onChange, accept, multiple, maxFiles, maxMb, hint)
- `@/components/ui/Page` → `PageHeader` (title, description, actions, crumbs), `Section` (title, actions, description), `Panel`
- `@/lib/api` → `api.get/post/put/patch/del/upload`, `download(url, name)` (PDF/XLSX autenticados), `ApiError` (`.fieldErrors` para formularios), `errorMessage(e)`, tipo `Paged<T>`
- `@/lib/hooks` → `useAction(fn, { success, invalidate, onSuccess })` (mutación con toast + invalidación), `useTableParams()` (estado de tabla en la URL: get/set/page/toggleSort/sort)
- `@/lib/auth` → `useAuth()` → { user, can(...perms), isStaff, login, logout, refresh }; tipo `Me`
- `@/lib/brand` → `useBrand()` (nombre, logo, contacto configurables)
- `@/lib/format` → `money`, `num`, `pct`, `date`, `dateTime`, `time`, `relative`, `fileSize`, `fullName`, `initials`, `serial`, y diccionarios de etiquetas: LEVELS, MODALITIES, COURSE_STATUS, ROLES, RESOURCE_TYPES, ASSESSMENT_TYPES, QUESTION_TYPES, ACTIVITY_TYPES, EVENT_TYPES, ATTENDANCE, COMPLETION_RULES, ORDER_STATUS, ENROLLMENT_STATUS, COMPETENCY_SOURCE
- Layouts y rutas ya existen en `web/src/App.tsx` (NO lo edites). Cada página es un archivo con `export default function NombrePagina()` en la ruta indicada en tu brief.

## Datos
- Contratos de la API: `docs/api/*.md` (formas JSON EXACTAS — léelas antes de consumir un endpoint; no inventes campos). Base `/api` ya incluida por `api` (usa rutas como `/catalog/courses`).
- `useQuery({ queryKey: [...], queryFn: () => api.get<T>(...) })`; define interfaces TypeScript locales de las respuestas que uses.
- Mutaciones con `useAction`. Errores de formulario: `catch (e) { if (e instanceof ApiError) setErrors(e.fieldErrors) }` o muestra `toast.error`.
- Todo botón hace algo real; todo enlace tiene destino. Sin datos ficticios: si una integración no está configurada (IA, pagos AZUL, SMTP), muéstralo como estado claro con `Alert`.
- Estados de carga (`PageLoader`/`SkeletonRows`), vacío (`EmptyState` con acción útil) y error (`ErrorState` con reintentar) en cada vista.
- Archivos: los recursos devuelven `url` tipo `/api/files/:id` — úsala directo en `<a href>`, `<img>`, `<video>`, `<audio>` (la cookie de sesión viaja sola).

## Rutas del frontend (para enlaces)
Público: `/`, `/nosotros`, `/programas`, `/programas/:slug`, `/cursos`, `/cursos/:slug`, `/facilitadores`, `/contacto`, `/preguntas-frecuentes`, `/verificar`, `/verificar/:code`, `/checkout?items=COURSE:12,BUNDLE:3`, `/ingresar?next=`, `/registro`, `/recuperar`, `/restablecer?token=`.
Campus: `/campus`, `/campus/cursos`, `/campus/cursos/:courseId`, `/campus/cursos/:courseId/espacio`, `/campus/leccion/:lessonId`, `/campus/evaluaciones/:assessmentId`, `/campus/practicas/:activityId`, `/campus/calificaciones`, `/campus/competencias`, `/campus/calendario`, `/campus/ia`, `/campus/ia/simulaciones/:id`, `/campus/ia/tutor`, `/campus/comunidad`, `/campus/comunidad/foro/:id`, `/campus/comunidad/hilo/:id`, `/campus/mensajes`, `/campus/mensajes/:id`, `/campus/logros`, `/campus/certificados`, `/campus/pagos`, `/campus/notificaciones`, `/campus/perfil`.
Panel: `/panel`, `/panel/cursos`, `/panel/cursos/:id` (?tab=), `/panel/evaluaciones/:id`, `/panel/actividades/:id`, `/panel/programas`, `/panel/categorias`, `/panel/competencias`, `/panel/calendario`, `/panel/asistencia/:eventId`, `/panel/certificados`, `/panel/estudiantes`, `/panel/estudiantes/:id`, `/panel/facilitadores`, `/panel/facilitadores/:id`, `/panel/comunidad`, `/panel/ia`, `/panel/ia/revisiones/:id`, `/panel/gamificacion`, `/panel/comercial` (?tab=), `/panel/reportes`, `/panel/usuarios`, `/panel/roles`, `/panel/configuracion` (?tab=).

## Reglas de trabajo
- Escribe SOLO los archivos de tu brief. Si necesitas un componente compartido nuevo, créalo dentro de `web/src/features/<tu-area>/`.
- Al terminar ejecuta `npx tsc --noEmit -p tsconfig.json` en `web/` y corrige errores de TUS archivos (ignora errores de imports de páginas que otros agentes aún no han creado).

# CEHACIS LMS

Plataforma de aprendizaje del **Centro de Entrenamiento en Habilidades Comunicativas e Inteligencia Social** (CEHACIS): portal público con catálogo y compra, campus virtual con aulas de navegación lineal y secuencia forzada, y panel administrativo completo.

> Transformamos tu voz, tu presencia y tu capacidad de conectar.

## Contenido

| Área | Qué incluye |
|---|---|
| **Portal público** | Inicio, Nosotros, Programas, Catálogo, Ficha de curso, Facilitadores, Contacto, Preguntas frecuentes, Registro, Inicio de sesión, Verificación pública de certificados, Checkout |
| **Campus virtual** | Mis cursos, **aula virtual** (Anterior/Siguiente en la esquina superior, secuencia forzada configurable, índice lateral, documentos/archivos/exámenes/foros/enlaces/carpetas/multimedia/clases en vivo), evaluaciones, prácticas con entrega de video/audio (incluye grabación en el navegador), calificaciones, competencias con historial, entrenador con IA, comunidad, mensajería, calendario, logros, certificados, pagos |
| **Panel** | Dashboard con KPIs y gráficos, cursos (constructor de módulos/lecciones/recursos), evaluaciones y banco de preguntas, prácticas con rúbricas, programas, categorías, estudiantes (expediente digital), facilitadores (perfil, cursos, disponibilidad, desempeño), competencias/rúbricas/escalas, calendario y asistencia, certificados y plantillas, comunidad y moderación, IA (escenarios y revisión docente), gamificación, comercial (pedidos, pagos, cupones, paquetes, planes, facturas), reportes Excel/PDF, usuarios, roles y permisos, configuración (marca, integraciones, FAQ, contacto, bandeja de correo, auditoría, respaldo) |

## Requisitos

- Node.js 22+ (probado con 24) y npm 10+
- MySQL 8 (probado con MySQL 8.4 de Laragon)

## Instalación

```bash
npm install
```

```bash
cp server/.env.example server/.env
```

Edita `server/.env`: `DATABASE_URL`, `SHADOW_DATABASE_URL` y un `JWT_ACCESS_SECRET` aleatorio de 48+ bytes:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Crea las bases de datos (vacías) `cehacis_lms` y `cehacis_lms_shadow` en MySQL con `utf8mb4`, luego aplica migraciones y datos iniciales:

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

## Ejecución en desarrollo

```bash
npm run dev:server
```

```bash
npm run dev:web
```

- API: http://localhost:4000/api (salud: `/api/health`)
- Web: http://localhost:5173 (Vite redirige `/api` a la API)

## Usuarios de prueba (datos semilla)

Contraseña de todos: `Cehacis2026!` (o el valor de `SEED_PASSWORD` al sembrar). **Cámbiala o elimina estos usuarios antes de producción.**

| Rol | Correo |
|---|---|
| Superadministrador | superadmin@cehacis.test |
| Administrador académico | academico@cehacis.test |
| Facilitador (Oratoria, Comunicación Asertiva) | facilitador@cehacis.test |
| Facilitadora (Resolución de Conflictos) | facilitadora2@cehacis.test |
| Estudiante con progreso, certificado y pagos | estudiante@cehacis.test |
| Estudiantes adicionales | estudiante2@cehacis.test, estudiante3@cehacis.test |

## Catálogo inicial

Tomado de cehacis.com (noviembre 2026): **Curso de Oratoria** (USD 39), **Curso de Comunicación Asertiva** (USD 29), **Curso de Resolución de Conflictos** (USD 39) — publicados con módulos, lecciones, evaluaciones, rúbricas y prácticas. **Etiqueta y Urbanidad** queda en borrador porque su precio no está publicado. *Inteligencia Emocional Aplicada*, *Liderazgo Comunicativo* y *Negociación Estratégica* están "En desarrollo" para que la dirección académica complete temario, facilitador y precio.

## Pruebas

```bash
npm test
```

Pruebas de integración (Vitest + Supertest) de autenticación, CSRF, RBAC por rol, secuencia forzada y navegación del aula, cotización con cupón en sandbox, verificación de certificados y exposición de claves. Requieren la base sembrada.

## Integraciones y estado

| Integración | Estado por defecto | Cómo activarla |
|---|---|---|
| **Pagos** | `sandbox`: entorno de pruebas interno, **no cobra dinero real**; pedidos, pagos y facturas quedan marcados como prueba | AZUL: definir `AZUL_MERCHANT_ID`, `AZUL_AUTH1`, `AZUL_AUTH2`, `PAYMENT_PROVIDER=azul` y completar la firma y el retorno en `server/src/integrations/payments/gateway.ts` y `POST /api/commerce/webhook/azul` (hoy responde 501) |
| **IA (Claude)** | No configurada: el simulador y el tutor muestran "no configurado"; las recomendaciones usan reglas | Definir `ANTHROPIC_API_KEY` (y opcionalmente `AI_MODEL`, por defecto `claude-opus-5-5`). La clave solo vive en el servidor |
| **Correo** | Sin SMTP: los correos quedan registrados en la bandeja (panel → Configuración → Bandeja de correo) con estado LOGGED | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| **Videoconferencia** | Enlaces manuales (Zoom, Meet, Teams, Jitsi detectados automáticamente) | Credenciales Zoom S2S en `.env` (creación automática de reuniones pendiente de implementar) |
| **Facturación fiscal** | NCF vacío ("Pendiente de configuración") | Integrar secuencias de comprobantes de la DGII |
| **Almacenamiento** | Disco local (`UPLOAD_DIR`) | Para varias instancias, mover a S3/compatible |

## Producción

```bash
npm run build
```

```bash
npm run db:deploy --workspace server
```

```bash
NODE_ENV=production COOKIE_SECURE=true node server/dist/index.js
```

En producción la API sirve `web/dist` con fallback SPA. Usa HTTPS (cookies `Secure`), un `JWT_ACCESS_SECRET` propio y respaldos diarios (ver `docs/OPERACION.md`).

## Documentación

- `docs/ARQUITECTURA.md` — arquitectura, modelo de datos, seguridad y decisiones
- `docs/OPERACION.md` — configuración, respaldos y recuperación
- `docs/api/*.md` — contrato de cada módulo de la API
- `docs/BACKEND_CONVENTIONS.md`, `docs/FRONTEND_CONVENTIONS.md` — convenciones para ampliar el sistema
- `PRODUCT.md`, `DESIGN.md` — contexto de producto y sistema visual

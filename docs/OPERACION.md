# Operación: configuración, respaldos y recuperación

## Variables de entorno
Ver `server/.env.example`. Nunca subas `server/.env` al repositorio (está en `.gitignore`).

## Respaldo diario de la base de datos

```bash
mysqldump --single-transaction --routines --triggers -u USUARIO -p cehacis_lms > respaldo-$(date +%F).sql
```

Respaldar también la carpeta de archivos subidos (`UPLOAD_DIR`, por defecto `server/storage/uploads`). Conservar al menos 7 diarios y 4 semanales fuera del servidor. Registrar cada respaldo en Panel → Configuración → Respaldo.

## Recuperación

1. Detener la API.
2. Restaurar la base:

```bash
mysql -u USUARIO -p cehacis_lms < respaldo-AAAA-MM-DD.sql
```

3. Restaurar `UPLOAD_DIR`.
4. Aplicar migraciones pendientes:

```bash
npm run db:deploy --workspace server
```

5. Iniciar la API y comprobar `GET /api/health`.

## Rotación de secretos
Cambiar `JWT_ACCESS_SECRET` invalida los tokens de acceso (los usuarios renuevan con su refresh token). Para cerrar todas las sesiones, marcar `revokedAt` en la tabla `sessions`.

## Puntos pendientes de configuración
- Credenciales y firma de AZUL (pagos reales).
- `ANTHROPIC_API_KEY` (entrenador con IA y tutor).
- SMTP (envío real de correos).
- Secuencias NCF (comprobantes fiscales DGII).
- Credenciales Zoom (opcional, creación automática de reuniones).
- Contraseñas y usuarios de prueba: cambiarlos o eliminarlos.

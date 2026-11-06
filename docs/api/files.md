# API Archivos — `/api/files`

Almacenamiento local. Tipos permitidos: pdf, doc(x), xls(x), ppt(x), txt, csv, zip, png, jpg, jpeg, webp, gif, mp4, webm, mov, mp3, m4a, wav, ogg (extensión y mime validados). Tamaño máximo por defecto `MAX_UPLOAD_MB` (200).

## `POST /api/files` (sesión)
Multipart, campo `file`. Query opcional `?isPublic=true` (solo personal con `courses.manage`, `courses.teach` o `settings.manage`; si no, 403).
→ 201
```json
{ "file": { "id": 12, "originalName": "guia.pdf", "mimeType": "application/pdf", "size": 12345, "isPublic": false, "url": "/api/files/12" } }
```

## `GET /api/files/:id`
Sirve el archivo. `?download=1` fuerza `Content-Disposition: attachment` (por defecto `inline`); el nombre original va codificado (RFC 5987, `filename*=UTF-8''...`).
Cabeceras: `X-Content-Type-Options: nosniff`; `Cache-Control: private` (públicos: `public, max-age=3600`).
Autorización:
- `isPublic` → cualquiera (sin sesión).
- Privado → requiere sesión (401) y una de: dueño; `courses.manage`; el archivo es recurso de lección o está en una carpeta de un curso al que el usuario tiene acceso (staff o inscrito activo/completado); es archivo de una entrega y el usuario es autor, miembro del grupo o facilitador del curso; es logo/firma de una plantilla de certificado y tiene `certificates.manage`. Si no: 403.
- 404 si el registro no existe o el archivo ya no está en disco.

## `DELETE /api/files/:id` (sesión)
Dueño o `courses.manage`. → `{ "ok": true }`. 409 si está usado por un recurso de lección, una entrega, una plantilla de certificado o es el logo de la marca. Borra el registro y el archivo físico.

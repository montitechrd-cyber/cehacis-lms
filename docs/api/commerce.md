# API — Módulo comercial (`/api/commerce`)

Moneda: USD. **Entorno de pruebas**: el único proveedor operativo es el SANDBOX (no mueve dinero real). Todo cobro hecho con sandbox queda con `isTest: true` en pagos, y la factura/pedido se etiquetan como prueba. AZUL (`getGateway()`) está pendiente de configurar: si `PAYMENT_PROVIDER=azul` sin credenciales, el checkout responde `503 NOT_CONFIGURED`.

Convenciones: errores `{ error:{ code, message, details } }`; fechas ISO; importes como `number`. Listas paginadas: `{ data:[...], meta:{ total, page, pageSize, pages } }` (`?page&pageSize&q&sort&order`). Permiso administrativo: `payments.manage`.

Ítems del carrito: `{ type: 'COURSE'|'PROGRAM'|'BUNDLE'|'SUBSCRIPTION', id: number }`. Precio: `course.price` (PUBLISHED, no `isFree`), `program.price` (PUBLISHED), `bundle.price` (isActive), `plan.price` (isActive).

---

## Catálogo (públicos, sin sesión)

### GET `/catalog/plans`
```json
{ "data": [ { "id":1, "name":"Pro mensual", "description":"...", "price":29.9, "interval":"MONTH", "includesAll":true, "isActive":true } ] }
```
### GET `/catalog/bundles`
```json
{ "data": [ { "id":1, "title":"Pack Oratoria", "slug":"pack-oratoria", "description":"...", "price":99, "regularTotal":150,
  "courses":[ { "id":3, "title":"...", "slug":"...", "imageUrl":null, "price":50, "durationHours":10 } ] } ] }
```

---

## Estudiante (`requireAuth`)

### POST `/checkout/quote`
Body: `{ "items":[{type,id}], "couponCode"?: "VERANO10" }`
```json
{
  "items":[ { "type":"COURSE","id":3,"description":"Oratoria","unitPrice":50,"alreadyOwned":false } ],
  "subtotal":50, "discount":5, "tax":0, "total":45,
  "coupon": { "code":"VERANO10","description":"...","type":"PERCENT","value":10 },
  "couponError": null,
  "warnings":[]
}
```
- Los ítems `alreadyOwned:true` (curso/programa/paquete con todos sus cursos ya activos; plan con suscripción activa) se excluyen del subtotal y generan un `warning`. Ítems no vendibles también generan `warning` (en `/checkout` son error 400).
- Cupón inválido → `coupon:null`, `couponError:"mensaje"`, descuento 0 (no es error HTTP). Reglas: activo, vigencia, `maxUses`, `perUserLimit` (canjes del usuario), `minAmount` (sobre el subtotal), `courseId` (si lo tiene, solo descuenta ese curso). PERCENT 0–100; FIXED nunca supera la base aplicable.

### POST `/checkout`
Body:
```json
{ "items":[{"type":"COURSE","id":3}], "couponCode":"VERANO10", "billing":{ "name":"Ana Pérez", "taxId":"001-0000000-1" }, "testCard":"approve" }
```
`testCard`: `'approve'` (defecto) | `'decline'` (solo sandbox). `billing.taxId` opcional.

Flujo: crea Order `PENDING` (`ORD-AAAAMMDD-0001`, secuencial diario) con sus ítems y `provider` = pasarela activa; si total = 0 se paga directo sin pasarela (Payment `provider:'FREE'`); si no, `gateway.charge`.
- **Aprobado → 200**
```json
{ "order":{ "id":12,"number":"ORD-20261103-0001","status":"PAID","total":45,"isTest":true },
  "invoice":{ "id":7,"number":"FAC-000007" },
  "enrolledCourseIds":[3] }
```
Efectos: Order `PAID` + `paidAt`; Payment `APPROVED` (`isTest`); Invoice (`ncf:null` — pendiente de configuración fiscal, `isTest` = pago de prueba); CouponRedemption + `usedCount++`; COURSE → Enrollment `ACTIVE` source `PURCHASE` (upsert, reactiva `CANCELLED`, guarda `orderItemId`); PROGRAM → inscribe cada curso (source `PROGRAM`); BUNDLE → cada curso (`PURCHASE`); SUBSCRIPTION → Subscription `ACTIVE` por 1 mes / 1 año. Notificación "Pago confirmado" (con correo, link `/campus/pagos`).
- **Rechazado → 402** `{ "error":{ "code":"PAYMENT_DECLINED","message":"Pago de prueba rechazado ..." } }` (Order `FAILED`, Payment `DECLINED`).
- **Pasarela sin configurar → 503** `NOT_CONFIGURED`.
- **Pasarela con redirección → 202** `{ order:{...status:"PENDING"}, invoice:null, enrolledCourseIds:[], redirectUrl }` (solo aplicable a AZUL cuando se implemente).
- 400 si el cupón enviado es inválido, si hay ítems no vendibles o si todo está ya adquirido.

### GET `/orders/me`
Sin paginar: `{ data:[Order] }` (más recientes primero). Forma de `Order`:
```json
{ "id":12,"number":"ORD-20261103-0001","userId":5,"status":"PAID","subtotal":50,"discount":5,"tax":0,"total":45,"currency":"USD",
  "couponId":1,"coupon":{"code":"VERANO10"},"provider":"SANDBOX","notes":null,"isTest":true,"createdAt":"...","paidAt":"...",
  "items":[ { "id":1,"orderId":12,"itemType":"COURSE","courseId":3,"programId":null,"bundleId":null,"planId":null,"description":"Oratoria","unitPrice":50,"quantity":1,"total":50 } ],
  "payments":[ { "id":9,"provider":"SANDBOX","providerRef":"SBX-AB12","amount":45,"currency":"USD","status":"APPROVED","isTest":true,"method":"TARJETA_PRUEBA","createdAt":"..." } ],
  "invoice":{ "id":7,"number":"FAC-000007","isTest":true,"ncf":null,"issuedAt":"...","total":45 } }
```
### GET `/orders/:id`
Dueño o `payments.manage`. `{ data: Order & { user:{id,firstName,lastName,email,avatarUrl} } }`. 403 si no es suyo.

### GET `/invoices/:id/pdf`
Dueño o `payments.manage`. Responde `application/pdf` (inline). Incluye datos de la academia (`legalName`, `contactEmail`, `contactPhone`), cliente, número, fecha, ítems, subtotal/descuento/impuestos/total en USD, NCF ("Pendiente de configuración" si es null) y, si `isTest`, la franja roja "DOCUMENTO DE PRUEBA — SIN VALIDEZ FISCAL".

### GET `/subscriptions/me`
`{ data:[ { id,userId,planId,status,currentPeriodStart,currentPeriodEnd,cancelledAt,createdAt, plan:{id,name,description,price,interval,includesAll} } ] }`

### POST `/subscriptions/:id/cancel`
Dueño. Registra `cancelledAt`; la suscripción **sigue `ACTIVE` hasta `currentPeriodEnd`** y al vencer pasa a `CANCELLED` (sin cancelar, al vencer pasa a `EXPIRED`). La transición ocurre perezosamente: se aplica al consultar `GET /subscriptions/me` o `GET /subscriptions`. Respuesta `{ data: Subscription & { plan } }`. 409 si no está activa o ya fue cancelada.

---

## Administración (`payments.manage`)

### GET `/status`
`integrationStatus()`:
```json
{ "active":"SANDBOX", "sandbox":{ "configured":true,"note":"..." }, "azul":{ "configured":false,"env":"...","note":"..." } }
```

### GET `/orders`
Query: `q` (número, correo o nombre), `status` (`PENDING|PAID|FAILED|CANCELLED|REFUNDED`), `from`, `to` (`YYYY-MM-DD`, `to` inclusivo), `page`, `pageSize`, `sort` (`createdAt|total|number|status`). Paginado; cada fila:
```json
{ "id":12,"number":"...","status":"PAID","subtotal":50,"discount":5,"tax":0,"total":45,"currency":"USD","provider":"SANDBOX","isTest":true,"createdAt":"...","paidAt":"...",
  "user":{ "id":5,"firstName":"","lastName":"","email":"","avatarUrl":null },
  "items":[ { "id":1,"itemType":"COURSE","description":"","unitPrice":50,"quantity":1,"total":50 } ],
  "payments":[ { "id":9,"provider":"SANDBOX","status":"APPROVED","isTest":true,"method":"TARJETA_PRUEBA","amount":45 } ],
  "invoice":{ "id":7,"number":"FAC-000007","isTest":true } }
```

### POST `/orders/:id/mark-paid`
Body: `{ "method":"TRANSFERENCIA"|"EFECTIVO"|"OTRO", "reference":"string", "notes"?:"string" }`. Solo para `PENDING`/`FAILED` (409 si no). Crea Payment `APPROVED` provider `MANUAL` con `isTest:false`, factura (isTest false), cupón y cumplimiento como el checkout; la factura usa el nombre del usuario como cliente. Audita `order.mark_paid` y notifica. Respuesta igual a la del checkout aprobado: `{ order, invoice, enrolledCourseIds }`.

### POST `/orders/:id/cancel`
Solo `PENDING`. Respuesta `{ "id":12,"number":"...","status":"CANCELLED" }`. Audita `order.cancel` y notifica.

### POST `/orders/:id/refund`
Body opcional `{ "reason"?: string }`. Solo `PAID`. Orden → `REFUNDED`, pagos aprobados → `REFUNDED`, inscripciones originadas por la orden (`orderItemId`) en `ACTIVE`/`PENDING_PAYMENT` → `CANCELLED` (las `COMPLETED` se conservan), y las suscripciones de los planes de la orden se cancelan de inmediato. Respuesta `{ "id","number","status":"REFUNDED","enrollmentsCancelled":2,"subscriptionsReverted":0 }`. Pagos reales de AZUL aún no se reembolsan por API (`503 NOT_CONFIGURED`). Audita `order.refund` y notifica.

### GET `/payments`
Query `status` (`PENDING|APPROVED|DECLINED|REFUNDED`), `from`, `to`, paginación. Fila:
`{ id, provider, providerRef, amount, currency, status, isTest, method, createdAt, order:{ id, number, status, user:{...} } }`

### GET `/payments/pending`
Órdenes `PENDING` (paginado, más antiguas primero): `{ ...Order, user, items:[{id,itemType,description,total}], payments:[{id,provider,status,isTest}] }`

### GET `/invoices`
Paginado (`q` por número, nombre de facturación o correo). Fila: `{ id, number, orderId, userId, billingName, billingTaxId, ncf, subtotal, discount, tax, total, currency, isTest, issuedAt, user:{...}, order:{id,number} }`

### GET `/transactions?from&to`
Historial unificado para exportación (sin paginar, máx. 10 000, más recientes primero):
```json
{ "data":[ { "id":9,"date":"2026-11-03T14:00:00.000Z","orderNumber":"ORD-20261103-0001","customer":"Ana Pérez","customerEmail":"ana@x.com","method":"TARJETA_PRUEBA","provider":"SANDBOX","amount":45,"currency":"USD","status":"APPROVED","isTest":true } ] }
```

### Cupones
- `GET /coupons` (paginado, `q`): `{ id, code, description, type, value, maxUses, usedCount, perUserLimit, minAmount, courseId, course:{id,title}|null, validFrom, validUntil, isActive, createdAt }`
- `POST /coupons` → 201 `{ data: Coupon }`. Body:
```json
{ "code":"verano10","description":"10% verano","type":"PERCENT","value":10,"maxUses":100,"perUserLimit":1,"minAmount":null,"courseId":null,"validFrom":null,"validUntil":"2026-12-31","isActive":true }
```
  `code` se guarda en mayúsculas y es único (409). PERCENT ≤ 100. `perUserLimit` defecto 1, `isActive` defecto true.
- `PATCH /coupons/:id` — campos parciales del mismo body → `{ data: Coupon }`.
- `DELETE /coupons/:id` → `{ ok:true }`. Si tiene canjes/pedidos: se **desactiva** y responde `409` ("... se desactivó en su lugar").

### Paquetes
- `GET /bundles` (paginado): `{ id,title,slug,description,price,isActive,createdAt, courses:[{id,title,slug,price}] }`
- `POST /bundles` → 201 `{ data: Bundle }`. Body `{ "title","description","price","isActive","courseIds":[3,4] }`; `slug` se genera del título (único).
- `PATCH /bundles/:id` — parcial; si llega `courseIds` reemplaza el contenido; si cambia el título se regenera el slug.
- `DELETE /bundles/:id` → `{ ok:true }`; con pedidos asociados se desactiva y responde `409`.

### Planes
- `GET /plans` (paginado): `{ id,name,description,price,interval,includesAll,isActive,subscriptionsCount }`
- `POST /plans` → 201 `{ data: Plan }`. Body `{ "name","description","price","interval":"MONTH"|"YEAR","includesAll","isActive" }`.
- `PATCH /plans/:id`, `DELETE /plans/:id` (`409` si tiene suscripciones; desactívalo en su lugar).

### Suscripciones
- `GET /subscriptions?status&q&page` (paginado): `{ id,userId,planId,status,currentPeriodStart,currentPeriodEnd,cancelledAt,createdAt, user:{...}, plan:{id,name,price,interval} }`
- `POST /subscriptions/:id/cancel` — body opcional `{ "immediate"?: boolean }`. Sin `immediate` aplica la misma regla que al estudiante (activa hasta fin de periodo); con `immediate:true` pasa a `CANCELLED` ya. Audita y notifica.

---

## Webhook
### POST `/webhook/azul` (público)
Aún no implementado: `501 { "error":{ "code":"NOT_CONFIGURED","message":"Retorno de AZUL pendiente de configurar" } }`. Los pasos pendientes (validar AuthHash, idempotencia por OrderNumber, actualizar Payment, verificar monto) están como comentario en `commerce.routes.ts`.

## Notas de integración
- Una suscripción activa NO crea inscripciones: el acceso a cursos por suscripción (`includesAll`) debe resolverlo el módulo de acceso/cursos consultando `GET /subscriptions/me` / la tabla `subscriptions` (`status=ACTIVE` y `currentPeriodEnd` futuro).
- NCF/facturación fiscal: `ncf` siempre `null` hasta configurar la secuencia fiscal. Las facturas de prueba llevan `isTest:true`.

# Backend de comercio y reservas

Backend modular con NestJS, PostgreSQL y TypeORM. Incluye autenticaci?n JWT, cat?logo, promociones, ?rdenes, reservas, Culqi y administraci?n.

## Instalaci?n local

1. Instalar Node.js 22 o superior y PostgreSQL.
2. Ejecutar `npm ci`.
3. Copiar `.env.example` a `.env` y completar los valores. `JWT_SECRET` debe ser una cadena aleatoria de al menos 32 caracteres; no existe una clave de respaldo.
4. Crear una base vac?a y ejecutar `npm run migration:run`.
5. Opcional: configurar `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` (m?nimo 12 caracteres) y ejecutar `npm run seed`. El seed crea una cuenta ADMIN por defecto; para el primer acceso de administracion global, configurar tambien `SEED_ADMIN_ROLE=superadmin` antes de ejecutarlo. Si el correo ya existe, el seed conserva su rol.
6. Ejecutar `npm run start:dev`. Swagger est? disponible en `/api`.

Las migraciones deben ejecutarse antes de arrancar la nueva versi?n tambi?n sobre bases existentes. La migraci?n de seguridad a?ade tablas de auditor?a/configuraci?n, intentos de pago y la columna de cargo de ?rdenes. No se han aplicado autom?ticamente sobre tu base. Mantener `TYPEORM_SYNC=false`; la aplicaci?n rechaza la sincronizaci?n autom?tica en producci?n.

## Integraciones

- Culqi: configurar `CULQI_SECRET_KEY`. Los cambios posteriores desde configuraci?n del superadministrador se leen desde la base en cada operaci?n.
- Chatbot: configurar `OPENROUTER_API_KEY` y `OPENROUTER_MODEL` con un identificador disponible en tu cuenta de OpenRouter.
- Correo: configurar `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` y `SMTP_FROM`. Si el servidor requiere autenticaci?n, completar `SMTP_USER` y `SMTP_PASSWORD`. Un error de correo se registra sin revertir un pago confirmado.
- Las claves guardadas en configuraci?n administrativa tienen prioridad sobre el entorno. No guardar credenciales de prueba compartidas en el c?digo.

## Comportamiento financiero

Las promociones se aplican al crear la reserva o la orden directa. Prioridad: producto, categor?a, general; en empates se usa el ID m?s antiguo. Los precios descontados se guardan como instant?nea.

Los precios del cat?logo se interpretan como precios **sin impuesto ni delivery**. El total se calcula con el subtotal descontado, `TAX_RATE` y `DELIVERY_FEE`; el m?nimo `MIN_ORDER_AMOUNT` se verifica sobre el subtotal descontado. Valores iniciales: 0.18, S/ 5 y S/ 10 respectivamente. Si tus precios ya incluyen IGV, configura `TAX_RATE=0` en el panel antes de habilitar ventas, para evitar sumarlo nuevamente.

Una orden de reserva conserva el total cotizado, sin aplicar el impuesto/delivery por segunda vez. Las reservas anteriores conservan sus totales existentes. La creaci?n de ?rdenes devuelve `totalAmount`: el frontend debe utilizar ese monto para el pago, en lugar de recalcularlo.

## Confirmaci?n y conciliaci?n de pagos

Antes de llamar a Culqi se registra un intento bajo bloqueo de la orden. Los intentos inciertos permanecen en `processing` y bloquean nuevos cobros y cambios financieros. Solo un rechazo definitivo permite otro intento.

Un proceso cada minuto intenta recuperar cargos usando su metadata y confirma orden/reserva en una transacci?n. Nunca interpreta la ausencia de un cargo como autorizaci?n para cobrar otra vez. La consulta a Culqi est? acotada a 20 p?ginas por intento; si no se puede resolver, se mantiene bloqueado para revisi?n operativa. No se garantiza disponibilidad de Culqi ni se reintenta autom?ticamente un cobro.

`GET /orders/:id/payment-status` permite al propietario consultar `orderStatus`, `paymentStatus` y `chargeId`. Un pago puede haberse cobrado aunque una respuesta HTTP sea de error: el frontend debe consultar este endpoint y no enviar otro token para repetirlo.

Integraci?n basada en la [documentaci?n oficial de cargos de Culqi](https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/cargos/) y su [referencia de API](https://apidocs.culqi.com/).

## Permisos y cambios de estado

- Roles y altas/cambios/bajas administrativas de usuarios: solo SUPERADMIN. ADMIN conserva consultas de usuarios; cada usuario puede editar su propio perfil.
- Administraci?n de reservas: ADMIN o SUPERADMIN.
- Consultas de ?rdenes: siempre restringidas al propietario, incluso al filtrar por reserva.
- La estrategia JWT consulta el estado y rol actuales del usuario en cada petici?n.
- Estado de ?rdenes: pendiente/fallida ? cancelada; pagada ? enviada ? entregada. Los pagos y reembolsos usan sus flujos espec?ficos.
- Reservas: pendiente ? aprobada/cancelada; aprobada ? cancelada; pagada ? completada. No se admite marcarla pagada manualmente.
- DELETE de reserva conserva el historial y la cancela; no elimina f?sicamente.
- Los DTO de actualizaci?n de reserva y orden aceptan ?nicamente `status`. El perfil no permite editar roles ni fechas de aceptaci?n.
- Mantenimiento devuelve HTTP 503 para operaciones de negocio; autenticaci?n y rutas protegidas de superadministrador quedan disponibles para recuperaci?n.

## Chatbot

Admite 10 consultas por IP y minuto por proceso, mensajes de hasta 500 caracteres, tiempo m?ximo de solicitud al proveedor de 20 segundos y l?mite de 500 tokens de salida. El cat?logo enviado es una muestra de hasta 100 productos; el asistente informa que no puede confirmar los productos ausentes. En despliegues con varias r?plicas, aplicar tambi?n un l?mite compartido en el proxy o gateway. No confiar en cabeceras de IP enviadas directamente por el cliente.

## Validaci?n

- `npm run typecheck`: comprueba TypeScript incluyendo pruebas.
- `npm run build`: compila producci?n.
- `npm test -- --runInBand`: pruebas unitarias y regresiones.
- `npm run test:e2e -- --runInBand`: pruebas HTTP aisladas, sin base real ni cargos.
- `npm run lint:check`: an?lisis sin modificar archivos.
- `npm run lint`: an?lisis con correcciones autom?ticas.

Las pruebas HTTP a?slan persistencia e integraciones. Antes de desplegar, validar las migraciones en una base de pruebas PostgreSQL y el circuito Culqi en modo de prueba con credenciales propias.

## Producci?n

Ejecutar migraciones, `npm run build` y `npm run start:prod`. La salida de entrada es `dist/src/main.js`. TypeORM forma parte de las dependencias de ejecuci?n.

# Especificación del Proyecto — Administrador de Gimnasio (SaaS)

> Documento de decisiones, arquitectura y alcance. **Fuente de verdad** del proyecto.
> Complementa a [prompt.md](./prompt.md) (visión original). Donde haya conflicto, **manda este documento**.
>
> Última actualización: 2026-06-25

---

## 1. Decisiones fijadas (resumen ejecutivo)

| Tema | Decisión |
|---|---|
| Modelo | **SaaS multi-inquilino + multi-sucursal** desde el día 1 |
| País / fiscal | **México**, MXN + IVA. Facturación CFDI 4.0 → fase posterior |
| Stack | **Next.js (full-stack) + Supabase** (Postgres + RLS + Auth + Storage) |
| Hosting | **Vercel** (frontend/API) + **Supabase** (datos/auth/storage) |
| Pagos | **Mercado Pago** (tarjeta, OXXO, SPEI, MSI) — tokenizado, fuera de alcance PCI |
| Recordatorios | **Correo electrónico** (Resend / Amazon SES) vía cola de jobs |
| Acceso (MVP) | **QR personal** en celular + registro en recepción; hardware enchufable después |
| Gráficas | Recharts |
| Export | Excel (XLSX), CSV (con sanitización anti-inyección de fórmulas), PDF |

---

## 2. Modelo de aislamiento multi-tenant (núcleo)

Jerarquía de datos:

```
Organización (gimnasio / marca)
└── Sucursal
    └── Datos operativos (clientes, ventas, caja, accesos, …)
```

- Cada tabla lleva `org_id` (y `sucursal_id` donde aplique).
- **Row-Level Security (RLS) de Postgres** filtra automáticamente por el `org_id`/`sucursal_id` del usuario autenticado.
- Cierra de raíz los dos riesgos #1 de esta clase de app: **fuga entre inquilinos** e **IDOR**.
- **Regla obligatoria:** ninguna tabla operativa sin política RLS. Test automatizado que verifique que la organización A no puede leer datos de la B.

---

## 3. Roles y permisos

| Rol | Alcance |
|---|---|
| Administrador | Toda la organización, todas las sucursales, configuración |
| Gerente | Una o varias sucursales asignadas |
| Recepcionista | Operación de su sucursal (POS, caja, check-in) |
| Instructor | Clases / acceso limitado |
| Cliente | Solo su propio portal (auth separada del staff) |

Permisos personalizables por sucursal. Logs de auditoría de acciones sensibles.

---

## 4. Plan por fases

### Fase 0 — Cimientos (no negociable antes de features)
- [x] Esquema multi-tenant (`org_id` / `sucursal_id`) + RLS en **todas** las tablas
- [x] Auth con roles (Admin, Gerente, Recepcionista, Instructor, Cliente) y permisos por sucursal
- [x] Personalización por organización (nombre, logo, colores, tipografía, moneda, idioma)
- [x] Logs de auditoría + backups (gestionados por Supabase)
- [x] Modo claro/oscuro, layout responsive base

### Fase 1 — Núcleo operativo (MVP-A)
- [x] Clientes: ficha completa, foto, número consecutivo por organización, contacto de emergencia, consentimiento de datos (LFPDPPP)
- [x] Membresías editables (Mensual, Parejas, Estudiantes, Quincenal, Semanal, Visita)
- [x] POS / Venta de membresías con **devoluciones, cancelaciones y reembolsos** (omitido en el prompt original)
- [x] Caja: apertura/cierre de turno con fondo inicial y arqueo (control de diferencias)
- [x] Cortes diario / semanal / mensual + gráficas financieras
- [x] Export Excel / CSV

### Fase 2 — Cliente y cobranza (MVP-B)
- [x] Portal del cliente (login separado del staff, rate-limiting, anti-fuerza bruta) — *Rebanada A*
- [x] Vista de cliente: estado de membresía, días restantes, QR personal, historial, pagos (historial de solo lectura) — *Rebanada A*
- [ ] Pagos / renovación en línea con **Mercado Pago** (webhooks, tokenizado) — *Rebanada B (pendiente credenciales)*
- [x] Recordatorios por correo en cola de jobs (configurable, con opt-out) — *Rebanada C*. **Por omisión sólo se envía un aviso: 7 días antes.** Los otros momentos (−3, día 0, +7, +30) existen y se encienden desde /settings/reminders.

### Fase 3 — Acceso y ocupación (MVP-C)
- [x] Check-in por QR + registro manual en recepción — *Rebanada A*
- [ ] "Quién está dentro ahora" en tiempo real (Supabase Realtime)
- [ ] Ocupación: capacidad, % actual, hora pico, hora más vacía, promedios
- [ ] Horarios recomendados (menor afluencia) visibles para el cliente

### Futuro (arquitectura preparada, no construido en MVP)
- [ ] Inventario + Catálogo (productos, stock, alertas, toallas venta/renta)
- [ ] Hardware: biométrico, Face ID, RFID, torniquetes (requiere agente on-premise)
- [ ] Facturación electrónica CFDI 4.0 (vía PAC)
- [ ] App móvil nativa (iOS/Android)
- [ ] Reservación de clases, rutinas, nutrición, control de entrenadores
- [ ] API pública, franquicias, más pasarelas de pago

---

## 5. Barandillas de seguridad (específicas del proyecto)

1. **RLS obligatorio** en cada tabla (aislamiento org/sucursal) + test que verifique no-fuga entre orgs.
2. **Storage privado** (fotos/documentos) con URLs firmadas — nunca buckets públicos.
3. **Mercado Pago vía webhooks** — el sistema **nunca** almacena datos de tarjeta.
4. **Portal del cliente** con rate-limiting y bloqueo por fuerza bruta (superficie pública).
5. **Export CSV/Excel** sanitizado contra inyección de fórmulas.
6. **Sesiones**: refresh tokens con revocación real (Supabase Auth).
7. **Consentimiento de datos** (LFPDPPP) en registro de clientes; preparado para biométricos (guardar plantillas/hashes, nunca crudos).
8. Datos de **menores** (estudiantes) con consentimiento de tutor.

---

## 6. Escalabilidad incorporada

- **Cola de jobs** para recordatorios (no cron ingenuo) → reintentos y volumen.
- **Vistas materializadas** para estadísticas/gráficas (no golpear tablas transaccionales).
- **Tabla de accesos particionable** (crece sin límite).
- **Supabase Realtime** para ocupación en vivo (sin polling).
- **CDN** para imágenes; política de tamaño de archivos.

---

## 7. Riesgos abiertos / decisiones pendientes

- [x] **IVA (resuelto 2026-06-26):** los precios capturados son **base gravable, SIN IVA**. El IVA (16%) se calcula y se suma **aparte** en el ticket, el total cobrado y los reportes. Implica: cada producto/membresía guarda precio sin IVA; el POS desglosa subtotal + IVA + total.
- [x] **Parejas (resuelto 2026-07-16):** venta **vinculada** (una venta liga a 2 clientes con vencimiento compartido, total = 2 × precio). Si **solo uno renueva**, se le vende una **membresía individual** al precio individual y el vínculo de pareja se rompe.
- [x] **Periodo de gracia (resuelto 2026-08-08):** ninguno. Vencida = no entra; recepción puede autorizar el paso caso por caso y queda registrado quién autorizó y por qué.
- [ ] ¿Hay datos existentes (clientes/inventario) que migrar?
- [ ] Modo offline/contingencia del POS si se cae internet *(post-MVP; el POS del MVP requiere conexión)*

### Semántica de la cola de recordatorios (resuelta 2026-08-08)

- **Sólo avisa la última membresía del cliente.** El encolado mira la membresía con el vencimiento más lejano entre las no canceladas; las anteriores callan. Sin esta regla, quien renovaba recibía «tu membresía venció hace 7 días» de la vigencia anterior —el peor destinatario posible, el que sí pagó— y la renovación anticipada disparaba «vence en 7 días» estando ya cubierto.
- **Ventana de recuperación (2 días) en vez de coincidencia exacta.** Un día que el agendado no corriera, esos avisos se perdían para siempre. La unicidad `(membresía, momento)` ya impedía duplicados, así que repasar días hacia atrás es seguro. Fuera de la ventana no se recupera: más vale callar que mandar un aviso rancio.
- **Los días del asunto se cuentan al ENVIAR, no al encolar.** Con ventana de recuperación, un texto fijo de «vence en 7 días» mentiría si el envío sale con retraso. El `offset_key` sólo elige el tono; el número sale de `end_date` contra el día del envío.
- **Reintentos con retroceso exponencial** (5 min ×3, hasta 5 intentos). Un fallo deja la fila en `pending` reprogramada; `failed` pasa a significar «descartado tras agotar intentos» y es un buzón para revisar a mano. Las transiciones viven en la base (`mark_reminder_sent` / `mark_reminder_failed`) para que la política no dependa de quién drene la cola.
- **Agenda partida en dos:** encolar es diario (el momento cae un día concreto); drenar es horario, o un reintento programado a 15 minutos esperaría al día siguiente.

### Control de acceso (resuelto 2026-08-08)

- **La credencial deja de ser `clients.id`.** Ese id ya viaja en las URLs del panel, así que como llave de puerta no servía. El socio tiene ahora un `access_token` propio, revocable, con caducidad.
- **El QR dura 90 días y se puede capturar en pantalla, a propósito.** Muchos gimnasios no tienen WiFi para socios: si el código caducara en minutos, quien llega sin datos se quedaría fuera. Se renueva solo cuando el socio abre el portal *con* conexión, que es justo cuando puede capturar el nuevo. Consecuencia asumida: permitiendo capturas, la caducidad **no** es un control anti-préstamo fuerte.
- **El control anti-préstamo real es la foto.** La pantalla de check-in muestra en grande la foto del socio para que recepción vea si quien pasa es el dueño del QR, y desde la ficha se puede **revocar** el código —lo que mata cualquier captura que ande circulando.
- **Vencida = no entra**, salvo autorización explícita de recepción, que exige motivo y se guarda con el usuario que la dio. No hay días de gracia automáticos.
- **Un segundo escaneo no duplica la visita:** si no, un socio nervioso contaría como dos personas en la ocupación.
- **La visita cierra al escanear la salida, y un barrido horario cierra las que nadie cerró** (`exit_method = 'auto'`, duración estimada). Sin ese respaldo, «quién está dentro» acumularía gente que se fue hace días.
- **`access_logs` va particionada por mes** (§6: crece sin límite), con un job que crea la partición del mes siguiente por adelantado — sin partición, un INSERT falla y nadie podría entrar.
- **Rotar el token es `SECURITY DEFINER` con autorización a mano, no una política de UPDATE.** Una política «el socio puede actualizar su fila» le habría abierto todas las columnas: podría reactivarse tras una baja (`is_active`) o mudar su ficha a otra organización (`org_id`).

### Anti-fuerza bruta del portal (resuelto 2026-08-08)

Barandilla #4, segunda versión. La primera contaba «fallos del correo **o** de la IP» contra un único umbral de 5, y eso mezclaba dos preguntas distintas: *¿atacan esta cuenta?* y *¿rocían contraseñas desde esta red?*. Con un solo contador, los socios que entran desde el WiFi del gimnasio se bloqueaban entre sí.

- **Por correo: retraso progresivo, no portazo.** Cuatro intentos libres; a partir del cuarto fallo la espera crece (5 s, 15 s, 45 s, 2 min) y se borra al entrar bien. Nadie queda fuera del todo —que era la molestia real—, pero para un atacante el costo sigue creciendo. Un intento rechazado por la espera no cuenta como fallo: si contara, quien insiste alargaría su castigo sin llegar a probar.
- **Por IP: se cuentan cuentas distintas, no intentos.** Un gimnasio lleno produce muchos fallos repartidos entre pocas personas que se equivocan con *su* correo; un ataque produce fallos contra *muchos* correos. El freno salta a las 10 cuentas distintas fallidas en 15 minutos desde la misma IP — un umbral que el mostrador no alcanza ni en día pico.
- **El acierto limpia sólo el contador del correo, nunca el de la IP:** si limpiara el de la red, a un atacante le bastaría entrar a su propia cuenta para reiniciarlo y seguir rociando.
- **Pendiente si se cambia de hosting:** `x-forwarded-for` sólo es de fiar detrás de un proxy que la fije (Vercel lo hace). Sin proxy de confianza al frente, la cabecera es falsificable y el contador por IP se evade rotándola.

### Alcance de los recordatorios (resuelto 2026-08-08)

- **Un solo aviso por membresía: 7 días antes.** Es lo que el negocio necesita; más correos por la misma membresía cansan al cliente y suben el riesgo de que marque el remitente como spam. Los otros cuatro momentos siguen implementados y se encienden por organización desde `/settings/reminders`, pero no vienen activos: un gimnasio que no toque nada manda un correo por membresía y nada más.
- **Sin reintentos de envío** (`max_attempts` = 1): un fallo de SMTP manda el aviso a `failed`, visible en la cola para revisarlo a mano. La maquinaria de reintentos de 0018 se conserva —es un número por fila— para reactivarla subiendo `max_attempts`, sin migrar nada.

### Decisiones de Cortes y export (resueltas 2026-08-05)

- **Agregación en la base, no en la app:** los cortes salen de funciones SQL (`sales_summary`, `sales_by_day`, `sales_by_plan`, `sales_by_cashier`, `sales_by_hour`, `sales_detail`), todas `SECURITY INVOKER` para que sumen bajo RLS. Traer un mes de ventas a Node para sumarlas no escala y expone de más. Cuando el volumen lo pida, estas mismas firmas pueden respaldarse con vistas materializadas (§6) sin tocar la app.
- **Zona horaria:** un corte «del día» es local del gimnasio, no del servidor. Los rangos se calculan con `org_branding.timezone` y se agrupa por día/hora en esa zona. Con el servidor en UTC, un corte diario calculado con la fecha del servidor sale vacío después de las 18:00 hora de CDMX.
- **Ingresos vs. neto:** «Ingresos» cuenta sólo ventas **completadas** del periodo. El **neto** parte del bruto (incluidas las canceladas) y le resta los reembolsos **pagados** en el periodo, igual que el arqueo: si se restaran de los ingresos, una venta cancelada penalizaría dos veces, y un reembolso de una venta de otro mes nunca aparecería en el corte donde salió el dinero.
- **Export:** CSV (con BOM UTF-8, o Excel rompe los acentos) y XLSX vía `exceljs`, ambos saneados contra **inyección de fórmulas** (§5.5): toda celda que empiece con `=`, `+`, `-`, `@` o tabulación se antepone con apóstrofo. El vector es real: el nombre de un cliente entra por un formulario del gimnasio y se ejecuta en la máquina de quien abra el reporte.

### Decisiones de Caja (resueltas 2026-08-05)

- **Ámbito del turno:** el turno es **por cajero**, no por sucursal. Cada usuario abre y cierra el suyo (un solo turno abierto por persona), de modo que una diferencia en el arqueo tiene un responsable claro y alimenta «ventas por empleado».
- **Turno obligatorio:** **toda** venta —efectivo, tarjeta o transferencia— exige turno abierto, para que el corte del turno esté completo. La sucursal de la venta la determina el turno, no el formulario del POS.
- **Arqueo:** sólo cuenta **efectivo**. `esperado = fondo inicial + ventas en efectivo + ingresos en efectivo − egresos en efectivo`; `diferencia = contado − esperado` (negativo = faltante). Las ventas con tarjeta/transferencia y sus reembolsos aparecen en el corte pero no mueven el cajón.
- **Ventas canceladas en el arqueo:** el efectivo esperado incluye las ventas canceladas **a propósito**. El dinero entró al cajón y el reembolso sale como egreso; excluir la venta descontaría dos veces.
- **Reembolsos:** cancelar una venta registra automáticamente el egreso en el turno abierto de **quien cancela**. Sin turno abierto no se puede cancelar (el dinero que sale tiene que caer en algún turno).
- **Arqueo a ciegas:** mientras el turno está abierto, la app **no** muestra el fondo inicial ni el efectivo esperado (ni en Caja, ni en el POS, ni en el detalle del corte). Si el cajero viera la cifra la teclearía al cerrar y el control de diferencias no mediría nada. Durante el turno sí ve su reporte de ventas y los movimientos que capturó, que necesita para operar. El arqueo completo —fondo, esperado, contado y diferencia— se revela en el corte una vez cerrado.

### Decisiones del POS (resueltas 2026-07-16)

- **Renovación anticipada:** la nueva vigencia **apila** sobre el vencimiento actual (empieza el día siguiente al vencimiento vigente); el cliente no pierde días restantes. Si ya está vencida, empieza el día de la venta.
- **Métodos de pago (MVP):** **efectivo, tarjeta y transferencia**, **un solo método por venta** (sin pago dividido). Mercado Pago (en línea) llega en Fase 2.
- **Descuento:** por **monto o porcentaje**, a nivel de venta, aplicado sobre la base **antes** de IVA. Libre para recepción (topes por rol, después).
- **Estado de pago:** toda venta se **liquida al momento** (pagada/completada); sin ventas a crédito en el MVP.
- **Reembolsos:** **total** si se cancela el **mismo día/turno** (corrección de cobro); después, solo **admin**. La cancelación revierte la membresía otorgada y registra un **egreso** en caja.
- **Folio:** consecutivo por organización (contador `org_counters`, formato `V-0001`).
- **Caja/turno:** la venta guarda `cash_session_id` **opcional** en este slice; el turno se vuelve **obligatorio** en el slice de Caja.

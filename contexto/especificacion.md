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
- [ ] Esquema multi-tenant (`org_id` / `sucursal_id`) + RLS en **todas** las tablas
- [ ] Auth con roles (Admin, Gerente, Recepcionista, Instructor, Cliente) y permisos por sucursal
- [ ] Personalización por organización (nombre, logo, colores, tipografía, moneda, idioma)
- [ ] Logs de auditoría + backups (gestionados por Supabase)
- [ ] Modo claro/oscuro, layout responsive base

### Fase 1 — Núcleo operativo (MVP-A)
- [ ] Clientes: ficha completa, foto, número consecutivo por organización, contacto de emergencia, consentimiento de datos (LFPDPPP)
- [ ] Membresías editables (Mensual, Parejas, Estudiantes, Quincenal, Semanal, Visita)
- [ ] POS / Venta de membresías con **devoluciones, cancelaciones y reembolsos** (omitido en el prompt original)
- [ ] Caja: apertura/cierre de turno con fondo inicial y arqueo (control de diferencias)
- [ ] Cortes diario / semanal / mensual + gráficas financieras
- [ ] Export Excel / CSV

### Fase 2 — Cliente y cobranza (MVP-B)
- [ ] Portal del cliente (login separado del staff, rate-limiting, anti-fuerza bruta)
- [ ] Vista de cliente: estado de membresía, días restantes, QR personal, historial, pagos
- [ ] Pagos / renovación en línea con **Mercado Pago** (webhooks, tokenizado)
- [ ] Recordatorios por correo en cola de jobs: 7 días, 3 días, mismo día, +7 días, +30 días (configurable, con opt-out)

### Fase 3 — Acceso y ocupación (MVP-C)
- [ ] Check-in por QR + registro manual en recepción
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

- [ ] ¿Los precios incluyen IVA o se calcula aparte? (afecta tickets y reportes)
- [ ] Regla de membresía "Parejas": ¿venta vinculada? ¿qué pasa si solo uno renueva?
- [ ] Periodo de gracia de acceso para membresías vencidas
- [ ] ¿Hay datos existentes (clientes/inventario) que migrar?
- [ ] Modo offline/contingencia del POS si se cae internet (definir en Fase 1)

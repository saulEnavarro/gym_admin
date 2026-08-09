# Pendientes — qué falta y qué tan urgente es

> Estado al 2026-08-09. Complementa a [especificacion.md](./especificacion.md),
> que sigue siendo la fuente de verdad de las decisiones.
>
> Los pendientes están ordenados por **qué impide hacer**, no por tamaño.

---

## Resumen honesto

Las fases 0, 1, 3, 4 y 5 están construidas y probadas (237 pruebas
automáticas). Con la Fase 5, un gimnasio **ya puede configurarse solo**: sus
sucursales, su equipo y su personalización se administran desde la interfaz, y
el alta de nuevos gimnasios se hace desde el panel de plataforma sin tocar SQL.

Para operar en producción falta **un solo paso, y es de configuración**:
conectar Resend como servidor de correo. De la Fase 2 sigue pendiente Mercado
Pago, que no bloquea porque se cobra en mostrador.

---

## 1. Bloquean el beta en producción

> **Resueltos el 2026-08-09 (Fase 5).** Quedaban siete; se cerraron seis. Un
> gimnasio ya puede configurarse solo desde la interfaz.

| Pendiente | Estado |
|---|---|
| Alta de organización | ✅ Panel de plataforma en `/admin` |
| Sucursales (CRUD) | ✅ `/branches` |
| Equipo: invitar y asignar roles | ✅ `/team` |
| Personalización | ✅ `/branding` |
| Recuperación de contraseña | ✅ Staff y portal |
| Runtime de recordatorios | ✅ Documentado en el despliegue (paso 7) |
| **Correo saliente propio (SMTP)** | ⏳ **Es configuración, no código** |

### Lo único que falta: conectar Resend

El correo por defecto de Supabase manda unos pocos envíos por hora. Sin SMTP
propio, las invitaciones al equipo, las del portal y la recuperación de
contraseña prácticamente no salen. Es un paso de configuración, no desarrollo:
[despliegue.md, paso 4](../docs/despliegue.md).

## 2. No bloquean el beta, pero conviene resolverlos pronto

### 2.1 Pagos en línea con Mercado Pago — *Fase 2, rebanada B*
Único pendiente de la Fase 2. Esperando credenciales. **No bloquea el beta**: se
puede operar cobrando en mostrador, que es lo que el POS ya hace bien.

### 2.2 Auditoría (pantalla)
`audit_logs` se llena desde Fase 0 con cada cambio sensible, pero no hay
pantalla para consultarlo. Hoy sólo se ve por SQL.

### 2.3 Fotos de producto
La columna `photo_url` existe y el bucket privado está creado, pero falta la
subida en el formulario. El patrón ya está resuelto en las fotos de cliente.

### 2.4 Catálogo visual (tarjetas con foto y botón comprar)
El prompt original lo pedía. Hoy el POS busca por nombre, SKU o código de
barras, que es más rápido para mostrador. Las tarjetas tendrían sentido sobre
todo en el portal del socio.

### 2.5 Escaneo por cámara
El check-in y el POS funcionan con lector físico (los USB se comportan como
teclado) o pegando el código. Si se va a usar una tablet sin lector, hace falta
escaneo por cámara — decidir primero qué hardware habrá, porque la librería
depende de si son iPads o Android.

### 2.6 Configuración general
Sólo existe `/settings/reminders`. Faltarían horarios del gimnasio, datos de
contacto y redes sociales que el prompt pedía y que `org_branding` ya guarda.

---

## 3. Deuda técnica anotada

- **Los alias de tipos se repegan a mano.** `npm run db:types` sobreescribe
  `src/lib/types/database.types.ts` completo, incluida la sección de alias del
  final. Está advertido en el encabezado del archivo. Si algún día molesta, se
  resuelve moviendo los alias a un archivo aparte.
- **Dos restricciones quedaron `NOT VALID`** a propósito, para no romper filas
  creadas antes de existir: `sales_cash_session_required` (migración 0014) y
  `sale_items_one_kind` (0026). Rigen para todo lo nuevo. En una base de
  producción limpia se pueden validar con `ALTER TABLE … VALIDATE CONSTRAINT`.
- **Sin escaneo de salida, la ocupación queda subestimada.** Está avisado en la
  propia pantalla cuando más del 40% de las visitas las cerró el barrido.
- **`x-forwarded-for` sólo es confiable detrás de un proxy que la fije** (Vercel
  lo hace). Si se cambia de hosting, el contador por IP del anti-fuerza bruta
  se puede evadir rotando la cabecera.

---

## 4. Lo que sigue en «Futuro» de la especificación

Sin fecha y fuera del MVP: hardware biométrico y torniquetes, facturación CFDI
4.0, app móvil nativa, reservación de clases, rutinas y nutrición, API pública
y franquicias.

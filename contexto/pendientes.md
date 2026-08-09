# Pendientes — qué falta y qué tan urgente es

> Estado al 2026-08-09. Complementa a [especificacion.md](./especificacion.md),
> que sigue siendo la fuente de verdad de las decisiones.
>
> Los pendientes están ordenados por **qué impide hacer**, no por tamaño.

---

## Resumen honesto

Las fases 0, 1, 3 y 4 están construidas y probadas (220 pruebas automáticas).
Lo que **no** existe todavía es la parte que le permite a un gimnasio *darse de
alta y configurarse solo*. Hoy la aplicación asume que la organización, las
sucursales y el equipo ya existen en la base — porque en desarrollo se crean con
datos de ejemplo.

Eso convierte el arranque de cada cliente nuevo en un trabajo manual de base de
datos. Se puede hacer para **un** gimnasio piloto acompañado de cerca; no se
puede sostener para varios ni dejar que el cliente lo haga solo.

---

## 1. Bloquean el beta en producción

Sin esto, un gimnasio no puede operar por su cuenta.

### 1.1 Alta de organización (onboarding)
No hay registro. La organización, su branding y su primer administrador se
crean hoy con `INSERT` a mano. Falta el flujo: alguien se registra, se crea su
organización, se le asigna el rol de admin y se le pide lo mínimo (nombre del
gimnasio, moneda, zona horaria).

**Por qué bloquea:** es el punto de entrada. Sin él, cada cliente nuevo es una
intervención manual en la base de producción.

### 1.2 Sucursales (CRUD)
La tabla `branches` existe y todo el sistema depende de ella —el turno de caja,
el check-in, las existencias— pero **no hay pantalla** para crearlas o editarlas.
En la navegación aparece como «Pronto».

**Por qué bloquea:** sin sucursal no se abre turno; sin turno no se vende.

### 1.3 Equipo: invitar personal y asignar roles
No hay pantalla para invitar a un recepcionista, asignarle rol ni sucursales.
Las tablas (`org_members`, `member_branches`) y toda la seguridad por rol están
listas y probadas; falta la interfaz.

**Por qué bloquea:** el dueño no puede dar de alta a su propia recepcionista.

### 1.4 Personalización (nombre, logo, colores, moneda, idioma)
`org_branding` existe, se aplica en toda la interfaz y en el portal del socio,
pero **no hay pantalla para editarla**. La especificación marca este punto de
Fase 0 como hecho: eso es cierto en la base y en cómo se pinta, **no** en la
capacidad del cliente de cambiarlo.

**Por qué bloquea:** el gimnasio no puede poner su nombre ni su logo.

### 1.5 Correo saliente propio (SMTP en Supabase Auth)
El correo por defecto de Supabase tiene un límite muy bajo (unos pocos envíos
por hora) y está pensado sólo para pruebas. Las invitaciones al portal del
socio y la recuperación de contraseña salen por ahí.

**Por qué bloquea:** con 50 socios invitados el mismo día, la mayoría no
recibiría su correo. Se resuelve conectando un proveedor (Resend, Amazon SES) —
está descrito en [despliegue.md](../docs/despliegue.md).

### 1.6 Recuperación de contraseña
No hay pantalla de «olvidé mi contraseña», ni para el staff ni para el socio.
Supabase Auth ya lo soporta; falta la interfaz y el correo.

**Por qué bloquea:** el primer socio que olvide su contraseña se queda fuera y
alguien tendrá que resetearla a mano.

### 1.7 Runtime de recordatorios en producción
`private.reminder_runtime` guarda la URL de la Edge Function y su secreto. En
local apunta a `host.docker.internal`. **En producción hay que sustituir esa
fila** con la URL real del proyecto y un secreto nuevo.

**Por qué bloquea:** si no se hace, el agendado diario intenta llamar a una
dirección que no existe y no sale ningún recordatorio. Falla en silencio.

---

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

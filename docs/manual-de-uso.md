# Manual de uso — Administrador de Gimnasio

Guía práctica para el personal del gimnasio. No hace falta saber de
computación: si sabes cobrar en un mostrador, sabes usar esto.

---

## Índice

1. [Qué hace la plataforma](#1-qué-hace-la-plataforma)
2. [Quién usa qué](#2-quién-usa-qué)
3. [El día a día en recepción](#3-el-día-a-día-en-recepción)
4. [Clientes](#4-clientes)
5. [Membresías](#5-membresías)
6. [Punto de venta](#6-punto-de-venta)
7. [Caja y arqueo](#7-caja-y-arqueo)
8. [Acceso al gimnasio](#8-acceso-al-gimnasio)
9. [Ocupación](#9-ocupación)
10. [Inventario](#10-inventario)
11. [Préstamos de toallas](#11-préstamos-de-toallas)
12. [Cortes y reportes](#12-cortes-y-reportes)
13. [Recordatorios por correo](#13-recordatorios-por-correo)
14. [El portal del socio](#14-el-portal-del-socio)
15. [Preguntas frecuentes](#15-preguntas-frecuentes)

---

## 1. Qué hace la plataforma

Lleva el control completo del gimnasio: socios, membresías, cobros, caja,
entradas y salidas, inventario y reportes. Cada gimnasio ve **únicamente** sus
propios datos, aunque la plataforma atienda a varios.

Hay dos entradas distintas:

| Entrada | Quién | Para qué |
|---|---|---|
| **Panel** | Personal del gimnasio | Operar todo el negocio |
| **Portal** (`/portal`) | Socios | Ver su membresía, su QR y su historial |

Son cuentas separadas. Un socio no puede entrar al panel ni aunque tenga la
dirección.

---

## 2. Quién usa qué

| Rol | Puede hacer |
|---|---|
| **Administrador** | Todo, en todas las sucursales |
| **Gerente** | Todo lo operativo y el catálogo, en sus sucursales |
| **Recepcionista** | Vender, cobrar, caja, check-in, mover inventario, prestar toallas |
| **Instructor** | Registrar accesos |
| **Socio** | Sólo su portal |

Dos límites que conviene conocer porque son a propósito:

- **Recepción no edita el catálogo.** Puede vender productos y mover
  existencias, pero no cambiar precios ni crear productos. Eso es configuración
  y la hace un gerente o el administrador.
- **Recepción no cancela ventas de días anteriores.** El mismo día sí; después,
  sólo un administrador.

---

## 3. El día a día en recepción

El orden importa. Este es el ciclo completo de una jornada:

```
1. Abrir turno de caja      (Caja → Abrir turno, con el efectivo con que arrancas)
2. Vender y cobrar          (Punto de venta)
3. Registrar entradas       (Acceso)
4. Registrar salidas        (Acceso, modo Salida)
5. Cerrar turno con arqueo  (Caja → Cerrar turno)
```

> **Sin turno abierto no se puede vender.** No es un capricho: es lo que hace
> que al final del día el dinero del cajón cuadre con lo que dice el sistema.

---

## 4. Clientes

**Clientes → Nuevo cliente.**

Se pide nombre, apellidos y el consentimiento del aviso de privacidad —este
último es obligatorio por ley (LFPDPPP). Todo lo demás (teléfono, correo,
foto, contacto de emergencia) es opcional pero muy recomendable:

- **El correo** es lo que permite invitarlo al portal y mandarle el recordatorio
  antes de que venza.
- **La foto** aparece en grande cuando el socio entra con su QR, y es lo que le
  permite a recepción ver si quien pasa es realmente el dueño del código.

Si el cliente es **menor de edad**, el sistema pide el consentimiento del tutor
y su nombre. No deja continuar sin eso.

Cada cliente recibe un número consecutivo automático (#0001, #0002…). Ese
número sirve para buscarlo rápido en el mostrador.

### Dar de baja
En su ficha, con el botón de activar/desactivar. **No se borra**: se conserva
su historial de compras y accesos. Un socio dado de baja no puede entrar.

---

## 5. Membresías

**Membresías → Nueva membresía.**

Cada plan tiene nombre, precio, duración en días y cuántas personas cubre
(2 para el plan de Parejas).

> ⚠️ **Los precios se capturan SIN IVA.** El sistema calcula el 16% y lo suma
> aparte en el ticket. Si tu plan mensual se cobra en $522 al público, aquí
> capturas **450**.

La pantalla te muestra el precio final mientras escribes, para que no haya duda.

---

## 6. Punto de venta

**Punto de venta.** Un mismo ticket puede llevar membresía y productos.

1. **Cliente**: búscalo por nombre o por su número. *Si sólo vendes productos a
   alguien que no es socio, puedes dejarlo vacío.*
2. **Membresía**: elige el plan, o deja «Sin membresía» si sólo vendes producto.
3. **Productos**: escribe el nombre, el SKU, o **escanea el código de barras**.
   El lector escribe el código y lo agrega solo al presionar Enter.
4. **Descuento** (opcional): por monto o por porcentaje.
5. **Método de pago**: efectivo, tarjeta o transferencia. Uno solo por venta.
6. **Cobrar**.

El resumen de la derecha muestra el desglose en vivo: subtotal, descuento, IVA
y total.

### Renovación anticipada
Si el socio renueva antes de que se le acabe, **no pierde los días que le
quedan**: la nueva vigencia empieza al día siguiente de que termine la actual.

### Membresía de parejas
Pide dos socios distintos. Ambos quedan con el mismo vencimiento.

### Cancelar una venta
Desde el ticket (**Ventas → folio**). Puedes:

- **Cancelar una sola línea** (botón *Cancelar* junto al renglón). Sirve para
  quitar un artículo sin tirar toda la compra.
- **Cancelar el ticket completo** (botón rojo abajo).

En ambos casos: el producto regresa al inventario, la membresía se revierte si
era esa la línea, y el dinero devuelto se registra como salida de tu turno.

> **El ticket conserva su folio y su total original.** Abajo aparece cuánto se
> devolvió y cuál es el neto. Se hace así para que un corte de caja ya cerrado
> no cambie solo días después.

**Sobre el descuento:** si el ticket tenía descuento, al cancelar una línea se
devuelve **su parte proporcional**, no el precio de lista. Es lo correcto: se
cobró con descuento, se devuelve con descuento.

---

## 7. Caja y arqueo

### Abrir turno
**Caja → Abrir turno.** Cuenta el efectivo con el que arrancas (el cambio) y
captúralo como *fondo inicial*.

Cada cajero abre **su propio turno**. Si son dos personas, son dos turnos: así
una diferencia tiene un responsable claro.

### Durante el turno
La pantalla muestra tus ventas por método de pago y los movimientos que hayas
registrado. También puedes capturar:

- **Ingresos**: aportación de efectivo al cajón.
- **Egresos**: pago a proveedor, pago a personal, retiro, ajuste.

Sólo los movimientos **en efectivo** afectan el conteo del cajón. Un reembolso a
tarjeta queda registrado pero no mueve el dinero físico.

### Cerrar turno (arqueo)
**Caja → Cerrar turno.** Cuenta el efectivo del cajón y captura el total.

> 🔒 **El sistema no te dice cuánto debería haber.** Es a propósito: si te lo
> mostrara, teclearías esa cifra y el control no serviría de nada. Cuenta
> primero, captura después.

Al cerrar verás el corte completo: fondo inicial, ventas, movimientos, lo
esperado, lo contado y **la diferencia**. Si falta o sobra dinero queda
registrado con tu nombre, y ya no se puede modificar.

**Cortes anteriores** guarda todos los turnos cerrados.

---

## 8. Acceso al gimnasio

**Acceso.** Deja esta pantalla abierta en el mostrador: se actualiza sola cada
minuto.

### Entrada
El socio muestra su QR y tú lo escaneas (o pegas el código). Verás en grande:

- **Su foto** — compárala con quien está enfrente. Este es el control real
  contra el préstamo de códigos.
- Su nombre, su plan y los días que le quedan.
- Un letrero verde (**Adelante**) o rojo (**Acceso denegado**).

### Si la membresía está vencida
El sistema **no lo deja pasar**. Tienes dos opciones:

1. Venderle la renovación ahí mismo.
2. **Autorizar de todos modos** — te pide un motivo, y queda registrado con tu
   nombre. Úsalo con criterio: es exactamente lo que revisará el dueño.

### Si no trae el celular
Botón **«Sin QR: buscar socio»** y lo das de alta por nombre o número.

### Salida
Cambia el interruptor a **Salida** y escanea igual. Registrar la salida es lo
que hace que el dato de «cuánta gente hay» y los horarios pico sirvan de algo.

Si alguien se va sin registrar salida, el sistema cierra su visita
automáticamente por la noche, pero ese tiempo queda marcado como estimado.

---

## 9. Ocupación

**Ocupación.** Muestra cuánta gente hay ahora, el porcentaje de aforo, y con las
últimas 4 semanas: la hora pico, la más tranquila y un mapa de la semana típica.

Para que aparezca el porcentaje hay que declarar el **aforo de la sucursal**.

> Si ves un aviso de que muchas visitas «se cerraron solas», significa que los
> socios casi no registran su salida. La ocupación por hora y el tiempo de
> permanencia quedan subestimados. Pedir el escaneo de salida mejora ambos.

---

## 10. Inventario

**Inventario.** Aquí vive el catálogo de productos: bebidas, suplementos, ropa,
toallas, accesorios.

### Crear un producto
Nombre, categoría, SKU, código de barras, **costo** y **precio** (ambos sin
IVA). La pantalla te muestra el precio al público y el margen mientras escribes.

Dos casillas importantes:
- **Llevar control de existencias** — apágala para servicios o cosas a granel.
- **Se puede prestar** — para toallas y candados (ver [Préstamos](#11-préstamos-de-toallas)).

### Existencias
Van **por sucursal**, porque el producto está en un anaquel concreto. Una
sucursal sólo puede vender lo que tiene enfrente.

Desde la ficha del producto puedes:

| Movimiento | Cuándo usarlo |
|---|---|
| **Compra / entrada** | Llegó mercancía del proveedor |
| **Merma** | Se rompió, caducó o se perdió |
| **Ajuste por conteo** | Contaste físicamente y no cuadra |
| **Traspaso** | Mover piezas de una sucursal a otra |

> **El ajuste FIJA las existencias en lo que contaste.** Si el sistema dice 6 y
> tú cuentas 3, capturas **3** y queda en 3. No suma ni resta: iguala.

Toda la historia queda en **Movimientos**, al pie de la ficha. Si algún día no
cuadra el inventario, ahí está la explicación.

### Alertas
Si defines un **mínimo** por sucursal, el producto aparece en el aviso amarillo
de la pantalla principal de Inventario cuando llegue a ese nivel.

---

## 11. Préstamos de toallas

**Préstamos.** Para artículos marcados como «se puede prestar».

Eliges al socio, el artículo, las piezas y un plazo en horas. La toalla sale del
inventario y queda en **Pendientes de devolución** con el tiempo que lleva
fuera. Pasado el plazo aparece marcada como **vencida**.

Al devolverla, botón **Devuelta** y regresa al inventario.
Si nunca volvió, botón **No volvió**: se da de baja como merma, porque la pieza
dejó de existir y hay que reponerla.

> **Prestar no cobra nada.** Si cobras la renta de toalla, créala como un
> producto normal (por ejemplo «Renta de toalla», $20) y véndela en el punto de
> venta. Así el dinero entra a tu turno de caja como cualquier otra venta.

---

## 12. Cortes y reportes

### Cortes (financieros)
**Cortes.** Elige Hoy, Semana, Mes o un rango. Muestra:

- Ingresos, número de ventas y ticket promedio.
- Desglose: subtotal, descuentos, IVA, total, y por método de pago.
- **Neto**: lo cobrado menos reembolsos y egresos.
- Gráficas: ingresos por día, membresías más y menos vendidas, horarios de
  mayor venta y ventas por empleado.

Botones **CSV** y **Excel** para descargar el detalle venta por venta.

### Reportes de inventario
**Inventario → Reportes.** Productos vendidos con su **utilidad**, y las
existencias valuadas a costo y a precio de venta.

> La utilidad usa el costo que tenía el producto **cuando se vendió**, no el de
> hoy. Si el proveedor sube el precio, lo que ya vendiste no cambia. Para que
> sea exacto, captura las entradas con su **costo unitario**; si no, el sistema
> usa el costo del catálogo y marca la fila como *estimada*.

---

## 13. Recordatorios por correo

**Recordatorios.** El sistema envía **un aviso, 7 días antes** de que venza cada
membresía. Sale solo, cada mañana.

Requisitos: que el socio tenga correo y no haya pedido dejar de recibirlos
(*opt-out*, se apaga desde su ficha).

En esa misma pantalla puedes activar otros momentos si los quieres (3 días
antes, el día del vencimiento, 7 y 30 días después) y ver la cola de envíos.

---

## 14. El portal del socio

El socio entra en **`/portal`** con su correo y contraseña.

**Cómo se le da acceso:** desde su ficha, botón **Invitar al portal**. Le llega
un correo para poner su contraseña.

Ahí ve:
- Su membresía, con los días que le quedan.
- **Su código QR** para entrar al gimnasio.
- Qué tan lleno está el gimnasio ahora y los horarios con menos gente hoy.
- Su historial de membresías.

> **El QR se puede fotografiar.** Es a propósito: muchos gimnasios no tienen
> WiFi para socios, y la captura funciona sin internet. Vale 90 días y se
> renueva solo cuando el socio abre el portal con datos.
>
> Si sospechas que alguien está prestando su código, entra a su ficha y usa
> **Revocar y regenerar QR**. Todas las capturas anteriores dejan de servir al
> instante.

---

## 15. Preguntas frecuentes

**«No me deja vender.»**
Revisa que tengas el turno de caja abierto (**Caja → Abrir turno**).

**«El QR del socio no abre.»**
Puede ser que caducó (que abra su portal con internet para renovarlo), que la
membresía esté vencida, o que el socio esté dado de baja. La pantalla te dice
cuál de los tres es.

**«Cobré de más / cobré un producto equivocado.»**
Ve a **Ventas**, abre el folio y cancela la línea equivocada. El mismo día lo
puede hacer recepción; después, sólo un administrador.

**«No cuadró la caja.»**
La diferencia queda registrada en el corte con tu nombre. Antes de cerrar,
revisa que hayas capturado todos los egresos (pagos a proveedor, retiros): es
la causa más común.

**«El inventario no coincide con el anaquel.»**
Usa **Ajuste por conteo** con el número real y anota el motivo. Después revisa
los **Movimientos** del producto para ver dónde se fue.

**«Un socio no recibió su recordatorio.»**
Revisa que tenga correo en su ficha, que no tenga el *opt-out* activado, y la
cola en **Recordatorios**.

---

## Lo que todavía no existe

Para que no lo busques:

- **Pagos en línea.** Los cobros son en mostrador. Mercado Pago está pendiente.
- **Pantallas de configuración**: sucursales, equipo, logo y colores todavía se
  configuran por soporte técnico, no desde la aplicación.
- **Recuperación de contraseña.** Si alguien la olvida, pídesela a soporte.
- **Facturación (CFDI).** El sistema calcula IVA y lo desglosa, pero no emite
  facturas fiscales.

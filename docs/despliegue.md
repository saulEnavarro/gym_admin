# Despliegue — de local a la nube

Guía para poner la plataforma en línea. Asume que nunca has desplegado nada:
cada paso dice qué hacer y por qué.

---

## 1. Lo primero: no vas a «exportar» la base

Es la duda más común y la respuesta ahorra mucho trabajo.

**Las migraciones SON la base de datos.** En `supabase/migrations/` hay 28
archivos SQL numerados que, ejecutados en orden, construyen el esquema completo:
tablas, seguridad, funciones, agendados y particiones. Es exactamente lo que
pasa cada vez que corres `supabase db reset` en tu máquina.

Entonces **no** haces un respaldo de tu base local para subirlo. Le dices a
Supabase en la nube que ejecute esas mismas migraciones, y queda idéntica:

```bash
supabase db push
```

Por qué importa la diferencia:

| Con dump/restore | Con migraciones |
|---|---|
| Te llevas los datos de prueba a producción | Empiezas limpio |
| Depende de versiones de Postgres compatibles | Es SQL, funciona igual |
| El siguiente cambio hay que hacerlo a mano | El siguiente cambio es otro `db push` |

> ⚠️ **`supabase/seed.sql` NO se ejecuta en producción.** Ese archivo crea los
> gimnasios de ejemplo (Iron Temple, FitZone) con contraseñas conocidas. Sólo
> corre en `db reset` local. Nunca lo apliques en la nube.

---

## 2. Qué servicios necesitas

Tres, y uno opcional:

| Servicio | Para qué | Costo |
|---|---|---|
| **Supabase** | Base de datos, autenticación, archivos, tareas programadas | Gratis para empezar · **Pro $25 USD/mes** |
| **Vercel** | La aplicación web (Next.js) | Gratis (Hobby) · Pro $20 USD/mes |
| **Resend** (o Amazon SES) | Correos: invitaciones y recordatorios | Gratis hasta 3,000 correos/mes |
| **Dominio** | `tugimnasio.com` en vez de `algo.vercel.app` | ~$150–400 MXN/año |

**Para un beta con un gimnasio: entre $0 y $25 USD al mes.**

### Sobre el plan gratuito de Supabase
Funciona, pero tiene una trampa importante: **el proyecto se pausa tras una
semana sin actividad** y hay que despertarlo a mano. Para un gimnasio real eso
es inaceptable. También limita a 500 MB de base y 1 GB de archivos.

**Recomendación:** empieza en el plan gratuito mientras pruebas, y pásate a Pro
($25) antes de que entre el primer cliente de verdad. Pro además te da respaldos
diarios automáticos con 7 días de retención, que para datos de cobros no es
opcional.

### Por qué Vercel
Next.js es de Vercel, así que el despliegue es conectar el repositorio y listo.
El plan gratuito alcanza de sobra para un gimnasio. Si algún día prefieres otra
cosa, la aplicación también corre en Docker (hay `Dockerfile` en el repositorio),
pero entonces tú te encargas del servidor, el HTTPS y las actualizaciones.

> Un detalle que importa: el bloqueo por intentos fallidos de contraseña usa la
> IP del visitante, y la toma de una cabecera que **sólo es confiable detrás de
> un proxy que la fije**. Vercel la fija. Si te mueves a un servidor propio sin
> proxy de confianza, hay que revisarlo.

---

## 3. Paso a paso

### Paso 1 — Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea una cuenta.
2. **New project**. Elige:
   - **Region:** `East US (North Virginia)` — es la más cercana a México con
     buena latencia. (No hay región en México.)
   - **Database password:** genera una larga y **guárdala en tu gestor de
     contraseñas**. Si la pierdes, se puede resetear, pero es un mal rato.
3. Espera ~2 minutos a que termine de crearse.

Del panel del proyecto vas a necesitar (**Settings → API**):

| Dato | Dónde se usa | ¿Secreto? |
|---|---|---|
| **Project URL** | Variable `NEXT_PUBLIC_SUPABASE_URL` | No |
| **anon / public key** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No — la protege la seguridad de la base |
| **service_role key** | `SUPABASE_SERVICE_ROLE_KEY` | **SÍ. Nunca la pongas en el navegador ni en el repositorio** |

### Paso 2 — Subir el esquema

Desde tu máquina, en la carpeta del proyecto:

```bash
# 1. Inicia sesión en Supabase desde la terminal
npx supabase login

# 2. Enlaza esta carpeta con el proyecto de la nube
#    (el project-ref sale de la URL del panel: supabase.com/dashboard/project/XXXXX)
npx supabase link --project-ref XXXXX

# 3. Ejecuta todas las migraciones en la nube
npx supabase db push
```

Al terminar, en **Table Editor** del panel deberías ver todas las tablas.
La base está construida y vacía, que es justo lo que quieres.

### Paso 3 — Activar las extensiones de tareas programadas

La plataforma usa dos agendados: los recordatorios de vencimiento y el cierre de
visitas colgadas. Necesitan dos extensiones.

En el panel: **Database → Extensions**, busca y activa:

- `pg_cron` — ejecuta tareas a una hora fija.
- `pg_net` — permite que la base llame a la función de correos.

> Las migraciones intentan activarlas solas y **no fallan si no puede**: dejan un
> aviso y siguen. Es a propósito, para que un permiso faltante no impida crear la
> base. Pero si no las activas, **no saldrá ningún recordatorio** y nadie te
> avisará. Verifícalo.

Para comprobar que los agendados quedaron, en **SQL Editor**:

```sql
select jobname, schedule from cron.job order by jobname;
```

Deberías ver estos cinco: `access-close-stale-hourly`, `access-partitions-monthly`,
`purge-login-attempts-daily`, `reminders-drain-hourly` y
`reminders-enqueue-daily`.

### Paso 4 — Configurar el correo saliente

**Este paso no es opcional.** El correo que trae Supabase de fábrica permite
sólo unos pocos envíos por hora y está pensado para pruebas: si invitas a 30
socios al portal el mismo día, la mayoría no recibirá nada.

1. Crea cuenta en [resend.com](https://resend.com) (gratis hasta 3,000/mes).
2. Verifica tu dominio ahí (te pide agregar unos registros DNS). Sin dominio
   propio puedes usar el de pruebas de Resend, pero los correos caerán en spam.
3. En Resend, crea unas credenciales SMTP.
4. En Supabase: **Project Settings → Authentication → SMTP Settings**, activa
   *Enable Custom SMTP* y captura:
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: tu API key de Resend
   - Sender email: `no-reply@tudominio.com`

### Paso 5 — Configurar las direcciones de retorno

Los correos de invitación llevan un enlace de regreso a tu aplicación. Hay que
decirle a Supabase cuáles son válidas, o el enlace no funcionará.

**Authentication → URL Configuration**:

- **Site URL:** `https://tudominio.com`
- **Redirect URLs:** agrega
  - `https://tudominio.com/portal/set-password`
  - `https://tudominio.com/portal/login`

### Paso 6 — Desplegar la aplicación en Vercel

1. Sube el repositorio a GitHub (ya está: `github.com/saulEnavarro/gym_admin`).
2. En [vercel.com](https://vercel.com), **Add New → Project** e importa el
   repositorio.
3. En **Environment Variables**, captura:

```
NEXT_PUBLIC_SUPABASE_URL       = https://XXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = (anon key del paso 1)
SUPABASE_SERVICE_ROLE_KEY      = (service_role key del paso 1)
NEXT_PUBLIC_SITE_URL           = https://tudominio.com
```

4. **Deploy**. Tarda unos 2 minutos.

> `SUPABASE_INTERNAL_URL` sólo sirve para el desarrollo con Docker en tu
> máquina. En Vercel **no la pongas**.

### Paso 7 — Desplegar la función de recordatorios

Los recordatorios los envía una función que corre en Supabase.

```bash
# Publica la función
npx supabase functions deploy process-reminders

# Guarda sus secretos (elige tú un secreto largo e irrepetible)
npx supabase secrets set REMINDER_INVOKE_SECRET="pon-aqui-algo-largo-y-aleatorio"
npx supabase secrets set SMTP_HOST="smtp.resend.com"
npx supabase secrets set SMTP_PORT="465"
npx supabase secrets set SMTP_USER="resend"
npx supabase secrets set SMTP_PASS="tu-api-key-de-resend"
npx supabase secrets set SMTP_FROM="Tu Gimnasio <no-reply@tudominio.com>"
```

Ahora dile a la base dónde está esa función. En **SQL Editor**:

```sql
-- Sustituye XXXXX por tu project-ref y el secreto por el mismo de arriba.
insert into private.reminder_runtime (function_url, invoke_secret)
values (
  'https://XXXXX.supabase.co/functions/v1/process-reminders',
  'pon-aqui-algo-largo-y-aleatorio'
)
on conflict (singleton) do update
   set function_url  = excluded.function_url,
       invoke_secret = excluded.invoke_secret,
       updated_at    = now();
```

> **Si te saltas este paso, los recordatorios fallan en silencio.** La tarea
> programada intentará llamar a una dirección que no existe y nadie te avisará.

### Paso 8 — Crear el primer gimnasio y su administrador

Hoy **no hay pantalla de registro** (ver [pendientes](../contexto/pendientes.md)),
así que el primer alta se hace desde el panel de Supabase. Es la única parte
manual, y sólo ocurre una vez por gimnasio.

1. **Authentication → Users → Add user**. Crea la cuenta del dueño con su correo
   y una contraseña temporal. Marca *Auto Confirm User*.
2. Copia el **UID** que aparece en la lista.
3. En **SQL Editor**, sustituye los valores y ejecuta:

```sql
-- 1) El gimnasio. El 'slug' es un identificador corto, en minúsculas y sin
--    acentos ni espacios.
insert into public.organizations (name, slug)
values ('Nombre del Gimnasio', 'nombre-del-gimnasio')
returning id;   -- ← copia este id

-- 2) El dueño como administrador. Pega el id de arriba y el UID del usuario.
insert into public.org_members (org_id, user_id, role)
values ('EL-ID-DEL-GIMNASIO', 'EL-UID-DEL-USUARIO', 'admin');

-- 3) Al menos una sucursal. Sin ella no se puede abrir turno de caja.
insert into public.branches (org_id, name, address, phone, capacity)
values ('EL-ID-DEL-GIMNASIO', 'Matriz', 'Su dirección', '55-0000-0000', 60);

-- 4) Nombre visible, moneda y zona horaria.
update public.org_branding
   set display_name  = 'Nombre del Gimnasio',
       primary_color = '#dc2626',
       currency      = 'MXN',
       locale        = 'es-MX',
       timezone      = 'America/Mexico_City'
 where org_id = 'EL-ID-DEL-GIMNASIO';
```

Las 8 categorías de producto se crean solas al insertar la organización.

4. Entra a `https://tudominio.com/login` con esa cuenta y cambia la contraseña.

---

## 4. Lista de verificación después de desplegar

Recórrela en orden. Si algo falla, falla aquí y no con el gimnasio operando:

- [ ] Entro a `/login` y accedo con el usuario administrador.
- [ ] El panel muestra el nombre del gimnasio y su color.
- [ ] Creo una membresía de prueba con precio.
- [ ] Creo un producto con existencias.
- [ ] Abro turno de caja con fondo $100.
- [ ] Vendo una membresía a un cliente de prueba → sale el ticket con IVA.
- [ ] Invito a ese cliente al portal → **le llega el correo** (si no llega,
      revisa el paso 4).
- [ ] El socio entra al portal y ve su QR.
- [ ] Escaneo ese QR en **Acceso** → dice «Adelante» y muestra su foto.
- [ ] Cierro el turno y el arqueo cuadra.
- [ ] **Cortes** muestra la venta; el export a Excel descarga bien.
- [ ] En SQL Editor: `select jobname from cron.job;` devuelve los cinco.
- [ ] Cancelo la venta de prueba y borro los datos de prueba.

Prueba manual de los recordatorios (para no esperar a mañana):

```sql
select public.enqueue_due_reminders();   -- encola los que tocan hoy
select * from public.reminder_outbox;    -- deberías ver las filas
```

---

## 5. Respaldos

En el plan **Pro**, Supabase toma un respaldo diario y guarda 7 días. Se
restauran desde **Database → Backups**.

En el plan **gratuito no hay respaldos automáticos.** Si vas a operar de verdad,
esta sola razón justifica el Pro. Mientras tanto, un respaldo manual:

```bash
npx supabase db dump --linked -f respaldo-$(date +%F).sql
```

---

## 6. Cómo publicar cambios después

Ya montado, el ciclo es corto:

```bash
# Cambios de aplicación: basta con subirlos, Vercel despliega solo
git push

# Cambios de base de datos (una migración nueva)
npx supabase db push
```

Antes de subir, en tu máquina:

```bash
npx supabase db reset && npx supabase test db   # 220 pruebas
npx tsc --noEmit && npx next build
```

> **Nunca edites una migración que ya se aplicó en producción.** Los cambios van
> siempre en un archivo nuevo. Una migración ya ejecutada es historia; si la
> cambias, tu base local y la de producción dejan de coincidir.

---

## 7. Entonces, ¿ya se puede operar?

Técnicamente **sí se puede desplegar hoy** y todo lo construido funciona. Pero
antes de entregarlo a un cliente conviene resolver lo que está en
[pendientes.md](../contexto/pendientes.md), sección 1 — sobre todo:

- No hay pantallas para crear sucursales, invitar personal ni cambiar el logo:
  hoy todo eso es SQL manual.
- No hay recuperación de contraseña.
- Sin el SMTP del paso 4, las invitaciones al portal prácticamente no salen.

**Sugerencia:** despliega ya, y úsalo tú con datos reales de **un** gimnasio
piloto acompañándolo de cerca. Eso saca a la luz lo que falta mucho mejor que
seguir construyendo a ciegas. Pero no lo entregues como autoservicio hasta
cerrar esa sección.

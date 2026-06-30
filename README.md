# Registro Gym

SaaS **multi-inquilino y multi-sucursal** para la administración integral de gimnasios (México · MXN + IVA).

> Documento de alcance y decisiones: [`contexto/especificacion.md`](contexto/especificacion.md) — **fuente de verdad** del proyecto.

Estado actual: **Fase 0 — Cimientos** ✅

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend / API | Next.js 15 (App Router) · React 19 · TypeScript |
| Estilos | Tailwind CSS · modo claro/oscuro (`next-themes`) |
| Datos / Auth / Storage | Supabase (Postgres + RLS + Auth + Storage) |
| Gráficas (Fase 1) | Recharts |
| Entorno local | Docker (app) + Supabase CLI (stack de datos) |

---

## Qué incluye la Fase 0

- **Aislamiento multi-tenant** (`org_id` / `branch_id`) con **Row-Level Security en todas las tablas**.
- **Autenticación** con roles por organización: Administrador, Gerente, Recepcionista, Instructor, Cliente.
- **Personalización por organización** (branding): nombre, logo, color, tipografía, moneda, idioma.
- **Logs de auditoría** append-only con trigger genérico.
- **Storage privado** (logos, fotos, documentos) aislado por organización vía URLs firmadas.
- **Modo claro/oscuro** y layout responsive base (panel con sidebar).
- **Test automatizado de no-fuga entre inquilinos** (pgTAP).

---

## Requisitos

- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (corre tanto el stack de Supabase como, opcionalmente, la app).
- **[Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)** (`npm i -g supabase` o `scoop install supabase`).
- Opcional: **Node.js 20+** sólo si prefieres correr la app sin Docker.

---

## Arranque rápido

### 1. Levanta el stack de datos (Supabase, sobre Docker)

```bash
supabase start
```

La primera vez descarga las imágenes. Al terminar imprime las URLs y claves locales:

- API: `http://127.0.0.1:54321`
- Studio (panel visual de la BD): `http://127.0.0.1:54323`
- Inbucket (correos de prueba): `http://127.0.0.1:54324`

> Las migraciones de [`supabase/migrations/`](supabase/migrations/) y el [`supabase/seed.sql`](supabase/seed.sql) se aplican solos al iniciar.

### 2. Configura las variables de entorno

Ya existe un [`.env.local`](.env.example) con los **defaults locales de Supabase**. Si `supabase start` mostró claves distintas, cópialas ahí. (Ver [`.env.example`](.env.example) para la referencia comentada.)

### 3. Levanta la app

**Opción A — con Docker (recomendada):**

```bash
docker compose up --build
```

**Opción B — en tu máquina (sin Docker):**

```bash
npm install
npm run dev
```

### 4. Abre la app

<http://localhost:3000> → entra con una cuenta demo:

| Cuenta | Rol | Contraseña |
|---|---|---|
| `admin@iron-temple.test` | Administrador (Iron Temple) | `Password123!` |
| `recepcion@iron-temple.test` | Recepcionista | `Password123!` |
| `admin@fitzone.test` | Administrador (FitZone) | `Password123!` |

> Inicia sesión con cada organización para comprobar que **no ven los datos de la otra**.

---

## Comandos útiles

```bash
npm run dev          # app en modo desarrollo (host)
npm run build        # build de producción
npm run lint         # ESLint
npm run typecheck    # TypeScript sin emitir

supabase start       # levanta Postgres/Auth/Storage/Studio (Docker)
supabase stop        # detiene el stack
npm run db:reset     # recrea la BD y reaplica migraciones + seed
npm run db:test      # corre los tests de BD (incl. aislamiento RLS)
npm run db:types     # regenera src/lib/types/database.types.ts desde el esquema
```

### Verificar el aislamiento entre inquilinos

```bash
npm run db:test
# o: supabase test db
```

Ejecuta [`supabase/tests/01_rls_tenant_isolation.test.sql`](supabase/tests/01_rls_tenant_isolation.test.sql),
que valida que la organización A no puede leer ni escribir datos de la B.

---

## Estructura

```
.
├── docker-compose.yml         # app Next.js en contenedor (desarrollo)
├── Dockerfile                 # imagen de desarrollo de la app
├── src/
│   ├── app/                   # rutas (App Router)
│   │   ├── (app)/             # área privada (panel) con su layout
│   │   ├── login/             # acceso del staff (server action)
│   │   └── auth/signout/      # cierre de sesión
│   ├── components/            # UI (shell, tema, primitivos)
│   └── lib/
│       ├── supabase/          # clientes (browser, server, admin, middleware)
│       ├── auth/              # sesión y roles
│       └── types/             # tipos de la BD
└── supabase/
    ├── config.toml
    ├── migrations/            # esquema, RLS, auditoría, branding, storage
    ├── seed.sql               # 2 organizaciones demo
    └── tests/                 # pruebas pgTAP (aislamiento RLS)
```

---

## Notas de seguridad (Fase 0)

- **RLS obligatorio**: ninguna tabla operativa sin política. El test lo verifica.
- **Storage privado**: buckets nunca públicos; convención de ruta `{org_id}/...`.
- **`service_role`** sólo en servidor (cliente admin); jamás expuesta al navegador.
- **Sesiones**: `getUser()` revalida el token en el servidor; refresh tokens rotan.
- **Login**: mensajes genéricos (anti-enumeración) y redirección sólo interna.

---

## Notas sobre Docker + Supabase

La app y Supabase corren en **stacks de Docker distintos**. Por eso:

- El **navegador** (en tu host) usa `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`.
- El **servidor** dentro del contenedor usa `SUPABASE_INTERNAL_URL=http://host.docker.internal:54321`.

Ambos comparten la misma cookie de sesión porque el `storageKey` está fijado en
[`src/lib/supabase/config.ts`](src/lib/supabase/config.ts). Si corres la app sin Docker (Opción B),
`SUPABASE_INTERNAL_URL` se ignora y todo apunta a `127.0.0.1`.

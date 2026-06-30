# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile de DESARROLLO para la app Next.js.
# El stack de datos (Postgres, Auth, Storage, Studio) lo levanta el Supabase CLI
# con `supabase start` (su propio Docker). Este contenedor sólo corre la app web.
#
# Para producción se usará un build multi-stage distinto (output standalone);
# se añadirá al desplegar en Vercel / contenedor de producción.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine

# libc6-compat: algunas deps nativas lo necesitan en Alpine.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Instala dependencias en una capa cacheable (sólo se reinstala si cambian
# package.json / lockfile).
COPY package.json package-lock.json* ./
RUN npm install

# El código se monta como volumen en docker-compose para hot-reload,
# así que no copiamos el resto del código aquí en desarrollo.

EXPOSE 3000

ENV NODE_ENV=development
# Habilita el polling de archivos (necesario para hot-reload en volúmenes Docker
# bajo Windows/macOS).
ENV WATCHPACK_POLLING=true

CMD ["npm", "run", "dev"]

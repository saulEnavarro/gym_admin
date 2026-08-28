/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Las fotos (cliente hasta 5 MB, establecimiento hasta 3 MB) viajan dentro
    // de una server action, y el límite por omisión de Next es 1 MB: con él,
    // una foto de celular se rechaza antes de llegar a la validación propia.
    serverActions: { bodySizeLimit: "6mb" },
  },
  // Necesario para hot-reload estable dentro de un contenedor Docker (file watching).
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  images: {
    // El Storage de Supabase sirve imágenes (logos, fotos) vía URLs firmadas.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;

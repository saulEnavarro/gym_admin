/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

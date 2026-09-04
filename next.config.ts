import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Documentos e fotos sobem pelo próprio server action (armazenados no Firestore).
      bodySizeLimit: "4400kb",
    },
  },
  images: {
    // Dispositivos alvo (celular 2x e desktop); evita gerar variantes gigantes.
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [48, 64, 96, 128, 192, 256, 320, 384],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;

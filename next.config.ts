import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Documentos e fotos sobem pelo próprio server action (armazenados no Firestore).
      bodySizeLimit: "4400kb",
    },
  },
};

export default nextConfig;

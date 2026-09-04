import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Equoterapia · Gestão",
    short_name: "Equoterapia",
    description: "Gestão da operação de equoterapia: equipe, praticantes, agenda e evolução.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf9f5",
    theme_color: "#2f6549",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

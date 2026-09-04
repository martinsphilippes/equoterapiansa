import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/layout/RegisterSW";

export const metadata: Metadata = {
  title: { default: "Equoterapia Nossa Senhora Aparecida", template: "%s · Equoterapia NSA" },
  description: "Gestão da Equoterapia Nossa Senhora Aparecida: equipe, praticantes, agenda, evolução e área da família.",
  applicationName: "Equoterapia NSA",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Equoterapia NSA" },
  icons: {
    icon: [{ url: "/icons/favicon-64.png", sizes: "64x64", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#1420b4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

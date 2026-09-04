import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterSW } from "@/components/layout/RegisterSW";

export const metadata: Metadata = {
  title: { default: "Equoterapia", template: "%s · Equoterapia" },
  description: "Gestão da operação de equoterapia: equipe, praticantes, agenda e evolução.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Equoterapia" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#2f6549",
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

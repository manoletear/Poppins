import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { LoadingScreen } from "@/components/LoadingScreen";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Poppins - Magia en tu Casa | Gestión Laboral para el Hogar Chileno",
  description:
    "Formaliza a tu trabajadora de casa particular en minutos. Contratos, liquidaciones, cotizaciones, pagos y cumplimiento legal — todo automático con Poppins.",
  keywords: "poppins, empleada doméstica, trabajadora casa particular, contrato trabajo, liquidaciones, cotizaciones, previred, chile, nana, asesora del hogar, leyes sociales, sueldo nana",
  openGraph: {
    title: "Poppins - Magia en tu Casa",
    description: "Formaliza a tu trabajadora de casa particular en minutos. Contratos, liquidaciones y pagos automáticos.",
    images: ["/landing/logo-poppins.png"],
    type: "website",
    locale: "es_CL",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${outfit.variable} font-outfit antialiased`}>
        <AuthProvider>
          <LoadingScreen />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import { BarraDeCarregamento } from "@/components/marca/barra-de-carregamento";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "satisfeito?!", template: "%s · satisfeito?!" },
  description: "Pesquisa de satisfação rápida para negócios locais.",
};

// Cor da barra do navegador no celular: igual ao topo da tela (fundo menta)
// interactiveWidget: no Android o teclado encolhe a tela em vez de cobrir o campo que a pessoa está digitando
export const viewport: Viewport = { themeColor: "#14b8a6", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <BarraDeCarregamento />
        {children}
      </body>
    </html>
  );
}

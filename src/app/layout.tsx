import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
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
export const viewport: Viewport = { themeColor: "#14b8a6" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}

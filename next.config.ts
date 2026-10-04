import type { NextConfig } from "next";

// Cabeçalhos enviados em todas as páginas
const cabecalhosDeSeguranca = [
  // Impede que o site seja embutido em outro (golpe de "clique falso")
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // O navegador não tenta "adivinhar" o tipo dos arquivos
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não vaza o endereço completo da página para outros sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa câmera, microfone nem localização
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosDeSeguranca }];
  },
};

export default nextConfig;

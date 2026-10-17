import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Avaliação da IA de verdade (chama a API da Anthropic e gasta crédito): npm run avaliar-ia
// Não roda no "npm test" nem no CI.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { environment: "node", include: ["src/**/*.avaliacao.ts"], testTimeout: 120_000 },
});

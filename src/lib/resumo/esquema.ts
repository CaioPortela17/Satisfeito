import { z } from "zod";
import type { Resumo } from "./tipos";

const MAX_FRASES = 6;
const MAX_CARACTERES_FRASE = 200;

const frase = z.string().min(1).max(MAX_CARACTERES_FRASE);
const lista = z.array(frase).max(MAX_FRASES);

// O formato final que guardamos no banco
export const esquemaResumo = z.object({ positivos: lista, reclamacoes: lista, sugestoes: lista });

// Limpa a lista que a IA devolveu: só texto, sem espaços nas pontas, sem vazios,
// frases longas cortadas e no máximo 6. Devolve null se não for uma lista de textos.
function limparLista(bruto: unknown): string[] | null {
  if (!Array.isArray(bruto) || !bruto.every((x) => typeof x === "string")) return null;
  return bruto
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .map((x) => (x.length > MAX_CARACTERES_FRASE ? `${x.slice(0, MAX_CARACTERES_FRASE - 1)}…` : x))
    .slice(0, MAX_FRASES);
}

// A resposta da IA é "dado de fora": limpamos e só então conferimos com o zod.
export function limparResumo(bruto: unknown): Resumo | null {
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  const positivos = limparLista(o.positivos);
  const reclamacoes = limparLista(o.reclamacoes);
  const sugestoes = limparLista(o.sugestoes);
  if (!positivos || !reclamacoes || !sugestoes) return null;
  const r = esquemaResumo.safeParse({ positivos, reclamacoes, sugestoes });
  return r.success ? r.data : null;
}

// A "ferramenta" que obrigamos a IA a chamar: é assim que ela devolve o resultado estruturado
export const NOME_FERRAMENTA = "registrar_resumo";

const listaDeFrases = (descricao: string) => ({
  type: "array",
  items: { type: "string" },
  description: `${descricao} No máximo ${MAX_FRASES} frases curtas; lista vazia se não houver nada.`,
});

export const ESQUEMA_FERRAMENTA = {
  type: "object" as const,
  properties: {
    positivos: listaDeFrases("O que os clientes elogiam."),
    reclamacoes: listaDeFrases("O que os clientes reclamam."),
    sugestoes: listaDeFrases("O que os clientes pedem ou sugerem."),
  },
  required: ["positivos", "reclamacoes", "sugestoes"],
};

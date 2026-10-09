import { z } from "zod";
import type { Resumo } from "./tipos";

const MAX_FRASES = 6;
const MAX_CARACTERES_FRASE = 200;

const frase = z.string().min(1).max(MAX_CARACTERES_FRASE);
const lista = z.array(frase).max(MAX_FRASES);

// O formato final que guardamos no banco
export const esquemaResumo = z.object({ positivos: lista, reclamacoes: lista, sugestoes: lista });

// Corta frase longa e põe "…" no fim, sem passar de 200 caracteres.
// Se o corte caiu no meio de um emoji (par de "metades"), tiramos a metade solta,
// porque o banco recusa texto com metade de emoji. Também tiramos espaço antes do "…".
function cortarFrase(x: string): string {
  if (x.length <= MAX_CARACTERES_FRASE) return x;
  let corte = x.slice(0, MAX_CARACTERES_FRASE - 1);
  const ultimo = corte.charCodeAt(corte.length - 1);
  if (ultimo >= 0xd800 && ultimo <= 0xdbff) corte = corte.slice(0, -1);
  return `${corte.trimEnd()}…`;
}

// O Postgres (jsonb) recusa o caractere NUL e "metades de emoji" soltas.
// Tiramos os dois; pares válidos (emoji inteiro) ficam.
function limparCaracteresInvalidos(x: string): string {
  return x
    .replace(/\u0000/g, "")
    .replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "");
}

// Limpa a lista que a IA devolveu: só texto, sem espaços nas pontas, sem vazios,
// frases longas cortadas e no máximo 6. Devolve null se não for uma lista de textos.
function limparLista(bruto: unknown): string[] | null {
  if (!Array.isArray(bruto) || !bruto.every((x) => typeof x === "string")) return null;
  return bruto
    .map((x) => limparCaracteresInvalidos(x).trim())
    .filter((x) => x.length > 0)
    .map(cortarFrase)
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

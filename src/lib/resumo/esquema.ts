import { z } from "zod";
import type { ResumoRelatorio } from "./tipos";

const MAX_FRASES = 6;
const MAX_CARACTERES_FRASE = 200;
const MAX_ACOES = 3;
const MAX_CARACTERES_PANORAMA = 400;

const frase = z.string().min(1).max(MAX_CARACTERES_FRASE);
const lista = z.array(frase).max(MAX_FRASES);

const panorama = z.string().min(1).max(MAX_CARACTERES_PANORAMA);

// O formato final que guardamos no banco (as ações são no máximo 3)
export const esquemaResumo = z.object({
  positivos: lista,
  reclamacoes: lista,
  sugestoes: lista,
  panorama,
  acoes: z.array(frase).max(MAX_ACOES),
});

// Corta frase longa e põe "…" no fim, sem passar de 200 caracteres.
// Se o corte caiu no meio de um emoji (par de "metades"), tiramos a metade solta,
// porque o banco recusa texto com metade de emoji. Também tiramos espaço antes do "…".
function cortarFrase(x: string, max = MAX_CARACTERES_FRASE): string {
  if (x.length <= max) return x;
  let corte = x.slice(0, max - 1);
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
function limparLista(bruto: unknown, maximo = MAX_FRASES): string[] | null {
  if (!Array.isArray(bruto) || !bruto.every((x) => typeof x === "string")) return null;
  return bruto
    .map((x) => limparCaracteresInvalidos(x).trim())
    .filter((x) => x.length > 0)
    .map((x) => cortarFrase(x))
    .slice(0, maximo);
}

// O panorama é um texto só (até 400 caracteres), com a mesma limpeza das frases
function limparPanorama(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;
  const texto = limparCaracteresInvalidos(bruto).trim();
  return texto.length > 0 ? cortarFrase(texto, MAX_CARACTERES_PANORAMA) : null;
}

// A resposta da IA é "dado de fora": limpamos e só então conferimos com o zod.
export function limparResumo(bruto: unknown): ResumoRelatorio | null {
  if (typeof bruto !== "object" || bruto === null || Array.isArray(bruto)) return null;
  const o = bruto as Record<string, unknown>;
  const positivos = limparLista(o.positivos);
  const reclamacoes = limparLista(o.reclamacoes);
  const sugestoes = limparLista(o.sugestoes);
  const acoes = limparLista(o.acoes, MAX_ACOES);
  const resumoPanorama = limparPanorama(o.panorama);
  if (!positivos || !reclamacoes || !sugestoes || !acoes || !resumoPanorama) return null;
  const r = esquemaResumo.safeParse({ positivos, reclamacoes, sugestoes, panorama: resumoPanorama, acoes });
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
    panorama: {
      type: "string",
      description: `Como foi o período, em 2 a 4 frases (no máximo ${MAX_CARACTERES_PANORAMA} caracteres), usando só os números do bloco <numeros>.`,
    },
    positivos: listaDeFrases("O que os clientes elogiam."),
    reclamacoes: listaDeFrases("O que os clientes reclamam."),
    sugestoes: listaDeFrases("O que os clientes pedem ou sugerem."),
    acoes: {
      type: "array",
      items: { type: "string" },
      description: `2 ou 3 ações práticas para a equipe fazer, baseadas só nos dados. No máximo ${MAX_ACOES} frases curtas.`,
    },
  },
  required: ["panorama", "positivos", "reclamacoes", "sugestoes", "acoes"],
};

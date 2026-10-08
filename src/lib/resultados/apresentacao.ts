import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import type { MembroEquipe } from "./tipos";

// Com menos avaliações que isso, a média da pessoa ainda não diz muito
export const MINIMO_AVALIACOES = 3;

// 8,4 (vírgula, uma casa). Sem média: travessão.
export function formatarMedia(media: number | null): string {
  if (media === null) return "—";
  return media.toFixed(1).replace(".", ",");
}

const ROTULOS: Record<Faixa, string> = { boa: "Ótimo", atencao: "Pode melhorar", ruim: "Ruim" };

// A palavra que acompanha a cor da nota (a cor sozinha não basta)
export function rotuloFaixa(nota: number): string {
  return ROTULOS[faixaDaNota(nota)];
}

export function poucasAvaliacoes(avaliacoes: number): boolean {
  return avaliacoes < MINIMO_AVALIACOES;
}

// Quem tem avaliações suficientes vem primeiro; dentro de cada grupo, maior média,
// depois mais avaliações, depois ordem alfabética.
export function ordenarEquipe(equipe: MembroEquipe[]): MembroEquipe[] {
  return [...equipe].sort((a, b) => {
    const pa = poucasAvaliacoes(a.avaliacoes);
    const pb = poucasAvaliacoes(b.avaliacoes);
    if (pa !== pb) return pa ? 1 : -1;
    if (b.media !== a.media) return b.media - a.media;
    if (b.avaliacoes !== a.avaliacoes) return b.avaliacoes - a.avaliacoes;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

// "2026-10-08" -> "08/10"
export function rotuloDia(dia: string): string {
  const [, mes, d] = dia.split("-");
  return `${d}/${mes}`;
}

export type ResumoPesquisa = { id: string; respostas: number };

// A lista vem da mais recente para a mais antiga.
// Usa a pedida na URL (se for da empresa), senão a mais recente que já tem respostas,
// senão a mais recente.
export function escolherPesquisaPadrao(pesquisas: ResumoPesquisa[], pedido?: string | null): string | null {
  if (pedido && pesquisas.some((p) => p.id === pedido)) return pedido;
  return (pesquisas.find((p) => p.respostas > 0) ?? pesquisas[0])?.id ?? null;
}

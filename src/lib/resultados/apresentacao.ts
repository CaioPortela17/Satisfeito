import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";

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

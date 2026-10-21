import { z } from "zod";
import type { TipoPergunta } from "@/lib/pesquisas/esquemas";

export type PerguntaPublica = { id: string; texto: string; tipo: TipoPergunta; obrigatoria: boolean };
export type ItemResposta = {
  pergunta_id: string;
  valor_nota?: number;
  valor_texto?: string;
  funcionario_id?: string;
};
export type LeituraResposta =
  | { ok: true; itens: ItemResposta[] }
  | { ok: false; erros: Record<string, string> };

export const LIMITE_TEXTO_RESPOSTA = 1000;
// Notas abaixo disso mostram a caixa "Onde podemos melhorar?" (o banco confere a mesma regra)
export const NOTA_MINIMA_SEM_MELHORAR = 7;

const nota = z.coerce.number().int().min(1).max(10);
const id = z.uuid();

function campo(formData: FormData, nome: string) {
  const valor = formData.get(nome);
  return typeof valor === "string" ? valor.trim() : "";
}

// Lê o formulário da página pública. Os nomes dos campos são "<tipo>:<id da pergunta>".
// As perguntas vêm do servidor (nunca do navegador), então só lemos o que existe.
export function lerResposta(formData: FormData, perguntas: PerguntaPublica[]): LeituraResposta {
  const itens: ItemResposta[] = [];
  const erros: Record<string, string> = {};

  for (const p of perguntas) {
    const valor = campo(formData, `${p.tipo}:${p.id}`);
    if (!valor) {
      if (p.obrigatoria) erros[p.id] = "Responda esta pergunta.";
      continue;
    }
    if (p.tipo === "nota") {
      const r = nota.safeParse(valor);
      if (!r.success) {
        erros[p.id] = "Escolha uma nota de 1 a 10.";
        continue;
      }
      const item: ItemResposta = { pergunta_id: p.id, valor_nota: r.data };
      // Nota baixa: o cliente pode dizer onde melhorar (o texto fica junto da nota)
      const melhorar = r.data < NOTA_MINIMA_SEM_MELHORAR ? campo(formData, `melhorar:${p.id}`) : "";
      if (melhorar) {
        if (melhorar.length > LIMITE_TEXTO_RESPOSTA) {
          erros[p.id] = `Escreva no máximo ${LIMITE_TEXTO_RESPOSTA} caracteres.`;
          continue;
        }
        item.valor_texto = melhorar;
      }
      itens.push(item);
    } else if (p.tipo === "texto") {
      if (valor.length <= LIMITE_TEXTO_RESPOSTA) itens.push({ pergunta_id: p.id, valor_texto: valor });
      else erros[p.id] = `Escreva no máximo ${LIMITE_TEXTO_RESPOSTA} caracteres.`;
    } else {
      const r = id.safeParse(valor);
      if (r.success) itens.push({ pergunta_id: p.id, funcionario_id: r.data });
      else erros[p.id] = "Escolha quem te atendeu.";
    }
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  if (itens.length === 0) return { ok: false, erros: { geral: "Responda pelo menos uma pergunta." } };
  return { ok: true, itens };
}

import type { NumerosRelatorio, Resumo } from "./tipos";

// Todo número que a IA pode citar no panorama, nas notas e nas ações: os que demos a ela e as diferenças entre eles.
function numerosPermitidos(n: NumerosRelatorio): Set<number> {
  const set = new Set<number>();
  const add = (v: number | null | undefined) => {
    if (typeof v === "number" && Number.isFinite(v)) set.add(Math.round(v * 10) / 10);
  };
  const diferenca = (a: number | null, b: number | null) => {
    if (a !== null && b !== null) add(Math.abs(a - b));
  };

  add(n.periodo.dias);
  add(n.envios);
  add(n.envios_anterior);
  add(n.media);
  add(n.media_anterior);
  add(n.nps);
  add(n.nps_anterior);
  diferenca(n.envios, n.envios_anterior);
  diferenca(n.media, n.media_anterior);
  diferenca(n.nps, n.nps_anterior);
  for (const x of [n.melhor_dia, n.dia_mais_fraco, n.melhor_turno, n.pior_turno, n.melhor_pergunta, n.pior_pergunta]) {
    if (x) add(x.media);
  }
  for (const p of n.perguntas ?? []) {
    add(p.media);
    add(p.respostas);
    add(p.media_anterior);
    diferenca(p.media, p.media_anterior);
  }
  for (const f of n.distribuicao ?? []) add(f.envios);
  // Dia e mês das datas do período (ex.: "de 17/09 a 14/10")
  for (const iso of [n.periodo.inicio, n.periodo.fim]) {
    const [, mes, dia] = iso.split("-");
    add(Number(mes));
    add(Number(dia));
  }
  return set;
}

// Números soltos no texto: 8,4 | 8.4 | 52 | 30%
const NUMERO = /\d+(?:[.,]\d+)?/g;

// A IA escreve só a prosa; os números do relatório vêm do banco. Para ela não inventar conta, conferimos o
// panorama e as ações: todo número com casa decimal ou maior que 10 precisa estar nos dados (ou ser a
// diferença entre dois deles). Inteiros de 0 a 10 passam (contagens como "duas ações" ou "nota 8").
// As listas de elogios, reclamações e sugestões ficam de fora: vêm de comentários de clientes, que podem
// ter número ("esperei 40 minutos"). Devolve os números que não deveriam estar lá.
export function numerosDesconhecidos(resumo: Resumo, numeros: NumerosRelatorio): string[] {
  const permitidos = numerosPermitidos(numeros);
  const textos = [resumo.panorama ?? "", resumo.notas ?? "", ...(resumo.acoes ?? [])];
  const achados: string[] = [];
  for (const texto of textos) {
    for (const token of texto.match(NUMERO) ?? []) {
      const valor = Number(token.replace(",", "."));
      if (Number.isInteger(valor) && valor <= 10) continue;
      if (!permitidos.has(Math.round(valor * 10) / 10)) achados.push(token);
    }
  }
  return achados;
}

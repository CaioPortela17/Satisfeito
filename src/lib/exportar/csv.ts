// CSV para abrir no Excel em português: separador ";" (o Excel brasileiro espera esse), linhas com CRLF
// e um BOM no começo para os acentos aparecerem certos.
const SEPARADOR = ";";
const BOM = String.fromCharCode(0xfeff);

// Texto que começa com = + - @ (ou tab/enter) é executado como FÓRMULA pelo Excel e pelo Google Planilhas.
// Como o cliente digita o que quiser na pesquisa, colocamos um apóstrofo na frente para anular isso.
const COMECO_PERIGOSO = /^[=+\-@\t\r]/;

export type Celula = string | number | boolean | null | undefined;

export function escaparCelula(valor: Celula): string {
  if (valor === null || valor === undefined) return "";
  let texto = String(valor);
  if (typeof valor === "string" && COMECO_PERIGOSO.test(texto)) texto = `'${texto}`;
  // Entre aspas só quando tem separador, aspas ou quebra de linha; as aspas de dentro são dobradas
  if (/[";\r\n]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function montarCsv(linhas: Celula[][]): string {
  return BOM + linhas.map((linha) => linha.map(escaparCelula).join(SEPARADOR)).join("\r\n") + "\r\n";
}

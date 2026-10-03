// Evita "redirecionamento aberto": um link como /entrar?next=https://golpe.com
// não pode mandar o usuário para fora do nosso site depois do login.
// Só aceitamos caminhos internos, que começam com uma única "/".
export function caminhoSeguro(
  destino: string | null | undefined,
  padrao = "/painel",
): string {
  if (!destino) return padrao;
  if (!destino.startsWith("/")) return padrao;
  // "//site.com" e "/\site.com" são entendidos pelo navegador como outro site
  if (destino.startsWith("//") || destino.startsWith("/\\")) return padrao;
  return destino;
}

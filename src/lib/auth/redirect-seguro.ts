// Evita "redirecionamento aberto": um link como /entrar?next=https://golpe.com
// não pode mandar o usuário para fora do nosso site depois do login.
//
// Não basta olhar se o texto começa com "/": o navegador apaga caracteres
// invisíveis (tab, quebra de linha), e "/\t/golpe.com" vira "//golpe.com",
// que é outro site. Por isso interpretamos o destino do mesmo jeito que o
// navegador (com new URL) e conferimos se ele continua no nosso endereço.
const BASE = "http://satisfeito.invalid";

export function caminhoSeguro(
  destino: string | null | undefined,
  padrao = "/painel",
): string {
  if (!destino || !destino.startsWith("/")) return padrao;

  try {
    const url = new URL(destino, BASE);
    if (url.origin !== BASE) return padrao; // saiu do nosso site
    return url.pathname + url.search + url.hash;
  } catch {
    return padrao;
  }
}

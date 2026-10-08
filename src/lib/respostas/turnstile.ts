// Confere com a Cloudflare se o token do Turnstile é de uma pessoa.
// "buscar" é injetável só para os testes não dependerem da internet.
export type ResultadoTurnstile = "ok" | "invalido" | "indisponivel";

const URL_VERIFICACAO = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const LIMITE_TOKEN = 2048; // limite documentado pela Cloudflare
const TEMPO_LIMITE_MS = 5000;

export async function verificarTurnstile(
  token: string,
  segredo: string,
  buscar: typeof fetch = fetch,
): Promise<ResultadoTurnstile> {
  if (!token || token.length > LIMITE_TOKEN) return "invalido";
  try {
    const resposta = await buscar(URL_VERIFICACAO, {
      method: "POST",
      // Só secret e response. Sem "remoteip": decisão do projeto, nada por IP.
      body: new URLSearchParams({ secret: segredo, response: token }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) return "indisponivel";
    const json: unknown = await resposta.json();
    if (typeof json !== "object" || json === null) return "indisponivel";
    const { success, "error-codes": codigos } = json as { success?: unknown; "error-codes"?: unknown };
    if (success === true) return "ok";
    if (success === false) {
      // Problema do lado da Cloudflare não é culpa do cliente
      return Array.isArray(codigos) && codigos.includes("internal-error") ? "indisponivel" : "invalido";
    }
    return "indisponivel";
  } catch {
    return "indisponivel"; // rede caída, tempo esgotado ou resposta que não é JSON
  }
}

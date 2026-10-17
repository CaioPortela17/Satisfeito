// Monta a linha de log de um erro do servidor. Vai para os logs da hospedagem (Vercel > Logs).
// Nunca registramos a URL completa (pode ter código de confirmação), cabeçalhos, cookies nem o conteúdo
// de pedidos: só o que ajuda a achar o problema (tipo do erro, mensagem curta, rota e o "digest" do Next).

export type PedidoDoErro = { path: string; method: string };
export type ContextoDoErro = { routePath: string; routeType: string };

const MAX_MENSAGEM = 200;

function semParametros(caminho: string): string {
  const i = caminho.search(/[?#]/);
  return i === -1 ? caminho : caminho.slice(0, i);
}

export function resumoDoErro(err: unknown, pedido: PedidoDoErro, contexto: ContextoDoErro) {
  const e = typeof err === "object" && err !== null ? (err as { name?: unknown; message?: unknown; digest?: unknown }) : null;
  return {
    evento: "erro_no_servidor",
    tipo: typeof e?.name === "string" ? e.name : "Erro",
    mensagem: (typeof e?.message === "string" ? e.message : String(err)).slice(0, MAX_MENSAGEM),
    digest: typeof e?.digest === "string" ? e.digest : undefined,
    metodo: pedido.method,
    caminho: semParametros(pedido.path),
    rota: contexto.routePath,
    contexto: contexto.routeType,
  };
}

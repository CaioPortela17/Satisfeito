// erros.ts: a chave da IA não está configurada (erro de configuração, não do cliente)
export class ErroConfiguracaoIA extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY não configurada");
    this.name = "ErroConfiguracaoIA";
  }
}

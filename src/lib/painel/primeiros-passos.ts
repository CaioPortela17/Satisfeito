// Os "Primeiros passos" do Início: cada passo sabe se já foi feito, olhando o que a empresa tem no banco.
export type EstadoEmpresa = { funcionarios: number; pesquisas: number; respostas: number };

export type Passo = {
  chave: "equipe" | "pesquisa" | "qr";
  titulo: string;
  texto: string;
  href: string;
  acao: string; // texto do link (muda quando o passo já foi feito)
  feito: boolean;
};

export function passosDoPainel(e: EstadoEmpresa): Passo[] {
  return [
    {
      chave: "equipe",
      titulo: "Cadastre quem atende",
      texto: "Seus clientes vão poder dizer quem atendeu eles.",
      href: "/painel/funcionarios",
      acao: e.funcionarios > 0 ? "Ver funcionários" : "Cadastrar funcionários",
      feito: e.funcionarios > 0,
    },
    {
      chave: "pesquisa",
      titulo: "Monte sua pesquisa",
      texto: "Escolha as perguntas: nota de 1 a 10, texto livre e quem atendeu.",
      href: "/painel/pesquisas",
      acao: e.pesquisas > 0 ? "Ver pesquisas" : "Montar pesquisa",
      feito: e.pesquisas > 0,
    },
    {
      // Feito quando chega a primeira resposta: é a prova de que o QR code já está nas mãos dos clientes
      chave: "qr",
      titulo: "Espalhe o QR code",
      texto: "Na mesa, no balcão ou na nota fiscal. Aí é só esperar as respostas.",
      href: e.respostas > 0 ? "/painel/resultados" : "/painel/pesquisas",
      acao: e.respostas > 0 ? "Ver resultados" : "Ver link e QR code",
      feito: e.respostas > 0,
    },
  ];
}

export function tudoPronto(passos: Passo[]): boolean {
  return passos.every((p) => p.feito);
}

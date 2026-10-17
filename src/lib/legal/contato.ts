// E-mail de contato mostrado nas páginas de termos e privacidade (pedidos de dados, dúvidas, denúncias).
// Fica numa variável de ambiente para o endereço real não ir para o código nem para o repositório público.
export function emailDeContato(): string | null {
  const email = process.env.NEXT_PUBLIC_EMAIL_CONTATO?.trim();
  return email ? email : null;
}

export const DATA_TERMOS = "17 de outubro de 2026";
export const DATA_PRIVACIDADE = "17 de outubro de 2026";

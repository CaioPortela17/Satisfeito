export type EmpresaResumo = { id: string; nome: string };

// Decide qual empresa o painel mostra.
// - A lista vem do banco, já filtrada pelo RLS (só empresas do usuário).
// - O id do cookie só vale se estiver nessa lista: um cookie adulterado
//   com a empresa de outra pessoa simplesmente é ignorado.
// - Sem cookie válido, abre a primeira (a mais antiga).
export function escolherEmpresaAtual(
  empresas: EmpresaResumo[],
  idDoCookie: string | undefined,
): EmpresaResumo | null {
  if (empresas.length === 0) return null;
  return empresas.find((empresa) => empresa.id === idDoCookie) ?? empresas[0];
}

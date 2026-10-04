// Mensagem de erro que aparece logo abaixo de um campo do formulário.
// O id é ligado ao campo por aria-describedby, para leitores de tela.
export function ErroDoCampo({ id, erros }: { id: string; erros?: string[] }) {
  if (!erros?.length) return null;
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {erros[0]}
    </p>
  );
}

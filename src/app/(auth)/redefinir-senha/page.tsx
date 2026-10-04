import type { Metadata } from "next";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";

export const metadata: Metadata = { title: "Nova senha" };

// Protegida pelo proxy: só chega aqui quem abriu o link do e-mail (sessão de recuperação)
export default function PaginaRedefinirSenha() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Crie uma nova senha</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Escolha uma senha que você não use em outros sites.
      </p>
      <FormularioRedefinirSenha />
    </>
  );
}

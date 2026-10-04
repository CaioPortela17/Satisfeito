import type { Metadata } from "next";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";

export const metadata: Metadata = { title: "Nova senha" };

// Protegida pelo proxy: só chega aqui quem abriu o link do e-mail (sessão de recuperação)
export default function PaginaRedefinirSenha() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Crie uma nova senha</h1>
      <p className="mt-2 mb-8 text-base text-muted-foreground">
        Escolha uma senha que você não use em outros sites.
      </p>
      <FormularioRedefinirSenha />
    </>
  );
}

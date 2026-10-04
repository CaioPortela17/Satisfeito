import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormularioEntrar } from "./formulario-entrar";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  "link-invalido": "Esse link expirou ou já foi usado. Entre com sua senha ou peça um novo.",
};

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const { next, erro } = await searchParams;
  const aviso = typeof erro === "string" ? AVISOS[erro] : undefined;

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Que bom te ver de novo</h1>
      <p className="mt-2 mb-8 text-base text-muted-foreground">
        Entre para ver o que seus clientes acharam.
      </p>
      {aviso && (
        <Alert className="mb-4">
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}
      <FormularioEntrar next={typeof next === "string" ? next : undefined} />
    </>
  );
}

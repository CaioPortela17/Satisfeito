import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { escolherEmpresaAtual } from "./empresa-atual";

// Nome do cookie que lembra qual empresa o usuário está vendo
export const COOKIE_EMPRESA = "empresa_atual";

// Busca as empresas do usuário e decide qual é a atual.
// cache(): o layout e a página chamam esta função na mesma requisição,
// mas o banco é consultado uma vez só.
export const obterContextoEmpresa = cache(async () => {
  const supabase = await createClient();

  // O RLS só devolve as empresas do usuário logado
  const { data } = await supabase
    .from("empresas")
    .select("id, nome")
    .order("created_at", { ascending: true });
  const empresas = data ?? [];

  const cookieStore = await cookies();
  const atual = escolherEmpresaAtual(empresas, cookieStore.get(COOKIE_EMPRESA)?.value);

  return { supabase, empresas, atual };
});

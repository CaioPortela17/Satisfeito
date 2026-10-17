import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// Apaga TUDO de um dono: respostas, pesquisas, perguntas, funcionários, empresas, relatórios, avisos e o login.
// Usa a chave secreta (ignora o RLS), então só chame depois de confirmar quem está pedindo.
// Ordem importa: as respostas ficam presas à pesquisa de propósito (ninguém perde dados sem querer ao apagar uma
// pesquisa), então saem primeiro; o resto sai em cascata quando a empresa e o usuário são apagados.
export async function apagarDadosDoDono(
  admin: SupabaseClient<Database>,
  donoId: string,
): Promise<{ ok: boolean }> {
  const { data: empresas, error: erroEmpresas } = await admin.from("empresas").select("id").eq("owner_id", donoId);
  if (erroEmpresas) return { ok: false };

  const empresaIds = (empresas ?? []).map((e) => e.id);
  if (empresaIds.length > 0) {
    const { data: pesquisas, error: erroPesquisas } = await admin.from("pesquisas").select("id").in("empresa_id", empresaIds);
    if (erroPesquisas) return { ok: false };
    const pesquisaIds = (pesquisas ?? []).map((p) => p.id);
    if (pesquisaIds.length > 0) {
      // respostas_itens saem junto (cascata a partir da resposta)
      const { error } = await admin.from("respostas").delete().in("pesquisa_id", pesquisaIds);
      if (error) return { ok: false };
    }
    const { error } = await admin.from("empresas").delete().in("id", empresaIds);
    if (error) return { ok: false };
  }

  const { error } = await admin.auth.admin.deleteUser(donoId);
  return { ok: !error };
}

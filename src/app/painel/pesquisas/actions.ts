"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import {
  esquemaIdPesquisa,
  esquemaTextoPergunta,
  esquemaTipoPergunta,
  esquemaTituloPesquisa,
  mensagemErroPesquisa,
} from "@/lib/pesquisas/esquemas";
import { candidatosDeSlug, esquemaSlug, gerarSlug } from "@/lib/pesquisas/slug";
import { perguntasSugeridas, TITULO_SUGERIDO } from "@/lib/pesquisas/sugeridas";
import { createClient } from "@/lib/supabase/server";

export type EstadoAcao = {
  erro?: string;
  ok?: number; // muda a cada sucesso (o formulário sabe que deu certo)
  valor?: string; // o que foi digitado, para não sumir depois de um erro
  anuncio?: string; // frase para o leitor de tela
};

const ERRO = { erro: mensagemErroPesquisa() };

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

// A lista e todos os editores ficam embaixo de /painel/pesquisas
function atualizarTelas() {
  revalidatePath("/painel/pesquisas", "layout");
}

// Próxima posição livre no fim da pesquisa
async function proximaOrdem(supabase: Awaited<ReturnType<typeof createClient>>, pesquisaId: string) {
  const { data } = await supabase
    .from("perguntas")
    .select("ordem")
    .eq("pesquisa_id", pesquisaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ordem ?? 0) + 1;
}

// Não lê o formulário (a empresa vem do servidor), por isso não declara os parâmetros
// que o useActionState manda: o TypeScript aceita uma função com menos parâmetros.
export async function criarPesquisa(): Promise<EstadoAcao> {
  // A empresa é a atual do usuário, decidida no servidor
  const { supabase, atual } = await obterContextoEmpresa();
  if (!atual) return ERRO;

  // Link público a partir do nome da empresa: bebelu, bebelu-2, bebelu-3…
  let pesquisa: { id: string } | null = null;
  for (const slug of candidatosDeSlug(gerarSlug(atual.nome))) {
    const { data, error } = await supabase
      .from("pesquisas")
      .insert({ empresa_id: atual.id, titulo: TITULO_SUGERIDO, slug })
      .select("id")
      .single();
    if (!error) {
      pesquisa = data;
      break;
    }
    if (error.code !== "23505") return { erro: mensagemErroPesquisa(error.code) }; // 23505 = slug em uso
  }
  if (!pesquisa) return ERRO;

  // "Quem te atendeu?" só entra se houver alguém ativo para escolher
  const { count } = await supabase
    .from("funcionarios")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", atual.id)
    .eq("ativo", true);

  const { error: erroPerguntas } = await supabase.from("perguntas").insert(
    perguntasSugeridas((count ?? 0) > 0).map((p, i) => ({
      pesquisa_id: pesquisa.id,
      texto: p.texto,
      tipo: p.tipo,
      obrigatoria: p.obrigatoria,
      ordem: i + 1,
    })),
  );
  if (erroPerguntas) {
    // Não deixa pesquisa pela metade
    await supabase.from("pesquisas").delete().eq("id", pesquisa.id);
    return { erro: mensagemErroPesquisa(erroPerguntas.code) };
  }

  atualizarTelas();
  redirect(`/painel/pesquisas/${pesquisa.id}`);
}

export async function renomearPesquisa(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "titulo");
  const id = esquemaIdPesquisa.safeParse(texto(formData, "id"));
  const titulo = esquemaTituloPesquisa.safeParse(digitado);
  if (!id.success) return { ...ERRO, valor: digitado };
  if (!titulo.success) return { erro: titulo.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pesquisas")
    .update({ titulo: titulo.data })
    .eq("id", id.data)
    .select("id");
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };
  // O RLS esconde linhas de outras empresas: nada mudou = id inválido
  if (!data?.length) return { ...ERRO, valor: digitado };

  atualizarTelas();
  return { ok: Date.now() };
}

export async function alterarSlug(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "slug");
  const id = esquemaIdPesquisa.safeParse(texto(formData, "id"));
  const slug = esquemaSlug.safeParse(digitado);
  if (!id.success) return { ...ERRO, valor: digitado };
  if (!slug.success) return { erro: slug.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pesquisas")
    .update({ slug: slug.data })
    .eq("id", id.data)
    .select("id");
  if (error?.code === "23505") {
    return { erro: "Esse link já está em uso. Tente outro, por exemplo: bebelu-centro.", valor: digitado };
  }
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };
  // O RLS esconde linhas de outras empresas: nada mudou = id inválido
  if (!data?.length) return { ...ERRO, valor: digitado };

  atualizarTelas();
  return { ok: Date.now(), anuncio: "Link atualizado." };
}

export async function alterarAtivaPesquisa(idRecebido: string, ativa: boolean): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || typeof ativa !== "boolean") return ERRO;

  const supabase = await createClient();
  const { data, error } = await supabase.from("pesquisas").update({ ativa }).eq("id", id.data).select("id");
  if (error) return { erro: mensagemErroPesquisa(error.code) };
  // O RLS esconde linhas de outras empresas: nada mudou = id inválido
  if (!data?.length) return ERRO;

  atualizarTelas();
  return { ok: Date.now(), anuncio: ativa ? "Pesquisa recebendo respostas." : "Pesquisa pausada." };
}

export async function excluirPesquisa(idRecebido: string): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success) return ERRO;

  const supabase = await createClient();
  const { data, error } = await supabase.from("pesquisas").delete().eq("id", id.data).select("id");
  if (error) return { erro: mensagemErroPesquisa(error.code) };
  // O RLS esconde linhas de outras empresas: nada mudou = id inválido
  if (!data?.length) return ERRO;

  atualizarTelas();
  redirect("/painel/pesquisas");
}

export async function adicionarPergunta(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "texto");
  const pesquisaId = esquemaIdPesquisa.safeParse(texto(formData, "pesquisaId"));
  const tipo = esquemaTipoPergunta.safeParse(texto(formData, "tipo"));
  const textoPergunta = esquemaTextoPergunta.safeParse(digitado);
  if (!pesquisaId.success) return { ...ERRO, valor: digitado };
  if (!tipo.success) return { erro: tipo.error.issues[0].message, valor: digitado };
  if (!textoPergunta.success) return { erro: textoPergunta.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { error } = await supabase.from("perguntas").insert({
    pesquisa_id: pesquisaId.data,
    texto: textoPergunta.data,
    tipo: tipo.data,
    ordem: await proximaOrdem(supabase, pesquisaId.data),
  });
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };

  atualizarTelas();
  return { ok: Date.now(), anuncio: `Pergunta adicionada: ${textoPergunta.data}` };
}

export async function editarTextoPergunta(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "texto");
  const id = esquemaIdPesquisa.safeParse(texto(formData, "id"));
  const textoPergunta = esquemaTextoPergunta.safeParse(digitado);
  if (!id.success) return { ...ERRO, valor: digitado };
  if (!textoPergunta.success) return { erro: textoPergunta.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perguntas")
    .update({ texto: textoPergunta.data })
    .eq("id", id.data)
    .select("id");
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };
  // O RLS esconde linhas de outras empresas: nada mudou = id inválido
  if (!data?.length) return { ...ERRO, valor: digitado };

  atualizarTelas();
  return { ok: Date.now() };
}

export async function alterarObrigatoria(idRecebido: string, obrigatoria: boolean): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || typeof obrigatoria !== "boolean") return ERRO;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("perguntas")
    .update({ obrigatoria })
    .eq("id", id.data)
    .select("id");
  if (error) return { erro: mensagemErroPesquisa(error.code) };
  // O RLS esconde linhas de outras empresas: nada mudou = id inválido
  if (!data?.length) return ERRO;

  atualizarTelas();
  return { ok: Date.now(), anuncio: obrigatoria ? "Agora é obrigatória." : "Agora é opcional." };
}

// Tirar da pesquisa (arquivada = true) ou devolver (false, vai para o fim)
export async function arquivarPergunta(idRecebido: string, arquivada: boolean): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || typeof arquivada !== "boolean") return ERRO;

  const supabase = await createClient();
  let mudanca: { arquivada: boolean; ordem?: number } = { arquivada };
  if (!arquivada) {
    const { data: pergunta } = await supabase
      .from("perguntas")
      .select("pesquisa_id")
      .eq("id", id.data)
      .maybeSingle();
    if (!pergunta) return ERRO;
    mudanca = { arquivada, ordem: await proximaOrdem(supabase, pergunta.pesquisa_id) };
  }

  const { data, error } = await supabase.from("perguntas").update(mudanca).eq("id", id.data).select("id");
  if (error) return { erro: mensagemErroPesquisa(error.code) };
  // O RLS esconde linhas de outras empresas: nada mudou = id inválido
  if (!data?.length) return ERRO;

  atualizarTelas();
  return {
    ok: Date.now(),
    anuncio: arquivada ? "Pergunta tirada da pesquisa." : "Pergunta devolvida para a pesquisa.",
  };
}

export async function moverPergunta(idRecebido: string, direcao: "subir" | "descer"): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || (direcao !== "subir" && direcao !== "descer")) return ERRO;

  const supabase = await createClient();
  const { data: pergunta } = await supabase
    .from("perguntas")
    .select("pesquisa_id, ordem")
    .eq("id", id.data)
    .maybeSingle();
  if (!pergunta) return ERRO;

  // A vizinha é a pergunta valendo mais próxima acima (subir) ou abaixo (descer)
  const base = supabase
    .from("perguntas")
    .select("id")
    .eq("pesquisa_id", pergunta.pesquisa_id)
    .eq("arquivada", false);
  const { data: vizinha } =
    direcao === "subir"
      ? await base.lt("ordem", pergunta.ordem).order("ordem", { ascending: false }).limit(1).maybeSingle()
      : await base.gt("ordem", pergunta.ordem).order("ordem", { ascending: true }).limit(1).maybeSingle();
  if (!vizinha) return {}; // já está na ponta: nada a fazer

  const { error } = await supabase.rpc("trocar_ordem_perguntas", { a: id.data, b: vizinha.id });
  if (error) return { erro: mensagemErroPesquisa(error.code) };

  atualizarTelas();
  return { ok: Date.now(), anuncio: direcao === "subir" ? "Pergunta subiu." : "Pergunta desceu." };
}

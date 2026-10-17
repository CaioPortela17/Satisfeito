"use server";

import { after } from "next/server";
import { avisarSobreResposta } from "@/lib/avisos/avisar";
import { ehRespostaRuim, mediaDasNotas } from "@/lib/avisos/regras";
import { verificarCarimbo } from "@/lib/respostas/carimbo";
import { lerResposta } from "@/lib/respostas/formulario";
import { mensagemErroResposta, mensagemTurnstile } from "@/lib/respostas/mensagens";
import { verificarTurnstile } from "@/lib/respostas/turnstile";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EstadoEnvio, PesquisaPublica } from "./tipos";

function campo(formData: FormData, nome: string) {
  const valor = formData.get(nome);
  return typeof valor === "string" ? valor : "";
}

export async function enviarResposta(_estado: EstadoEnvio, formData: FormData): Promise<EstadoEnvio> {
  // 0. Turnstile: a Cloudflare confirma que quem enviou é uma pessoa.
  // Sem segredo, sem token ou Cloudflare fora do ar: não aceita (falha fecha).
  const segredoTurnstile = process.env.TURNSTILE_SECRET_KEY;
  if (!segredoTurnstile) return { erro: mensagemErroResposta() };
  const humano = await verificarTurnstile(campo(formData, "cf-turnstile-response"), segredoTurnstile);
  if (humano !== "ok") return { erro: mensagemTurnstile(humano) };

  // 1. Carimbo de tempo: robô responde rápido demais; carimbo inventado não passa
  const segredo = process.env.CARIMBO_SEGREDO;
  if (!segredo) return { erro: mensagemErroResposta() };
  const carimbo = verificarCarimbo(campo(formData, "carimbo"), Date.now(), segredo);
  if (carimbo === "rapido") return { erro: "Ops, foi rápido demais. Confira as respostas e envie de novo." };
  if (carimbo === "expirado") return { erro: "Essa página ficou aberta muito tempo. Recarregue e responda de novo." };
  if (carimbo !== "ok") return { erro: mensagemErroResposta() };

  // 2. As perguntas vêm do banco, nunca do navegador
  const supabase = await createClient();
  const { data } = await supabase.rpc("pesquisa_publica", { p_slug: campo(formData, "slug") });
  const pesquisa = data as unknown as PesquisaPublica | null; // Json do Supabase → nosso tipo
  if (!pesquisa?.ativa) return { erro: mensagemErroResposta("SF101") };

  // 3. Lê e valida o formulário
  const leitura = lerResposta(formData, pesquisa.perguntas);
  if (!leitura.ok) {
    const { geral, ...erros } = leitura.erros;
    return { erro: geral ?? "Confira as perguntas marcadas.", erros };
  }

  // 4. Grava pela função do banco, que confere tudo de novo.
  // Qualquer falha vira uma mensagem genérica: nada do erro técnico chega ao cliente.
  try {
    const { data: respostaId, error } = await criarClienteAdmin().rpc("registrar_resposta", {
      p_pesquisa_id: pesquisa.id,
      p_itens: leitura.itens,
    });
    if (error) return { erro: mensagemErroResposta(error.code) };

    // Resposta com nota baixa: avisa o dono por e-mail DEPOIS de responder ao cliente (after), sem atrasar nem
    // quebrar o envio dele. O aviso nunca leva o que o cliente escreveu.
    const media = mediaDasNotas(leitura.itens);
    if (respostaId && ehRespostaRuim(media)) {
      after(() => avisarSobreResposta({ pesquisaId: pesquisa.id, respostaId, media }));
    }
  } catch {
    return { erro: mensagemErroResposta() };
  }

  return { enviado: true };
}

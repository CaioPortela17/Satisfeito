import type { NextRequest } from "next/server";
import { enviarRelatorioSemanal } from "@/lib/avisos/avisar";
import { emailAtivo } from "@/lib/avisos/email";
import { JANELA_RELATORIO_SEMANAL_MIN } from "@/lib/avisos/regras";
import { gerarRelatorio } from "@/lib/resumo/pipeline";
import { montarRelatorioWhatsApp } from "@/lib/resumo/relatorio";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// A Vercel chama esta rota todo dia (veja vercel.json). Para cada empresa que LIGOU o relatório semanal, gera o
// relatório dos últimos 7 dias das pesquisas ativas que ainda não receberam um nesta semana e manda por e-mail
// ao dono. Rodar todo dia (e não só na segunda) permite continuar no dia seguinte se houver muita coisa.
export const maxDuration = 60;

const MAX_RELATORIOS_POR_EXECUCAO = 4; // cada um chama a IA: limita o tempo e o gasto de uma execução
const MAX_PESQUISAS_VERIFICADAS = 40;

export async function GET(request: NextRequest) {
  // Só a Vercel sabe o segredo (ela manda no cabeçalho Authorization). Sem segredo configurado, nega tudo.
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return new Response("Não autorizado.", { status: 401 });
  }
  if (!emailAtivo()) return Response.json({ enviados: 0, motivo: "envio de e-mail desativado" });

  const admin = criarClienteAdmin();
  const { data: empresas, error } = await admin.from("empresas").select("id, owner_id").eq("relatorio_semanal", true);
  if (error) return new Response("Não deu para ler as empresas.", { status: 500 });

  const desde = new Date(Date.now() - JANELA_RELATORIO_SEMANAL_MIN * 60_000).toISOString();
  let verificadas = 0;
  let gerados = 0;
  let enviados = 0;

  parar: for (const empresa of empresas ?? []) {
    const { data: pesquisas } = await admin.from("pesquisas").select("id").eq("empresa_id", empresa.id).eq("ativa", true);
    for (const pesquisa of pesquisas ?? []) {
      if (verificadas >= MAX_PESQUISAS_VERIFICADAS || gerados >= MAX_RELATORIOS_POR_EXECUCAO) break parar;
      verificadas++;

      // Já recebeu nesta semana? Confere antes de gerar, porque gerar custa uma chamada de IA
      const { count } = await admin
        .from("avisos_enviados")
        .select("id", { count: "exact", head: true })
        .eq("pesquisa_id", pesquisa.id)
        .eq("tipo", "relatorio_semanal")
        .gt("created_at", desde);
      if (count) continue;

      const r = await gerarRelatorio({
        leitura: admin,
        admin,
        donoId: empresa.owner_id,
        pesquisaId: pesquisa.id,
        dias: 7,
        comNomes: false, // sem nomes: o relatório automático nunca expõe pessoas sem o dono ter conferido
      });
      if (!r.ok) continue; // poucas respostas na semana, limite de uso etc.: simplesmente pula
      gerados++;
      const resultado = await enviarRelatorioSemanal(pesquisa.id, montarRelatorioWhatsApp(r.numeros, r.resumo));
      if (resultado === "enviado") enviados++;
    }
  }

  return Response.json({ empresas: empresas?.length ?? 0, verificadas, gerados, enviados });
}

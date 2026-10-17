import type { Instrumentation } from "next";
import { resumoDoErro } from "@/lib/observabilidade/erro";

// O Next chama esta função quando um erro acontece no servidor (página, Server Action ou rota).
// Escrevemos uma linha JSON no log; na Vercel ela aparece em Logs e dá para filtrar por "erro_no_servidor".
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  console.error(JSON.stringify(resumoDoErro(err, request, context)));
};

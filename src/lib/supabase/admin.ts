import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente com a chave secreta: IGNORA o RLS (as regras de acesso do banco não valem).
// Usos hoje:
//   1. chamar a função registrar_resposta (envio público da pesquisa), que confere tudo sozinha;
//   2. gerarResumoAction gravar em resumos_ia.
// Regra: só use DEPOIS de o código já ter conferido de quem são os dados e os limites
// (dono da empresa, limite de uso etc.), porque o banco não vai conferir por você.
// "server-only" quebra o build se alguém importar este arquivo num componente do navegador,
// assim a chave secreta nunca chega ao celular do cliente.
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Falta SUPABASE_SECRET_KEY no .env.local");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

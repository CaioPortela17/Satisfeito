import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente com a chave secreta: IGNORA o RLS. Use só para chamar registrar_resposta,
// que confere tudo por conta própria. "server-only" quebra o build se alguém
// importar este arquivo num componente do navegador.
export function criarClienteAdmin() {
  const chave = process.env.SUPABASE_SECRET_KEY;
  if (!chave) throw new Error("Falta SUPABASE_SECRET_KEY no .env.local");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Cliente para usar no servidor: Server Components, Server Actions e Route Handlers.
// Ele lê a sessão do usuário a partir dos cookies da requisição, então o
// Supabase sabe "quem está pedindo" e o RLS consegue filtrar os dados.
// Crie um cliente novo a cada requisição (não guarde em variável global).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components não podem gravar cookies. Tudo bem ignorar:
            // o proxy (src/proxy.ts) cuida de renovar a sessão.
          }
        },
      },
    },
  );
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para usar no servidor: Server Components, Server Actions e Route Handlers.
// Ele lê a sessão do usuário a partir dos cookies da requisição, então o
// Supabase sabe "quem está pedindo" e o RLS consegue filtrar os dados.
// Crie um cliente novo a cada requisição (não guarde em variável global).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
            // Server Components não podem gravar cookies. Tudo bem ignorar aqui:
            // na Etapa 2 o proxy vai cuidar de renovar a sessão.
          }
        },
      },
    },
  );
}

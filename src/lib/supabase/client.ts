import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Cliente para usar em Client Components (arquivos com "use client"),
// ou seja, código que roda no navegador do usuário.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    // Em produção (HTTPS), o cookie da sessão só trafega por conexão segura
    { cookieOptions: { secure: process.env.NODE_ENV === "production" } },
  );
}

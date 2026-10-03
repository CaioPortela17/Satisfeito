import { createBrowserClient } from "@supabase/ssr";

// Cliente para usar em Client Components (arquivos com "use client"),
// ou seja, código que roda no navegador do usuário.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

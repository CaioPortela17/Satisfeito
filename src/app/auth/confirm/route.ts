import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { caminhoSeguro } from "@/lib/auth/redirect-seguro";
import { createClient } from "@/lib/supabase/server";

// O link do e-mail traz um token_hash. Aqui trocamos esse token por uma sessão
// (cookies) e mandamos a pessoa para dentro do sistema, já logada.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = caminhoSeguro(searchParams.get("next"));

  if (tokenHash && tipo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(destino, request.url));
    }
  }

  // Link vencido, já usado ou adulterado
  return NextResponse.redirect(new URL("/entrar?erro=link-invalido", request.url));
}

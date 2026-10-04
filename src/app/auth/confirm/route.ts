import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { caminhoSeguro } from "@/lib/auth/redirect-seguro";
import { createClient } from "@/lib/supabase/server";

// Recebe a pessoa que clicou no link do e-mail e transforma o clique em login.
// Aceita os dois formatos de link do Supabase:
// - ?code=...                    → e-mail padrão (plano gratuito): o Supabase já confirmou
//                                  o e-mail e nos devolve um código para trocar por sessão
// - ?token_hash=...&type=...     → modelo de e-mail personalizado (quando tivermos SMTP próprio)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const codigo = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = caminhoSeguro(searchParams.get("next"));

  const supabase = await createClient();

  if (codigo) {
    // Só funciona no mesmo navegador do cadastro (ele guardou uma "chave" em cookie)
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (!error) return NextResponse.redirect(new URL(destino, request.url));
  } else if (tokenHash && tipo) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(destino, request.url));
  }

  // Link vencido, já usado, adulterado ou aberto em outro navegador
  return NextResponse.redirect(new URL("/entrar?erro=link-invalido", request.url));
}

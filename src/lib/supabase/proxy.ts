import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

// Páginas que exigem login
const ROTAS_PROTEGIDAS = ["/painel", "/redefinir-senha"];
// Páginas que não fazem sentido para quem já está logado
const ROTAS_SO_VISITANTE = ["/entrar", "/cadastro"];

function estaEm(caminho: string, rotas: string[]) {
  return rotas.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
}

// Roda antes de cada página: renova o token da sessão (se venceu)
// e devolve os cookies atualizados para o navegador.
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Atualiza os cookies para as páginas desta requisição...
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          // ...e para o navegador
          cookiesToSet.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([chave, valor]) => resposta.headers.set(chave, valor));
        },
      },
    },
  );

  // IMPORTANTE: não coloque código entre createServerClient e getClaims().
  // getClaims() confere a assinatura do token; é ele que renova a sessão.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!logado && estaEm(pathname, ROTAS_PROTEGIDAS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    url.searchParams.set("next", pathname);
    return redirecionarMantendoCookies(url, resposta);
  }

  if (logado && estaEm(pathname, ROTAS_SO_VISITANTE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return redirecionarMantendoCookies(url, resposta);
  }

  return resposta;
}

// Um redirecionamento é uma resposta nova: copiamos os cookies renovados
// para ela, senão o usuário perderia a sessão.
function redirecionarMantendoCookies(url: URL, base: NextResponse) {
  const redirecionamento = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
  return redirecionamento;
}

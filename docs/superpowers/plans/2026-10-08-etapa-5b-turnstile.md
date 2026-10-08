# Etapa 5B (Turnstile) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impedir envios de robôs na pesquisa pública com o Cloudflare Turnstile e deixar no banco a coluna `descartada` que a Etapa 6 vai usar.

**Architecture:** O formulário público carrega o script oficial da Cloudflare (`next/script`, sem pacote npm novo) e guarda o token num campo escondido. A Server Action `enviarResposta` valida o token na API `siteverify` (função pura `verificarTurnstile`) **antes** de qualquer outra coisa e recusa se não for `ok`. No banco, `respostas.descartada` com uma policy que deixa o dono atualizar só essa coluna.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Vitest, Supabase (Postgres + RLS), Cloudflare Turnstile.

**Spec:** `docs/superpowers/specs/2026-10-08-etapa-5b-turnstile-design.md`

## Global Constraints

- Next.js 16: antes de escrever código de Next, consultar `node_modules/next/dist/docs/` (regras do `AGENTS.md`), principalmente sobre `next/script`.
- Responder, comentar e escrever textos da interface em **português**. **Sem emojis** na interface.
- **Nenhum limite ou sinal por IP**: não enviar `remoteip` à Cloudflare. Sem exigir identificação do cliente.
- **Nenhuma biblioteca npm nova.** O Turnstile entra pelo script oficial.
- Segredos só em `.env.local` (já no `.gitignore`); `TURNSTILE_SECRET_KEY` nunca com `NEXT_PUBLIC_`.
- Se a Cloudflare falhar ou o token faltar, a resposta **não** é aceita (falha fecha).
- Nada do erro técnico chega ao cliente: só mensagens amigáveis.
- Toda interface passa pelas skills de design (`impeccable`, `frontend-design`, `emil-design-eng`, `mobile-native`, `animate`, `design:ux-copy`, `design:accessibility-review`) e segue o `DESIGN.md`.
- Commits terminam com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Explicar as partes importantes do código de forma simples (o Caio está aprendendo).

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261008000000_respostas_descartadas.sql` (novo) | Coluna `descartada` e policy de update |
| `supabase/tests/rls_respostas.sql` (alterar) | Casos de descarte |
| `src/lib/supabase/database.types.ts` (regenerar) | Tipo da nova coluna |
| `src/lib/respostas/turnstile.ts` + `turnstile.test.ts` (novos) | `verificarTurnstile` |
| `src/lib/respostas/mensagens.ts` + `mensagens.test.ts` (alterar) | `mensagemTurnstile` |
| `src/app/p/[slug]/widget-turnstile.tsx` (novo) | Widget no navegador |
| `src/app/p/[slug]/formulario-resposta.tsx` (alterar) | Campo escondido, botão, reinício do widget |
| `src/app/p/[slug]/actions.ts` (alterar) | Primeiro passo: verificar o token |
| `.env.example`, `.env.local`, `README.md`, `CLAUDE.md` | Variáveis e status |

---

### Task 1: Banco — coluna `descartada` e policy do dono

**Files:**
- Create: `supabase/migrations/20261008000000_respostas_descartadas.sql`
- Modify: `supabase/tests/rls_respostas.sql` (antes da linha `select 'TODOS OS TESTES...`)
- Regenerate: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces: coluna `public.respostas.descartada boolean not null default false`; policy `"dono descarta as próprias respostas"`.

- [ ] **Step 1: Teste primeiro.** Em `supabase/tests/rls_respostas.sql`, logo **antes** da linha `select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;`, inserir:

```sql
-- Descartar respostas (base da Etapa 6): só o dono, só a coluna descartada
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
do $$
begin
  update public.respostas set descartada = true
   where id = (select id from public.respostas order by created_at limit 1);
  if (select count(*) from public.respostas where descartada) <> 1 then
    raise exception 'FALHOU: dono não conseguiu descartar a própria resposta';
  end if;
  begin
    update public.respostas set pesquisa_id = current_setting('app.pb')::uuid;
    raise exception 'FALHOU: dono alterou outra coluna de respostas';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dono B não descarta resposta da empresa A (0 linhas afetadas)
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
do $$
declare
  n int;
begin
  update public.respostas set descartada = true where pesquisa_id = current_setting('app.pa')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU: B descartou % resposta(s) da empresa A', n;
  end if;
end $$;

-- Visitante sem login não descarta
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    update public.respostas set descartada = true;
    raise exception 'FALHOU: visitante descartou resposta';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

```

- [ ] **Step 2: Ver falhar.** Rodar o arquivo inteiro com `mcp__supabase__execute_sql` (projeto `cvgayvfqzrbdqmlsvcal`, colando o conteúdo do arquivo, como na 5A). Esperado: erro `column "descartada" of relation "respostas" does not exist`.

- [ ] **Step 3: Migração.** Criar `supabase/migrations/20261008000000_respostas_descartadas.sql`:

```sql
-- Etapa 5B: o dono pode descartar respostas suspeitas (a tela chega na Etapa 6)

alter table public.respostas
  add column descartada boolean not null default false;

comment on column public.respostas.descartada is
  'Resposta descartada pelo dono. Não entra nas médias: as consultas da Etapa 6 devem filtrar "not descartada".';

-- O dono só pode mudar esta coluna (nunca created_at nem pesquisa_id)
grant update (descartada) on public.respostas to authenticated;

create policy "dono descarta as próprias respostas"
  on public.respostas for update to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                      where q.id = pesquisa_id and e.owner_id = (select auth.uid())));
```

- [ ] **Step 4: Aplicar** com `mcp__supabase__apply_migration` (`name: "respostas_descartadas"`, mesmo SQL).

- [ ] **Step 5: Teste passa.** Rodar de novo `rls_respostas.sql` → `TODOS OS TESTES DE SEGURANÇA PASSARAM`. Rodar também `rls_empresas.sql`, `rls_funcionarios.sql` e `rls_pesquisas.sql` (devem continuar passando). Conferir sobras: `select count(*) from auth.users where email like 'resp-%@exemplo.com'` → 0.

- [ ] **Step 6: Advisors** (`security` e `performance`): nada novo além dos avisos conhecidos (`pesquisa_publica` executável pelo público, proteção de senha vazada).

- [ ] **Step 7: Tipos.** `mcp__supabase__generate_typescript_types` → salvar em `src/lib/supabase/database.types.ts`; conferir `descartada` em `respostas`.

- [ ] **Step 8: lint, test, build, commit.** `npm run lint && npm test && npm run build`; depois:

```bash
git add supabase src/lib/supabase/database.types.ts
git commit -m "feat: coluna descartada em respostas com policy do dono

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `verificarTurnstile` e mensagens (TDD)

**Files:**
- Create: `src/lib/respostas/turnstile.ts`, `src/lib/respostas/turnstile.test.ts`
- Modify: `src/lib/respostas/mensagens.ts`, `src/lib/respostas/mensagens.test.ts`

**Interfaces:**
- Produces:
  - `type ResultadoTurnstile = "ok" | "invalido" | "indisponivel"`
  - `verificarTurnstile(token: string, segredo: string, buscar?: typeof fetch): Promise<ResultadoTurnstile>`
  - `mensagemTurnstile(resultado: "invalido" | "indisponivel"): string`

- [ ] **Step 1: Testes que falham.** Criar `src/lib/respostas/turnstile.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { verificarTurnstile } from "./turnstile";

function resposta(corpo: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status }));
}

describe("verificarTurnstile", () => {
  it("token vazio ou grande demais é inválido, sem chamar a rede", async () => {
    const buscar = vi.fn();
    expect(await verificarTurnstile("", "segredo", buscar)).toBe("invalido");
    expect(await verificarTurnstile("a".repeat(2049), "segredo", buscar)).toBe("invalido");
    expect(buscar).not.toHaveBeenCalled();
  });

  it("success true → ok", async () => {
    const buscar = vi.fn(() => resposta({ success: true }));
    expect(await verificarTurnstile("token", "segredo", buscar)).toBe("ok");
  });

  it("success false → inválido", async () => {
    const buscar = vi.fn(() => resposta({ success: false, "error-codes": ["invalid-input-response"] }));
    expect(await verificarTurnstile("token", "segredo", buscar)).toBe("invalido");
  });

  it("erro interno da Cloudflare → indisponível", async () => {
    const buscar = vi.fn(() => resposta({ success: false, "error-codes": ["internal-error"] }));
    expect(await verificarTurnstile("token", "segredo", buscar)).toBe("indisponivel");
  });

  it("rede caída, tempo esgotado, status 500 ou JSON estranho → indisponível", async () => {
    expect(await verificarTurnstile("t", "s", vi.fn(() => Promise.reject(new Error("rede"))))).toBe("indisponivel");
    expect(await verificarTurnstile("t", "s", vi.fn(() => resposta({}, 500)))).toBe("indisponivel");
    expect(await verificarTurnstile("t", "s", vi.fn(() => resposta({ outra: 1 })))).toBe("indisponivel");
    expect(await verificarTurnstile("t", "s", vi.fn(() => Promise.resolve(new Response("não é json"))))).toBe("indisponivel");
  });

  it("envia secret e response, e nunca o IP (remoteip)", async () => {
    const buscar = vi.fn((_url: string | URL | Request, _init?: RequestInit) => resposta({ success: true }));
    await verificarTurnstile("meu-token", "meu-segredo", buscar);
    const [url, init] = buscar.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init?.method).toBe("POST");
    const corpo = new URLSearchParams(String(init?.body));
    expect(corpo.get("secret")).toBe("meu-segredo");
    expect(corpo.get("response")).toBe("meu-token");
    expect(corpo.has("remoteip")).toBe(false);
  });
});
```

Em `src/lib/respostas/mensagens.test.ts`, mudar a primeira linha de import e acrescentar um `describe` no fim:

```ts
import { mensagemErroResposta, mensagemTurnstile } from "./mensagens";
```

```ts
describe("mensagemTurnstile", () => {
  it("inválido pede para recarregar", () => {
    expect(mensagemTurnstile("invalido")).toBe(
      "Não conseguimos confirmar que você é uma pessoa. Recarregue a página e tente de novo.",
    );
  });
  it("indisponível pede para tentar de novo", () => {
    expect(mensagemTurnstile("indisponivel")).toBe("Não deu para verificar agora. Tente de novo em instantes.");
  });
});
```

- [ ] **Step 2: Ver falhar.** `npm test` → FAIL (`./turnstile` não existe; `mensagemTurnstile` não existe).

- [ ] **Step 3: Implementar.** Criar `src/lib/respostas/turnstile.ts`:

```ts
// Confere com a Cloudflare se o token do Turnstile é de uma pessoa.
// "buscar" é injetável só para os testes não dependerem da internet.
export type ResultadoTurnstile = "ok" | "invalido" | "indisponivel";

const URL_VERIFICACAO = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const LIMITE_TOKEN = 2048; // limite documentado pela Cloudflare
const TEMPO_LIMITE_MS = 5000;

export async function verificarTurnstile(
  token: string,
  segredo: string,
  buscar: typeof fetch = fetch,
): Promise<ResultadoTurnstile> {
  if (!token || token.length > LIMITE_TOKEN) return "invalido";
  try {
    const resposta = await buscar(URL_VERIFICACAO, {
      method: "POST",
      // Só secret e response. Sem "remoteip": decisão do projeto, nada por IP.
      body: new URLSearchParams({ secret: segredo, response: token }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    });
    if (!resposta.ok) return "indisponivel";
    const json: unknown = await resposta.json();
    if (typeof json !== "object" || json === null) return "indisponivel";
    const { success, "error-codes": codigos } = json as { success?: unknown; "error-codes"?: unknown };
    if (success === true) return "ok";
    if (success === false) {
      // Problema do lado da Cloudflare não é culpa do cliente
      return Array.isArray(codigos) && codigos.includes("internal-error") ? "indisponivel" : "invalido";
    }
    return "indisponivel";
  } catch {
    return "indisponivel"; // rede caída, tempo esgotado ou resposta que não é JSON
  }
}
```

Em `src/lib/respostas/mensagens.ts`, acrescentar no fim:

```ts
export function mensagemTurnstile(resultado: "invalido" | "indisponivel"): string {
  return resultado === "invalido"
    ? "Não conseguimos confirmar que você é uma pessoa. Recarregue a página e tente de novo."
    : "Não deu para verificar agora. Tente de novo em instantes.";
}
```

- [ ] **Step 4: Ver passar.** `npm test` → PASS (todos os testes, incluindo os antigos).

- [ ] **Step 5: lint e commit.** `npm run lint`, depois:

```bash
git add src/lib/respostas
git commit -m "feat: verificação do Turnstile e mensagens

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Widget, formulário e Server Action

**Files:**
- Create: `src/app/p/[slug]/widget-turnstile.tsx`
- Modify: `src/app/p/[slug]/formulario-resposta.tsx`, `src/app/p/[slug]/actions.ts`, `.env.example`, `.env.local`

**Interfaces:**
- Consumes: `verificarTurnstile`, `mensagemTurnstile`, `mensagemErroResposta` (Task 2).
- Produces: `WidgetTurnstile({ aoMudar }: { aoMudar: (token: string) => void })`; campo do formulário `cf-turnstile-response`.

- [ ] **Step 1: Ler a documentação.** Em `node_modules/next/dist/docs/` achar o guia de `next/script` e confirmar: `strategy="afterInteractive"`, `onReady` (roda quando o script termina de carregar **e** a cada nova montagem do componente). Se algo for diferente do código abaixo, ajustar o código ao guia.

- [ ] **Step 2: Variáveis.**
  - `.env.example`: acrescentar no fim

```
# Cloudflare Turnstile (anti-robô). Crie o widget em dash.cloudflare.com > Turnstile (modo Managed).
# Em desenvolvimento use as chaves de teste da Cloudflare (sempre passam):
# https://developers.cloudflare.com/turnstile/troubleshooting/testing/
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
# Só no servidor: nunca use NEXT_PUBLIC_ nesta.
TURNSTILE_SECRET_KEY=
```

  - `.env.local`: acrescentar as duas variáveis com as chaves de teste "sempre passa" copiadas da página de testes da Cloudflare (a *site key* começa com `1x` e termina em `AA`; a *secret* também começa com `1x`). **Copiar da documentação, não de memória.** Não imprimir o `.env.local` no terminal além dessas duas linhas.

- [ ] **Step 3: Widget.** Criar `src/app/p/[slug]/widget-turnstile.tsx`:

```tsx
"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// O que usamos da API global que o script da Cloudflare cria
type OpcoesTurnstile = {
  sitekey: string;
  appearance: "interaction-only";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};
declare global {
  interface Window {
    turnstile?: {
      render: (elemento: HTMLElement, opcoes: OpcoesTurnstile) => string;
      remove: (id: string) => void;
    };
  }
}

// Widget invisível: só aparece se a Cloudflare precisar de um clique.
// Quando aprova, avisa o formulário com o token; quando expira ou dá erro, avisa com "".
export function WidgetTurnstile({ aoMudar }: { aoMudar: (token: string) => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const chave = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!pronto || !chave || !caixa.current || !window.turnstile) return;
    const id = window.turnstile.render(caixa.current, {
      sitekey: chave,
      appearance: "interaction-only",
      callback: aoMudar,
      "expired-callback": () => aoMudar(""),
      "error-callback": () => aoMudar(""),
    });
    return () => window.turnstile?.remove(id); // limpa ao desmontar
  }, [pronto, aoMudar]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setPronto(true)}
      />
      <div ref={caixa} className="flex justify-center" />
    </>
  );
}
```

- [ ] **Step 4: Formulário.** Em `formulario-resposta.tsx`:
  1. Import: `import { WidgetTurnstile } from "./widget-turnstile";`
  2. Junto dos outros `useState` do componente `FormularioResposta`:

```tsx
  const [token, setToken] = useState("");
  const [rodada, setRodada] = useState(0); // trocar a "rodada" recria o widget e gera token novo
```

  3. Em `enviar`, trocar o final

```tsx
    const dados = new FormData(e.currentTarget);
    startTransition(() => acao(dados));
```

   por

```tsx
    const dados = new FormData(e.currentTarget);
    // Cada token vale uma vez só: depois de enviar, pede um novo ao widget
    setToken("");
    setRodada((r) => r + 1);
    startTransition(() => acao(dados));
```

  4. Dentro do `<form>`, logo depois do `<input type="hidden" name="slug" ...>`:

```tsx
      <input type="hidden" name="cf-turnstile-response" value={token} />
```

  5. Logo **antes** do `<Button type="submit" ...>` (depois do `<div role="alert">` do erro geral):

```tsx
      <WidgetTurnstile key={rodada} aoMudar={setToken} />
      <p role="status" className="min-h-5 text-center text-sm text-muted-foreground">
        {token ? "" : "Confirmando que você é uma pessoa…"}
      </p>
```

  6. Trocar `disabled={pendente}` do botão por `disabled={pendente || !token}`.
  7. Atualizar o comentário de "Já respondeu hoje" removendo "; a 5B reforça" (a marca continua sendo só uma ajuda; quem protege de verdade é o servidor).

- [ ] **Step 5: Server Action.** Em `actions.ts`:
  1. Imports: trocar a linha de mensagens por `import { mensagemErroResposta, mensagemTurnstile } from "@/lib/respostas/mensagens";` e acrescentar `import { verificarTurnstile } from "@/lib/respostas/turnstile";`
  2. Dentro de `enviarResposta`, **antes** do comentário `// 1. Carimbo de tempo...`, inserir:

```ts
  // 0. Turnstile: a Cloudflare confirma que quem enviou é uma pessoa.
  // Sem segredo, sem token ou Cloudflare fora do ar: não aceita (falha fecha).
  const segredoTurnstile = process.env.TURNSTILE_SECRET_KEY;
  if (!segredoTurnstile) return { erro: mensagemErroResposta() };
  const humano = await verificarTurnstile(campo(formData, "cf-turnstile-response"), segredoTurnstile);
  if (humano !== "ok") return { erro: mensagemTurnstile(humano) };

```

- [ ] **Step 6: lint, test, build.** `npm run lint && npm test && npm run build` → tudo verde.

- [ ] **Step 7: Chrome** (reiniciar o servidor para ler o `.env.local`; Caio logado na aba do grupo, janela não minimizada, zoom 100%). Abrir `/p/<slug>` de uma pesquisa ativa:
  1. Chaves de teste que passam: o texto "Confirmando…" some em instantes, o botão habilita, responder e enviar → "Obrigado!". Conferir no banco (`execute_sql`: `select count(*) from respostas`) que a resposta entrou.
  2. Trocar `TURNSTILE_SECRET_KEY` por a *secret* de teste "sempre falha" da página da Cloudflare, reiniciar, enviar → mensagem "Não conseguimos confirmar que você é uma pessoa..." e nada novo no banco. Depois **voltar** a secret que passa.
  3. Bloquear o script (no DevTools, aba Rede, bloquear `challenges.cloudflare.com`, recarregar): o botão fica desabilitado e o texto de apoio continua visível.
  4. Repetir o item 1 com a janela em 639 px de largura, se a janela permitir (o botão e o texto não podem quebrar o layout).
  5. Teclado: Tab chega ao botão só depois que ele habilita; leitor de tela: o texto de apoio é anunciado.

- [ ] **Step 8: Passada de skills.** Rodar `design:ux-copy` (textos do apoio e das duas mensagens), `design:accessibility-review` e `impeccable` no formulário; e `security-review` na Server Action. Aplicar correções.

- [ ] **Step 9: Commit.**

```bash
git add src/app/p .env.example
git commit -m "feat: Turnstile na pesquisa pública

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

(`.env.local` não entra no commit; conferir com `git status` que não aparece.)

---

### Task 4: Verificação, documentação, PR e merge

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Verificação final.** `npm run lint && npm test && npm run build`; os quatro `rls_*.sql`; advisors `security` e `performance`; `git status` limpo de segredos.

- [ ] **Step 2: Documentação.**
  - `README.md`: na seção de Progresso trocar `- [ ] **Etapa 5B** — Proteção contra respostas falsas` por `- [x] **Etapa 5B** — Proteção contra robôs (Cloudflare Turnstile)`; em "Página pública" acrescentar o bullet "Cloudflare Turnstile: um teste invisível confirma que quem envia é uma pessoa, e o servidor confere o resultado antes de gravar (sem usar IP)"; na tabela de variáveis acrescentar `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (chave pública do widget) e `TURNSTILE_SECRET_KEY` (**só servidor**); atualizar a contagem de testes automáticos (rodar `npm test` e usar o número real); em Segurança citar a coluna `descartada`; na estrutura de pastas nada muda.
  - `CLAUDE.md`: no Status marcar `- [x] Etapa 5B: Turnstile` (concluída em 2026-10-08, com links do desenho e do plano), registrar que **suspeitas + descarte (tela e detecção de rajada) ficam na Etapa 6**, e acrescentar em "Decisões registradas": "Turnstile: falha fecha; não enviamos IP à Cloudflare". Antes de publicar o site: criar o widget real na Cloudflare (domínio real) e trocar as chaves de teste.

- [ ] **Step 3: Commit** `docs: Etapa 5B concluída` (com a linha Co-Authored-By).

- [ ] **Step 4: Push, PR e merge.** `git push -u origin etapa-5b-turnstile`; `gh pr create --base main` (corpo termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`); merge autorizado pelo Caio (`gh pr merge --merge`); `git checkout main && git pull`.

- [ ] **Step 5: Avisar o Caio** do que falta fazer por ele: criar o widget real na Cloudflare antes de publicar e testar o formulário no celular de verdade.

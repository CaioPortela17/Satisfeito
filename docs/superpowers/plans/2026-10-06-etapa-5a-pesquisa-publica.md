# Etapa 5A — Página pública, link, QR e respostas: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O cliente responde a pesquisa em `/p/[slug]` sem login; o dono ganha link editável, QR code e cartaz; as respostas são gravadas por uma Server Action com carimbo de tempo assinado e marca no navegador.

**Architecture:** Duas funções `security definer` no banco: `pesquisa_publica(slug)` (o visitante pode chamar; devolve só o necessário) e `registrar_resposta(pesquisa_id, itens)` (só `service_role`; valida tudo e grava). A Server Action `enviarResposta` confere o carimbo HMAC, relê a pesquisa no servidor, valida o formulário e chama `registrar_resposta` com um cliente de chave secreta isolado em `server-only`. QR em SVG gerado no servidor com a biblioteca `qrcode`.

**Tech Stack:** Next.js 16.3 · React 19 · TypeScript · Tailwind 4 · shadcn/ui (Radix) · Supabase (`@supabase/ssr`, `@supabase/supabase-js`) · zod 4 · Vitest · `qrcode` (novo, aprovado)

**Spec:** `docs/superpowers/specs/2026-10-06-etapa-5a-pesquisa-publica-design.md`

## Global Constraints

- Projeto Supabase ref **`cvgayvfqzrbdqmlsvcal`** (ferramentas `mcp__supabase__*`). Testes SQL sempre em `begin … rollback`.
- Next 16: consultar `node_modules/next/dist/docs/` antes de escrever código do Next. Página dinâmica: `PageProps<"/p/[slug]">`, `const { slug } = await props.params`. `import "server-only"` funciona sem instalar pacote.
- Visitante (`anon`) **não** recebe permissão em nenhuma tabela; só `execute` em `pesquisa_publica`. `registrar_resposta` só para `service_role`.
- `SUPABASE_SECRET_KEY` e `CARIMBO_SEGREDO` só no servidor (sem `NEXT_PUBLIC_`), no `.env.local` (fora do git) e com os nomes vazios no `.env.example`. Nunca imprimir segredos em saída de comando.
- Sem IP e sem identificação do cliente.
- Interface e comentários em pt-BR; sem emojis; ícones de conteúdo próprios em `src/components/icones/`; genéricos do `lucide-react`. Aspas tipográficas: `“`/`”` em strings JS, `&ldquo;`/`&rdquo;` em JSX (a ferramenta de edição troca “ ” por ").
- Acessibilidade: foco nunca se perde; erros `role="alert"`; anúncios `role="status"` `sr-only`; alvos ≥ 44px; nada só por cor; grupos de opção como `radiogroup` operáveis pelo teclado.
- Visual do PRODUCT.md: fundo menta, cartões brancos arredondados, botões principais ameixa, notas boa=menta / atenção=manga / ruim=coral sempre com palavra.
- Única biblioteca nova: `qrcode` (+ `@types/qrcode` em dev).
- **Toda tarefa com tela termina com a passada de skills**: `impeccable` (context + craft-floor + `detect`), `frontend-design`, `design:accessibility-review`, `design:ux-copy`, `mobile-native`, `emil-design-eng`, `animate` (se houver movimento). Tarefas de banco/ações: lente de `security-review`.
- Cada tarefa termina com `npm run lint`, `npm test`, `npm run build` passando (código de saída), servidor reiniciado (`npm run start` em segundo plano) e commit em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/pesquisas/slug.ts` (+ teste) | `gerarSlug`, `candidatosDeSlug`, `esquemaSlug` |
| `src/lib/respostas/carimbo.ts` (+ teste) | `criarCarimbo`, `verificarCarimbo` |
| `src/lib/respostas/formulario.ts` (+ teste) | `lerResposta(formData, perguntas)` |
| `src/lib/respostas/mensagens.ts` (+ teste) | `mensagemErroResposta(codigo)` |
| `src/lib/pesquisas/sugeridas.ts`, `esquemas.ts`; `src/lib/funcionarios/esquemas.ts` (+ testes) | Texto "Onde podemos melhorar?"; mensagens 23503 |
| `supabase/migrations/20261007000000_respostas.sql` | slug, respostas, itens, RLS, funções |
| `supabase/tests/rls_respostas.sql` | Prova |
| `src/lib/supabase/database.types.ts` | Tipos regenerados |
| `src/lib/qr.ts` | `gerarQrSvg` |
| `src/app/painel/pesquisas/actions.ts` | `criarPesquisa` com slug; `alterarSlug` |
| `src/app/painel/pesquisas/[id]/cartao-link-qr.tsx`, `botao-copiar-link.tsx`, `formulario-slug.tsx` | Cartão do link e QR |
| `src/app/painel/pesquisas/[id]/cartaz/page.tsx`, `botao-imprimir.tsx` | Cartaz para imprimir |
| `src/lib/supabase/admin.ts` | Cliente com chave secreta (`server-only`) |
| `src/app/p/[slug]/page.tsx`, `formulario-resposta.tsx`, `actions.ts`, `tipos.ts` | Página pública e envio |
| `src/components/icones/icone-obrigado.tsx` | Ícone da tela de obrigado |

---

### Task 1: Bibliotecas puras (slug, carimbo, formulário, mensagens) e textos

**Files:**
- Create: `src/lib/pesquisas/slug.ts`, `src/lib/pesquisas/slug.test.ts`, `src/lib/respostas/carimbo.ts`, `src/lib/respostas/carimbo.test.ts`, `src/lib/respostas/formulario.ts`, `src/lib/respostas/formulario.test.ts`, `src/lib/respostas/mensagens.ts`, `src/lib/respostas/mensagens.test.ts`
- Modify: `src/lib/pesquisas/sugeridas.ts` (+ teste), `src/lib/pesquisas/esquemas.ts` (+ teste), `src/lib/funcionarios/esquemas.ts` (+ teste)

**Interfaces:**
- Produces: `gerarSlug(nome: string): string`; `candidatosDeSlug(base: string, quantidade?: number): string[]`; `esquemaSlug` (zod → string); `TEMPO_MINIMO_MS = 3000`; `VALIDADE_MS = 7_200_000`; `criarCarimbo(agoraMs: number, segredo: string): string`; `type ResultadoCarimbo = "ok" | "invalido" | "rapido" | "expirado"`; `verificarCarimbo(carimbo: string, agoraMs: number, segredo: string): ResultadoCarimbo`; `type PerguntaPublica = { id: string; texto: string; tipo: TipoPergunta; obrigatoria: boolean }`; `type ItemResposta = { pergunta_id: string; valor_nota?: number; valor_texto?: string; funcionario_id?: string }`; `type LeituraResposta = { ok: true; itens: ItemResposta[] } | { ok: false; erros: Record<string, string> }`; `lerResposta(formData: FormData, perguntas: PerguntaPublica[]): LeituraResposta`; `LIMITE_TEXTO_RESPOSTA = 1000`; `mensagemErroResposta(codigo?: string): string`

- [ ] **Step 1: Testes que falham**

`src/lib/pesquisas/slug.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { candidatosDeSlug, esquemaSlug, gerarSlug } from "./slug";

describe("gerarSlug", () => {
  it("minúsculas, sem acento, hífen no lugar de espaço e símbolos", () => {
    expect(gerarSlug("Bebelu")).toBe("bebelu");
    expect(gerarSlug("Pão de Açúcar & Cia.")).toBe("pao-de-acucar-cia");
    expect(gerarSlug("  Lanchonete   do  Zé  ")).toBe("lanchonete-do-ze");
  });
  it("nome curto ou sem letras vira pesquisa", () => {
    expect(gerarSlug("AB")).toBe("pesquisa-ab");
    expect(gerarSlug(" ++ ")).toBe("pesquisa");
  });
  it("corta em 50 caracteres sem terminar em hífen", () => {
    const slug = gerarSlug("a".repeat(49) + " bcd");
    expect(slug.length).toBeLessThanOrEqual(50);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("candidatosDeSlug", () => {
  it("base, base-2, base-3…", () => {
    expect(candidatosDeSlug("bebelu", 3)).toEqual(["bebelu", "bebelu-2", "bebelu-3"]);
    expect(candidatosDeSlug("bebelu")).toHaveLength(20);
  });
});

describe("esquemaSlug", () => {
  it("aceita e normaliza para minúsculas", () => {
    expect(esquemaSlug.parse(" Bebelu-Centro ")).toBe("bebelu-centro");
  });
  it("recusa formato inválido", () => {
    for (const ruim of ["a b", "-bebelu", "bebelu-", "be--lu", "pão", "ab", "a".repeat(61)]) {
      expect(esquemaSlug.safeParse(ruim).success).toBe(false);
    }
  });
  it("mensagem do formato", () => {
    expect(esquemaSlug.safeParse("a b c").error?.issues[0].message).toBe(
      "Use só letras sem acento, números e hífen (ex.: bebelu-centro).",
    );
  });
});
```

`src/lib/respostas/carimbo.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { criarCarimbo, verificarCarimbo } from "./carimbo";

const SEGREDO = "segredo-de-teste";
const T0 = 1_760_000_000_000;

describe("carimbo", () => {
  it("ok entre 3 s e 2 h", () => {
    const c = criarCarimbo(T0, SEGREDO);
    expect(verificarCarimbo(c, T0 + 5_000, SEGREDO)).toBe("ok");
    expect(verificarCarimbo(c, T0 + 3_000, SEGREDO)).toBe("ok");
  });
  it("rápido demais", () => {
    expect(verificarCarimbo(criarCarimbo(T0, SEGREDO), T0 + 1_000, SEGREDO)).toBe("rapido");
  });
  it("expirado depois de 2 h", () => {
    expect(verificarCarimbo(criarCarimbo(T0, SEGREDO), T0 + 7_200_001, SEGREDO)).toBe("expirado");
  });
  it("inválido se adulterado, com outro segredo ou lixo", () => {
    const c = criarCarimbo(T0, SEGREDO);
    const [, assinatura] = c.split(".");
    expect(verificarCarimbo(`${T0 - 60_000}.${assinatura}`, T0 + 5_000, SEGREDO)).toBe("invalido");
    expect(verificarCarimbo(c, T0 + 5_000, "outro")).toBe("invalido");
    expect(verificarCarimbo("abc", T0, SEGREDO)).toBe("invalido");
    expect(verificarCarimbo("", T0, SEGREDO)).toBe("invalido");
    expect(verificarCarimbo(`${c}.extra`, T0 + 5_000, SEGREDO)).toBe("invalido");
  });
});
```

`src/lib/respostas/formulario.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { lerResposta, type PerguntaPublica } from "./formulario";

const NOTA = "11111111-1111-4111-8111-111111111111";
const TEXTO = "22222222-2222-4222-8222-222222222222";
const QUEM = "33333333-3333-4333-8333-333333333333";
const ANA = "44444444-4444-4444-8444-444444444444";

const perguntas: PerguntaPublica[] = [
  { id: NOTA, texto: "Nota?", tipo: "nota", obrigatoria: true },
  { id: TEXTO, texto: "Melhorar?", tipo: "texto", obrigatoria: false },
  { id: QUEM, texto: "Quem?", tipo: "funcionario", obrigatoria: false },
];

function form(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return fd;
}

describe("lerResposta", () => {
  it("monta os itens respondidos e pula os vazios", () => {
    expect(
      lerResposta(form({ [`nota:${NOTA}`]: "9", [`texto:${TEXTO}`]: "  Mais sal  ", [`funcionario:${QUEM}`]: ANA }), perguntas),
    ).toEqual({
      ok: true,
      itens: [
        { pergunta_id: NOTA, valor_nota: 9 },
        { pergunta_id: TEXTO, valor_texto: "Mais sal" },
        { pergunta_id: QUEM, funcionario_id: ANA },
      ],
    });
    expect(lerResposta(form({ [`nota:${NOTA}`]: "7", [`texto:${TEXTO}`]: "   " }), perguntas)).toEqual({
      ok: true,
      itens: [{ pergunta_id: NOTA, valor_nota: 7 }],
    });
  });
  it("obrigatória faltando", () => {
    expect(lerResposta(form({}), perguntas)).toEqual({
      ok: false,
      erros: { [NOTA]: "Responda esta pergunta." },
    });
  });
  it("valores inválidos", () => {
    const r = lerResposta(
      form({ [`nota:${NOTA}`]: "11", [`texto:${TEXTO}`]: "x".repeat(1001), [`funcionario:${QUEM}`]: "ana" }),
      perguntas,
    );
    expect(r).toEqual({
      ok: false,
      erros: {
        [NOTA]: "Escolha uma nota de 1 a 10.",
        [TEXTO]: "Escreva no máximo 1000 caracteres.",
        [QUEM]: "Escolha quem te atendeu.",
      },
    });
    expect(lerResposta(form({ [`nota:${NOTA}`]: "7.5" }), perguntas).ok).toBe(false);
  });
  it("nada respondido numa pesquisa sem obrigatórias", () => {
    expect(lerResposta(form({}), perguntas.slice(1))).toEqual({
      ok: false,
      erros: { geral: "Responda pelo menos uma pergunta." },
    });
  });
});
```

`src/lib/respostas/mensagens.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mensagemErroResposta } from "./mensagens";

describe("mensagemErroResposta", () => {
  it("traduz os códigos da função registrar_resposta", () => {
    expect(mensagemErroResposta("SF101")).toBe("Essa pesquisa não está recebendo respostas agora.");
    expect(mensagemErroResposta("SF102")).toBe("Alguma resposta veio com problema. Recarregue a página e tente de novo.");
    expect(mensagemErroResposta("SF103")).toBe("Alguma resposta veio com problema. Recarregue a página e tente de novo.");
    expect(mensagemErroResposta("SF104")).toBe("Responda as perguntas obrigatórias.");
    expect(mensagemErroResposta("SF105")).toBe("Responda pelo menos uma pergunta.");
  });
  it("genérica nos outros casos", () => {
    expect(mensagemErroResposta()).toBe("Não deu para enviar agora. Tente de novo em instantes.");
    expect(mensagemErroResposta("XX000")).toBe("Não deu para enviar agora. Tente de novo em instantes.");
  });
});
```

Atualizar testes existentes:
- `src/lib/pesquisas/sugeridas.test.ts`: o terceiro item esperado passa a ser `{ texto: "Onde podemos melhorar?", tipo: "texto", obrigatoria: false }`.
- `src/lib/pesquisas/esquemas.test.ts`: novo caso
```ts
  it("traduz pesquisa com respostas (23503)", () => {
    expect(mensagemErroPesquisa("23503")).toBe("Essa pesquisa já tem respostas. Pause em vez de excluir.");
  });
```
- `src/lib/funcionarios/esquemas.test.ts`: novo caso
```ts
  it("traduz funcionário com avaliações (23503)", () => {
    expect(mensagemErroFuncionario("23503")).toBe(
      "Essa pessoa já tem avaliações. Desative em vez de excluir: o histórico continua guardado.",
    );
  });
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL (módulos novos não existem; textos antigos).

- [ ] **Step 3: Implementar**

`src/lib/pesquisas/slug.ts`:
```ts
import { z } from "zod";

// Final do link público: /p/<slug>
export const esquemaSlug = z
  .string("Escreva o final do link.")
  .trim()
  .toLowerCase()
  .min(3, "Use pelo menos 3 caracteres.")
  .max(60, "Use no máximo 60 caracteres.")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use só letras sem acento, números e hífen (ex.: bebelu-centro).");

// "Pão de Açúcar & Cia." → "pao-de-acucar-cia"
export function gerarSlug(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira os acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  if (base.length >= 3) return base;
  return base ? `pesquisa-${base}` : "pesquisa";
}

// Se "bebelu" já existir, tenta "bebelu-2", "bebelu-3"…
export function candidatosDeSlug(base: string, quantidade = 20): string[] {
  return Array.from({ length: quantidade }, (_, i) => (i === 0 ? base : `${base}-${i + 1}`));
}
```

`src/lib/respostas/carimbo.ts`:
```ts
import { createHmac, timingSafeEqual } from "node:crypto";

// Proteção contra robôs: a página entrega a hora em que abriu, assinada pelo servidor.
// Ninguém consegue inventar um carimbo sem o segredo (CARIMBO_SEGREDO).
export const TEMPO_MINIMO_MS = 3_000;
export const VALIDADE_MS = 2 * 60 * 60 * 1000;

export type ResultadoCarimbo = "ok" | "invalido" | "rapido" | "expirado";

function assinar(ms: string, segredo: string) {
  return createHmac("sha256", segredo).update(ms).digest("base64url");
}

export function criarCarimbo(agoraMs: number, segredo: string): string {
  const ms = String(agoraMs);
  return `${ms}.${assinar(ms, segredo)}`;
}

export function verificarCarimbo(carimbo: string, agoraMs: number, segredo: string): ResultadoCarimbo {
  const partes = carimbo.split(".");
  const [ms, assinatura] = partes;
  if (partes.length !== 2 || !/^\d+$/.test(ms) || !assinatura) return "invalido";

  // Comparação em tempo constante: não dá pista de "quanto acertou"
  const esperada = Buffer.from(assinar(ms, segredo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return "invalido";

  const decorrido = agoraMs - Number(ms);
  if (decorrido < TEMPO_MINIMO_MS) return "rapido";
  if (decorrido > VALIDADE_MS) return "expirado";
  return "ok";
}
```

`src/lib/respostas/formulario.ts`:
```ts
import { z } from "zod";
import type { TipoPergunta } from "@/lib/pesquisas/esquemas";

export type PerguntaPublica = { id: string; texto: string; tipo: TipoPergunta; obrigatoria: boolean };
export type ItemResposta = {
  pergunta_id: string;
  valor_nota?: number;
  valor_texto?: string;
  funcionario_id?: string;
};
export type LeituraResposta =
  | { ok: true; itens: ItemResposta[] }
  | { ok: false; erros: Record<string, string> };

export const LIMITE_TEXTO_RESPOSTA = 1000;

const nota = z.coerce.number().int().min(1).max(10);
const id = z.uuid();

function campo(formData: FormData, nome: string) {
  const valor = formData.get(nome);
  return typeof valor === "string" ? valor.trim() : "";
}

// Lê o formulário da página pública. Os nomes dos campos são "<tipo>:<id da pergunta>".
// As perguntas vêm do servidor (nunca do navegador), então só lemos o que existe.
export function lerResposta(formData: FormData, perguntas: PerguntaPublica[]): LeituraResposta {
  const itens: ItemResposta[] = [];
  const erros: Record<string, string> = {};

  for (const p of perguntas) {
    const valor = campo(formData, `${p.tipo}:${p.id}`);
    if (!valor) {
      if (p.obrigatoria) erros[p.id] = "Responda esta pergunta.";
      continue;
    }
    if (p.tipo === "nota") {
      const r = nota.safeParse(valor);
      if (r.success) itens.push({ pergunta_id: p.id, valor_nota: r.data });
      else erros[p.id] = "Escolha uma nota de 1 a 10.";
    } else if (p.tipo === "texto") {
      if (valor.length <= LIMITE_TEXTO_RESPOSTA) itens.push({ pergunta_id: p.id, valor_texto: valor });
      else erros[p.id] = `Escreva no máximo ${LIMITE_TEXTO_RESPOSTA} caracteres.`;
    } else {
      const r = id.safeParse(valor);
      if (r.success) itens.push({ pergunta_id: p.id, funcionario_id: r.data });
      else erros[p.id] = "Escolha quem te atendeu.";
    }
  }

  if (Object.keys(erros).length > 0) return { ok: false, erros };
  if (itens.length === 0) return { ok: false, erros: { geral: "Responda pelo menos uma pergunta." } };
  return { ok: true, itens };
}
```
> `z.coerce.number().int()` recusa `"7.5"` (não inteiro) e `"11"` (max). Se o zod 4 do projeto aceitar `" "`… não chega aqui: vazio é tratado antes.

`src/lib/respostas/mensagens.ts`:
```ts
const PROBLEMA = "Alguma resposta veio com problema. Recarregue a página e tente de novo.";

// Códigos próprios da função registrar_resposta (migração da Etapa 5A)
const MENSAGENS: Record<string, string> = {
  SF101: "Essa pesquisa não está recebendo respostas agora.",
  SF102: PROBLEMA,
  SF103: PROBLEMA,
  SF104: "Responda as perguntas obrigatórias.",
  SF105: "Responda pelo menos uma pergunta.",
};

export function mensagemErroResposta(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || "Não deu para enviar agora. Tente de novo em instantes.";
}
```

Modificar:
- `src/lib/pesquisas/sugeridas.ts`: o texto da pergunta de texto vira `"Onde podemos melhorar?"`.
- `src/lib/pesquisas/esquemas.ts`, em `MENSAGENS`: `"23503": "Essa pesquisa já tem respostas. Pause em vez de excluir.",` (comentário: chave estrangeira `restrict` de respostas).
- `src/lib/funcionarios/esquemas.ts`, em `MENSAGENS`: `"23503": "Essa pessoa já tem avaliações. Desative em vez de excluir: o histórico continua guardado.",`.

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.
- [ ] **Step 5: lint, build, commit** — `feat: slug, carimbo de tempo e leitura das respostas`

---

### Task 2: Banco — slug, respostas, funções públicas e prova de segurança

**Files:**
- Create: `supabase/tests/rls_respostas.sql`, `supabase/migrations/20261007000000_respostas.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerar)

**Interfaces:**
- Produces: coluna `pesquisas.slug` (única, com default aleatório `pesquisa-xxxxxxxx`); tabelas `respostas`, `respostas_itens`; `pesquisa_publica(p_slug text) returns jsonb`; `registrar_resposta(p_pesquisa_id uuid, p_itens jsonb) returns uuid`; erros `SF101`–`SF105`.

- [ ] **Step 1: Teste de segurança primeiro**

`supabase/tests/rls_respostas.sql`:
```sql
-- Prova de segurança da Etapa 5A (slug, respostas e funções públicas). Desfaz tudo (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resp-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resp-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Dados de A e B, criados como administrador
do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000a3');
  eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b3');
  pa uuid; pp uuid; pb uuid;
begin
  insert into public.funcionarios (empresa_id, nome) values (ea, 'Ana');
  insert into public.funcionarios (empresa_id, nome, ativo) values (ea, 'Zé', false);
  insert into public.funcionarios (empresa_id, nome) values (eb, 'Bia');

  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Mesa', 'teste-a-mesa') returning id into pa;
  insert into public.pesquisas (empresa_id, titulo, slug, ativa) values (ea, 'Pausada', 'teste-a-pausada', false) returning id into pp;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'Pesquisa B', 'teste-b') returning id into pb;

  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values
    (pa, 'Nota?', 'nota', 1, true),
    (pa, 'Melhorar?', 'texto', 2, false),
    (pa, 'Quem?', 'funcionario', 3, true),
    (pa, 'Antiga', 'texto', 4, false),
    (pp, 'Nota P?', 'nota', 1, true),
    (pb, 'Nota B?', 'nota', 1, true);
  update public.perguntas set arquivada = true where texto = 'Antiga';

  perform set_config('app.pa', pa::text, true);
  perform set_config('app.pp', pp::text, true);
  perform set_config('app.pb', pb::text, true);
  perform set_config('app.nota', (select id::text from public.perguntas where texto = 'Nota?'), true);
  perform set_config('app.texto', (select id::text from public.perguntas where texto = 'Melhorar?'), true);
  perform set_config('app.quem', (select id::text from public.perguntas where texto = 'Quem?'), true);
  perform set_config('app.antiga', (select id::text from public.perguntas where texto = 'Antiga'), true);
  perform set_config('app.nota_b', (select id::text from public.perguntas where texto = 'Nota B?'), true);
  perform set_config('app.ana', (select id::text from public.funcionarios where nome = 'Ana'), true);
  perform set_config('app.ze', (select id::text from public.funcionarios where nome = 'Zé'), true);
  perform set_config('app.bia', (select id::text from public.funcionarios where nome = 'Bia'), true);
end $$;

-- Slug: único, formato e default
do $$
begin
  begin
    insert into public.pesquisas (empresa_id, titulo, slug)
    values ((select empresa_id from public.pesquisas where slug = 'teste-b'), 'Dup', 'teste-a-mesa');
    raise exception 'FALHOU: aceitou slug repetido';
  exception when unique_violation then null;
  end;
  begin
    update public.pesquisas set slug = 'Slug Ruim' where slug = 'teste-b';
    raise exception 'FALHOU: aceitou slug fora do formato';
  exception when check_violation then null;
  end;
  insert into public.pesquisas (empresa_id, titulo)
  values ((select empresa_id from public.pesquisas where slug = 'teste-b'), 'Sem slug');
  if (select slug from public.pesquisas where titulo = 'Sem slug') !~ '^pesquisa-[a-z0-9]{8}$' then
    raise exception 'FALHOU: default do slug';
  end if;
  delete from public.pesquisas where titulo = 'Sem slug';
end $$;

-- Visitante sem login
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare
  r jsonb;
begin
  begin
    perform count(*) from public.respostas;
    raise exception 'FALHOU: visitante lê respostas';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.respostas_itens;
    raise exception 'FALHOU: visitante lê itens';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.registrar_resposta(current_setting('app.pa')::uuid, '[]'::jsonb);
    raise exception 'FALHOU: visitante chamou registrar_resposta';
  exception when insufficient_privilege then null;
  end;

  r := public.pesquisa_publica('teste-a-mesa');
  if (r->>'ativa')::boolean is not true or r->>'empresa' <> 'Empresa A'
     or jsonb_array_length(r->'perguntas') <> 3 then
    raise exception 'FALHOU: pesquisa_publica ativa (%)', r;
  end if;
  if jsonb_array_length(r->'funcionarios') <> 1 or r->'funcionarios'->0->>'nome' <> 'Ana' then
    raise exception 'FALHOU: só funcionários ativos devem aparecer';
  end if;
  if r::text like '%Antiga%' or r::text like '%owner%' then
    raise exception 'FALHOU: vazou pergunta arquivada ou dado do dono';
  end if;

  r := public.pesquisa_publica('TESTE-A-PAUSADA');
  if (r->>'ativa')::boolean is not false or r ? 'perguntas' or r ? 'id' then
    raise exception 'FALHOU: pausada deveria vir sem perguntas e sem id';
  end if;
  if public.pesquisa_publica('nao-existe') is not null then
    raise exception 'FALHOU: slug inexistente deveria dar null';
  end if;
end $$;

-- Sem equipe ativa, a pergunta "Quem?" some da página pública
reset role;
update public.funcionarios set ativo = false where nome = 'Ana';
set local role anon;
do $$
begin
  if jsonb_array_length(public.pesquisa_publica('teste-a-mesa')->'perguntas') <> 2 then
    raise exception 'FALHOU: pergunta de funcionário deveria sumir sem equipe';
  end if;
end $$;
reset role;
update public.funcionarios set ativo = true where nome = 'Ana';

-- Usuário logado também não chama registrar_resposta
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.registrar_resposta(current_setting('app.pa')::uuid, '[]'::jsonb);
    raise exception 'FALHOU: usuário logado chamou registrar_resposta';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Servidor (service_role): cada recusa e o caso válido
reset role;
set local role service_role;
do $$
declare
  pa uuid := current_setting('app.pa')::uuid;
  nota text := current_setting('app.nota');
  texto text := current_setting('app.texto');
  quem text := current_setting('app.quem');
  ana text := current_setting('app.ana');
  ok_itens jsonb;
  r uuid;

begin
  ok_itens := jsonb_build_array(
    jsonb_build_object('pergunta_id', nota, 'valor_nota', 9),
    jsonb_build_object('pergunta_id', texto, 'valor_texto', 'Mais sal'),
    jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana));

  -- SF101: pausada ou inexistente
  begin perform public.registrar_resposta(current_setting('app.pp')::uuid, ok_itens);
    raise exception 'FALHOU: aceitou pesquisa pausada';
  exception when sqlstate 'SF101' then null; end;
  begin perform public.registrar_resposta(gen_random_uuid(), ok_itens);
    raise exception 'FALHOU: aceitou pesquisa inexistente';
  exception when sqlstate 'SF101' then null; end;

  -- SF105: nada
  begin perform public.registrar_resposta(pa, '[]'::jsonb);
    raise exception 'FALHOU: aceitou resposta vazia';
  exception when sqlstate 'SF105' then null; end;

  -- SF102: pergunta de outra pesquisa, arquivada ou repetida
  begin perform public.registrar_resposta(pa, ok_itens || jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('app.nota_b'), 'valor_nota', 5)));
    raise exception 'FALHOU: aceitou pergunta de outra pesquisa';
  exception when sqlstate 'SF102' then null; end;
  begin perform public.registrar_resposta(pa, ok_itens || jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('app.antiga'), 'valor_texto', 'oi')));
    raise exception 'FALHOU: aceitou pergunta arquivada';
  exception when sqlstate 'SF102' then null; end;
  begin perform public.registrar_resposta(pa, ok_itens || jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 3)));
    raise exception 'FALHOU: aceitou pergunta repetida';
  exception when sqlstate 'SF102' then null; end;

  -- SF103: valores que não combinam
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 11),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou nota 11';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7.5),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou nota 7.5';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', '7'),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou nota como texto';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7, 'valor_texto', 'extra'),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou campo extra';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, ok_itens - 1 || jsonb_build_array(
      jsonb_build_object('pergunta_id', texto, 'valor_texto', '  ')));
    raise exception 'FALHOU: aceitou texto vazio';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', current_setting('app.ze'))));
    raise exception 'FALHOU: aceitou funcionário inativo';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', current_setting('app.bia'))));
    raise exception 'FALHOU: aceitou funcionário de outra empresa';
  exception when sqlstate 'SF103' then null; end;

  -- SF104: obrigatória faltando
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', texto, 'valor_texto', 'Só texto')));
    raise exception 'FALHOU: aceitou sem as obrigatórias';
  exception when sqlstate 'SF104' then null; end;

  -- Válido
  r := public.registrar_resposta(pa, ok_itens);
  if (select count(*) from public.respostas_itens where resposta_id = r) <> 3 then
    raise exception 'FALHOU: itens não gravados';
  end if;
end $$;

-- Sem equipe ativa, "Quem?" deixa de ser obrigatória
reset role;
update public.funcionarios set ativo = false where nome = 'Ana';
set local role service_role;
do $$
begin
  perform public.registrar_resposta(current_setting('app.pa')::uuid, jsonb_build_array(
    jsonb_build_object('pergunta_id', current_setting('app.nota'), 'valor_nota', 4)));
  -- resposta para a empresa B, para conferir o isolamento abaixo
  perform public.registrar_resposta(current_setting('app.pb')::uuid, jsonb_build_array(
    jsonb_build_object('pergunta_id', current_setting('app.nota_b'), 'valor_nota', 10)));
end $$;
reset role;
update public.funcionarios set ativo = true where nome = 'Ana';

-- Dono A: lê só as próprias respostas; não altera; restrict impede excluir
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.respostas) <> 2 then
    raise exception 'FALHOU: A deveria ver exatamente as 2 respostas dele';
  end if;
  if (select count(*) from public.respostas_itens) <> 4 then
    raise exception 'FALHOU: A deveria ver os 4 itens dele';
  end if;
  begin
    update public.respostas set created_at = now();
    raise exception 'FALHOU: dono alterou resposta';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.pesquisas where id = current_setting('app.pa')::uuid;
    raise exception 'FALHOU: excluiu pesquisa com respostas';
  exception when foreign_key_violation then null;
  end;
  begin
    delete from public.funcionarios where id = current_setting('app.ana')::uuid;
    raise exception 'FALHOU: excluiu funcionário com avaliações';
  exception when foreign_key_violation then null;
  end;
  -- Dono pode mudar o slug da própria pesquisa
  update public.pesquisas set slug = 'teste-a-salao' where id = current_setting('app.pa')::uuid;
  if not exists (select 1 from public.pesquisas where slug = 'teste-a-salao') then
    raise exception 'FALHOU: dono não conseguiu mudar o slug';
  end if;
end $$;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;
```

- [ ] **Step 2: Rodar e ver falhar** — `execute_sql` com o arquivo → erro `column "slug" of relation "pesquisas" does not exist`.

- [ ] **Step 3: Migração**

`supabase/migrations/20261007000000_respostas.sql`:
```sql
-- Etapa 5A: link público (slug), respostas e funções públicas

-- Slug: final do link /p/<slug>. O app gera do nome da empresa; o default só cobre
-- pesquisas antigas e inserções sem slug.
alter table public.pesquisas
  add column slug text not null
    default ('pesquisa-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

alter table public.pesquisas
  add constraint pesquisas_slug_formato
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  add constraint pesquisas_slug_unico unique (slug);

grant insert (slug) on public.pesquisas to authenticated;
grant update (slug) on public.pesquisas to authenticated;

-- Cada envio de um cliente
create table public.respostas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas (id) on delete restrict,
  created_at timestamptz not null default now()
);
comment on table public.respostas is 'Cada envio de um cliente. Gravado só por registrar_resposta.';
create index respostas_pesquisa_data_idx on public.respostas (pesquisa_id, created_at);

-- Cada resposta dada dentro de um envio
create table public.respostas_itens (
  id uuid primary key default gen_random_uuid(),
  resposta_id uuid not null references public.respostas (id) on delete cascade,
  pergunta_id uuid not null references public.perguntas (id) on delete restrict,
  valor_nota smallint check (valor_nota between 1 and 10),
  valor_texto text check (valor_texto = btrim(valor_texto) and char_length(valor_texto) between 1 and 1000),
  funcionario_id uuid references public.funcionarios (id) on delete restrict,
  unique (resposta_id, pergunta_id)
);
create index respostas_itens_pergunta_idx on public.respostas_itens (pergunta_id);
create index respostas_itens_funcionario_idx on public.respostas_itens (funcionario_id);

alter table public.respostas enable row level security;
alter table public.respostas_itens enable row level security;

-- O dono lê as respostas das próprias pesquisas (painel da Etapa 6)
create policy "dono lê as próprias respostas"
  on public.respostas for select to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

create policy "dono lê os próprios itens"
  on public.respostas_itens for select to authenticated
  using (exists (select 1 from public.respostas r
                 join public.pesquisas q on q.id = r.pesquisa_id
                 join public.empresas e on e.id = q.empresa_id
                 where r.id = resposta_id and e.owner_id = (select auth.uid())));

-- Ninguém grava pela API: só a função registrar_resposta (chamada pelo servidor)
revoke all on public.respostas from anon, authenticated;
revoke all on public.respostas_itens from anon, authenticated;
grant select on public.respostas to authenticated;
grant select on public.respostas_itens to authenticated;

-- Leitura pública: só o necessário para montar a página do cliente.
-- security definer: roda como dono da função (o visitante não tem acesso às tabelas).
create function public.pesquisa_publica(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v record;
  v_tem_equipe boolean;
begin
  select q.id, q.titulo, q.ativa, q.empresa_id, e.nome as empresa
    into v
    from public.pesquisas q
    join public.empresas e on e.id = q.empresa_id
   where q.slug = lower(p_slug);
  if not found then
    return null;
  end if;

  if not v.ativa then
    return jsonb_build_object('ativa', false, 'titulo', v.titulo, 'empresa', v.empresa);
  end if;

  v_tem_equipe := exists (select 1 from public.funcionarios f where f.empresa_id = v.empresa_id and f.ativo);

  return jsonb_build_object(
    'ativa', true,
    'id', v.id,
    'titulo', v.titulo,
    'empresa', v.empresa,
    'perguntas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'texto', p.texto, 'tipo', p.tipo,
                                          'obrigatoria', p.obrigatoria) order by p.ordem)
        from public.perguntas p
       where p.pesquisa_id = v.id and not p.arquivada
         and (p.tipo <> 'funcionario' or v_tem_equipe)), '[]'::jsonb),
    'funcionarios', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'nome', f.nome) order by f.nome)
        from public.funcionarios f
       where f.empresa_id = v.empresa_id and f.ativo), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.pesquisa_publica(text) from public;
grant execute on function public.pesquisa_publica(text) to anon, authenticated;

-- Gravação: confere tudo e grava. Só o servidor (service_role) chama,
-- depois de aplicar as proteções (carimbo de tempo).
create function public.registrar_resposta(p_pesquisa_id uuid, p_itens jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_ativa boolean;
  v_tem_equipe boolean;
  v_item jsonb;
  v_pergunta record;
  v_vistas uuid[] := '{}';
  v_nota numeric;
  v_texto text;
  v_resposta uuid;
begin
  select empresa_id, ativa into v_empresa, v_ativa from public.pesquisas where id = p_pesquisa_id;
  if v_empresa is null or not v_ativa then
    raise exception 'Pesquisa indisponível' using errcode = 'SF101';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhuma resposta' using errcode = 'SF105';
  end if;

  v_tem_equipe := exists (select 1 from public.funcionarios f where f.empresa_id = v_empresa and f.ativo);

  -- Confere cada item antes de gravar qualquer coisa
  for v_item in select value from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Item inválido' using errcode = 'SF102';
    end if;

    select p.id, p.tipo into v_pergunta
      from public.perguntas p
     where p.id::text = v_item->>'pergunta_id' and p.pesquisa_id = p_pesquisa_id and not p.arquivada;
    if not found or v_pergunta.id = any(v_vistas) then
      raise exception 'Pergunta inválida' using errcode = 'SF102';
    end if;
    v_vistas := v_vistas || v_pergunta.id;

    if v_pergunta.tipo = 'nota' then
      if (v_item - 'pergunta_id' - 'valor_nota') <> '{}'::jsonb
         or coalesce(jsonb_typeof(v_item->'valor_nota'), '') <> 'number' then
        raise exception 'Nota inválida' using errcode = 'SF103';
      end if;
      v_nota := (v_item->>'valor_nota')::numeric;
      if v_nota <> trunc(v_nota) or v_nota < 1 or v_nota > 10 then
        raise exception 'Nota inválida' using errcode = 'SF103';
      end if;
    elsif v_pergunta.tipo = 'texto' then
      if (v_item - 'pergunta_id' - 'valor_texto') <> '{}'::jsonb
         or coalesce(jsonb_typeof(v_item->'valor_texto'), '') <> 'string' then
        raise exception 'Texto inválido' using errcode = 'SF103';
      end if;
      v_texto := v_item->>'valor_texto';
      if v_texto <> btrim(v_texto) or char_length(v_texto) not between 1 and 1000 then
        raise exception 'Texto inválido' using errcode = 'SF103';
      end if;
    else
      if (v_item - 'pergunta_id' - 'funcionario_id') <> '{}'::jsonb
         or coalesce(jsonb_typeof(v_item->'funcionario_id'), '') <> 'string'
         or not exists (select 1 from public.funcionarios f
                         where f.id::text = v_item->>'funcionario_id'
                           and f.empresa_id = v_empresa and f.ativo) then
        raise exception 'Funcionário inválido' using errcode = 'SF103';
      end if;
    end if;
  end loop;

  -- Obrigatórias: a de funcionário só conta se houver equipe ativa
  if exists (select 1 from public.perguntas p
              where p.pesquisa_id = p_pesquisa_id and not p.arquivada and p.obrigatoria
                and (p.tipo <> 'funcionario' or v_tem_equipe)
                and not (p.id = any(v_vistas))) then
    raise exception 'Falta obrigatória' using errcode = 'SF104';
  end if;

  insert into public.respostas (pesquisa_id) values (p_pesquisa_id) returning id into v_resposta;

  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota, valor_texto, funcionario_id)
  select v_resposta,
         (i->>'pergunta_id')::uuid,
         (i->>'valor_nota')::smallint,
         i->>'valor_texto',
         (i->>'funcionario_id')::uuid
    from jsonb_array_elements(p_itens) i;

  return v_resposta;
end;
$$;

-- O Supabase dá execute em funções novas para anon/authenticated por padrão: tiramos.
revoke execute on function public.registrar_resposta(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_resposta(uuid, jsonb) to service_role;
```

- [ ] **Step 4: Aplicar** — `apply_migration` (`name: "respostas"`).
- [ ] **Step 5: Teste passa** — `rls_respostas.sql` → `TODOS OS TESTES DE SEGURANÇA PASSARAM`. Rodar também `rls_empresas.sql`, `rls_funcionarios.sql`, `rls_pesquisas.sql`. Conferir sobras: `select count(*) from auth.users where email like 'resp-%@exemplo.com'` → 0. Se um teste antigo quebrar por causa do slug (ex.: inserção sem slug), o default deve cobrir; investigar antes de mudar o teste.
- [ ] **Step 6: Advisors** — security e performance: nada novo além dos avisos conhecidos. Atenção ao aviso de "function search_path mutable" (não deve aparecer) e a "security definer" exposta (esperado só para `pesquisa_publica`, que é intencional; registrar no relatório).
- [ ] **Step 7: Tipos** — `generate_typescript_types` → `src/lib/supabase/database.types.ts`; conferir `respostas`, `respostas_itens`, `slug`, `pesquisa_publica`, `registrar_resposta`.
- [ ] **Step 8: lint, build, test, commit** — `feat: respostas, slug e funções públicas com teste de segurança`

---

### Task 3: Link, QR code e cartaz no painel

**Files:**
- Create: `src/lib/qr.ts`, `src/app/painel/pesquisas/[id]/cartao-link-qr.tsx`, `src/app/painel/pesquisas/[id]/botao-copiar-link.tsx`, `src/app/painel/pesquisas/[id]/formulario-slug.tsx`, `src/app/painel/pesquisas/[id]/cartaz/page.tsx`, `src/app/painel/pesquisas/[id]/cartaz/botao-imprimir.tsx`
- Modify: `package.json` (`qrcode`, `@types/qrcode`), `src/app/painel/pesquisas/actions.ts`, `src/app/painel/pesquisas/[id]/page.tsx`

**Interfaces:**
- Consumes: `gerarSlug`, `candidatosDeSlug`, `esquemaSlug` (Task 1); coluna `slug` (Task 2); `urlDoSite(caminho)` de `src/lib/site-url.ts`; `EstadoAcao` e helpers de `actions.ts`.
- Produces: `gerarQrSvg(texto: string): Promise<string>`; action `alterarSlug(estado: EstadoAcao, formData{id, slug}): Promise<EstadoAcao>`; `<CartaoLinkQr pesquisaId slug />`.

- [ ] **Step 1: Instalar** — `npm install qrcode` e `npm install -D @types/qrcode`; conferir `git diff package.json` (só esses dois).

- [ ] **Step 2: QR**

`src/lib/qr.ts`:
```ts
import "server-only";
import QRCode from "qrcode";

// QR code em SVG (fica nítido em qualquer tamanho de impressão), ameixa sobre branco
export function gerarQrSvg(texto: string): Promise<string> {
  return QRCode.toString(texto, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#2a1f2dff", light: "#ffffffff" },
  });
}
```

- [ ] **Step 3: Actions**

Em `src/app/painel/pesquisas/actions.ts`:
- importar `candidatosDeSlug, esquemaSlug, gerarSlug` de `@/lib/pesquisas/slug`;
- em `criarPesquisa`, trocar o insert da pesquisa por tentativa de slugs:
```ts
  // Link público a partir do nome da empresa: bebelu, bebelu-2, bebelu-3…
  let pesquisa: { id: string } | null = null;
  for (const slug of candidatosDeSlug(gerarSlug(atual.nome))) {
    const { data, error } = await supabase
      .from("pesquisas")
      .insert({ empresa_id: atual.id, titulo: TITULO_SUGERIDO, slug })
      .select("id")
      .single();
    if (!error) {
      pesquisa = data;
      break;
    }
    if (error.code !== "23505") return { erro: mensagemErroPesquisa(error.code) }; // 23505 = slug em uso
  }
  if (!pesquisa) return ERRO;
```
(manter o resto da função: perguntas sugeridas, rollback, redirect);
- nova action:
```ts
export async function alterarSlug(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "slug");
  const id = esquemaIdPesquisa.safeParse(texto(formData, "id"));
  const slug = esquemaSlug.safeParse(digitado);
  if (!id.success) return { ...ERRO, valor: digitado };
  if (!slug.success) return { erro: slug.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pesquisas")
    .update({ slug: slug.data })
    .eq("id", id.data)
    .select("id");
  if (error?.code === "23505") {
    return { erro: "Esse link já está em uso. Tente outro, por exemplo: bebelu-centro.", valor: digitado };
  }
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };
  if (!data?.length) return { ...ERRO, valor: digitado }; // o RLS esconde outras empresas: nada mudou

  atualizarTelas();
  return { ok: Date.now(), anuncio: "Link atualizado." };
}
```
(adaptar nomes de helpers ao que existe no arquivo: `texto`, `ERRO`, `atualizarTelas`.)

- [ ] **Step 4: Componentes do cartão**

`src/app/painel/pesquisas/[id]/botao-copiar-link.tsx`:
```tsx
"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function BotaoCopiarLink({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o link continua visível para copiar à mão
    }
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={copiar} className="min-h-11">
        {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copiado ? "Copiado" : "Copiar link"}
      </Button>
      <p role="status" className="sr-only">{copiado ? "Link copiado." : ""}</p>
    </>
  );
}
```

`src/app/painel/pesquisas/[id]/formulario-slug.tsx`:
```tsx
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { alterarSlug, type EstadoAcao } from "../actions";

export function FormularioSlug({ id, slug, base }: { id: string; slug: string; base: string }) {
  const [editando, setEditando] = useState(false);
  const [estado, acao, pendente] = useActionState(alterarSlug, {} as EstadoAcao);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (estado.ok) {
      setEditando(false);
      botao.current?.focus();
    }
  }, [estado.ok]);

  if (!editando) {
    return (
      <>
        <Button ref={botao} type="button" variant="ghost" className="min-h-11" onClick={() => setEditando(true)}>
          Mudar o final do link
        </Button>
        <p role="status" className="sr-only">{estado.anuncio}</p>
      </>
    );
  }

  return (
    <form action={acao} className="space-y-2" noValidate onKeyDown={(e) => e.key === "Escape" && setEditando(false)}>
      <input type="hidden" name="id" value={id} />
      <Label htmlFor="slug">Final do link</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-sm text-muted-foreground">{base}</span>
        <Input
          id="slug"
          name="slug"
          defaultValue={estado.valor ?? slug}
          maxLength={60}
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={Boolean(estado.erro)}
          aria-describedby="slug-ajuda"
        />
      </div>
      <p id="slug-ajuda" className="text-sm text-manga-texto">
        Se você já imprimiu o QR code, ele para de funcionar.
      </p>
      <div role="alert">{estado.erro && <p className="text-sm font-medium text-destructive">{estado.erro}</p>}</div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pendente} className="min-h-11">
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```
> Após "Cancelar"/Esc o foco deve voltar ao botão "Mudar o final do link" (mesmo padrão de ref de callback usado em `cabecalho-pesquisa.tsx`); ajustar ao implementar.

`src/app/painel/pesquisas/[id]/cartao-link-qr.tsx`:
```tsx
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { gerarQrSvg } from "@/lib/qr";
import { urlDoSite } from "@/lib/site-url";
import { BotaoCopiarLink } from "./botao-copiar-link";
import { FormularioSlug } from "./formulario-slug";

// Cartão do editor: link público, QR code para baixar e atalho para o cartaz
export async function CartaoLinkQr({ pesquisaId, slug }: { pesquisaId: string; slug: string }) {
  const link = urlDoSite(`/p/${slug}`);
  const svg = await gerarQrSvg(link);
  const download = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <section className="rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
      <h2 className="text-xl font-bold">Link e QR code</h2>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row">
        {/* SVG gerado no servidor a partir do nosso próprio link: seguro para inserir */}
        <div
          className="size-40 shrink-0 self-center rounded-2xl border border-border p-2 sm:self-start [&>svg]:size-full"
          role="img"
          aria-label={`QR code que abre ${link}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="font-mono text-sm break-all">{link}</p>
          <div className="flex flex-wrap gap-2">
            <BotaoCopiarLink link={link} />
            <a
              href={download}
              download={`qr-${slug}.svg`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ameixa/25 px-4 text-sm font-semibold hover:bg-muted"
            >
              <Download className="size-4" aria-hidden="true" />
              Baixar QR code
            </a>
            <Link
              href={`/painel/pesquisas/${pesquisaId}/cartaz`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ameixa/25 px-4 text-sm font-semibold hover:bg-muted"
            >
              <Printer className="size-4" aria-hidden="true" />
              Imprimir cartaz
            </Link>
          </div>
          <FormularioSlug id={pesquisaId} slug={slug} base={urlDoSite("/p/")} />
        </div>
      </div>
    </section>
  );
}
```

Em `src/app/painel/pesquisas/[id]/page.tsx`: buscar `slug` no select da pesquisa e renderizar `<CartaoLinkQr pesquisaId={pesquisa.id} slug={pesquisa.slug} />` entre o cabeçalho e o cartão de perguntas.

- [ ] **Step 5: Cartaz**

`src/app/painel/pesquisas/[id]/cartaz/botao-imprimir.tsx`:
```tsx
"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BotaoImprimir() {
  return (
    <Button type="button" className="min-h-11 print:hidden" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      Imprimir
    </Button>
  );
}
```

`src/app/painel/pesquisas/[id]/cartaz/page.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/marca/logo";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { esquemaIdPesquisa } from "@/lib/pesquisas/esquemas";
import { gerarQrSvg } from "@/lib/qr";
import { urlDoSite } from "@/lib/site-url";
import { BotaoImprimir } from "./botao-imprimir";

export const metadata: Metadata = { title: "Cartaz da pesquisa" };

export default async function PaginaCartaz(props: PageProps<"/painel/pesquisas/[id]/cartaz">) {
  const { id: idRecebido } = await props.params;
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || !atual) notFound();
  const { data: pesquisa } = await supabase
    .from("pesquisas")
    .select("id, slug")
    .eq("id", id.data)
    .eq("empresa_id", atual.id)
    .maybeSingle();
  if (!pesquisa) notFound();

  const link = urlDoSite(`/p/${pesquisa.slug}`);
  const svg = await gerarQrSvg(link);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/painel/pesquisas/${pesquisa.id}`} className="font-semibold text-ameixa underline-offset-4 hover:underline">
          Voltar para a pesquisa
        </Link>
        <BotaoImprimir />
      </div>
      {/* Folha do cartaz: na impressão, só ela aparece */}
      <article className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl bg-card p-10 text-center shadow-[0_8px_24px_rgba(42,31,45,0.08)] print:max-w-none print:shadow-none">
        <p className="text-2xl font-bold">{atual.nome}</p>
        <h1 className="text-4xl font-bold tracking-tight">Conta pra gente como foi!</h1>
        <div className="size-64 [&>svg]:size-full" role="img" aria-label={`QR code que abre ${link}`} dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="text-lg font-medium">Aponte a câmera do celular. Leva menos de 30 segundos.</p>
        <p className="font-mono text-sm break-all text-muted-foreground">{link}</p>
        <Logo className="text-xl" />
      </article>
    </div>
  );
}
```
Impressão: em `src/app/globals.css`, acrescentar no fim:
```css
/* Cartaz: na impressão some o topo do painel e o fundo menta */
@media print {
  header { display: none !important; }
  body { background: #fff !important; }
}
```
(conferir se o topo do painel é o `<header>` de `src/app/painel/layout.tsx` e se `Logo` existe em `src/components/marca/logo`; ajustar se diferente.)

- [ ] **Step 6: lint, test, build; Chrome** — editor mostra o cartão; Copiar (status "Link copiado"); mudar slug (válido; inválido "a b"; em uso → mensagem; Esc cancela e devolve o foco); Baixar QR baixa `qr-<slug>.svg`; Imprimir cartaz abre a página e `window.print` (não disparar o diálogo de impressão no teste: só conferir que a página renderiza); criar pesquisa nova → slug do nome da empresa (ex.: `bebelu-teste` / `-2`). Excluir pesquisa continua funcionando quando não há respostas.
- [ ] **Step 7: Passada de skills de design** e correções.
- [ ] **Step 8: Commit** — `feat: link público, QR code e cartaz da pesquisa`

---

### Task 4: Página pública e envio das respostas

**Files:**
- Create: `src/lib/supabase/admin.ts`, `src/app/p/[slug]/tipos.ts`, `src/app/p/[slug]/actions.ts`, `src/app/p/[slug]/page.tsx`, `src/app/p/[slug]/formulario-resposta.tsx`, `src/components/icones/icone-obrigado.tsx`
- Modify: `.env.example`, `.env.local` (não versionado)

**Interfaces:**
- Consumes: `criarCarimbo`, `verificarCarimbo`, `lerResposta`, `PerguntaPublica`, `mensagemErroResposta` (Task 1); `pesquisa_publica`, `registrar_resposta` (Task 2); `faixaDaNota` (`src/lib/notas/faixa.ts`).
- Produces: rota `/p/[slug]`; `enviarResposta(estado: EstadoEnvio, formData: FormData): Promise<EstadoEnvio>`.

- [ ] **Step 1: Variáveis de ambiente**
  - `.env.example`: acrescentar, com comentário, as linhas vazias `SUPABASE_SECRET_KEY=` ("chave secreta do Supabase; só no servidor, nunca com NEXT_PUBLIC_") e `CARIMBO_SEGREDO=` ("segredo do carimbo de tempo; gere com: node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\"").
  - `.env.local`: se não houver `CARIMBO_SEGREDO`, acrescentar com um valor gerado por `node -e` **sem imprimir o valor** (ex.: `node -e "require('fs').appendFileSync('.env.local', '\nCARIMBO_SEGREDO=' + require('crypto').randomBytes(32).toString('base64url') + '\n')"`).
  - `SUPABASE_SECRET_KEY`: só o Caio tem. Conferir se existe com `node -e "require('dotenv')…"` **não** — use `grep -c '^SUPABASE_SECRET_KEY=.' .env.local`. Se não existir, seguir com o código e marcar no relatório que o envio real não pôde ser testado.

- [ ] **Step 2: Cliente com chave secreta**

`src/lib/supabase/admin.ts`:
```ts
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
```

- [ ] **Step 3: Tipos e action**

`src/app/p/[slug]/tipos.ts`:
```ts
import type { PerguntaPublica } from "@/lib/respostas/formulario";

export type FuncionarioPublico = { id: string; nome: string };

// O que a função pesquisa_publica devolve
export type PesquisaPublica =
  | { ativa: false; titulo: string; empresa: string }
  | {
      ativa: true;
      id: string;
      titulo: string;
      empresa: string;
      perguntas: PerguntaPublica[];
      funcionarios: FuncionarioPublico[];
    };

export type EstadoEnvio = {
  enviado?: boolean;
  erro?: string;
  erros?: Record<string, string>;
};
```

`src/app/p/[slug]/actions.ts`:
```ts
"use server";

import { verificarCarimbo } from "@/lib/respostas/carimbo";
import { lerResposta } from "@/lib/respostas/formulario";
import { mensagemErroResposta } from "@/lib/respostas/mensagens";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { EstadoEnvio, PesquisaPublica } from "./tipos";

function campo(formData: FormData, nome: string) {
  const valor = formData.get(nome);
  return typeof valor === "string" ? valor : "";
}

export async function enviarResposta(_estado: EstadoEnvio, formData: FormData): Promise<EstadoEnvio> {
  // 1. Carimbo de tempo: robô responde rápido demais; carimbo inventado não passa
  const carimbo = verificarCarimbo(campo(formData, "carimbo"), Date.now(), process.env.CARIMBO_SEGREDO!);
  if (carimbo === "rapido") return { erro: "Ops, foi rápido demais. Confira as respostas e envie de novo." };
  if (carimbo === "expirado") return { erro: "Essa página ficou aberta muito tempo. Recarregue e responda de novo." };
  if (carimbo !== "ok") return { erro: mensagemErroResposta() };

  // 2. As perguntas vêm do banco, nunca do navegador
  const supabase = await createClient();
  const { data } = await supabase.rpc("pesquisa_publica", { p_slug: campo(formData, "slug") });
  const pesquisa = data as unknown as PesquisaPublica | null; // Json do Supabase → nosso tipo
  if (!pesquisa?.ativa) return { erro: mensagemErroResposta("SF101") };

  // 3. Lê e valida o formulário
  const leitura = lerResposta(formData, pesquisa.perguntas);
  if (!leitura.ok) {
    const { geral, ...erros } = leitura.erros;
    return { erro: geral ?? "Confira as perguntas marcadas.", erros };
  }

  // 4. Grava pela função do banco, que confere tudo de novo
  const { error } = await criarClienteAdmin().rpc("registrar_resposta", {
    p_pesquisa_id: pesquisa.id,
    p_itens: leitura.itens,
  });
  if (error) return { erro: mensagemErroResposta(error.code) };

  return { enviado: true };
}
```

- [ ] **Step 4: Ícone de obrigado**

`src/components/icones/icone-obrigado.tsx`:
```tsx
import { cn } from "@/lib/utils";

// Ícone próprio: coração dentro do balão da marca, para a tela de obrigado
export function IconeObrigado({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-16", className)}>
      <path
        d="M11 8h26a7 7 0 0 1 7 7v13a7 7 0 0 1-7 7H23l-9 7v-7h-3a7 7 0 0 1-7-7V15a7 7 0 0 1 7-7Z"
        fill="var(--menta-claro)"
        stroke="var(--ameixa)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M24 29s-7-4.3-7-9.2A3.8 3.8 0 0 1 24 17.6a3.8 3.8 0 0 1 7 2.2C31 24.7 24 29 24 29Z"
        fill="var(--coral)"
        stroke="var(--ameixa)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
```

- [ ] **Step 5: Página**

`src/app/p/[slug]/page.tsx`:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/marca/logo";
import { criarCarimbo } from "@/lib/respostas/carimbo";
import { createClient } from "@/lib/supabase/server";
import { FormularioResposta } from "./formulario-resposta";
import type { PesquisaPublica } from "./tipos";

async function buscar(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("pesquisa_publica", { p_slug: slug });
  return data as unknown as PesquisaPublica | null;
}

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const pesquisa = await buscar(slug);
  return { title: pesquisa ? `Avalie ${pesquisa.empresa}` : "Pesquisa não encontrada" };
}

export default async function PaginaPesquisaPublica(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const pesquisa = await buscar(slug);
  if (!pesquisa) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-6 sm:py-10">
      <p className="text-center text-lg font-bold text-ameixa">{pesquisa.empresa}</p>
      {pesquisa.ativa ? (
        <FormularioResposta
          slug={slug}
          pesquisaId={pesquisa.id}
          titulo={pesquisa.titulo}
          empresa={pesquisa.empresa}
          perguntas={pesquisa.perguntas}
          funcionarios={pesquisa.funcionarios}
          carimbo={criarCarimbo(Date.now(), process.env.CARIMBO_SEGREDO!)}
        />
      ) : (
        <section className="mt-6 rounded-3xl bg-card p-8 text-center shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
          <h1 className="text-2xl font-bold">Pesquisa pausada</h1>
          <p className="mt-2 text-muted-foreground">Essa pesquisa está pausada no momento. Volte outra hora!</p>
        </section>
      )}
      <footer className="mt-auto flex justify-center pt-8">
        <Logo className="text-base opacity-80" />
      </footer>
    </main>
  );
}
```
> O carimbo é criado a cada carregamento: a página já é dinâmica (lê cookies via `createClient`). Conferir na doc do Next 16 que nada a torna estática/cacheada; se necessário, `export const dynamic = "force-dynamic"` ou `await connection()`.

- [ ] **Step 6: Formulário (cliente)**

`src/app/p/[slug]/formulario-resposta.tsx`:
```tsx
"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconeObrigado } from "@/components/icones/icone-obrigado";
import { Button } from "@/components/ui/button";
import { faixaDaNota } from "@/lib/notas/faixa";
import { LIMITE_TEXTO_RESPOSTA, type PerguntaPublica } from "@/lib/respostas/formulario";
import { cn } from "@/lib/utils";
import { enviarResposta } from "./actions";
import type { EstadoEnvio, FuncionarioPublico } from "./tipos";

const ROTULO_FAIXA = { boa: "Ótimo", atencao: "Pode melhorar", ruim: "Ruim" } as const;
const COR_FAIXA = {
  boa: "bg-menta text-ameixa",
  atencao: "bg-manga text-ameixa",
  ruim: "bg-coral text-ameixa",
} as const;

// "Já respondeu hoje": marca no navegador (não impede quem limpa os dados; a 5B reforça)
function chave(pesquisaId: string) {
  return `satisfeito:respondeu:${pesquisaId}`;
}
function hoje() {
  return new Date().toLocaleDateString("sv-SE"); // AAAA-MM-DD no fuso do celular
}
function lerMarca(pesquisaId: string) {
  try {
    return localStorage.getItem(chave(pesquisaId)) === hoje();
  } catch {
    return false; // navegação privada etc.: mostra o formulário
  }
}
function gravarMarca(pesquisaId: string) {
  try {
    localStorage.setItem(chave(pesquisaId), hoje());
  } catch {}
}
const nada = () => () => {};

type Props = {
  slug: string;
  pesquisaId: string;
  titulo: string;
  empresa: string;
  perguntas: PerguntaPublica[];
  funcionarios: FuncionarioPublico[];
  carimbo: string;
};

export function FormularioResposta({ slug, pesquisaId, titulo, empresa, perguntas, funcionarios, carimbo }: Props) {
  const [estado, acao, pendente] = useActionState(enviarResposta, {} as EstadoEnvio);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errosLocais, setErrosLocais] = useState<Record<string, string>>({});
  const jaRespondeu = useSyncExternalStore(nada, () => lerMarca(pesquisaId), () => false);
  const obrigado = useRef<HTMLHeadingElement>(null);

  const erros = { ...estado.erros, ...errosLocais };

  useEffect(() => {
    if (estado.enviado) {
      gravarMarca(pesquisaId);
      obrigado.current?.focus();
    }
  }, [estado.enviado, pesquisaId]);

  function escolher(perguntaId: string, valor: string) {
    setValores((v) => ({ ...v, [perguntaId]: valor }));
    setErrosLocais(({ [perguntaId]: _, ...resto }) => resto);
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); // sem reset automático do formulário: as escolhas ficam se der erro
    const faltando = perguntas.filter((p) => p.obrigatoria && !valores[p.id]?.trim());
    if (faltando.length > 0) {
      setErrosLocais(Object.fromEntries(faltando.map((p) => [p.id, "Responda esta pergunta."])));
      document.getElementById(`pergunta-${faltando[0].id}`)?.focus();
      return;
    }
    const dados = new FormData(e.currentTarget);
    startTransition(() => acao(dados));
  }

  if (estado.enviado || jaRespondeu) {
    return (
      <section className="mt-6 flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
        <IconeObrigado className="size-20" />
        <h1 ref={obrigado} tabIndex={-1} className="mt-4 text-3xl font-bold outline-none">
          {estado.enviado ? "Obrigado!" : "Você já respondeu hoje. Valeu!"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sua opinião ajuda a {empresa} a melhorar. Até a próxima!
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="mt-4 space-y-4">
      <input type="hidden" name="carimbo" value={carimbo} />
      <input type="hidden" name="slug" value={slug} />
      <h1 className="text-center text-3xl font-bold tracking-tight">{titulo}</h1>

      {perguntas.map((p) => {
        const erro = erros[p.id];
        const idTitulo = `titulo-${p.id}`;
        return (
          <fieldset
            key={p.id}
            id={`pergunta-${p.id}`}
            tabIndex={-1}
            aria-describedby={erro ? `erro-${p.id}` : undefined}
            className={cn(
              "rounded-3xl bg-card p-5 shadow-[0_8px_24px_rgba(42,31,45,0.08)] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              erro && "ring-2 ring-destructive",
            )}
          >
            <legend id={idTitulo} className="sr-only">{p.texto}</legend>
            <p aria-hidden="true" className="text-lg font-semibold">
              {p.texto}
              {p.obrigatoria && <span className="ml-2 text-sm font-semibold text-coral-escuro">Obrigatória</span>}
            </p>

            {p.tipo === "nota" && (
              <CampoNota id={p.id} valor={valores[p.id]} aoEscolher={(v) => escolher(p.id, v)} />
            )}
            {p.tipo === "funcionario" && (
              <CampoFuncionario id={p.id} funcionarios={funcionarios} valor={valores[p.id]} aoEscolher={(v) => escolher(p.id, v)} />
            )}
            {p.tipo === "texto" && (
              <textarea
                name={`texto:${p.id}`}
                aria-labelledby={idTitulo}
                value={valores[p.id] ?? ""}
                onChange={(e) => escolher(p.id, e.target.value)}
                maxLength={LIMITE_TEXTO_RESPOSTA}
                rows={3}
                placeholder="Escreva aqui, se quiser"
                className="mt-3 w-full rounded-2xl border border-input bg-background/0 p-3 text-base focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
            )}

            <div role="alert">
              {erro && <p id={`erro-${p.id}`} className="mt-2 text-sm font-medium text-destructive">{erro}</p>}
            </div>
          </fieldset>
        );
      })}

      <div role="alert">
        {estado.erro && <p className="rounded-2xl bg-card p-4 text-center font-medium text-destructive">{estado.erro}</p>}
      </div>
      <Button type="submit" size="lg" disabled={pendente} className="w-full">
        {pendente ? "Enviando…" : "Enviar"}
      </Button>
    </form>
  );
}

function CampoNota({ id, valor, aoEscolher }: { id: string; valor?: string; aoEscolher: (v: string) => void }) {
  const nota = valor ? Number(valor) : null;
  const faixa = nota ? faixaDaNota(nota) : null;
  return (
    <div className="mt-3">
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
          <label
            key={n}
            className={cn(
              "flex min-h-12 cursor-pointer items-center justify-center rounded-2xl border-2 text-lg font-bold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
              valor === n && faixa ? cn("border-ameixa", COR_FAIXA[faixa]) : "border-border hover:border-ameixa/40",
            )}
          >
            <input type="radio" name={`nota:${id}`} value={n} checked={valor === n} onChange={() => aoEscolher(n)} className="sr-only" />
            <span className="numeros">{n}</span>
          </label>
        ))}
      </div>
      <p className="mt-2 flex justify-between text-sm text-muted-foreground" aria-hidden="true">
        <span>1 = muito ruim</span>
        <span>10 = perfeito</span>
      </p>
      <p role="status" className="mt-1 min-h-6 text-center font-semibold">
        {faixa ? `${nota}: ${ROTULO_FAIXA[faixa]}` : ""}
      </p>
    </div>
  );
}

function CampoFuncionario({
  id,
  funcionarios,
  valor,
  aoEscolher,
}: {
  id: string;
  funcionarios: FuncionarioPublico[];
  valor?: string;
  aoEscolher: (v: string) => void;
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {funcionarios.map((f) => (
        <label
          key={f.id}
          className={cn(
            "flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border-2 p-2 font-semibold transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
            valor === f.id ? "border-ameixa bg-creme" : "border-border hover:border-ameixa/40",
          )}
        >
          <input type="radio" name={`funcionario:${id}`} value={f.id} checked={valor === f.id} onChange={() => aoEscolher(f.id)} className="sr-only" />
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-menta-claro font-bold text-menta-texto">
            {f.nome.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 break-words">{f.nome}</span>
        </label>
      ))}
    </div>
  );
}
```
> Ajustes esperados no Chrome/skills: a legenda acessível do grupo (`legend sr-only` + texto visual `aria-hidden`) — conferir com leitor de tela que cada rádio é anunciado com o nome da pergunta; o anúncio da faixa da nota; a textarea com fonte ≥ 16px (sem zoom no iPhone). A tela de obrigado é a única "comemoração": o `animate`/`emil-design-eng` podem dar um movimento curto de entrada (respeitando `prefers-reduced-motion`).

- [ ] **Step 7: lint, test, build; Chrome** (computador e 639px se a janela permitir):
  - `/p/<slug>` de uma pesquisa ativa mostra empresa, título e as perguntas; nota pelo teclado (setas no grupo), faixa anunciada;
  - enviar sem a obrigatória → erro no campo e foco nele;
  - enviar antes de 3 s (recarregar e enviar logo) → "Ops, foi rápido demais…";
  - enviar válido → "Obrigado!" com foco no título; recarregar → "Você já respondeu hoje. Valeu!";
  - `localStorage.removeItem(...)` + recarregar → formulário volta;
  - pesquisa pausada → "Pesquisa pausada"; slug inexistente → 404;
  - conferir no banco (como administrador, só leitura: `select count(*) from respostas where pesquisa_id = …`) que a resposta foi gravada;
  - **se `SUPABASE_SECRET_KEY` não estiver no `.env.local`, o envio válido vai falhar com a mensagem genérica**: registrar no relatório e seguir.
- [ ] **Step 8: Passada de skills** (design e `security-review` na action) e correções.
- [ ] **Step 9: Commit** — `feat: página pública da pesquisa e envio das respostas`

---

### Task 5: Verificação, documentação, PR e merge

- [ ] **Step 1:** Rodar os quatro testes de RLS e os advisors; `impeccable detect src/app src/components`.
- [ ] **Step 2:** Percorrer tudo no Chrome; responder uma pesquisa de ponta a ponta; excluir uma pesquisa **com** resposta → "Essa pesquisa já tem respostas. Pause em vez de excluir."; excluir funcionário com avaliação → mensagem de desativar.
- [ ] **Step 3:** README (Etapa 5A, "O que já existe", variáveis de ambiente novas, estrutura, testes), CLAUDE.md (status; próxima: Etapa 6 + 5B), commit `docs: Etapa 5A concluída`.
- [ ] **Step 4:** Push, PR para `main`, merge, atualizar o `main` local.

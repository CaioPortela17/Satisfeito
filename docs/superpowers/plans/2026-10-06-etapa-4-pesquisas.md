# Etapa 4 — Pesquisas e perguntas: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A empresa logada cria, edita, pausa e exclui pesquisas, e monta as perguntas (nota 1–10, texto, "Quem te atendeu?") em `/painel/pesquisas`, com dados isolados por RLS.

**Architecture:** Tabelas `pesquisas` e `perguntas` com RLS no padrão da Etapa 3, regras de negócio (uma pergunta de funcionário, máx. 10, troca de ordem atômica) também no banco. Páginas Server Component leem os dados; cada mudança é uma Server Action que salva na hora e chama `revalidatePath`. Componentes cliente cuidam de edição no lugar, menus e confirmações.

**Tech Stack:** Next.js 16.3 · React 19 · TypeScript · Tailwind 4 · shadcn/ui (Radix) · Supabase · zod 4 · Vitest

**Spec:** `docs/superpowers/specs/2026-10-06-etapa-4-pesquisas-design.md`

## Global Constraints

- Projeto Supabase ref **`cvgayvfqzrbdqmlsvcal`** (ferramentas `mcp__supabase__*`).
- Next 16: consultar `node_modules/next/dist/docs/` antes de escrever código do Next (regra do `AGENTS.md`). Página dinâmica: `PageProps<"/painel/pesquisas/[id]">` e `const { id } = await props.params`.
- Identidade no servidor só via `getClaims()`; empresa atual via `obterContextoEmpresa()` (`src/lib/empresas/contexto.ts`); **nunca** confiar em `empresa_id` vindo do formulário.
- Interface e comentários em português do Brasil. Sem emojis; ícones de conteúdo próprios em `src/components/icones/`; ícones genéricos do `lucide-react`.
- Fundo menta; texto fora dos cartões em `text-ameixa`; inativo/arquivado com `text-muted-foreground`, nunca `opacity`. Estado sempre com palavra + cor.
- Acessibilidade (aprendizado da Etapa 3): foco nunca se perde; erros em `role="alert"`; sucesso em `role="status"` (`sr-only`); alvos ≥ 44px (`size-11`); `aria-label` com o nome do item em botões repetidos.
- Nenhuma biblioteca nova.
- **Toda tarefa com interface termina com a passada de skills de design** (pedido do Caio): `impeccable` (context + craft-floor + `detect`), `design:accessibility-review`, `design:ux-copy`, `mobile-native`, `emil-design-eng` (e `animate` se houver movimento novo). Corrigir o que aparecer antes do commit.
- Cada tarefa termina com `npm run lint`, `npm test` e `npm run build` passando (conferir o código de saída), teste no Chrome quando houver tela, e commit em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Explicar ao Caio o que foi feito.
- Servidor: parar o `npm run start` antes do `build` (porta 3000) e subir de novo depois.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/pesquisas/esquemas.ts` (+ `.test.ts`) | zod: título, texto, tipo, id; limite; tradução de erros |
| `src/lib/pesquisas/sugeridas.ts` (+ `.test.ts`) | Título e perguntas sugeridas |
| `src/lib/pesquisas/tipos.ts` | Rótulo e descrição de cada tipo |
| `supabase/migrations/20261006000000_pesquisas.sql` | Tabelas, índices, trigger de limite, função de troca, RLS, permissões |
| `supabase/tests/rls_pesquisas.sql` | Prova de segurança e das regras |
| `src/lib/supabase/database.types.ts` | Tipos regenerados |
| `src/components/icones/icone-pesquisa.tsx` | Ícone da lista vazia |
| `src/components/icones/icone-tipo-pergunta.tsx` | Ícones dos três tipos |
| `src/app/painel/pesquisas/actions.ts` | Todas as Server Actions da etapa |
| `src/app/painel/pesquisas/page.tsx` | Lista de pesquisas |
| `src/app/painel/pesquisas/botao-criar-pesquisa.tsx` | Botão que cria e abre o editor |
| `src/app/painel/pesquisas/[id]/page.tsx` | Editor (servidor) |
| `src/app/painel/pesquisas/[id]/cabecalho-pesquisa.tsx` | Título editável, Pausar/Retomar, Excluir |
| `src/app/painel/pesquisas/[id]/linha-pergunta.tsx` | Pergunta: setas, editar, obrigatória, tirar/devolver |
| `src/app/painel/pesquisas/[id]/formulario-nova-pergunta.tsx` | Adicionar pergunta |
| `src/app/painel/nav-painel.tsx` | Link "Pesquisas" |
| `src/app/painel/page.tsx` | Passo 2 dos "Primeiros passos" disponível |

---

### Task 1: Validações, tipos e perguntas sugeridas

**Files:**
- Create: `src/lib/pesquisas/esquemas.ts`, `src/lib/pesquisas/esquemas.test.ts`, `src/lib/pesquisas/sugeridas.ts`, `src/lib/pesquisas/sugeridas.test.ts`, `src/lib/pesquisas/tipos.ts`

**Interfaces:**
- Produces: `TIPOS_PERGUNTA`, `type TipoPergunta`, `LIMITE_PERGUNTAS = 10`, `esquemaTituloPesquisa`, `esquemaTextoPergunta`, `esquemaTipoPergunta`, `esquemaIdPesquisa`, `mensagemErroPesquisa(codigo?: string): string`; `TITULO_SUGERIDO`, `type PerguntaSugerida = { texto: string; tipo: TipoPergunta; obrigatoria: boolean }`, `perguntasSugeridas(temFuncionarios: boolean): PerguntaSugerida[]`; `ROTULO_TIPO: Record<TipoPergunta, string>`, `DESCRICAO_TIPO: Record<TipoPergunta, string>`

- [ ] **Step 1: Testes que falham**

`src/lib/pesquisas/esquemas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  esquemaIdPesquisa,
  esquemaTextoPergunta,
  esquemaTipoPergunta,
  esquemaTituloPesquisa,
  mensagemErroPesquisa,
} from "./esquemas";

describe("esquemaTituloPesquisa", () => {
  it("limpa espaços das pontas", () => {
    expect(esquemaTituloPesquisa.parse("  Mesa  ")).toBe("Mesa");
  });
  it("recusa vazio", () => {
    expect(esquemaTituloPesquisa.safeParse("  ").error?.issues[0].message).toBe(
      "Dê um nome para a pesquisa.",
    );
  });
  it("aceita 80 e recusa 81 caracteres", () => {
    expect(esquemaTituloPesquisa.safeParse("a".repeat(80)).success).toBe(true);
    expect(esquemaTituloPesquisa.safeParse("a".repeat(81)).error?.issues[0].message).toBe(
      "O nome pode ter no máximo 80 caracteres.",
    );
  });
});

describe("esquemaTextoPergunta", () => {
  it("recusa vazio", () => {
    expect(esquemaTextoPergunta.safeParse("").error?.issues[0].message).toBe(
      "Escreva a pergunta.",
    );
  });
  it("aceita 120 e recusa 121 caracteres", () => {
    expect(esquemaTextoPergunta.safeParse("a".repeat(120)).success).toBe(true);
    expect(esquemaTextoPergunta.safeParse("a".repeat(121)).error?.issues[0].message).toBe(
      "A pergunta pode ter no máximo 120 caracteres.",
    );
  });
});

describe("esquemaTipoPergunta", () => {
  it("aceita os três tipos e recusa outros", () => {
    for (const tipo of ["nota", "texto", "funcionario"]) {
      expect(esquemaTipoPergunta.safeParse(tipo).success).toBe(true);
    }
    expect(esquemaTipoPergunta.safeParse("estrelas").error?.issues[0].message).toBe(
      "Escolha o tipo da pergunta.",
    );
  });
});

describe("esquemaIdPesquisa", () => {
  it("aceita uuid e recusa outras coisas", () => {
    expect(esquemaIdPesquisa.safeParse("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b").success).toBe(true);
    expect(esquemaIdPesquisa.safeParse("abc").success).toBe(false);
  });
});

describe("mensagemErroPesquisa", () => {
  it("traduz a segunda pergunta de funcionário (23505)", () => {
    expect(mensagemErroPesquisa("23505")).toBe(
      "Essa pesquisa já tem a pergunta “Quem te atendeu?”.",
    );
  });
  it("traduz o limite de perguntas (SF001)", () => {
    expect(mensagemErroPesquisa("SF001")).toBe(
      "Pesquisas curtas recebem mais respostas. O limite é 10 perguntas.",
    );
  });
  it("usa mensagem genérica nos outros casos", () => {
    expect(mensagemErroPesquisa("42501")).toBe("Algo deu errado. Tente de novo em instantes.");
    expect(mensagemErroPesquisa()).toBe("Algo deu errado. Tente de novo em instantes.");
  });
});
```

`src/lib/pesquisas/sugeridas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { perguntasSugeridas, TITULO_SUGERIDO } from "./sugeridas";

describe("perguntasSugeridas", () => {
  it("com funcionários: nota, quem atendeu e comentário, nessa ordem", () => {
    expect(perguntasSugeridas(true)).toEqual([
      { texto: "Que nota você dá para o nosso atendimento?", tipo: "nota", obrigatoria: true },
      { texto: "Quem te atendeu?", tipo: "funcionario", obrigatoria: false },
      { texto: "Quer contar mais alguma coisa?", tipo: "texto", obrigatoria: false },
    ]);
  });
  it("sem funcionários: pula o “Quem te atendeu?”", () => {
    expect(perguntasSugeridas(false).map((p) => p.tipo)).toEqual(["nota", "texto"]);
  });
  it("título sugerido", () => {
    expect(TITULO_SUGERIDO).toBe("Pesquisa de satisfação");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL (`./esquemas` e `./sugeridas` não existem).

- [ ] **Step 3: Implementar**

`src/lib/pesquisas/esquemas.ts`:
```ts
import { z } from "zod";

export const TIPOS_PERGUNTA = ["nota", "texto", "funcionario"] as const;
export type TipoPergunta = (typeof TIPOS_PERGUNTA)[number];

// Pesquisa curta = cliente responde em menos de 30 segundos
export const LIMITE_PERGUNTAS = 10;

// Mesmas regras do banco (check constraints)
export const esquemaTituloPesquisa = z
  .string("Dê um nome para a pesquisa.")
  .trim()
  .min(1, "Dê um nome para a pesquisa.")
  .max(80, "O nome pode ter no máximo 80 caracteres.");

export const esquemaTextoPergunta = z
  .string("Escreva a pergunta.")
  .trim()
  .min(1, "Escreva a pergunta.")
  .max(120, "A pergunta pode ter no máximo 120 caracteres.");

export const esquemaTipoPergunta = z.enum(TIPOS_PERGUNTA, "Escolha o tipo da pergunta.");

// Ids chegam do navegador: conferimos o formato antes de usar
export const esquemaIdPesquisa = z.uuid("Item inválido.");

const MENSAGENS: Record<string, string> = {
  // unique_violation: índice "uma pergunta de funcionário por pesquisa"
  "23505": "Essa pesquisa já tem a pergunta “Quem te atendeu?”.",
  // erro próprio do trigger limitar_perguntas
  SF001: "Pesquisas curtas recebem mais respostas. O limite é 10 perguntas.",
};

export function mensagemErroPesquisa(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || "Algo deu errado. Tente de novo em instantes.";
}
```

`src/lib/pesquisas/sugeridas.ts`:
```ts
import type { TipoPergunta } from "./esquemas";

export type PerguntaSugerida = { texto: string; tipo: TipoPergunta; obrigatoria: boolean };

export const TITULO_SUGERIDO = "Pesquisa de satisfação";

// Pesquisa nova já vem pronta: o dono só ajusta.
// "Quem te atendeu?" só entra se houver alguém para escolher.
export function perguntasSugeridas(temFuncionarios: boolean): PerguntaSugerida[] {
  return [
    { texto: "Que nota você dá para o nosso atendimento?", tipo: "nota", obrigatoria: true },
    ...(temFuncionarios
      ? [{ texto: "Quem te atendeu?", tipo: "funcionario" as const, obrigatoria: false }]
      : []),
    { texto: "Quer contar mais alguma coisa?", tipo: "texto", obrigatoria: false },
  ];
}
```

`src/lib/pesquisas/tipos.ts`:
```ts
import type { TipoPergunta } from "./esquemas";

// Como cada tipo aparece para o dono
export const ROTULO_TIPO: Record<TipoPergunta, string> = {
  nota: "Nota de 1 a 10",
  texto: "Texto livre",
  funcionario: "Quem te atendeu",
};

export const DESCRICAO_TIPO: Record<TipoPergunta, string> = {
  nota: "O cliente escolhe um número. Vira média e gráfico no painel.",
  texto: "O cliente escreve o que quiser. Entra no resumo da IA.",
  funcionario: "O cliente escolhe quem atendeu. Vira o ranking da equipe.",
};
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.
- [ ] **Step 5: lint, build, commit** — `feat: validações e perguntas sugeridas das pesquisas`

---

### Task 2: Banco — tabelas, regras, RLS e prova de segurança

**Files:**
- Create: `supabase/tests/rls_pesquisas.sql`, `supabase/migrations/20261006000000_pesquisas.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerar)

**Interfaces:**
- Produces: tabelas `public.pesquisas (id, empresa_id, titulo, ativa, created_at)` e `public.perguntas (id, pesquisa_id, texto, tipo, ordem, obrigatoria, arquivada, created_at)`; função `public.trocar_ordem_perguntas(a uuid, b uuid) returns void`; erro `SF001` (limite); tipos em `Database["public"]`.

- [ ] **Step 1: Teste de segurança primeiro**

`supabase/tests/rls_pesquisas.sql`:
```sql
-- Prova de segurança das tabelas pesquisas e perguntas. Desfaz tudo no final (rollback).
-- Se algo estiver errado, para com uma mensagem "FALHOU: ...".
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pesq-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pesq-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Pesquisa e pergunta da empresa B, criadas como administrador
insert into public.pesquisas (empresa_id, titulo)
select id, 'Pesquisa B' from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b2';
insert into public.perguntas (pesquisa_id, texto, tipo, ordem)
select id, 'Nota B', 'nota', 1 from public.pesquisas where titulo = 'Pesquisa B';
select set_config('app.pesquisa_b', (select id::text from public.pesquisas where titulo = 'Pesquisa B'), true);
select set_config('app.pergunta_b', (select id::text from public.perguntas where texto = 'Nota B'), true);

-- Agora como o dono da empresa A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

do $$
declare
  minha_empresa uuid := (select id from public.empresas);
  minha uuid;
  p1 uuid;
  p2 uuid;
begin
  if exists (select 1 from public.pesquisas where titulo = 'Pesquisa B')
     or exists (select 1 from public.perguntas where texto = 'Nota B') then
    raise exception 'FALHOU: A enxerga dados da empresa B';
  end if;

  insert into public.pesquisas (empresa_id, titulo) values (minha_empresa, 'Mesa') returning id into minha;

  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Nota', 'nota', 1) returning id into p1;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Quem?', 'funcionario', 2) returning id into p2;

  -- Segunda pergunta de funcionário: proibida
  begin
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Quem 2?', 'funcionario', 3);
    raise exception 'FALHOU: aceitou duas perguntas de funcionário';
  exception when unique_violation then null;
  end;

  -- Arquivada não conta: depois de arquivar, pode criar outra
  update public.perguntas set arquivada = true where id = p2;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Quem 3?', 'funcionario', 3);

  -- Limite de 10 não arquivadas (já temos 2: Nota e Quem 3?)
  for i in 4..11 loop
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Texto ' || i, 'texto', i);
  end loop;
  begin
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Demais', 'texto', 12);
    raise exception 'FALHOU: aceitou a 11ª pergunta';
  exception when sqlstate 'SF001' then null;
  end;
  -- Devolver uma arquivada também respeita o limite (p2 é funcionario; usamos uma de texto)
  update public.perguntas set arquivada = true where texto = 'Texto 11';
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Texto 12', 'texto', 12);
  begin
    update public.perguntas set arquivada = false where texto = 'Texto 11';
    raise exception 'FALHOU: devolveu pergunta passando do limite';
  exception when sqlstate 'SF001' then null;
  end;

  -- Trocar o tipo: proibido (permissão de coluna)
  begin
    update public.perguntas set tipo = 'texto' where id = p1;
    raise exception 'FALHOU: conseguiu trocar o tipo da pergunta';
  exception when insufficient_privilege then null;
  end;

  -- Excluir pergunta: proibido (só arquivar)
  begin
    delete from public.perguntas where id = p1;
    raise exception 'FALHOU: conseguiu excluir pergunta';
  exception when insufficient_privilege then null;
  end;

  -- Mover pesquisa para outra empresa / pergunta para outra pesquisa: proibido
  begin
    update public.pesquisas set empresa_id = current_setting('app.pesquisa_b')::uuid where id = minha;
    raise exception 'FALHOU: conseguiu mover a pesquisa';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.perguntas set pesquisa_id = current_setting('app.pesquisa_b')::uuid where id = p1;
    raise exception 'FALHOU: conseguiu mover a pergunta';
  exception when insufficient_privilege then null;
  end;

  -- Pergunta na pesquisa de B: proibido
  begin
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem)
    values (current_setting('app.pesquisa_b')::uuid, 'Intrusa', 'texto', 9);
    raise exception 'FALHOU: A criou pergunta na pesquisa de B';
  exception when insufficient_privilege then null;
  end;

  -- Trocar ordem: funciona na mesma pesquisa...
  perform public.trocar_ordem_perguntas(p1, (select id from public.perguntas where texto = 'Quem 3?'));
  if (select ordem from public.perguntas where id = p1) <> 3 then
    raise exception 'FALHOU: a troca de ordem não aconteceu';
  end if;
  -- ...e não mexe em pergunta de B (B é invisível: a função recusa)
  begin
    perform public.trocar_ordem_perguntas(p1, current_setting('app.pergunta_b')::uuid);
    raise exception 'FALHOU: trocou ordem com pergunta de outra empresa';
  exception when sqlstate 'SF002' then null;
  end;

  -- Mexer em B não afeta nada (RLS esconde)
  update public.pesquisas set titulo = 'Hackeada' where id = current_setting('app.pesquisa_b')::uuid;
  delete from public.pesquisas where id = current_setting('app.pesquisa_b')::uuid;
  update public.perguntas set texto = 'Hackeada' where id = current_setting('app.pergunta_b')::uuid;

  -- Renomear, pausar e excluir a própria pesquisa: pode (perguntas vão junto)
  update public.pesquisas set titulo = 'Balcão', ativa = false where id = minha;
  if (select titulo || '/' || ativa from public.pesquisas where id = minha) <> 'Balcão/false' then
    raise exception 'FALHOU: dono não conseguiu renomear/pausar';
  end if;
  delete from public.pesquisas where id = minha;
  if exists (select 1 from public.perguntas where pesquisa_id = minha) then
    raise exception 'FALHOU: perguntas não foram junto com a pesquisa';
  end if;
end $$;

-- Criar pesquisa na empresa B: proibido
reset role;
select set_config('app.empresa_b',
  (select id::text from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b2'), true);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.pesquisas (empresa_id, titulo) values (current_setting('app.empresa_b')::uuid, 'Intrusa');
    raise exception 'FALHOU: A criou pesquisa na empresa B';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Visitante sem login
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform count(*) from public.pesquisas;
    raise exception 'FALHOU: visitante lê pesquisas';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.perguntas;
    raise exception 'FALHOU: visitante lê perguntas';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Conferência final como administrador
reset role;
do $$
begin
  if (select titulo from public.pesquisas where id = current_setting('app.pesquisa_b')::uuid) is distinct from 'Pesquisa B'
     or (select texto from public.perguntas where id = current_setting('app.pergunta_b')::uuid) is distinct from 'Nota B' then
    raise exception 'FALHOU: dados da empresa B foram alterados ou apagados';
  end if;
end $$;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;
```
> "Criar pesquisa na empresa B" fica num bloco separado porque A não enxerga a empresa B: o id dela é lido como administrador antes.

- [ ] **Step 2: Rodar e ver falhar** — `mcp__supabase__execute_sql` com o arquivo → `relation "public.pesquisas" does not exist`.

- [ ] **Step 3: Migração**

`supabase/migrations/20261006000000_pesquisas.sql`:
```sql
-- Etapa 4: pesquisas e perguntas de cada empresa

create table public.pesquisas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  titulo text not null check (titulo = btrim(titulo) and char_length(titulo) between 1 and 80),
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.pesquisas is 'Pesquisas de satisfação; ativa = recebendo respostas.';

create index pesquisas_empresa_id_idx on public.pesquisas (empresa_id);

create table public.perguntas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas (id) on delete cascade,
  texto text not null check (texto = btrim(texto) and char_length(texto) between 1 and 120),
  tipo text not null check (tipo in ('nota', 'texto', 'funcionario')),
  ordem integer not null,
  obrigatoria boolean not null default false,
  arquivada boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.perguntas is
  'Perguntas de uma pesquisa. arquivada = tirada da pesquisa, mas as respostas antigas ficam.';

-- Começa por pesquisa_id: também serve de índice para a chave estrangeira
create index perguntas_pesquisa_ordem_idx on public.perguntas (pesquisa_id, ordem);

-- No máximo uma "Quem te atendeu?" valendo por pesquisa
create unique index perguntas_uma_de_funcionario
  on public.perguntas (pesquisa_id)
  where tipo = 'funcionario' and not arquivada;

-- No máximo 10 perguntas valendo por pesquisa (pesquisa curta = mais respostas).
-- Erro próprio SF001, traduzido na interface.
create function public.limitar_perguntas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.arquivada and (
    select count(*) from public.perguntas p
    where p.pesquisa_id = new.pesquisa_id and not p.arquivada and p.id <> new.id
  ) >= 10 then
    raise exception 'Limite de 10 perguntas por pesquisa' using errcode = 'SF001';
  end if;
  return new;
end;
$$;

create trigger perguntas_limite
  before insert or update of arquivada on public.perguntas
  for each row execute function public.limitar_perguntas();

-- Subir/descer: troca a ordem de duas perguntas da mesma pesquisa de uma vez só.
-- security invoker: roda com as permissões de quem chama, então o RLS vale
-- (pergunta de outra empresa é invisível e cai no erro SF002).
create function public.trocar_ordem_perguntas(a uuid, b uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ordem_a integer;
  ordem_b integer;
  pesquisa_a uuid;
  pesquisa_b uuid;
begin
  select ordem, pesquisa_id into ordem_a, pesquisa_a from public.perguntas where id = a;
  select ordem, pesquisa_id into ordem_b, pesquisa_b from public.perguntas where id = b;
  if pesquisa_a is null or pesquisa_b is null or pesquisa_a <> pesquisa_b then
    raise exception 'Perguntas inválidas para troca' using errcode = 'SF002';
  end if;
  update public.perguntas set ordem = ordem_b where id = a;
  update public.perguntas set ordem = ordem_a where id = b;
end;
$$;

revoke execute on function public.trocar_ordem_perguntas(uuid, uuid) from public, anon;
grant execute on function public.trocar_ordem_perguntas(uuid, uuid) to authenticated;
revoke execute on function public.limitar_perguntas() from public, anon, authenticated;

alter table public.pesquisas enable row level security;
alter table public.perguntas enable row level security;

-- pesquisas: a empresa pertence ao usuário logado
create policy "dono lê as próprias pesquisas"
  on public.pesquisas for select to authenticated
  using (exists (select 1 from public.empresas e
                 where e.id = empresa_id and e.owner_id = (select auth.uid())));

create policy "dono cria pesquisas na própria empresa"
  on public.pesquisas for insert to authenticated
  with check (exists (select 1 from public.empresas e
                      where e.id = empresa_id and e.owner_id = (select auth.uid())));

create policy "dono edita as próprias pesquisas"
  on public.pesquisas for update to authenticated
  using (exists (select 1 from public.empresas e
                 where e.id = empresa_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.empresas e
                      where e.id = empresa_id and e.owner_id = (select auth.uid())));

create policy "dono exclui as próprias pesquisas"
  on public.pesquisas for delete to authenticated
  using (exists (select 1 from public.empresas e
                 where e.id = empresa_id and e.owner_id = (select auth.uid())));

-- perguntas: a pesquisa é de uma empresa do usuário logado
create policy "dono lê as próprias perguntas"
  on public.perguntas for select to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

create policy "dono cria perguntas nas próprias pesquisas"
  on public.perguntas for insert to authenticated
  with check (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                      where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

create policy "dono edita as próprias perguntas"
  on public.perguntas for update to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                      where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

-- Permissões por coluna: ninguém troca empresa, pesquisa nem tipo; pergunta não se exclui (arquiva).
-- Visitante sem login: nada (a Etapa 5 libera só o necessário).
revoke all on public.pesquisas from anon, authenticated;
grant select, delete on public.pesquisas to authenticated;
grant insert (empresa_id, titulo) on public.pesquisas to authenticated;
grant update (titulo, ativa) on public.pesquisas to authenticated;

revoke all on public.perguntas from anon, authenticated;
grant select on public.perguntas to authenticated;
grant insert (pesquisa_id, texto, tipo, ordem, obrigatoria) on public.perguntas to authenticated;
grant update (texto, ordem, obrigatoria, arquivada) on public.perguntas to authenticated;
```

- [ ] **Step 4: Aplicar** — `mcp__supabase__apply_migration` (`name: "pesquisas"`, conteúdo do arquivo).
- [ ] **Step 5: Teste passa** — rodar `rls_pesquisas.sql` → `TODOS OS TESTES DE SEGURANÇA PASSARAM`. Rodar também `rls_empresas.sql` e `rls_funcionarios.sql`. Conferir sobras: `select count(*) from auth.users where email like 'pesq-%@exemplo.com'` → `0`.
- [ ] **Step 6: Advisors** — security e performance: nada novo além do aviso de senhas vazadas e de índices "não usados" (normal com poucos dados).
- [ ] **Step 7: Tipos** — `mcp__supabase__generate_typescript_types` → salvar em `src/lib/supabase/database.types.ts`; conferir que aparecem `pesquisas`, `perguntas` e `trocar_ordem_perguntas`.
- [ ] **Step 8: lint, build, test, commit** — `feat: tabelas pesquisas e perguntas com RLS e teste de segurança`

---

### Task 3: Server Actions, lista de pesquisas e menu

**Files:**
- Create: `src/app/painel/pesquisas/actions.ts`, `src/app/painel/pesquisas/page.tsx`, `src/app/painel/pesquisas/botao-criar-pesquisa.tsx`, `src/components/icones/icone-pesquisa.tsx`
- Modify: `src/app/painel/nav-painel.tsx`, `src/app/painel/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`esquemas`, `sugeridas`), Task 2 (tabelas, `trocar_ordem_perguntas`)
- Produces (usadas nas Tasks 4 e 5): `type EstadoAcao = { erro?: string; ok?: number; valor?: string; anuncio?: string }`; `criarPesquisa(estado, formData)`, `renomearPesquisa(estado, formData{id,titulo})`, `alterarAtivaPesquisa(id, ativa)`, `excluirPesquisa(id)`, `adicionarPergunta(estado, formData{pesquisaId,tipo,texto})`, `editarTextoPergunta(estado, formData{id,texto})`, `alterarObrigatoria(id, obrigatoria)`, `arquivarPergunta(id, arquivada)`, `moverPergunta(id, direcao: "subir" | "descer")`

- [ ] **Step 1: Server Actions** (todas de uma vez: são pequenas e compartilham os ajudantes)

`src/app/painel/pesquisas/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import {
  esquemaIdPesquisa,
  esquemaTextoPergunta,
  esquemaTipoPergunta,
  esquemaTituloPesquisa,
  mensagemErroPesquisa,
} from "@/lib/pesquisas/esquemas";
import { perguntasSugeridas, TITULO_SUGERIDO } from "@/lib/pesquisas/sugeridas";
import { createClient } from "@/lib/supabase/server";

export type EstadoAcao = {
  erro?: string;
  ok?: number; // muda a cada sucesso (o formulário sabe que deu certo)
  valor?: string; // o que foi digitado, para não sumir depois de um erro
  anuncio?: string; // frase para o leitor de tela
};

const ERRO = { erro: mensagemErroPesquisa() };

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

// A lista e todos os editores ficam embaixo de /painel/pesquisas
function atualizarTelas() {
  revalidatePath("/painel/pesquisas", "layout");
}

// Próxima posição livre no fim da pesquisa
async function proximaOrdem(supabase: Awaited<ReturnType<typeof createClient>>, pesquisaId: string) {
  const { data } = await supabase
    .from("perguntas")
    .select("ordem")
    .eq("pesquisa_id", pesquisaId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.ordem ?? 0) + 1;
}

export async function criarPesquisa(_estado: EstadoAcao, _formData: FormData): Promise<EstadoAcao> {
  // A empresa é a atual do usuário, decidida no servidor
  const { supabase, atual } = await obterContextoEmpresa();
  if (!atual) return ERRO;

  const { data: pesquisa, error } = await supabase
    .from("pesquisas")
    .insert({ empresa_id: atual.id, titulo: TITULO_SUGERIDO })
    .select("id")
    .single();
  if (error || !pesquisa) return { erro: mensagemErroPesquisa(error?.code) };

  // "Quem te atendeu?" só entra se houver alguém ativo para escolher
  const { count } = await supabase
    .from("funcionarios")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", atual.id)
    .eq("ativo", true);

  const { error: erroPerguntas } = await supabase.from("perguntas").insert(
    perguntasSugeridas((count ?? 0) > 0).map((p, i) => ({
      pesquisa_id: pesquisa.id,
      texto: p.texto,
      tipo: p.tipo,
      obrigatoria: p.obrigatoria,
      ordem: i + 1,
    })),
  );
  if (erroPerguntas) {
    // Não deixa pesquisa pela metade
    await supabase.from("pesquisas").delete().eq("id", pesquisa.id);
    return { erro: mensagemErroPesquisa(erroPerguntas.code) };
  }

  atualizarTelas();
  redirect(`/painel/pesquisas/${pesquisa.id}`);
}

export async function renomearPesquisa(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "titulo");
  const id = esquemaIdPesquisa.safeParse(texto(formData, "id"));
  const titulo = esquemaTituloPesquisa.safeParse(digitado);
  if (!id.success) return { ...ERRO, valor: digitado };
  if (!titulo.success) return { erro: titulo.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { error } = await supabase.from("pesquisas").update({ titulo: titulo.data }).eq("id", id.data);
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };

  atualizarTelas();
  return { ok: Date.now() };
}

export async function alterarAtivaPesquisa(idRecebido: string, ativa: boolean): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || typeof ativa !== "boolean") return ERRO;

  const supabase = await createClient();
  const { error } = await supabase.from("pesquisas").update({ ativa }).eq("id", id.data);
  if (error) return { erro: mensagemErroPesquisa(error.code) };

  atualizarTelas();
  return { ok: Date.now(), anuncio: ativa ? "Pesquisa recebendo respostas." : "Pesquisa pausada." };
}

export async function excluirPesquisa(idRecebido: string): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success) return ERRO;

  const supabase = await createClient();
  const { error } = await supabase.from("pesquisas").delete().eq("id", id.data);
  if (error) return { erro: mensagemErroPesquisa(error.code) };

  atualizarTelas();
  redirect("/painel/pesquisas");
}

export async function adicionarPergunta(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "texto");
  const pesquisaId = esquemaIdPesquisa.safeParse(texto(formData, "pesquisaId"));
  const tipo = esquemaTipoPergunta.safeParse(texto(formData, "tipo"));
  const textoPergunta = esquemaTextoPergunta.safeParse(digitado);
  if (!pesquisaId.success) return { ...ERRO, valor: digitado };
  if (!tipo.success) return { erro: tipo.error.issues[0].message, valor: digitado };
  if (!textoPergunta.success) return { erro: textoPergunta.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { error } = await supabase.from("perguntas").insert({
    pesquisa_id: pesquisaId.data,
    texto: textoPergunta.data,
    tipo: tipo.data,
    ordem: await proximaOrdem(supabase, pesquisaId.data),
  });
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };

  atualizarTelas();
  return { ok: Date.now(), anuncio: `Pergunta adicionada: ${textoPergunta.data}` };
}

export async function editarTextoPergunta(_estado: EstadoAcao, formData: FormData): Promise<EstadoAcao> {
  const digitado = texto(formData, "texto");
  const id = esquemaIdPesquisa.safeParse(texto(formData, "id"));
  const textoPergunta = esquemaTextoPergunta.safeParse(digitado);
  if (!id.success) return { ...ERRO, valor: digitado };
  if (!textoPergunta.success) return { erro: textoPergunta.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { error } = await supabase
    .from("perguntas")
    .update({ texto: textoPergunta.data })
    .eq("id", id.data);
  if (error) return { erro: mensagemErroPesquisa(error.code), valor: digitado };

  atualizarTelas();
  return { ok: Date.now() };
}

export async function alterarObrigatoria(idRecebido: string, obrigatoria: boolean): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || typeof obrigatoria !== "boolean") return ERRO;

  const supabase = await createClient();
  const { error } = await supabase.from("perguntas").update({ obrigatoria }).eq("id", id.data);
  if (error) return { erro: mensagemErroPesquisa(error.code) };

  atualizarTelas();
  return { ok: Date.now(), anuncio: obrigatoria ? "Agora é obrigatória." : "Agora é opcional." };
}

// Tirar da pesquisa (arquivada = true) ou devolver (false, vai para o fim)
export async function arquivarPergunta(idRecebido: string, arquivada: boolean): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || typeof arquivada !== "boolean") return ERRO;

  const supabase = await createClient();
  let mudanca: { arquivada: boolean; ordem?: number } = { arquivada };
  if (!arquivada) {
    const { data: pergunta } = await supabase
      .from("perguntas")
      .select("pesquisa_id")
      .eq("id", id.data)
      .maybeSingle();
    if (!pergunta) return ERRO;
    mudanca = { arquivada, ordem: await proximaOrdem(supabase, pergunta.pesquisa_id) };
  }

  const { error } = await supabase.from("perguntas").update(mudanca).eq("id", id.data);
  if (error) return { erro: mensagemErroPesquisa(error.code) };

  atualizarTelas();
  return {
    ok: Date.now(),
    anuncio: arquivada ? "Pergunta tirada da pesquisa." : "Pergunta devolvida para a pesquisa.",
  };
}

export async function moverPergunta(idRecebido: string, direcao: "subir" | "descer"): Promise<EstadoAcao> {
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || (direcao !== "subir" && direcao !== "descer")) return ERRO;

  const supabase = await createClient();
  const { data: pergunta } = await supabase
    .from("perguntas")
    .select("pesquisa_id, ordem")
    .eq("id", id.data)
    .maybeSingle();
  if (!pergunta) return ERRO;

  // A vizinha é a pergunta valendo mais próxima acima (subir) ou abaixo (descer)
  const base = supabase
    .from("perguntas")
    .select("id")
    .eq("pesquisa_id", pergunta.pesquisa_id)
    .eq("arquivada", false);
  const { data: vizinha } =
    direcao === "subir"
      ? await base.lt("ordem", pergunta.ordem).order("ordem", { ascending: false }).limit(1).maybeSingle()
      : await base.gt("ordem", pergunta.ordem).order("ordem", { ascending: true }).limit(1).maybeSingle();
  if (!vizinha) return {}; // já está na ponta: nada a fazer

  const { error } = await supabase.rpc("trocar_ordem_perguntas", { a: id.data, b: vizinha.id });
  if (error) return { erro: mensagemErroPesquisa(error.code) };

  atualizarTelas();
  return { ok: Date.now(), anuncio: direcao === "subir" ? "Pergunta subiu." : "Pergunta desceu." };
}
```

- [ ] **Step 2: Ícone da lista vazia**

`src/components/icones/icone-pesquisa.tsx`:
```tsx
import { cn } from "@/lib/utils";

// Ícone próprio: prancheta com uma nota marcada, nas cores da marca
export function IconePesquisa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-12", className)}>
      {/* Prancheta */}
      <rect x="9" y="8" width="30" height="34" rx="5" fill="var(--creme)" stroke="var(--ameixa)" strokeWidth="2.5" />
      {/* Prendedor (manga) */}
      <rect x="17" y="5" width="14" height="7" rx="2.5" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="2.5" />
      {/* Linhas de pergunta */}
      <path d="M16 21h16M16 29h10" stroke="var(--ameixa)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Marca de "respondido" (coral) */}
      <circle cx="33" cy="34" r="6" fill="var(--coral)" stroke="var(--ameixa)" strokeWidth="2.5" />
      <path d="m30.5 34 1.8 1.8 3.2-3.6" stroke="var(--creme)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 3: Botão de criar**

`src/app/painel/pesquisas/botao-criar-pesquisa.tsx`:
```tsx
"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { criarPesquisa, type EstadoAcao } from "./actions";

const estadoInicial: EstadoAcao = {};

// Cria a pesquisa já com as perguntas sugeridas e abre o editor
export function BotaoCriarPesquisa() {
  const [estado, acao, pendente] = useActionState(criarPesquisa, estadoInicial);

  return (
    <form action={acao} className="space-y-2">
      <Button type="submit" disabled={pendente}>
        <Plus aria-hidden="true" />
        {pendente ? "Criando…" : "Criar pesquisa"}
      </Button>
      <div role="alert">
        {estado.erro && <p className="text-sm font-medium text-destructive">{estado.erro}</p>}
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Página da lista**

`src/app/painel/pesquisas/page.tsx`:
```tsx
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconePesquisa } from "@/components/icones/icone-pesquisa";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { cn } from "@/lib/utils";
import { BotaoCriarPesquisa } from "./botao-criar-pesquisa";

export const metadata: Metadata = { title: "Pesquisas" };

export default async function PaginaPesquisas() {
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // perguntas(count) conta só as que valem (não arquivadas)
  const { data: pesquisas } = atual
    ? await supabase
        .from("pesquisas")
        .select("id, titulo, ativa, perguntas(count)")
        .eq("empresa_id", atual.id)
        .eq("perguntas.arquivada", false)
        .order("created_at", { ascending: false })
    : { data: [] };

  const lista = pesquisas ?? [];

  return (
    // Alinhado à esquerda com o logo, como as outras páginas do painel
    <div className="max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Pesquisas</h1>
          <p className="mt-1 text-lg font-medium text-ameixa">
            O que seus clientes respondem pelo QR code.
          </p>
        </div>
        {lista.length > 0 && <BotaoCriarPesquisa />}
      </div>

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
              <IconePesquisa className="size-12" />
            </div>
            <p className="font-semibold">Nenhuma pesquisa ainda</p>
            <p className="mt-1 mb-5 max-w-sm text-muted-foreground">
              Sua primeira pesquisa fica pronta em 1 minuto: ela já vem com perguntas sugeridas.
            </p>
            <BotaoCriarPesquisa />
          </div>
        ) : (
          <ul className="-my-2 divide-y divide-border">
            {lista.map((p) => {
              const total = p.perguntas[0]?.count ?? 0;
              return (
                <li key={p.id}>
                  <Link
                    href={`/painel/pesquisas/${p.id}`}
                    className="-mx-3 flex min-h-16 items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold break-words">{p.titulo}</p>
                      <p className="numeros text-sm text-muted-foreground">
                        {total} {total === 1 ? "pergunta" : "perguntas"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                        p.ativa ? "bg-menta-claro text-menta-texto" : "bg-manga-claro text-manga-texto",
                      )}
                    >
                      {p.ativa ? "Recebendo respostas" : "Pausada"}
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Menu e página inicial**

Em `src/app/painel/nav-painel.tsx`, trocar o import e a lista:
```tsx
import { ClipboardList, House, Users } from "lucide-react";
```
```tsx
const LINKS = [
  { href: "/painel", rotulo: "Início", Icone: House },
  { href: "/painel/funcionarios", rotulo: "Funcionários", Icone: Users },
  { href: "/painel/pesquisas", rotulo: "Pesquisas", Icone: ClipboardList },
];
```
No celular, três links + seletor podem não caber numa linha: no `<nav>`, acrescentar `overflow-x-auto` e, em cada link, `shrink-0` (conferir no Chrome a 639px; se apertar, esconder o rótulo do link inativo abaixo de `sm` mantendo `aria-label`).

Em `src/app/painel/page.tsx`, o passo 2 ganha link:
```tsx
  {
    titulo: "Monte sua pesquisa",
    texto: "Escolha as perguntas: nota de 1 a 10, texto livre e quem atendeu.",
    href: "/painel/pesquisas",
    acao: "Montar pesquisa",
  },
```

- [ ] **Step 6: lint, test, build; Chrome** — lista vazia → "Criar pesquisa" → redireciona para `/painel/pesquisas/<id>` (404 por enquanto é esperado: a página do editor vem na Task 4) → voltar à lista e ver a pesquisa com "3 perguntas" (ou 2 sem funcionários) e "Recebendo respostas". Menu com três links no computador e a 639px.
- [ ] **Step 7: Passada de skills de design** (ver Global Constraints) e correções.
- [ ] **Step 8: Commit** — `feat: lista de pesquisas com criação já com perguntas sugeridas`

---

### Task 4: Editor — página, título, pausar e excluir

**Files:**
- Create: `src/app/painel/pesquisas/[id]/page.tsx`, `src/app/painel/pesquisas/[id]/cabecalho-pesquisa.tsx`
- (gerado) nenhum: `alert-dialog` e `dropdown-menu` já existem

**Interfaces:**
- Consumes: `renomearPesquisa`, `alterarAtivaPesquisa`, `excluirPesquisa`, `EstadoAcao` (Task 3)
- Produces: `<CabecalhoPesquisa id titulo ativa />`; a página `[id]` (nesta task lista as perguntas em texto simples; a Task 5 troca pelos componentes de edição).

- [ ] **Step 1: Cabeçalho (cliente)**

`src/app/painel/pesquisas/[id]/cabecalho-pesquisa.tsx`:
```tsx
"use client";

import { Ellipsis, Pause, Pencil, Play } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  alterarAtivaPesquisa,
  excluirPesquisa,
  renomearPesquisa,
  type EstadoAcao,
} from "../actions";

type Props = { id: string; titulo: string; ativa: boolean };

export function CabecalhoPesquisa({ id, titulo, ativa }: Props) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState<string>();
  const [anuncio, setAnuncio] = useState("");
  const [pendente, iniciar] = useTransition();
  const devolverFoco = useRef(false);

  function executar(acao: () => Promise<EstadoAcao>) {
    setErro(undefined);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      if (r.anuncio) setAnuncio(r.anuncio);
    });
  }

  const terminarEdicao = useCallback(() => {
    devolverFoco.current = true;
    setEditando(false);
  }, []);

  // Ao sair da edição, o foco volta para o botão "Renomear"
  function aoMontarBotaoRenomear(botao: HTMLButtonElement | null) {
    if (botao && devolverFoco.current) {
      devolverFoco.current = false;
      botao.focus();
    }
  }

  return (
    <div className="space-y-3">
      {editando ? (
        <FormularioTitulo id={id} titulo={titulo} aoTerminar={terminarEdicao} />
      ) : (
        <div className="flex items-start gap-2">
          <h1 className="min-w-0 text-3xl font-bold tracking-tight break-words sm:text-4xl">{titulo}</h1>
          <Button
            ref={aoMontarBotaoRenomear}
            variant="ghost"
            size="icon"
            className="mt-0.5 size-11 shrink-0 text-ameixa hover:bg-ameixa/10"
            aria-label="Renomear pesquisa"
            onClick={() => setEditando(true)}
          >
            <Pencil className="size-5" aria-hidden="true" />
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-semibold",
            ativa ? "bg-menta-claro text-menta-texto" : "bg-manga-claro text-manga-texto",
          )}
        >
          {ativa ? "Recebendo respostas" : "Pausada"}
        </span>
        <Button
          variant="outline"
          disabled={pendente}
          onClick={() => executar(() => alterarAtivaPesquisa(id, !ativa))}
        >
          {ativa ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          {ativa ? "Pausar" : "Retomar"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11" aria-label="Mais ações da pesquisa">
              <Ellipsis className="size-5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmandoExclusao(true)}>
              Excluir pesquisa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div role="alert">{erro && <p className="text-sm font-medium text-destructive">{erro}</p>}</div>
      <p role="status" className="sr-only">{anuncio}</p>

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{titulo}”?</AlertDialogTitle>
            <AlertDialogDescription>
              A pesquisa e as perguntas somem de vez. Se só quer parar de receber respostas por um
              tempo, prefira Pausar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => executar(() => excluirPesquisa(id))}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FormularioTitulo({
  id,
  titulo,
  aoTerminar,
}: {
  id: string;
  titulo: string;
  aoTerminar: () => void;
}) {
  const [estado, acao, pendente] = useActionState(renomearPesquisa, {} as EstadoAcao);

  useEffect(() => {
    if (estado.ok) aoTerminar();
  }, [estado.ok, aoTerminar]);

  return (
    <div>
      <form
        action={acao}
        className="flex flex-col gap-2 sm:flex-row"
        onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
        noValidate
      >
        <input type="hidden" name="id" value={id} />
        <Input
          name="titulo"
          aria-label="Nome da pesquisa"
          defaultValue={estado.valor ?? titulo}
          maxLength={80}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? "erro-titulo" : undefined}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" onClick={aoTerminar}>
            Cancelar
          </Button>
        </div>
      </form>
      {estado.erro && (
        <p id="erro-titulo" role="alert" className="mt-1 text-sm font-medium text-destructive">
          {estado.erro}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Página do editor (servidor)**

`src/app/painel/pesquisas/[id]/page.tsx`:
```tsx
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { esquemaIdPesquisa } from "@/lib/pesquisas/esquemas";
import { CabecalhoPesquisa } from "./cabecalho-pesquisa";

export const metadata: Metadata = { title: "Editar pesquisa" };

export default async function PaginaEditorPesquisa(props: PageProps<"/painel/pesquisas/[id]">) {
  const { id: idRecebido } = await props.params;
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // Endereço inválido ou pesquisa de outra empresa: 404
  const id = esquemaIdPesquisa.safeParse(idRecebido);
  if (!id.success || !atual) notFound();

  const { data: pesquisa } = await supabase
    .from("pesquisas")
    .select("id, titulo, ativa")
    .eq("id", id.data)
    .eq("empresa_id", atual.id)
    .maybeSingle();
  if (!pesquisa) notFound();

  const { data: perguntas } = await supabase
    .from("perguntas")
    .select("id, texto, tipo, obrigatoria, arquivada")
    .eq("pesquisa_id", pesquisa.id)
    .order("ordem");

  const valendo = (perguntas ?? []).filter((p) => !p.arquivada);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/painel/pesquisas"
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 font-semibold text-ameixa underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Pesquisas
      </Link>

      <CabecalhoPesquisa id={pesquisa.id} titulo={pesquisa.titulo} ativa={pesquisa.ativa} />

      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        <h2 className="text-xl font-bold">Perguntas</h2>
        {/* Lista simples nesta tarefa; a Task 5 troca por LinhaPergunta */}
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          {valendo.map((p) => (
            <li key={p.id}>{p.texto}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: lint, test, build; Chrome** — criar pesquisa → abre o editor → renomear (Enter salva, Esc cancela, foco volta ao lápis) → nome vazio (erro) → Pausar (selo "Pausada", anúncio) → Retomar → Excluir com Cancelar (nada muda) → Excluir de verdade (volta à lista) → `/painel/pesquisas/abc` e um uuid qualquer dão 404. Computador e 639px.
- [ ] **Step 4: Passada de skills de design** e correções.
- [ ] **Step 5: Commit** — `feat: editor de pesquisa com título, pausar e excluir`

---

### Task 5: Editor — perguntas

**Files:**
- Create: `src/components/icones/icone-tipo-pergunta.tsx`, `src/app/painel/pesquisas/[id]/linha-pergunta.tsx`, `src/app/painel/pesquisas/[id]/formulario-nova-pergunta.tsx`
- Modify: `src/app/painel/pesquisas/[id]/page.tsx`

**Interfaces:**
- Consumes: `adicionarPergunta`, `editarTextoPergunta`, `alterarObrigatoria`, `arquivarPergunta`, `moverPergunta`, `EstadoAcao` (Task 3); `ROTULO_TIPO`, `DESCRICAO_TIPO` (Task 1); `LIMITE_PERGUNTAS`, `TIPOS_PERGUNTA`, `TipoPergunta` (Task 1)
- Produces: `type PerguntaEditor = { id: string; texto: string; tipo: TipoPergunta; obrigatoria: boolean; arquivada: boolean }`; `<LinhaPergunta pergunta posicao total />`; `<LinhaPerguntaArquivada pergunta podeDevolver />`; `<FormularioNovaPergunta pesquisaId tiposDisponiveis noLimite />`; `<IconeTipoPergunta tipo className />`

- [ ] **Step 1: Ícones dos tipos**

`src/components/icones/icone-tipo-pergunta.tsx`:
```tsx
import type { TipoPergunta } from "@/lib/pesquisas/esquemas";
import { cn } from "@/lib/utils";

// Ícones próprios dos tipos de pergunta, nas cores da marca
export function IconeTipoPergunta({ tipo, className }: { tipo: TipoPergunta; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={cn("size-6", className)}>
      {tipo === "nota" && (
        <>
          {/* Selo com "10" (manga) */}
          <rect x="2.5" y="4.5" width="19" height="15" rx="4" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="1.6" />
          <path d="M8 9.5v5M11.5 12a2 2.5 0 1 0 4 0 2 2.5 0 1 0-4 0" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {tipo === "texto" && (
        <>
          {/* Balão com linhas (menta) */}
          <path d="M5.5 4h13a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H11l-4.5 3.5V17h-1a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" fill="var(--menta-claro)" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M7.5 9h9M7.5 12.5h6" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {tipo === "funcionario" && (
        <>
          {/* Pessoa com crachá (coral) */}
          <circle cx="12" cy="8" r="3.5" fill="var(--creme)" stroke="var(--ameixa)" strokeWidth="1.6" />
          <path d="M5 20.5v-1a7 7 0 0 1 14 0v1Z" fill="var(--coral)" stroke="var(--ameixa)" strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="13.5" y="15.5" width="3.5" height="2.5" rx=".8" fill="var(--creme)" />
        </>
      )}
    </svg>
  );
}
```

- [ ] **Step 2: Linha da pergunta**

`src/app/painel/pesquisas/[id]/linha-pergunta.tsx`:
```tsx
"use client";

import { ArrowDown, ArrowUp, Ellipsis } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { IconeTipoPergunta } from "@/components/icones/icone-tipo-pergunta";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { TipoPergunta } from "@/lib/pesquisas/esquemas";
import { ROTULO_TIPO } from "@/lib/pesquisas/tipos";
import {
  alterarObrigatoria,
  arquivarPergunta,
  editarTextoPergunta,
  moverPergunta,
  type EstadoAcao,
} from "../actions";

export type PerguntaEditor = {
  id: string;
  texto: string;
  tipo: TipoPergunta;
  obrigatoria: boolean;
  arquivada: boolean;
};

// Roda uma action, mostra erro e anuncia o resultado para o leitor de tela
function useExecutar() {
  const [erro, setErro] = useState<string>();
  const [anuncio, setAnuncio] = useState("");
  const [pendente, iniciar] = useTransition();
  function executar(acao: () => Promise<EstadoAcao>) {
    setErro(undefined);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      if (r.anuncio) setAnuncio(r.anuncio);
    });
  }
  return { erro, anuncio, pendente, executar };
}

export function LinhaPergunta({
  pergunta,
  posicao,
  total,
}: {
  pergunta: PerguntaEditor;
  posicao: number; // 1, 2, 3…
  total: number;
}) {
  const [editando, setEditando] = useState(false);
  const { erro, anuncio, pendente, executar } = useExecutar();
  const devolverFoco = useRef(false);
  const focarDepoisDeMover = useRef<"subir" | "descer" | null>(null);
  const botaoSubir = useRef<HTMLButtonElement>(null);
  const botaoDescer = useRef<HTMLButtonElement>(null);
  const botaoAcoes = useRef<HTMLButtonElement | null>(null);

  const primeira = posicao === 1;
  const ultima = posicao === total;

  // Depois de subir/descer a posição muda: o foco acompanha a pergunta.
  // Se ela chegou na ponta, a seta clicada fica desabilitada; o foco vai para a outra.
  useEffect(() => {
    const direcao = focarDepoisDeMover.current;
    if (!direcao) return;
    focarDepoisDeMover.current = null;
    const alvo =
      direcao === "subir" ? (primeira ? botaoDescer : botaoSubir) : ultima ? botaoSubir : botaoDescer;
    (alvo.current ?? botaoAcoes.current)?.focus();
  }, [posicao, primeira, ultima]);

  function mover(direcao: "subir" | "descer") {
    focarDepoisDeMover.current = direcao;
    executar(() => moverPergunta(pergunta.id, direcao));
  }

  const terminarEdicao = useCallback(() => {
    devolverFoco.current = true;
    setEditando(false);
  }, []);

  // Ref de callback: quando o ⋯ reaparece depois da edição, recebe o foco
  function aoMontarBotaoAcoes(botao: HTMLButtonElement | null) {
    botaoAcoes.current = botao;
    if (botao && devolverFoco.current) {
      devolverFoco.current = false;
      botao.focus();
    }
  }

  if (editando) {
    return <FormularioTextoPergunta pergunta={pergunta} aoTerminar={terminarEdicao} />;
  }

  return (
    <li className="py-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
      <div className="flex items-start gap-3">
        <span className="numeros mt-2.5 w-5 shrink-0 text-right font-bold text-muted-foreground">
          {posicao}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <IconeTipoPergunta tipo={pergunta.tipo} className="size-5 shrink-0" />
            {ROTULO_TIPO[pergunta.tipo]}
            {pergunta.obrigatoria && (
              <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-coral-escuro">
                Obrigatória
              </span>
            )}
          </p>
          <p className="mt-0.5 font-medium break-words">{pergunta.texto}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            ref={botaoSubir}
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={`Subir “${pergunta.texto}”`}
            disabled={primeira || pendente}
            onClick={() => mover("subir")}
          >
            <ArrowUp className="size-5" aria-hidden="true" />
          </Button>
          <Button
            ref={botaoDescer}
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={`Descer “${pergunta.texto}”`}
            disabled={ultima || pendente}
            onClick={() => mover("descer")}
          >
            <ArrowDown className="size-5" aria-hidden="true" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                ref={aoMontarBotaoAcoes}
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`Ações para “${pergunta.texto}”`}
                disabled={pendente}
              >
                <Ellipsis className="size-5" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => setEditando(true)}>Editar texto</DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => executar(() => alterarObrigatoria(pergunta.id, !pergunta.obrigatoria))}
              >
                {pergunta.obrigatoria ? "Tornar opcional" : "Tornar obrigatória"}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => executar(() => arquivarPergunta(pergunta.id, true))}>
                Tirar da pesquisa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div role="alert">
        {erro && <p className="mt-1 pl-8 text-sm font-medium text-destructive">{erro}</p>}
      </div>
      <p role="status" className="sr-only">{anuncio}</p>
    </li>
  );
}

export function LinhaPerguntaArquivada({
  pergunta,
  podeDevolver,
}: {
  pergunta: PerguntaEditor;
  podeDevolver: boolean; // falso quando já há 10 perguntas ou outra de funcionário valendo
}) {
  const { erro, pendente, executar } = useExecutar();

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <IconeTipoPergunta tipo={pergunta.tipo} className="size-5 shrink-0 grayscale" />
        <p className="min-w-0 flex-1 break-words text-muted-foreground">{pergunta.texto}</p>
        <Button
          variant="outline"
          disabled={!podeDevolver || pendente}
          aria-label={`Devolver “${pergunta.texto}” para a pesquisa`}
          onClick={() => executar(() => arquivarPergunta(pergunta.id, false))}
        >
          Devolver
        </Button>
      </div>
      <div role="alert">
        {erro && <p className="mt-1 text-sm font-medium text-destructive">{erro}</p>}
      </div>
    </li>
  );
}

function FormularioTextoPergunta({
  pergunta,
  aoTerminar,
}: {
  pergunta: PerguntaEditor;
  aoTerminar: () => void;
}) {
  const [estado, acao, pendente] = useActionState(editarTextoPergunta, {} as EstadoAcao);

  useEffect(() => {
    if (estado.ok) aoTerminar();
  }, [estado.ok, aoTerminar]);

  const idErro = `erro-pergunta-${pergunta.id}`;

  return (
    <li className="py-3">
      <form
        action={acao}
        className="flex flex-col gap-2 sm:flex-row"
        onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
        noValidate
      >
        <input type="hidden" name="id" value={pergunta.id} />
        <Input
          name="texto"
          aria-label={`Novo texto para “${pergunta.texto}”`}
          defaultValue={estado.valor ?? pergunta.texto}
          maxLength={120}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          autoComplete="off"
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? idErro : undefined}
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar"}
          </Button>
          <Button type="button" variant="ghost" onClick={aoTerminar}>
            Cancelar
          </Button>
        </div>
      </form>
      {estado.erro && (
        <p id={idErro} role="alert" className="mt-1 text-sm font-medium text-destructive">
          {estado.erro}
        </p>
      )}
    </li>
  );
}
```
> `grayscale` no ícone arquivado é só reforço visual; o texto cinza e a seção "Tiradas da pesquisa" já dizem o estado (nada só por cor).

- [ ] **Step 3: Formulário de nova pergunta**

`src/app/painel/pesquisas/[id]/formulario-nova-pergunta.tsx`:
```tsx
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { IconeTipoPergunta } from "@/components/icones/icone-tipo-pergunta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LIMITE_PERGUNTAS, type TipoPergunta } from "@/lib/pesquisas/esquemas";
import { DESCRICAO_TIPO, ROTULO_TIPO } from "@/lib/pesquisas/tipos";
import { cn } from "@/lib/utils";
import { adicionarPergunta, type EstadoAcao } from "../actions";

// Texto pronto para cada tipo: o dono só ajusta, se quiser
const TEXTO_INICIAL: Record<TipoPergunta, string> = {
  nota: "",
  texto: "",
  funcionario: "Quem te atendeu?",
};

export function FormularioNovaPergunta({
  pesquisaId,
  tiposDisponiveis,
  noLimite,
}: {
  pesquisaId: string;
  tiposDisponiveis: TipoPergunta[]; // sem "funcionario" se já houver uma valendo
  noLimite: boolean;
}) {
  const [estado, acao, pendente] = useActionState(adicionarPergunta, {} as EstadoAcao);
  const [tipo, setTipo] = useState<TipoPergunta>(tiposDisponiveis[0] ?? "nota");
  const campo = useRef<HTMLInputElement>(null);

  // Tipo escolhido sumiu da lista (ex.: acabou de adicionar "Quem te atendeu?")
  const tipoValido = tiposDisponiveis.includes(tipo) ? tipo : (tiposDisponiveis[0] ?? "nota");

  // Depois de adicionar, o campo continua focado para a próxima
  useEffect(() => {
    if (estado.ok) campo.current?.focus();
  }, [estado.ok]);

  if (noLimite) {
    return (
      <p className="rounded-2xl bg-manga-claro p-4 text-sm font-medium text-manga-texto">
        Pesquisas curtas recebem mais respostas. O limite é {LIMITE_PERGUNTAS} perguntas: para
        adicionar outra, tire uma da pesquisa.
      </p>
    );
  }

  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="pesquisaId" value={pesquisaId} />
      <fieldset>
        <legend className="mb-2 font-semibold">Tipo da pergunta</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {tiposDisponiveis.map((t) => (
            <label
              key={t}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-2 rounded-2xl border-2 p-3 transition-colors has-focus-visible:ring-2 has-focus-visible:ring-ring",
                tipoValido === t ? "border-ameixa bg-creme" : "border-border hover:border-ameixa/40",
              )}
            >
              <input
                type="radio"
                name="tipo"
                value={t}
                checked={tipoValido === t}
                onChange={() => setTipo(t)}
                className="sr-only"
              />
              <IconeTipoPergunta tipo={t} className="mt-0.5 size-6 shrink-0" />
              <span>
                <span className="block font-semibold">{ROTULO_TIPO[t]}</span>
                <span className="block text-sm text-muted-foreground">{DESCRICAO_TIPO[t]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="nova-pergunta">Pergunta</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            // key: ao trocar o tipo, o campo recomeça com o texto pronto daquele tipo
            key={tipoValido}
            ref={campo}
            id="nova-pergunta"
            name="texto"
            placeholder="Ex.: Que nota você dá para a comida?"
            defaultValue={estado.valor ?? TEXTO_INICIAL[tipoValido]}
            maxLength={120}
            autoComplete="off"
            aria-invalid={Boolean(estado.erro)}
            aria-describedby={estado.erro ? "erro-nova-pergunta" : undefined}
          />
          <Button type="submit" disabled={pendente} className="sm:w-32">
            {pendente ? "Adicionando…" : "Adicionar"}
          </Button>
        </div>
        <div role="alert">
          {estado.erro && (
            <p id="erro-nova-pergunta" className="text-sm font-medium text-destructive">
              {estado.erro}
            </p>
          )}
        </div>
        <p role="status" className="sr-only">{estado.anuncio}</p>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Página usa os componentes e mostra os avisos**

Em `src/app/painel/pesquisas/[id]/page.tsx`: acrescentar imports
```tsx
import { TIPOS_PERGUNTA, LIMITE_PERGUNTAS } from "@/lib/pesquisas/esquemas";
import { FormularioNovaPergunta } from "./formulario-nova-pergunta";
import { LinhaPergunta, LinhaPerguntaArquivada, type PerguntaEditor } from "./linha-pergunta";
```
Depois de buscar as perguntas, trocar o cálculo por:
```tsx
  const todas = (perguntas ?? []) as PerguntaEditor[];
  const valendo = todas.filter((p) => !p.arquivada);
  const tiradas = todas.filter((p) => p.arquivada);
  const temFuncionarioValendo = valendo.some((p) => p.tipo === "funcionario");
  const noLimite = valendo.length >= LIMITE_PERGUNTAS;

  // Avisos que ajudam o dono a não cair em armadilha
  const { count: funcionariosAtivos } = await supabase
    .from("funcionarios")
    .select("id", { count: "exact", head: true })
    .eq("empresa_id", atual.id)
    .eq("ativo", true);
  const semEquipe = temFuncionarioValendo && (funcionariosAtivos ?? 0) === 0;
  const semNota = !valendo.some((p) => p.tipo === "nota");
```
E trocar a `<section>` por:
```tsx
      <section className="entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        <h2 className="text-xl font-bold">
          Perguntas <span className="numeros text-muted-foreground">({valendo.length})</span>
        </h2>

        {(semEquipe || semNota) && (
          <ul className="mt-4 space-y-2">
            {semEquipe && (
              <li className="rounded-2xl bg-manga-claro p-3 text-sm font-medium text-manga-texto">
                A pergunta &ldquo;Quem te atendeu?&rdquo; só aparece para o cliente quando houver
                funcionários ativos.{" "}
                <Link href="/painel/funcionarios" className="font-semibold underline underline-offset-4">
                  Cadastrar a equipe
                </Link>
              </li>
            )}
            {semNota && (
              <li className="rounded-2xl bg-manga-claro p-3 text-sm font-medium text-manga-texto">
                Sem uma pergunta de nota, o painel não terá médias nem gráficos.
              </li>
            )}
          </ul>
        )}

        {valendo.length === 0 ? (
          <p className="mt-4 text-muted-foreground">
            Nenhuma pergunta valendo. Adicione uma logo abaixo.
          </p>
        ) : (
          <ol className="mt-2 divide-y divide-border">
            {valendo.map((p, i) => (
              <LinhaPergunta key={p.id} pergunta={p} posicao={i + 1} total={valendo.length} />
            ))}
          </ol>
        )}

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="mb-4 text-lg font-bold">Adicionar pergunta</h3>
          <FormularioNovaPergunta
            pesquisaId={pesquisa.id}
            tiposDisponiveis={TIPOS_PERGUNTA.filter((t) => t !== "funcionario" || !temFuncionarioValendo)}
            noLimite={noLimite}
          />
        </div>

        {tiradas.length > 0 && (
          <details className="group mt-6 border-t border-border pt-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
              Tiradas da pesquisa <span className="numeros ml-1 text-muted-foreground">({tiradas.length})</span>
            </summary>
            <p className="text-sm text-muted-foreground">
              Não aparecem para o cliente, mas as respostas antigas continuam no painel.
            </p>
            <ul className="divide-y divide-border">
              {tiradas.map((p) => (
                <LinhaPerguntaArquivada
                  key={p.id}
                  pergunta={p}
                  podeDevolver={!noLimite && !(p.tipo === "funcionario" && temFuncionarioValendo)}
                />
              ))}
            </ul>
          </details>
        )}
      </section>
```

- [ ] **Step 5: lint, test, build; Chrome** (computador e 639px):
  - pesquisa nova mostra 3 perguntas com ícone, tipo e "Obrigatória" na de nota;
  - subir/descer (setas desabilitadas nas pontas; foco acompanha a pergunta; ordem persiste ao recarregar);
  - editar texto (Enter, Esc, vazio → erro; foco volta ao ⋯);
  - tornar opcional/obrigatória;
  - adicionar nota e texto; tipo "Quem te atendeu?" some quando já existe; escolher tipo pelo teclado (setas no grupo de rádio);
  - adicionar até 10 → aviso de limite no lugar do formulário;
  - tirar da pesquisa → vai para "Tiradas"; Devolver volta para o fim; Devolver desabilitado no limite;
  - avisos: tirar a de nota → aviso "Sem uma pergunta de nota…"; empresa sem funcionários ativos com "Quem te atendeu?" → aviso com link.
- [ ] **Step 6: Passada de skills de design** e correções.
- [ ] **Step 7: Commit** — `feat: editar perguntas da pesquisa (adicionar, ordenar, obrigatória, tirar e devolver)`

---

### Task 6: Verificação completa, documentação, PR e merge

- [ ] **Step 1:** Rodar os três testes de RLS e os advisors; `impeccable detect src/app src/components`.
- [ ] **Step 2:** Percorrer tudo de novo no Chrome (computador e 639px), incluindo trocar de empresa no seletor (cada empresa vê só as próprias pesquisas).
- [ ] **Step 3:** README (Etapa 4 concluída, "O que já existe", estrutura, testes), CLAUDE.md (status; próxima: Etapa 5), commit `docs: Etapa 4 concluída`.
- [ ] **Step 4:** Push, PR para `main` e **merge** (o Caio autorizou merge sem perguntar); atualizar o `main` local.

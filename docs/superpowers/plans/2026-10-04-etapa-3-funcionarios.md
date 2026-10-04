# Etapa 3 — Cadastro de funcionários: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A empresa logada consegue adicionar, renomear, desativar, reativar e excluir os próprios funcionários em `/painel/funcionarios`, com os dados isolados por RLS.

**Architecture:** Nova tabela `funcionarios` (FK para `empresas`) com RLS que confere o dono via `empresas.owner_id`. Página Server Component lista os funcionários; Server Actions fazem as mudanças e chamam `revalidatePath`. Componentes cliente cuidam do formulário, do menu ⋯ e da confirmação de exclusão.

**Tech Stack:** Next.js 16.3 · React 19 · TypeScript · Tailwind 4 · shadcn/ui (Radix) · Supabase · zod 4 · Vitest

**Spec:** `docs/superpowers/specs/2026-10-04-etapa-3-funcionarios-design.md`

## Global Constraints

- Projeto Supabase ref **`cvgayvfqzrbdqmlsvcal`** (ferramentas `mcp__supabase__*`).
- Next 16: consultar `node_modules/next/dist/docs/` antes de escrever código do Next (regra do `AGENTS.md`).
- No servidor, identidade só via `supabase.auth.getClaims()`; o isolamento entre empresas é do RLS. A empresa do usuário é buscada no servidor, **nunca** recebida do formulário.
- Interface e comentários em português do Brasil. **Sem emojis** na interface: ícones próprios em `src/components/icones/`; ícones genéricos (⋯) do `lucide-react` (o de reticências se chama `Ellipsis`).
- Nome do funcionário: trim, 1 a 60 caracteres; único por empresa sem diferenciar maiúsculas.
- Mensagem de nome repetido (exata): `Já existe um funcionário com esse nome. Diferencie, por exemplo: Ana Paula ou Ana C.`
- Cores e componentes da Etapa 2 (botões principais ameixa, `bg-manga-claro`, `text-coral-escuro`, `text-destructive`). Texto de itens inativos com `text-muted-foreground`, **nunca** `opacity` (contraste).
- Nenhuma biblioteca nova. `npx shadcn@latest add dropdown-menu alert-dialog` é permitido (usa o `radix-ui` instalado).
- Cada tarefa termina com `npm run lint`, `npm run build` e `npm test` passando (conferir o código de saída) e um commit em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Explicar ao Caio o que foi feito ao fim de cada tarefa.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/funcionarios/esquemas.ts` (+ `.test.ts`) | Validação do nome e do id; tradução do erro de nome repetido |
| `supabase/migrations/20261004000000_funcionarios.sql` | Tabela, índice único, RLS, permissões |
| `supabase/tests/rls_funcionarios.sql` | Prova de segurança |
| `src/lib/supabase/database.types.ts` | Tipos regenerados |
| `src/app/painel/nav-painel.tsx` | Links Início / Funcionários com destaque do ativo |
| `src/app/painel/layout.tsx` | Cabeçalho com o menu |
| `src/app/painel/page.tsx` | Atalho "Cadastrar funcionários →" |
| `src/components/icones/icone-equipe.tsx` | Ícone da lista vazia |
| `src/components/ui/{dropdown-menu,alert-dialog}.tsx` | Gerados pelo shadcn |
| `src/app/painel/funcionarios/actions.ts` | Server Actions |
| `src/app/painel/funcionarios/page.tsx` | Página com as listas |
| `src/app/painel/funcionarios/formulario-adicionar.tsx` | Adicionar |
| `src/app/painel/funcionarios/linha-funcionario.tsx` | Linha: menu ⋯, renomear, desativar/reativar, excluir |

---

### Task 1: Validação do nome do funcionário

**Files:**
- Create: `src/lib/funcionarios/esquemas.ts`, `src/lib/funcionarios/esquemas.test.ts`

**Interfaces:**
- Produces: `esquemaNomeFuncionario` (zod string → string limpa), `esquemaIdFuncionario` (zod uuid), `mensagemErroFuncionario(codigo?: string): string`

- [ ] **Step 1: Teste que falha**

`src/lib/funcionarios/esquemas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  esquemaIdFuncionario,
  esquemaNomeFuncionario,
  mensagemErroFuncionario,
} from "./esquemas";

describe("esquemaNomeFuncionario", () => {
  it("aceita e limpa espaços das pontas", () => {
    expect(esquemaNomeFuncionario.parse("  Ana Paula  ")).toBe("Ana Paula");
  });

  it("recusa vazio ou só espaços", () => {
    const r = esquemaNomeFuncionario.safeParse("   ");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Digite o nome do funcionário.");
  });

  it("aceita 60 caracteres e recusa 61", () => {
    expect(esquemaNomeFuncionario.safeParse("a".repeat(60)).success).toBe(true);
    const r = esquemaNomeFuncionario.safeParse("a".repeat(61));
    expect(r.error?.issues[0].message).toBe("O nome pode ter no máximo 60 caracteres.");
  });

  it("recusa valor que não é texto", () => {
    expect(esquemaNomeFuncionario.safeParse(null).success).toBe(false);
  });
});

describe("esquemaIdFuncionario", () => {
  it("aceita uuid e recusa outras coisas", () => {
    expect(esquemaIdFuncionario.safeParse("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b").success).toBe(true);
    expect(esquemaIdFuncionario.safeParse("1 or 1=1").success).toBe(false);
  });
});

describe("mensagemErroFuncionario", () => {
  it("traduz nome repetido (23505)", () => {
    expect(mensagemErroFuncionario("23505")).toBe(
      "Já existe um funcionário com esse nome. Diferencie, por exemplo: Ana Paula ou Ana C.",
    );
  });

  it("usa mensagem genérica nos outros casos", () => {
    expect(mensagemErroFuncionario("42501")).toBe("Algo deu errado. Tente de novo em instantes.");
    expect(mensagemErroFuncionario()).toBe("Algo deu errado. Tente de novo em instantes.");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL (`./esquemas` não existe).

- [ ] **Step 3: Implementar**

`src/lib/funcionarios/esquemas.ts`:
```ts
import { z } from "zod";

// Mesmas regras do banco: 1 a 60 caracteres, sem espaços nas pontas
export const esquemaNomeFuncionario = z
  .string("Digite o nome do funcionário.")
  .trim()
  .min(1, "Digite o nome do funcionário.")
  .max(60, "O nome pode ter no máximo 60 caracteres.");

// Ids chegam do navegador: conferimos o formato antes de usar
export const esquemaIdFuncionario = z.uuid("Funcionário inválido.");

const MENSAGENS: Record<string, string> = {
  // unique_violation: o índice único (empresa_id, lower(nome)) recusou
  "23505": "Já existe um funcionário com esse nome. Diferencie, por exemplo: Ana Paula ou Ana C.",
};

export function mensagemErroFuncionario(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || "Algo deu errado. Tente de novo em instantes.";
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.
- [ ] **Step 5: lint, build, commit** — `feat: validação do nome do funcionário`

---

### Task 2: Banco — tabela `funcionarios`, RLS e prova de segurança

**Files:**
- Create: `supabase/tests/rls_funcionarios.sql`, `supabase/migrations/20261004000000_funcionarios.sql`
- Modify: `src/lib/supabase/database.types.ts` (regenerar)

**Interfaces:**
- Produces: tabela `public.funcionarios (id, empresa_id, nome, ativo, created_at)`; tipos `Database["public"]["Tables"]["funcionarios"]`

- [ ] **Step 1: Teste de segurança primeiro**

`supabase/tests/rls_funcionarios.sql`:
```sql
-- Prova de segurança da tabela funcionarios. Desfaz tudo no final (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'func-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'func-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Funcionário da empresa B, criado como administrador
insert into public.funcionarios (empresa_id, nome)
select id, 'Bia' from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b1';

-- Agora como o dono da empresa A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

do $$
declare
  minha_empresa uuid := (select id from public.empresas);
  empresa_b uuid := (select empresa_id from public.funcionarios where nome = 'Bia'); -- RLS: deve ser null
begin
  if empresa_b is not null then
    raise exception 'FALHOU: A enxerga funcionário da empresa B';
  end if;

  insert into public.funcionarios (empresa_id, nome) values (minha_empresa, 'Ana');

  begin
    insert into public.funcionarios (empresa_id, nome) values (minha_empresa, 'ANA');
    raise exception 'FALHOU: aceitou nome repetido com maiúsculas diferentes';
  exception when unique_violation then null;
  end;

  if (select count(*) from public.funcionarios) <> 1 then
    raise exception 'FALHOU: A deveria ver só os próprios funcionários';
  end if;

  update public.funcionarios set nome = 'Ana Paula', ativo = false where nome = 'Ana';
  if (select nome || '/' || ativo from public.funcionarios) <> 'Ana Paula/false' then
    raise exception 'FALHOU: dono não conseguiu renomear/desativar';
  end if;

  -- Mexer na empresa B não afeta nada (RLS esconde as linhas)
  update public.funcionarios set nome = 'Hackeado' where nome = 'Bia';
  delete from public.funcionarios where nome = 'Bia';

  -- Mover funcionário de empresa: proibido (permissão de coluna)
  begin
    update public.funcionarios set empresa_id = gen_random_uuid();
    raise exception 'FALHOU: conseguiu trocar a empresa do funcionário';
  exception when insufficient_privilege then null;
  end;

  delete from public.funcionarios where nome = 'Ana Paula';
  if (select count(*) from public.funcionarios) <> 0 then
    raise exception 'FALHOU: dono não conseguiu excluir';
  end if;
end $$;

-- Criar funcionário na empresa de outro: proibido.
-- A não enxerga a empresa B, então pegamos o id dela como administrador e guardamos.
reset role;
select set_config('app.empresa_b',
  (select id::text from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b1'), true);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.funcionarios (empresa_id, nome)
    values (current_setting('app.empresa_b')::uuid, 'Intruso');
    raise exception 'FALHOU: A criou funcionário na empresa B';
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
    perform count(*) from public.funcionarios;
    raise exception 'FALHOU: visitante consegue ler funcionários';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Conferência final como administrador
reset role;
do $$
begin
  if (select nome from public.funcionarios
       where empresa_id = current_setting('app.empresa_b')::uuid) is distinct from 'Bia' then
    raise exception 'FALHOU: funcionário da empresa B foi alterado ou apagado';
  end if;
end $$;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;
```

- [ ] **Step 2: Rodar e ver falhar** — `mcp__supabase__execute_sql` com o arquivo → erro `relation "public.funcionarios" does not exist`.

- [ ] **Step 3: Migração**

`supabase/migrations/20261004000000_funcionarios.sql`:
```sql
-- Etapa 3: funcionários de cada empresa

create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null check (nome = btrim(nome) and char_length(nome) between 1 and 60),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.funcionarios is 'Quem atende os clientes; aparece em "Quem te atendeu?".';

-- Mesmo nome na mesma empresa não pode (sem diferenciar maiúsculas).
-- Começa por empresa_id, então também serve de índice para a chave estrangeira.
create unique index funcionarios_empresa_nome_unico
  on public.funcionarios (empresa_id, lower(nome));

alter table public.funcionarios enable row level security;

-- Regra comum: a empresa do funcionário pertence ao usuário logado
create policy "dono lê os próprios funcionários"
  on public.funcionarios for select to authenticated
  using (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

create policy "dono cria funcionários na própria empresa"
  on public.funcionarios for insert to authenticated
  with check (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

create policy "dono edita os próprios funcionários"
  on public.funcionarios for update to authenticated
  using (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

create policy "dono exclui os próprios funcionários"
  on public.funcionarios for delete to authenticated
  using (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

-- Permissões por coluna: ninguém troca o funcionário de empresa.
-- Visitante sem login: nada (a Etapa 5 libera só o necessário para a pesquisa).
revoke all on public.funcionarios from anon, authenticated;
grant select, delete on public.funcionarios to authenticated;
grant insert (empresa_id, nome) on public.funcionarios to authenticated;
grant update (nome, ativo) on public.funcionarios to authenticated;
```

- [ ] **Step 4: Aplicar** — `mcp__supabase__apply_migration` (`name: "funcionarios"`).
- [ ] **Step 5: Teste passa** — rodar `rls_funcionarios.sql` → `TODOS OS TESTES DE SEGURANÇA PASSARAM`. Conferir sobras: `select count(*) from auth.users where email like 'func-%@exemplo.com'` → `0`. Rodar também `rls_empresas.sql` (não pode ter quebrado).
- [ ] **Step 6: Advisors** — security e performance: nada novo além do aviso de senhas vazadas (plano Pro).
- [ ] **Step 7: Tipos** — `mcp__supabase__generate_typescript_types` → salvar em `src/lib/supabase/database.types.ts`.
- [ ] **Step 8: lint, build, test, commit** — `feat: tabela funcionarios com RLS e teste de segurança`

---

### Task 3: Menu do painel e atalho

**Files:**
- Create: `src/app/painel/nav-painel.tsx`
- Modify: `src/app/painel/layout.tsx`, `src/app/painel/page.tsx`

- [ ] **Step 1: Componente do menu**

`src/app/painel/nav-painel.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/painel", rotulo: "Início" },
  { href: "/painel/funcionarios", rotulo: "Funcionários" },
];

export function NavPainel() {
  const caminho = usePathname();

  return (
    <nav aria-label="Painel" className="flex gap-1">
      {LINKS.map((link) => {
        // "Início" só fica ativo na própria página; os outros também nas subpáginas
        const ativo =
          link.href === "/painel" ? caminho === "/painel" : caminho.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={ativo ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-muted",
              ativo ? "bg-manga-claro text-ameixa" : "text-muted-foreground",
            )}
          >
            {link.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Layout** — em `src/app/painel/layout.tsx`, importar `NavPainel` e trocar o `<div>` interno do `<header>` por:
```tsx
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/painel" className="rounded-md" aria-label="Painel">
            <Logo className="text-2xl" />
          </Link>
          {/* No celular o menu desce para uma linha própria */}
          <div className="order-last w-full sm:order-none sm:mr-auto sm:w-auto">
            <NavPainel />
          </div>
          <form action={sair}>
            <Button type="submit" variant="ghost">
              Sair
            </Button>
          </form>
        </div>
```

- [ ] **Step 3: Atalho** — em `src/app/painel/page.tsx`, importar `Link` de `next/link` e acrescentar no fim da `<section>`:
```tsx
        <Link
          href="/painel/funcionarios"
          className="mt-4 inline-block font-semibold text-coral-escuro underline-offset-4 hover:underline"
        >
          Cadastrar funcionários →
        </Link>
```
- [ ] **Step 4: lint, build, test, commit** — `feat: menu do painel com link para funcionários`

---

### Task 4: Página de funcionários — listar e adicionar

**Files:**
- Create: `src/components/icones/icone-equipe.tsx`, `src/app/painel/funcionarios/actions.ts`, `src/app/painel/funcionarios/formulario-adicionar.tsx`, `src/app/painel/funcionarios/page.tsx`

**Interfaces:**
- Consumes: `esquemaNomeFuncionario`, `esquemaIdFuncionario`, `mensagemErroFuncionario` (Task 1); tipos (Task 2)
- Produces: `type EstadoAcao = { erro?: string; ok?: number; valor?: string }`; actions `adicionarFuncionario(estado, formData)`, `renomearFuncionario(estado, formData)`, `alterarAtivo(id, ativo)`, `excluirFuncionario(id)` (as três últimas usadas na Task 5)

- [ ] **Step 1: Ícone da lista vazia**

`src/components/icones/icone-equipe.tsx`:
```tsx
import { cn } from "@/lib/utils";

// Ícone próprio: duas pessoas (equipe) nas cores da marca
export function IconeEquipe({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className={cn("size-12", className)}>
      {/* Pessoa de trás (manga) */}
      <circle cx="31" cy="15" r="6" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="2.5" />
      <path d="M21 38v-3a10 10 0 0 1 20 0v3" fill="var(--manga)" stroke="var(--ameixa)" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Pessoa da frente (menta) */}
      <circle cx="18" cy="19" r="6.5" fill="var(--menta)" stroke="var(--ameixa)" strokeWidth="2.5" />
      <path d="M7 42v-3.5a11 11 0 0 1 22 0V42Z" fill="var(--menta)" stroke="var(--ameixa)" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Server Actions**

`src/app/painel/funcionarios/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  esquemaIdFuncionario,
  esquemaNomeFuncionario,
  mensagemErroFuncionario,
} from "@/lib/funcionarios/esquemas";
import { createClient } from "@/lib/supabase/server";

export type EstadoAcao = {
  erro?: string;
  ok?: number; // muda a cada sucesso (para o formulário saber que deu certo)
  valor?: string; // o que foi digitado, para não sumir depois de um erro
};

const CAMINHO = "/painel/funcionarios";

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

export async function adicionarFuncionario(
  _estado: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const digitado = texto(formData, "nome");
  const nome = esquemaNomeFuncionario.safeParse(digitado);
  if (!nome.success) return { erro: nome.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  // A empresa vem do banco (o RLS só devolve a do usuário), nunca do formulário
  const { data: empresa } = await supabase.from("empresas").select("id").maybeSingle();
  if (!empresa) return { erro: mensagemErroFuncionario(), valor: digitado };

  const { error } = await supabase
    .from("funcionarios")
    .insert({ empresa_id: empresa.id, nome: nome.data });
  if (error) return { erro: mensagemErroFuncionario(error.code), valor: digitado };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

export async function renomearFuncionario(
  _estado: EstadoAcao,
  formData: FormData,
): Promise<EstadoAcao> {
  const digitado = texto(formData, "nome");
  const id = esquemaIdFuncionario.safeParse(texto(formData, "id"));
  const nome = esquemaNomeFuncionario.safeParse(digitado);
  if (!id.success) return { erro: mensagemErroFuncionario(), valor: digitado };
  if (!nome.success) return { erro: nome.error.issues[0].message, valor: digitado };

  const supabase = await createClient();
  const { error } = await supabase
    .from("funcionarios")
    .update({ nome: nome.data })
    .eq("id", id.data);
  if (error) return { erro: mensagemErroFuncionario(error.code), valor: digitado };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

export async function alterarAtivo(idRecebido: string, ativo: boolean): Promise<EstadoAcao> {
  const id = esquemaIdFuncionario.safeParse(idRecebido);
  if (!id.success || typeof ativo !== "boolean") return { erro: mensagemErroFuncionario() };

  const supabase = await createClient();
  const { error } = await supabase.from("funcionarios").update({ ativo }).eq("id", id.data);
  if (error) return { erro: mensagemErroFuncionario(error.code) };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}

export async function excluirFuncionario(idRecebido: string): Promise<EstadoAcao> {
  const id = esquemaIdFuncionario.safeParse(idRecebido);
  if (!id.success) return { erro: mensagemErroFuncionario() };

  const supabase = await createClient();
  const { error } = await supabase.from("funcionarios").delete().eq("id", id.data);
  if (error) return { erro: mensagemErroFuncionario(error.code) };

  revalidatePath(CAMINHO);
  return { ok: Date.now() };
}
```

- [ ] **Step 3: Formulário de adicionar**

`src/app/painel/funcionarios/formulario-adicionar.tsx`:
```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adicionarFuncionario, type EstadoAcao } from "./actions";

const estadoInicial: EstadoAcao = {};

export function FormularioAdicionar() {
  const [estado, acao, pendente] = useActionState(adicionarFuncionario, estadoInicial);
  const campo = useRef<HTMLInputElement>(null);

  // Depois de adicionar, o campo (já limpo pelo React) continua focado:
  // dá para cadastrar a equipe inteira em sequência
  useEffect(() => {
    if (estado.ok) campo.current?.focus();
  }, [estado.ok]);

  return (
    <div className="space-y-2">
      <form action={acao} className="flex flex-col gap-2 sm:flex-row" noValidate>
        <Label htmlFor="novo-funcionario" className="sr-only">
          Nome do funcionário
        </Label>
        <Input
          ref={campo}
          id="novo-funcionario"
          name="nome"
          placeholder="Nome do funcionário"
          autoComplete="off"
          maxLength={60}
          defaultValue={estado.valor}
          aria-invalid={Boolean(estado.erro)}
          aria-describedby={estado.erro ? "erro-adicionar" : undefined}
        />
        <Button type="submit" size="lg" className="sm:w-auto" disabled={pendente}>
          {pendente ? "Adicionando…" : "Adicionar"}
        </Button>
      </form>
      <p id="erro-adicionar" role="alert" className="min-h-5 text-sm font-medium text-destructive">
        {estado.erro}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Página** (nesta tarefa, a linha ainda é simples; a Task 5 troca por `LinhaFuncionario`)

`src/app/painel/funcionarios/page.tsx`:
```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IconeEquipe } from "@/components/icones/icone-equipe";
import { createClient } from "@/lib/supabase/server";
import { FormularioAdicionar } from "./formulario-adicionar";

export const metadata: Metadata = { title: "Funcionários" };

export default async function PaginaFuncionarios() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // O RLS só devolve os funcionários da empresa do usuário
  const { data: funcionarios } = await supabase
    .from("funcionarios")
    .select("id, nome, ativo")
    .order("nome");

  const ativos = funcionarios?.filter((f) => f.ativo) ?? [];
  const inativos = funcionarios?.filter((f) => !f.ativo) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funcionários</h1>
        <p className="mt-1 text-muted-foreground">
          Quem aparece na pergunta &ldquo;Quem te atendeu?&rdquo;
        </p>
      </div>

      <section className="rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
        <FormularioAdicionar />

        {ativos.length === 0 && inativos.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
              <IconeEquipe className="size-12" />
            </div>
            <p className="font-semibold">Nenhum funcionário ainda.</p>
            <p className="mt-1 max-w-sm text-muted-foreground">
              Adicione quem atende seus clientes. Se você atende sozinho, pode pular esta parte.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            <ListaFuncionarios titulo="Ativos" funcionarios={ativos} />
            {inativos.length > 0 && <ListaFuncionarios titulo="Inativos" funcionarios={inativos} />}
          </div>
        )}
      </section>
    </div>
  );
}

function ListaFuncionarios({
  titulo,
  funcionarios,
}: {
  titulo: string;
  funcionarios: { id: string; nome: string; ativo: boolean }[];
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo} ({funcionarios.length})
      </h2>
      <ul className="divide-y divide-border">
        {funcionarios.map((f) => (
          <li key={f.id} className="py-3 font-medium">
            {f.nome}
          </li>
        ))}
      </ul>
    </div>
  );
}
```
- [ ] **Step 5: lint, build, test, commit** — `feat: página de funcionários com listagem e cadastro`

---

### Task 5: Renomear, desativar, reativar e excluir

**Files:**
- Create (gerados): `src/components/ui/dropdown-menu.tsx`, `src/components/ui/alert-dialog.tsx`
- Create: `src/app/painel/funcionarios/linha-funcionario.tsx`
- Modify: `src/app/painel/funcionarios/page.tsx` (usar `LinhaFuncionario`)

- [ ] **Step 1:** `npx shadcn@latest add dropdown-menu alert-dialog -y` → conferir `git diff package.json` (não pode haver pacote novo).

- [ ] **Step 2: Linha do funcionário**

`src/app/painel/funcionarios/linha-funcionario.tsx`:
```tsx
"use client";

import { Ellipsis } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
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
  alterarAtivo,
  excluirFuncionario,
  renomearFuncionario,
  type EstadoAcao,
} from "./actions";

type Funcionario = { id: string; nome: string; ativo: boolean };

export function LinhaFuncionario({ funcionario }: { funcionario: Funcionario }) {
  const [editando, setEditando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState<string>();
  const [pendente, iniciar] = useTransition();

  // Roda uma action e mostra o erro, se houver
  function executar(acao: () => Promise<EstadoAcao>) {
    setErro(undefined);
    iniciar(async () => {
      const resultado = await acao();
      if (resultado.erro) setErro(resultado.erro);
    });
  }

  if (editando) {
    return <FormularioRenomear funcionario={funcionario} aoTerminar={() => setEditando(false)} />;
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3">
        <span className={cn("font-medium", !funcionario.ativo && "text-muted-foreground")}>
          {funcionario.nome}
        </span>
        <div className="flex items-center gap-1">
          {!funcionario.ativo && (
            <Button
              variant="outline"
              disabled={pendente}
              onClick={() => executar(() => alterarAtivo(funcionario.id, true))}
            >
              Reativar
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-10"
                aria-label={`Ações para ${funcionario.nome}`}
                disabled={pendente}
              >
                <Ellipsis className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditando(true)}>Renomear</DropdownMenuItem>
              {funcionario.ativo && (
                <DropdownMenuItem
                  onSelect={() => executar(() => alterarAtivo(funcionario.id, false))}
                >
                  Desativar
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirmandoExclusao(true)}>
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {erro && (
        <p role="alert" className="mt-1 text-sm font-medium text-destructive">
          {erro}
        </p>
      )}

      <AlertDialog open={confirmandoExclusao} onOpenChange={setConfirmandoExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {funcionario.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso não pode ser desfeito. Se essa pessoa só saiu da empresa, prefira Desativar: o
              histórico de avaliações continua guardado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => executar(() => excluirFuncionario(funcionario.id))}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function FormularioRenomear({
  funcionario,
  aoTerminar,
}: {
  funcionario: Funcionario;
  aoTerminar: () => void;
}) {
  const [estado, acao, pendente] = useActionState(renomearFuncionario, {} as EstadoAcao);

  useEffect(() => {
    if (estado.ok) aoTerminar();
  }, [estado.ok, aoTerminar]);

  const idErro = `erro-renomear-${funcionario.id}`;

  return (
    <li className="py-2">
      <form
        action={acao}
        className="flex flex-col gap-2 sm:flex-row"
        onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
        noValidate
      >
        <input type="hidden" name="id" value={funcionario.id} />
        <Input
          name="nome"
          aria-label={`Novo nome para ${funcionario.nome}`}
          defaultValue={estado.valor ?? funcionario.nome}
          maxLength={60}
          autoFocus
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
> Conferir no arquivo gerado se `DropdownMenuItem` aceita `variant="destructive"`; se não aceitar, usar `className="text-destructive focus:text-destructive"`. Conferir também que o texto branco do botão Excluir sobre `--destructive` (`#c2321f`) passa contraste (≈ 5:1).

- [ ] **Step 3: Usar a linha na página** — em `page.tsx`, importar `LinhaFuncionario` e trocar o `<li>` de `ListaFuncionarios` por `<LinhaFuncionario key={f.id} funcionario={f} />`.
- [ ] **Step 4: lint, build, test, commit** — `feat: renomear, desativar, reativar e excluir funcionários`

---

### Task 6: Verificação completa e documentação

- [ ] **Step 1:** O Caio entra na conta na janela do Chrome controlada. Testar: lista vazia → adicionar "Ana" e "Bruno" em sequência (Enter) → "ana" (erro de repetido, texto mantido) → nome vazio (erro) → renomear Ana para "Ana Paula" (e Esc cancela) → desativar Bruno (vai para Inativos) → reativar → excluir com confirmação (Cancelar não exclui) → menu Início/Funcionários destacando a página atual. Em largura de celular e computador.
- [ ] **Step 2:** Rodar os dois testes de RLS e os advisors; `impeccable detect src/app src/components`.
- [ ] **Step 3:** README (Etapa 3 concluída, "O que já existe", estrutura), CLAUDE.md (status), commit `docs: Etapa 3 concluída`, push e PR para `main`.

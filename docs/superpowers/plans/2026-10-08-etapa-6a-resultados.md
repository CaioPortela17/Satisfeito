# Etapa 6A (Resultados) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/painel/resultados` com totais (hoje, 7 e 30 dias), média por pergunta de nota, gráfico de evolução e ranking da equipe, para uma pesquisa por vez.

**Architecture:** Uma função SQL `resultados_pesquisa` (`security invoker`, então o RLS vale) devolve os números já somados em JSON. A página (Server Component) escolhe a pesquisa, chama a função e entrega os dados a componentes pequenos; só o gráfico (Recharts) e o seletor são componentes de navegador. Funções puras em `src/lib/resultados/` cuidam de formatação, rótulos e ordem.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase (Postgres + RLS), Vitest, Recharts (novo).

**Spec:** `docs/superpowers/specs/2026-10-08-etapa-6a-resultados-design.md`

## Global Constraints

- Next.js 16: antes de escrever código de Next, consultar `node_modules/next/dist/docs/` (regras do `AGENTS.md`), principalmente `searchParams` em páginas (é uma `Promise`) e `useRouter`.
- Responder, comentar e escrever textos da interface em **português**. **Sem emojis** na interface; ilustrações próprias em `src/components/icones/`; ícones genéricos do `lucide-react`.
- Notas sempre com **número e palavra** (boa = menta, atenção = manga, ruim = coral), nunca só cor.
- Mobile-first: o dono olha no celular. Sem tabela larga; sem rolagem horizontal da página.
- Única biblioteca npm nova: **Recharts** (avisar o Caio e explicar por quê). Conferir `git diff package.json` (só ela).
- A função do banco ignora respostas com `descartada = true`, só conta perguntas de nota não arquivadas nos cartões, e **não** é executável por visitante (`anon`).
- Nada técnico na tela em caso de erro: só mensagem amigável em português.
- Toda interface passa pelas skills de design (`impeccable`, `frontend-design`, `emil-design-eng`, `mobile-native`, `animate`, `design:ux-copy`, `design:accessibility-review`) e segue `PRODUCT.md`/`DESIGN.md`.
- Commits terminam com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Explicar as partes importantes do código de forma simples (o Caio está aprendendo).

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261009000000_resultados_pesquisa.sql` (novo) | Função `resultados_pesquisa` |
| `supabase/tests/rls_resultados.sql` (novo) | Prova de cálculo e de segurança |
| `src/lib/supabase/database.types.ts` (regenerar) | Tipo da função |
| `src/lib/resultados/tipos.ts` (novo) | Tipos do que a função devolve |
| `src/lib/resultados/apresentacao.ts` + `.test.ts` (novos) | Funções puras de apresentação |
| `src/app/painel/resultados/grafico-evolucao.tsx` (novo) | Gráfico (cliente, Recharts) |
| `src/app/painel/resultados/cartoes-totais.tsx`, `cartoes-perguntas.tsx`, `ranking-equipe.tsx`, `vazio.tsx` (novos) | Peças da página (servidor) |
| `src/app/painel/resultados/seletor-pesquisa.tsx` (novo) | Seletor (cliente) |
| `src/app/painel/resultados/page.tsx` (novo) | Página |
| `src/app/painel/nav-painel.tsx` (alterar) | Link "Resultados" |
| `README.md`, `CLAUDE.md` (alterar) | Status e documentação |

---

### Task 1: Banco — função `resultados_pesquisa` e prova

**Files:**
- Create: `supabase/tests/rls_resultados.sql`, `supabase/migrations/20261009000000_resultados_pesquisa.sql`
- Regenerate: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces: `public.resultados_pesquisa(p_pesquisa_id uuid, p_fuso text default 'America/Sao_Paulo') returns jsonb`, com o formato:

```json
{
  "totais": { "hoje": 2, "sete_dias": 5, "trinta_dias": 6, "geral": 7 },
  "perguntas": [ { "id": "uuid", "texto": "…", "ordem": 1, "media": 6.7, "respostas": 6 } ],
  "evolucao": [ { "dia": "2026-10-08", "media": 8.0, "respostas": 2 } ],
  "equipe": [ { "id": "uuid", "nome": "Ana", "ativo": true, "media": 8.0, "avaliacoes": 2 } ]
}
```

- [ ] **Step 1: Teste primeiro.** Criar `supabase/tests/rls_resultados.sql`:

```sql
-- Prova da Etapa 6A (função resultados_pesquisa). Desfaz tudo (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resul-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resul-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Dados conhecidos, criados como administrador
do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000a6');
  eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b6');
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  pa uuid; pb uuid;
  n1 uuid; n2 uuid; qeq uuid; qtx uuid; qarq uuid; nb uuid;
  ana uuid; bia uuid; caio uuid;
  r uuid;
begin
  insert into public.funcionarios (empresa_id, nome) values (ea, 'Ana') returning id into ana;
  insert into public.funcionarios (empresa_id, nome) values (ea, 'Bia') returning id into bia;
  insert into public.funcionarios (empresa_id, nome, ativo) values (ea, 'Caio', false) returning id into caio;

  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Pesquisa A', 'teste-resul-a') returning id into pa;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'Pesquisa B', 'teste-resul-b') returning id into pb;

  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Nota 1?', 'nota', 1, true) returning id into n1;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Nota 2?', 'nota', 2, false) returning id into n2;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Quem?', 'funcionario', 3, false) returning id into qeq;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Texto?', 'texto', 4, false) returning id into qtx;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Nota antiga?', 'nota', 5, false) returning id into qarq;
  update public.perguntas set arquivada = true where id = qarq;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pb, 'Nota B?', 'nota', 1, true) returning id into nb;

  -- r1: hoje, 10 e 8, Ana
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, 10), (r, n2, 8);
  insert into public.respostas_itens (resposta_id, pergunta_id, funcionario_id) values (r, qeq, ana);
  -- r2: hoje, 6, Ana
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje)::timestamp + interval '13 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, 6);
  insert into public.respostas_itens (resposta_id, pergunta_id, funcionario_id) values (r, qeq, ana);
  -- r3: 3 dias atrás, 8, Bia
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje - 3)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, 8);
  insert into public.respostas_itens (resposta_id, pergunta_id, funcionario_id) values (r, qeq, bia);
  -- r4: 10 dias atrás, 4, Caio (inativo)
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje - 10)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, 4);
  insert into public.respostas_itens (resposta_id, pergunta_id, funcionario_id) values (r, qeq, caio);
  -- r5: 40 dias atrás, 10 (fora dos 30 dias)
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje - 40)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, 10);
  -- r6: hoje, DESCARTADA, nota 1 e Ana: não pode contar em nada
  insert into public.respostas (pesquisa_id, created_at, descartada) values (pa, ((hoje)::timestamp + interval '14 hours') at time zone 'America/Sao_Paulo', true) returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, 1);
  insert into public.respostas_itens (resposta_id, pergunta_id, funcionario_id) values (r, qeq, ana);
  -- r7: 3 dias atrás, só texto (conta nos totais, não tem nota)
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje - 3)::timestamp + interval '15 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qtx, 'Gostei');
  -- r9: 01:00 UTC de hoje = 22:00 de ontem em São Paulo; nota 2
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje)::timestamp + interval '1 hour') at time zone 'UTC') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, 2);
  -- pesquisa B: uma resposta hoje, nota 9
  insert into public.respostas (pesquisa_id, created_at) values (pb, ((hoje)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, nb, 9);

  perform set_config('app.pa', pa::text, true);
  perform set_config('app.pb', pb::text, true);
  perform set_config('app.ana', ana::text, true);
end $$;

-- Visitante sem login não executa
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.resultados_pesquisa(current_setting('app.pa')::uuid);
    raise exception 'FALHOU: visitante executou resultados_pesquisa';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dono A: os números da pesquisa A
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a6","role":"authenticated"}', true);
do $$
declare
  r jsonb := public.resultados_pesquisa(current_setting('app.pa')::uuid);
  e jsonb;
begin
  -- Totais: a descartada não conta; o envio das 22:00 de ontem não é "hoje"
  if (r->'totais'->>'hoje')::int <> 2 then raise exception 'FALHOU: hoje = %', r->'totais'; end if;
  if (r->'totais'->>'sete_dias')::int <> 5 then raise exception 'FALHOU: 7 dias = %', r->'totais'; end if;
  if (r->'totais'->>'trinta_dias')::int <> 6 then raise exception 'FALHOU: 30 dias = %', r->'totais'; end if;
  if (r->'totais'->>'geral')::int <> 7 then raise exception 'FALHOU: geral = %', r->'totais'; end if;

  -- Perguntas: só as de nota não arquivadas, na ordem
  if jsonb_array_length(r->'perguntas') <> 2 then raise exception 'FALHOU: perguntas = %', r->'perguntas'; end if;
  if r->'perguntas'->0->>'texto' <> 'Nota 1?' or (r->'perguntas'->0->>'media')::numeric <> 6.7
     or (r->'perguntas'->0->>'respostas')::int <> 6 then
    raise exception 'FALHOU: média da pergunta 1 = %', r->'perguntas'->0;
  end if;
  if (r->'perguntas'->1->>'media')::numeric <> 8.0 or (r->'perguntas'->1->>'respostas')::int <> 1 then
    raise exception 'FALHOU: média da pergunta 2 = %', r->'perguntas'->1;
  end if;

  -- Evolução: 4 dias com nota nos últimos 30, do mais antigo ao mais novo
  if jsonb_array_length(r->'evolucao') <> 4 then raise exception 'FALHOU: evolução = %', r->'evolucao'; end if;
  if (r->'evolucao'->0->>'media')::numeric <> 4.0 or (r->'evolucao'->1->>'media')::numeric <> 8.0
     or (r->'evolucao'->2->>'media')::numeric <> 2.0 or (r->'evolucao'->3->>'media')::numeric <> 8.0
     or (r->'evolucao'->3->>'respostas')::int <> 2 then
    raise exception 'FALHOU: valores da evolução = %', r->'evolucao';
  end if;
  if (r->'evolucao'->0->>'dia')::date >= (r->'evolucao'->1->>'dia')::date then
    raise exception 'FALHOU: evolução fora de ordem';
  end if;

  -- Equipe: Ana 8.0 (2), Bia 8.0 (1), Caio 4.0 (1, inativo); descartada fora
  if jsonb_array_length(r->'equipe') <> 3 then raise exception 'FALHOU: equipe = %', r->'equipe'; end if;
  e := r->'equipe';
  if e->0->>'nome' <> 'Ana' or (e->0->>'media')::numeric <> 8.0 or (e->0->>'avaliacoes')::int <> 2
     or e->1->>'nome' <> 'Bia' or (e->1->>'avaliacoes')::int <> 1
     or e->2->>'nome' <> 'Caio' or (e->2->>'media')::numeric <> 4.0 or (e->2->>'ativo')::boolean is not false then
    raise exception 'FALHOU: ranking da equipe = %', e;
  end if;

  -- Pesquisa de outra empresa e pesquisa inexistente: null
  if public.resultados_pesquisa(current_setting('app.pb')::uuid) is not null then
    raise exception 'FALHOU: A viu resultados da pesquisa de B';
  end if;
  if public.resultados_pesquisa(gen_random_uuid()) is not null then
    raise exception 'FALHOU: pesquisa inexistente deveria dar null';
  end if;
end $$;

-- Dono B: só enxerga a própria pesquisa
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b6","role":"authenticated"}', true);
do $$
declare
  r jsonb := public.resultados_pesquisa(current_setting('app.pb')::uuid);
begin
  if (r->'totais'->>'hoje')::int <> 1 or (r->'perguntas'->0->>'media')::numeric <> 9.0 then
    raise exception 'FALHOU: números da pesquisa B = %', r;
  end if;
  if jsonb_array_length(r->'equipe') <> 0 then raise exception 'FALHOU: B não tem equipe'; end if;
  if public.resultados_pesquisa(current_setting('app.pa')::uuid) is not null then
    raise exception 'FALHOU: B viu resultados da pesquisa de A';
  end if;
end $$;

select 'TODOS OS TESTES DE RESULTADOS PASSARAM' as resultado;
rollback;
```

- [ ] **Step 2: Ver falhar.** Rodar o arquivo inteiro com `mcp__supabase__execute_sql` (projeto `cvgayvfqzrbdqmlsvcal`; as ferramentas do Supabase são "deferred": carregue-as com ToolSearch antes). Esperado: erro de função inexistente (`function public.resultados_pesquisa(uuid) does not exist`).

- [ ] **Step 3: Migração.** Criar `supabase/migrations/20261009000000_resultados_pesquisa.sql`:

```sql
-- Etapa 6A: números da página Resultados
--
-- security invoker: a função roda com as permissões de QUEM chama. Assim o RLS continua
-- valendo: o dono só enxerga pesquisas, respostas e funcionários da própria empresa.
-- Se a pesquisa não é visível para quem chama, devolve null.
-- Respostas descartadas não contam em nada.
create function public.resultados_pesquisa(p_pesquisa_id uuid, p_fuso text default 'America/Sao_Paulo')
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone p_fuso)::date;
  v_totais jsonb;
  v_perguntas jsonb;
  v_evolucao jsonb;
  v_equipe jsonb;
begin
  if not exists (select 1 from public.pesquisas where id = p_pesquisa_id) then
    return null;
  end if;

  -- Totais (envios). "Últimos 7 dias" = hoje e os 6 anteriores; "30 dias" = hoje e os 29 anteriores
  select jsonb_build_object(
    'hoje',        count(*) filter (where t.d = v_hoje),
    'sete_dias',   count(*) filter (where t.d > v_hoje - 7),
    'trinta_dias', count(*) filter (where t.d > v_hoje - 30),
    'geral',       count(*))
  into v_totais
  from (
    select (r.created_at at time zone p_fuso)::date as d
    from public.respostas r
    where r.pesquisa_id = p_pesquisa_id and not r.descartada
  ) t;

  -- Média de cada pergunta de nota (não arquivada)
  select coalesce(jsonb_agg(
    jsonb_build_object('id', q.id, 'texto', q.texto, 'ordem', q.ordem,
                       'media', m.media, 'respostas', coalesce(m.n, 0))
    order by q.ordem), '[]'::jsonb)
  into v_perguntas
  from public.perguntas q
  left join lateral (
    select round(avg(i.valor_nota)::numeric, 1) as media, count(*) as n
    from public.respostas_itens i
    join public.respostas r on r.id = i.resposta_id
    where i.pergunta_id = q.id and not r.descartada and i.valor_nota is not null
  ) m on true
  where q.pesquisa_id = p_pesquisa_id and q.tipo = 'nota' and not q.arquivada;

  -- Evolução: nota média por dia (todas as notas juntas), últimos 30 dias, só dias com nota
  select coalesce(jsonb_agg(
    jsonb_build_object('dia', t.d, 'media', t.media, 'respostas', t.n)
    order by t.d), '[]'::jsonb)
  into v_evolucao
  from (
    select (r.created_at at time zone p_fuso)::date as d,
           round(avg(i.valor_nota)::numeric, 1) as media,
           count(distinct r.id) as n
    from public.respostas r
    join public.respostas_itens i on i.resposta_id = r.id and i.valor_nota is not null
    where r.pesquisa_id = p_pesquisa_id and not r.descartada
      and (r.created_at at time zone p_fuso)::date > v_hoje - 30
    group by 1
  ) t;

  -- Equipe: média de todas as notas dos envios em que o cliente escolheu o funcionário
  select coalesce(jsonb_agg(
    jsonb_build_object('id', f.id, 'nome', f.nome, 'ativo', f.ativo,
                       'media', e.media, 'avaliacoes', e.n)
    order by e.media desc, e.n desc, f.nome), '[]'::jsonb)
  into v_equipe
  from (
    select it.funcionario_id as fid,
           round(avg(nt.valor_nota)::numeric, 1) as media,
           count(distinct r.id) as n
    from public.respostas r
    join public.respostas_itens it on it.resposta_id = r.id and it.funcionario_id is not null
    join public.respostas_itens nt on nt.resposta_id = r.id and nt.valor_nota is not null
    where r.pesquisa_id = p_pesquisa_id and not r.descartada
    group by it.funcionario_id
  ) e
  join public.funcionarios f on f.id = e.fid;

  return jsonb_build_object(
    'totais', v_totais, 'perguntas', v_perguntas, 'evolucao', v_evolucao, 'equipe', v_equipe);
end $$;

-- Só quem está logado executa
revoke execute on function public.resultados_pesquisa(uuid, text) from public, anon;
grant execute on function public.resultados_pesquisa(uuid, text) to authenticated;
```

- [ ] **Step 4: Aplicar** com `mcp__supabase__apply_migration` (`name: "resultados_pesquisa"`, mesmo SQL).

- [ ] **Step 5: Teste passa.** Rodar `rls_resultados.sql` → `TODOS OS TESTES DE RESULTADOS PASSARAM`. Se um número não bater, descobrir se o erro está no teste ou na função (conferir à mão, com a seção de dados do teste) antes de mudar qualquer um dos dois; registrar no relatório. Rodar também `rls_respostas.sql`, `rls_pesquisas.sql`, `rls_funcionarios.sql`, `rls_empresas.sql` (continuam passando). Conferir sobras: `select count(*) from auth.users where email like 'resul-%@exemplo.com'` → 0.

- [ ] **Step 6: Advisors** (`security` e `performance`): nada novo além dos avisos conhecidos (função `pesquisa_publica` executável pelo público; proteção de senha vazada; `unused_index`). Registrar qualquer aviso novo no relatório.

- [ ] **Step 7: Tipos.** `mcp__supabase__generate_typescript_types` → `src/lib/supabase/database.types.ts`; conferir `resultados_pesquisa` em `Functions`. (Se o arquivo gerado diferir só em coisas sem relação, acrescentar apenas a função.)

- [ ] **Step 8: lint, test, build, commit.** `npm run lint && npm test && npm run build`, depois:

```bash
git add supabase src/lib/supabase/database.types.ts
git commit -m "feat: função resultados_pesquisa com teste de segurança e de cálculo

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Funções puras de apresentação (TDD)

**Files:**
- Create: `src/lib/resultados/tipos.ts`, `src/lib/resultados/apresentacao.ts`, `src/lib/resultados/apresentacao.test.ts`

**Interfaces:**
- Consumes: `faixaDaNota`, `Faixa` de `@/lib/notas/faixa`.
- Produces (usados nas Tasks 3 e 4):
  - tipos: `PerguntaNota`, `PontoEvolucao`, `MembroEquipe`, `Resultados`
  - `MINIMO_AVALIACOES = 3`
  - `formatarMedia(media: number | null): string`
  - `rotuloFaixa(nota: number): string`
  - `poucasAvaliacoes(avaliacoes: number): boolean`
  - `ordenarEquipe(equipe: MembroEquipe[]): MembroEquipe[]`
  - `rotuloDia(dia: string): string`
  - `escolherPesquisaPadrao(pesquisas: ResumoPesquisa[], pedido?: string | null): string | null`, com `ResumoPesquisa = { id: string; respostas: number }`

- [ ] **Step 1: Testes que falham.** Criar `src/lib/resultados/apresentacao.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  escolherPesquisaPadrao,
  formatarMedia,
  ordenarEquipe,
  poucasAvaliacoes,
  rotuloDia,
  rotuloFaixa,
} from "./apresentacao";
import type { MembroEquipe } from "./tipos";

describe("formatarMedia", () => {
  it("usa vírgula e uma casa decimal", () => {
    expect(formatarMedia(8.4)).toBe("8,4");
    expect(formatarMedia(8)).toBe("8,0");
    expect(formatarMedia(6.666)).toBe("6,7");
  });
  it("sem média vira travessão", () => {
    expect(formatarMedia(null)).toBe("—");
  });
});

describe("rotuloFaixa", () => {
  it("dá a palavra de cada faixa", () => {
    expect(rotuloFaixa(9)).toBe("Ótimo");
    expect(rotuloFaixa(8)).toBe("Ótimo");
    expect(rotuloFaixa(7)).toBe("Pode melhorar");
    expect(rotuloFaixa(6)).toBe("Pode melhorar");
    expect(rotuloFaixa(5.9)).toBe("Ruim");
  });
});

describe("poucasAvaliacoes", () => {
  it("menos de 3 é pouco", () => {
    expect(poucasAvaliacoes(2)).toBe(true);
    expect(poucasAvaliacoes(3)).toBe(false);
  });
});

describe("ordenarEquipe", () => {
  const m = (nome: string, media: number, avaliacoes: number): MembroEquipe => ({
    id: nome, nome, ativo: true, media, avaliacoes,
  });

  it("quem tem 3 ou mais avaliações vem antes, mesmo com média menor", () => {
    const r = ordenarEquipe([m("Pouca", 10, 1), m("Firme", 7, 5)]);
    expect(r.map((x) => x.nome)).toEqual(["Firme", "Pouca"]);
  });
  it("dentro do grupo: maior média primeiro, empate pelo maior número de avaliações, depois pelo nome", () => {
    const r = ordenarEquipe([m("Caio", 8, 4), m("Ana", 8, 9), m("Bia", 9, 3), m("Abel", 8, 4)]);
    expect(r.map((x) => x.nome)).toEqual(["Bia", "Ana", "Abel", "Caio"]);
  });
  it("não altera a lista original", () => {
    const original = [m("B", 5, 3), m("A", 9, 3)];
    ordenarEquipe(original);
    expect(original.map((x) => x.nome)).toEqual(["B", "A"]);
  });
});

describe("rotuloDia", () => {
  it("vira dia/mês", () => {
    expect(rotuloDia("2026-10-08")).toBe("08/10");
  });
});

describe("escolherPesquisaPadrao", () => {
  const lista = [
    { id: "nova", respostas: 0 },
    { id: "meio", respostas: 4 },
    { id: "velha", respostas: 9 },
  ];
  it("usa a pedida quando ela é da empresa", () => {
    expect(escolherPesquisaPadrao(lista, "velha")).toBe("velha");
  });
  it("ignora pedido que não é da empresa e usa a mais recente com respostas", () => {
    expect(escolherPesquisaPadrao(lista, "de-outro")).toBe("meio");
    expect(escolherPesquisaPadrao(lista, null)).toBe("meio");
    expect(escolherPesquisaPadrao(lista)).toBe("meio");
  });
  it("sem nenhuma resposta usa a mais recente", () => {
    expect(escolherPesquisaPadrao([{ id: "a", respostas: 0 }, { id: "b", respostas: 0 }])).toBe("a");
  });
  it("sem pesquisas devolve null", () => {
    expect(escolherPesquisaPadrao([])).toBeNull();
  });
});
```

- [ ] **Step 2: Ver falhar.** `npm test` → FAIL (módulos não existem).

- [ ] **Step 3: Implementar.** Criar `src/lib/resultados/tipos.ts`:

```ts
// O que a função resultados_pesquisa (banco) devolve
export type PerguntaNota = {
  id: string;
  texto: string;
  ordem: number;
  media: number | null; // null = ninguém respondeu ainda
  respostas: number;
};

export type PontoEvolucao = { dia: string; media: number; respostas: number }; // dia = AAAA-MM-DD

export type MembroEquipe = {
  id: string;
  nome: string;
  ativo: boolean;
  media: number;
  avaliacoes: number;
};

export type Resultados = {
  totais: { hoje: number; sete_dias: number; trinta_dias: number; geral: number };
  perguntas: PerguntaNota[];
  evolucao: PontoEvolucao[];
  equipe: MembroEquipe[];
};
```

Criar `src/lib/resultados/apresentacao.ts`:

```ts
import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import type { MembroEquipe } from "./tipos";

// Com menos avaliações que isso, a média da pessoa ainda não diz muito
export const MINIMO_AVALIACOES = 3;

// 8,4 (vírgula, uma casa). Sem média: travessão.
export function formatarMedia(media: number | null): string {
  if (media === null) return "—";
  return media.toFixed(1).replace(".", ",");
}

const ROTULOS: Record<Faixa, string> = { boa: "Ótimo", atencao: "Pode melhorar", ruim: "Ruim" };

// A palavra que acompanha a cor da nota (a cor sozinha não basta)
export function rotuloFaixa(nota: number): string {
  return ROTULOS[faixaDaNota(nota)];
}

export function poucasAvaliacoes(avaliacoes: number): boolean {
  return avaliacoes < MINIMO_AVALIACOES;
}

// Quem tem avaliações suficientes vem primeiro; dentro de cada grupo, maior média,
// depois mais avaliações, depois ordem alfabética.
export function ordenarEquipe(equipe: MembroEquipe[]): MembroEquipe[] {
  return [...equipe].sort((a, b) => {
    const pa = poucasAvaliacoes(a.avaliacoes);
    const pb = poucasAvaliacoes(b.avaliacoes);
    if (pa !== pb) return pa ? 1 : -1;
    if (b.media !== a.media) return b.media - a.media;
    if (b.avaliacoes !== a.avaliacoes) return b.avaliacoes - a.avaliacoes;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}

// "2026-10-08" -> "08/10"
export function rotuloDia(dia: string): string {
  const [, mes, d] = dia.split("-");
  return `${d}/${mes}`;
}

export type ResumoPesquisa = { id: string; respostas: number };

// A lista vem da mais recente para a mais antiga.
// Usa a pedida na URL (se for da empresa), senão a mais recente que já tem respostas,
// senão a mais recente.
export function escolherPesquisaPadrao(pesquisas: ResumoPesquisa[], pedido?: string | null): string | null {
  if (pedido && pesquisas.some((p) => p.id === pedido)) return pedido;
  return (pesquisas.find((p) => p.respostas > 0) ?? pesquisas[0])?.id ?? null;
}
```

- [ ] **Step 4: Ver passar.** `npm test` → PASS (todos).

- [ ] **Step 5: lint e commit.** `npm run lint` (sem avisos), depois:

```bash
git add src/lib/resultados
git commit -m "feat: funções de apresentação dos resultados

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Recharts, gráfico e peças da página

**Files:**
- Modify: `package.json`, `package-lock.json` (Recharts)
- Create: `src/app/painel/resultados/grafico-evolucao.tsx`, `cartoes-totais.tsx`, `cartoes-perguntas.tsx`, `ranking-equipe.tsx`, `vazio.tsx`

**Interfaces:**
- Consumes (Task 2): tipos `Resultados`, `PontoEvolucao`, `PerguntaNota`, `MembroEquipe`; `formatarMedia`, `rotuloFaixa`, `ordenarEquipe`, `poucasAvaliacoes`, `rotuloDia`; `faixaDaNota`.
- Produces (usados na Task 4):
  - `GraficoEvolucao({ dados }: { dados: PontoEvolucao[] })` (cliente)
  - `CartoesTotais({ totais }: { totais: Resultados["totais"] })`
  - `CartoesPerguntas({ perguntas }: { perguntas: PerguntaNota[] })`
  - `RankingEquipe({ equipe }: { equipe: MembroEquipe[] })`
  - `Vazio({ pesquisaId }: { pesquisaId: string })`

- [ ] **Step 1: Instalar Recharts.** Avisar o Caio na resposta e explicar: Recharts desenha gráficos em React (já previsto no `CLAUDE.md`); só entra no componente do gráfico. Rodar `npm install recharts`; conferir `git diff package.json` (só `recharts` em `dependencies`) e que o `npm run build` continua funcionando com React 19. Se der erro de versão de `peerDependencies`, usar a versão mais recente compatível com React 19 e anotar no relatório.

- [ ] **Step 2: Ler a documentação de Next** em `node_modules/next/dist/docs/` sobre Client Components (`"use client"`) e carregamento de componentes pesados, e confirmar que o gráfico (Recharts) só roda no navegador. Se `ResponsiveContainer` reclamar de renderização no servidor, o componente deve renderizar o gráfico só depois de montar (`useSyncExternalStore` ou `useEffect` com estado `pronto`).

- [ ] **Step 3: Gráfico.** Criar `src/app/painel/resultados/grafico-evolucao.tsx`:

```tsx
"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatarMedia, rotuloDia } from "@/lib/resultados/apresentacao";
import type { PontoEvolucao } from "@/lib/resultados/tipos";

const COR_LINHA = "#2a1f2d"; // ameixa
const COR_PONTO = "#14b8a6"; // menta

// Nota média por dia. Para quem usa leitor de tela, o gráfico (que é só imagem)
// vem acompanhado de uma tabela escondida com os mesmos números.
export function GraficoEvolucao({ dados }: { dados: PontoEvolucao[] }) {
  if (dados.length === 0) {
    return <p className="text-muted-foreground">Ainda não há notas nos últimos 30 dias.</p>;
  }

  const primeiro = dados[0];
  const ultimo = dados[dados.length - 1];
  const resumo = `Nota média por dia, de ${rotuloDia(primeiro.dia)} a ${rotuloDia(ultimo.dia)}. A última média foi ${formatarMedia(ultimo.media)}.`;
  const pontos = dados.map((d) => ({ ...d, rotulo: rotuloDia(d.dia) }));

  return (
    <div>
      <div role="img" aria-label={resumo} className="h-56 w-full sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pontos} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#eadfd8" vertical={false} />
            <XAxis dataKey="rotulo" tick={{ fontSize: 12, fill: "#5f5463" }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis domain={[1, 10]} ticks={[2, 4, 6, 8, 10]} tick={{ fontSize: 12, fill: "#5f5463" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              formatter={(valor) => [formatarMedia(Number(valor)), "Nota média"]}
              labelFormatter={(rotulo) => `Dia ${rotulo}`}
              contentStyle={{ borderRadius: 16, border: "1px solid #eadfd8" }}
            />
            <Line
              type="monotone"
              dataKey="media"
              stroke={COR_LINHA}
              strokeWidth={3}
              dot={{ r: 4, fill: COR_PONTO, stroke: COR_LINHA, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{resumo}</caption>
        <thead>
          <tr><th>Dia</th><th>Nota média</th><th>Respostas com nota</th></tr>
        </thead>
        <tbody>
          {dados.map((d) => (
            <tr key={d.dia}>
              <td>{rotuloDia(d.dia)}</td>
              <td>{formatarMedia(d.media)}</td>
              <td>{d.respostas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

(As cores acima são as da marca/neutras do projeto; se o `DESIGN.md`/`globals.css` tiver tokens melhores, usar os tokens. A cor do texto dos eixos precisa passar contraste 4,5:1 sobre branco.)

- [ ] **Step 4: Totais.** Criar `src/app/painel/resultados/cartoes-totais.tsx`:

```tsx
import type { Resultados } from "@/lib/resultados/tipos";

const ITENS = [
  { chave: "hoje", rotulo: "Hoje" },
  { chave: "sete_dias", rotulo: "Últimos 7 dias" },
  { chave: "trinta_dias", rotulo: "Últimos 30 dias" },
] as const;

export function CartoesTotais({ totais }: { totais: Resultados["totais"] }) {
  return (
    <ul className="grid grid-cols-3 gap-3">
      {ITENS.map(({ chave, rotulo }) => (
        <li key={chave} className="rounded-3xl bg-card p-4 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-5">
          <p className="numeros text-3xl font-bold tracking-tight sm:text-4xl">{totais[chave]}</p>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {rotulo}
            <span className="sr-only">: {totais[chave] === 1 ? "1 resposta" : `${totais[chave]} respostas`}</span>
          </p>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Médias por pergunta.** Criar `src/app/painel/resultados/cartoes-perguntas.tsx`:

```tsx
import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia, rotuloFaixa } from "@/lib/resultados/apresentacao";
import type { PerguntaNota } from "@/lib/resultados/tipos";
import { cn } from "@/lib/utils";

const COR_FAIXA: Record<Faixa, string> = {
  boa: "bg-menta-claro text-menta-texto",
  atencao: "bg-manga-claro text-manga-texto",
  ruim: "bg-coral/15 text-coral-escuro",
};

export function CartoesPerguntas({ perguntas }: { perguntas: PerguntaNota[] }) {
  if (perguntas.length === 0) {
    return <p className="text-muted-foreground">Esta pesquisa não tem pergunta de nota.</p>;
  }
  return (
    <ul className="space-y-3">
      {perguntas.map((p) => (
        <li key={p.id} className="flex items-center gap-4 rounded-2xl bg-creme p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold break-words">{p.texto}</p>
            <p className="numeros text-sm text-muted-foreground">
              {p.respostas === 1 ? "1 resposta" : `${p.respostas} respostas`}
            </p>
          </div>
          {p.media === null ? (
            <p className="shrink-0 text-sm font-medium text-muted-foreground">Sem respostas</p>
          ) : (
            <div className="shrink-0 text-right">
              <p className="numeros text-3xl font-bold tracking-tight">{formatarMedia(p.media)}</p>
              <p className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_FAIXA[faixaDaNota(p.media)])}>
                {rotuloFaixa(p.media)}
              </p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 6: Ranking.** Criar `src/app/painel/resultados/ranking-equipe.tsx`:

```tsx
import { faixaDaNota, type Faixa } from "@/lib/notas/faixa";
import { formatarMedia, ordenarEquipe, poucasAvaliacoes, rotuloFaixa } from "@/lib/resultados/apresentacao";
import type { MembroEquipe } from "@/lib/resultados/tipos";
import { cn } from "@/lib/utils";

const COR_FAIXA: Record<Faixa, string> = {
  boa: "bg-menta-claro text-menta-texto",
  atencao: "bg-manga-claro text-manga-texto",
  ruim: "bg-coral/15 text-coral-escuro",
};

export function RankingEquipe({ equipe }: { equipe: MembroEquipe[] }) {
  const lista = ordenarEquipe(equipe);
  return (
    <ol className="space-y-3">
      {lista.map((f, i) => {
        const poucas = poucasAvaliacoes(f.avaliacoes);
        return (
          <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-creme p-4">
            <span aria-hidden="true" className="numeros flex size-8 shrink-0 items-center justify-center rounded-full bg-card text-sm font-bold">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold break-words">
                {f.nome}
                {!f.ativo && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">inativo</span>}
              </p>
              <p className="numeros text-sm text-muted-foreground">
                {f.avaliacoes === 1 ? "1 avaliação" : `${f.avaliacoes} avaliações`}
                {poucas && <span className="ml-2 rounded-full bg-manga-claro px-2 py-0.5 text-xs font-semibold text-manga-texto">poucas avaliações</span>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="numeros text-2xl font-bold tracking-tight">{formatarMedia(f.media)}</p>
              <p className={cn("mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", COR_FAIXA[faixaDaNota(f.media)])}>
                {rotuloFaixa(f.media)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
```

- [ ] **Step 7: Estado vazio.** Criar `src/app/painel/resultados/vazio.tsx`:

```tsx
import Link from "next/link";
import { IconePesquisa } from "@/components/icones/icone-pesquisa";
import { Button } from "@/components/ui/button";

// Pesquisa sem nenhuma resposta ainda
export function Vazio({ pesquisaId }: { pesquisaId: string }) {
  return (
    <section className="entrada flex flex-col items-center rounded-3xl bg-card p-8 text-center shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
      <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-manga-claro">
        <IconePesquisa className="size-12" />
      </div>
      <h2 className="text-xl font-bold">Ainda sem respostas</h2>
      <p className="mt-1 mb-5 max-w-sm text-muted-foreground">
        Assim que o primeiro cliente responder, os números aparecem aqui. Pegue o link ou o QR code e coloque na mesa ou no balcão.
      </p>
      <Button render={<Link href={`/painel/pesquisas/${pesquisaId}`} />} size="lg">
        Ver link e QR code
      </Button>
    </section>
  );
}
```

(Conferir em `src/components/ui/button.tsx` e em um uso existente, por exemplo `src/app/painel/page.tsx`, **como** o projeto faz um botão que é link — `render`, `asChild` ou um `Link` estilizado — e usar o mesmo padrão. O trecho acima é só o formato; ajuste ao padrão real.)

- [ ] **Step 8: lint, test, build.** `npm run lint && npm test && npm run build` → verde, sem avisos.

- [ ] **Step 9: Passada de skills** (leitura de código, sem navegador): `design:ux-copy` nos textos, `design:accessibility-review` no gráfico (aria-label, tabela escondida, contraste dos eixos) e nos cartões; aplicar correções.

- [ ] **Step 10: Commit.**

```bash
git add package.json package-lock.json src/app/painel/resultados
git commit -m "feat: gráfico e peças da página Resultados

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Seletor, página e menu

**Files:**
- Create: `src/app/painel/resultados/seletor-pesquisa.tsx`, `src/app/painel/resultados/page.tsx`
- Modify: `src/app/painel/nav-painel.tsx`

**Interfaces:**
- Consumes: peças da Task 3; `obterContextoEmpresa` de `@/lib/empresas/contexto`; `escolherPesquisaPadrao`, tipos `Resultados` (Task 2); função do banco `resultados_pesquisa` (Task 1).
- Produces: rota `/painel/resultados` (parâmetro opcional `?pesquisa=<id>`); item de menu "Resultados".

- [ ] **Step 1: Ler a documentação** de Next 16 em `node_modules/next/dist/docs/` sobre `searchParams` em `page.tsx` (é uma `Promise`) e `useRouter`/`usePathname`.

- [ ] **Step 2: Seletor.** Criar `src/app/painel/resultados/seletor-pesquisa.tsx`:

```tsx
"use client";

import { usePathname, useRouter } from "next/navigation";

type Opcao = { id: string; titulo: string };

// Troca a pesquisa pela URL (?pesquisa=...): o servidor refaz a página com os números dela.
export function SeletorPesquisa({ opcoes, atual }: { opcoes: Opcao[]; atual: string }) {
  const router = useRouter();
  const caminho = usePathname();

  return (
    <div>
      <label htmlFor="seletor-pesquisa" className="mb-1 block text-sm font-semibold">
        Pesquisa
      </label>
      <select
        id="seletor-pesquisa"
        value={atual}
        onChange={(e) => router.replace(`${caminho}?pesquisa=${e.target.value}`)}
        className="min-h-12 w-full rounded-2xl border border-input bg-card px-3 text-base font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:w-auto sm:min-w-72"
      >
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.titulo}
          </option>
        ))}
      </select>
    </div>
  );
}
```

(Duas pesquisas podem ter o mesmo título, como "Pesquisa de satisfação". Para o dono distinguir, a opção deve mostrar também a data de criação, por exemplo `Pesquisa de satisfação (criada em 06/10)`. A página monta esse texto e passa em `titulo`.)

- [ ] **Step 3: Página.** Criar `src/app/painel/resultados/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterContextoEmpresa } from "@/lib/empresas/contexto";
import { escolherPesquisaPadrao } from "@/lib/resultados/apresentacao";
import type { Resultados } from "@/lib/resultados/tipos";
import { CartoesPerguntas } from "./cartoes-perguntas";
import { CartoesTotais } from "./cartoes-totais";
import { GraficoEvolucao } from "./grafico-evolucao";
import { RankingEquipe } from "./ranking-equipe";
import { SeletorPesquisa } from "./seletor-pesquisa";
import { Vazio } from "./vazio";

export const metadata: Metadata = { title: "Resultados" };

const SECAO = "entrada rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8";

export default async function PaginaResultados({
  searchParams,
}: {
  searchParams: Promise<{ pesquisa?: string }>;
}) {
  const { supabase, atual } = await obterContextoEmpresa();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  const { pesquisa: pedido } = await searchParams;

  // Pesquisas da empresa atual, da mais recente para a mais antiga, com quantos envios cada uma tem
  const { data: linhas } = atual
    ? await supabase
        .from("pesquisas")
        .select("id, titulo, created_at, respostas(count)")
        .eq("empresa_id", atual.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const pesquisas = (linhas ?? []).map((p) => ({
    id: p.id,
    titulo: p.titulo,
    criada: p.created_at,
    respostas: p.respostas[0]?.count ?? 0,
  }));

  const escolhida = escolherPesquisaPadrao(pesquisas, pedido);

  // Sem pesquisa nenhuma ainda
  if (!escolhida) {
    return (
      <div className="max-w-2xl space-y-6">
        <Cabecalho />
        <section className={SECAO}>
          <p className="font-semibold">Nenhuma pesquisa ainda</p>
          <p className="mt-1 text-muted-foreground">Crie uma pesquisa para começar a receber respostas.</p>
        </section>
      </div>
    );
  }

  const { data: bruto, error } = await supabase.rpc("resultados_pesquisa", { p_pesquisa_id: escolhida });
  const resultados = bruto as unknown as Resultados | null; // Json do Supabase -> nosso tipo

  const opcoes = pesquisas.map((p) => ({
    id: p.id,
    titulo: `${p.titulo} (criada em ${new Date(p.criada).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })})`,
  }));

  return (
    <div className="max-w-3xl space-y-6">
      <Cabecalho />
      {pesquisas.length > 1 && <SeletorPesquisa opcoes={opcoes} atual={escolhida} />}

      {error || !resultados ? (
        <section className={SECAO}>
          <p className="font-semibold">Não deu para carregar os resultados agora</p>
          <p className="mt-1 text-muted-foreground">Recarregue a página em instantes.</p>
        </section>
      ) : resultados.totais.geral === 0 ? (
        <Vazio pesquisaId={escolhida} />
      ) : (
        <>
          <CartoesTotais totais={resultados.totais} />

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Nota de cada pergunta</h2>
            <div className="mt-4">
              <CartoesPerguntas perguntas={resultados.perguntas} />
            </div>
          </section>

          <section className={SECAO}>
            <h2 className="text-xl font-bold">Evolução nos últimos 30 dias</h2>
            <div className="mt-4">
              <GraficoEvolucao dados={resultados.evolucao} />
            </div>
          </section>

          {resultados.equipe.length > 0 && (
            <section className={SECAO}>
              <h2 className="text-xl font-bold">Ranking da equipe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Média das notas dos clientes que escolheram cada pessoa em &ldquo;Quem te atendeu?&rdquo;.
              </p>
              <div className="mt-4">
                <RankingEquipe equipe={resultados.equipe} />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Cabecalho() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Resultados</h1>
      <p className="mt-1 text-lg font-medium text-ameixa">Como seus clientes estão avaliando.</p>
    </div>
  );
}
```

Atenção ao escrever as aspas tipográficas em JSX: usar `&ldquo;`/`&rdquo;` (a ferramenta de edição troca aspas curvas por retas), como no `CLAUDE.md`.

- [ ] **Step 4: Menu.** Em `src/app/painel/nav-painel.tsx`: importar `ChartColumn` do `lucide-react` (se o nome não existir na versão instalada, usar `BarChart3` ou outro de barras que exista) e inserir em `LINKS`, logo depois de "Início":

```tsx
  { href: "/painel/resultados", rotulo: "Resultados", Icone: ChartColumn },
```

Com 4 itens, conferir no celular (639 px) que o trilho não estoura (nos itens inativos só o ícone aparece).

- [ ] **Step 5: lint, test, build.** `npm run lint && npm test && npm run build` → verde, sem avisos; a rota `/painel/resultados` aparece no resumo do build.

- [ ] **Step 6: Passada de skills** (leitura de código): `design:ux-copy` nos textos novos (título, subtítulo, vazio, erro, "Média das notas...") e `design:accessibility-review` no seletor e na estrutura de títulos (h1 e h2).

- [ ] **Step 7: Commit.**

```bash
git add src/app/painel
git commit -m "feat: página Resultados com seletor e menu

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

(O teste no Chrome, com dados de exemplo, é feito pelo controlador depois desta tarefa; o implementador não faz navegador.)

---

### Task 5: Verificação, documentação, PR e merge

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Verificação.** `npm run lint && npm test && npm run build`; os cinco `rls_*.sql` (empresas, funcionarios, pesquisas, respostas, resultados); advisors `security` e `performance`; `git status` sem segredos.

- [ ] **Step 2: Chrome (controlador).** Com o servidor de produção reiniciado (`npm run start`; o Caio precisa estar logado na aba do grupo e a janela não pode estar minimizada). Criar respostas de **exemplo** na pesquisa de teste via SQL (como administrador), **guardando os ids** para apagar depois, com datas variadas, notas diferentes, funcionários (incluindo um com menos de 3 avaliações), e uma resposta descartada; abrir `/painel/resultados` e conferir: três cartões, nota por pergunta com cor e palavra, gráfico (e a tabela escondida no leitor de tela), ranking com "poucas avaliações", seletor (trocar pesquisa pela URL e pelo seletor), tela vazia (pesquisa sem respostas), e celular a 639 px (se a janela permitir). Apagar **só** as respostas de exemplo pelos ids guardados. Tirar prints para o README.

- [ ] **Step 3: Documentação.**
  - `README.md`: Progresso (`- [x] **Etapa 6A** — Resultados: totais, médias, evolução e ranking da equipe` e `- [ ] **Etapa 6B** — Lista de respostas, suspeitas e descarte`); seção "O que já existe" com **Resultados**; tecnologia Recharts na tabela (deixar de ser "*(etapa 6)*"); seção de segurança citando `resultados_pesquisa` (`security invoker`, RLS vale); contagem real de testes; pasta `resultados/` na estrutura; prints novos em `docs/prints/`.
  - `CLAUDE.md`: Status com a 6A concluída (links do desenho e do plano) e a 6B como próxima; decisão: "nota da equipe = média das notas dos envios em que o cliente escolheu a pessoa; menos de 3 avaliações = 'poucas avaliações'".
- [ ] **Step 4: Commit** `docs: Etapa 6A concluída` (com a linha Co-Authored-By).
- [ ] **Step 5: Push, PR e merge.** `git push -u origin etapa-6-dashboard`; `gh pr create --base main` (corpo termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`); merge autorizado pelo Caio (`gh pr merge --merge`); `git checkout main && git pull`.

# Etapa 6B (Respostas, suspeitas e descarte) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/painel/respostas` com a lista de envios (abas Todas, Suspeitas, Descartadas), selo de suspeita por rajada de notas ruins e botões de descartar e restaurar; aviso de suspeitas em Resultados.

**Architecture:** Duas funções SQL `security invoker` (o RLS vale): `envios_suspeitos` (a regra da rajada) e `respostas_pesquisa` (uma página de 20 envios + contagens, em JSON). A página é Server Component; só os botões de descarte são componentes de navegador, que chamam Server Actions. A escrita é um `update` só da coluna `descartada`, liberado na 5B e protegido por RLS.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase (Postgres + RLS), Zod, Vitest. Nenhuma biblioteca nova.

**Spec:** `docs/superpowers/specs/2026-10-08-etapa-6b-respostas-design.md`

## Global Constraints

- Next.js 16: antes de escrever código de Next, consultar `node_modules/next/dist/docs/` (regras do `AGENTS.md`), principalmente `searchParams` em páginas (é uma `Promise`) e Server Actions.
- Responder, comentar e escrever textos da interface em **português**. **Sem emojis** na interface; ícones genéricos do `lucide-react`.
- Notas sempre com **número e palavra** (reusar `faixaDaNota` e `rotuloFaixa`); o selo "Suspeita" e a etiqueta "Descartada" são **texto**, nunca só cor.
- Regra da suspeita (valores exatos): envio ruim = média das notas do envio **menor ou igual a 4**; rajada = **4** envios ruins dentro de **15 minutos** (exatamente 15 vale), na mesma pesquisa; só envios **não descartados** contam; nada de IP.
- Mobile-first, alvos de toque de pelo menos 44 px, sem rolagem horizontal da página.
- Texto de cliente é sempre renderizado como texto (React escapa); nunca `dangerouslySetInnerHTML`.
- Funções novas do banco: `security invoker`, `set search_path = ''`, `revoke execute ... from public, anon`, `grant execute ... to authenticated`.
- Nenhuma biblioteca npm nova: `git diff package.json` deve ficar vazio.
- Nada técnico na tela em caso de erro: só mensagem amigável em português.
- Toda interface passa pelas skills de design (`impeccable`, `frontend-design`, `emil-design-eng`, `mobile-native`, `animate`, `design:ux-copy`, `design:accessibility-review`) e segue `PRODUCT.md`/`DESIGN.md`.
- Commits terminam com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Explicar as partes importantes do código de forma simples (o Caio está aprendendo).

## Decisões de plano (rulings sobre a spec)

- A spec lista `p_fuso` em `respostas_pesquisa`, mas a função devolve o instante (`timestamptz`) e quem formata a hora é o TypeScript (`America/Sao_Paulo`). **Sem parâmetro `p_fuso`** na função nova (um parâmetro sem uso seria enganoso).
- A página pedida além do fim volta para a última página: a função faz isso e devolve a página real em `pagina`.
- A busca das pesquisas da empresa (lista para o seletor) sai de `resultados/page.tsx` para uma função compartilhada, usada pelas duas páginas.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261010000000_respostas_lista.sql` (novo) | `envios_suspeitos`, `respostas_pesquisa`, `resultados_pesquisa` recriada com `suspeitas` |
| `supabase/tests/rls_respostas_lista.sql` (novo) | Prova de segurança e de cálculo |
| `supabase/tests/rls_resultados.sql` (editar) | Confere `suspeitas = 0` |
| `src/lib/supabase/database.types.ts` (regenerar) | Tipos das funções |
| `src/lib/respostas/lista.ts` + `.test.ts` (novos) | Tipos, `lerAba`, `lerPagina`, `formatarDataHora`, esquemas de id, mensagem |
| `src/app/painel/respostas/actions.ts` (novo) | Server Actions de descarte |
| `src/app/painel/respostas/botoes-descarte.tsx` (novo) | Botões (cliente) |
| `src/app/painel/respostas/abas.tsx`, `cartao-envio.tsx`, `paginacao.tsx`, `vazio.tsx` (novos) | Peças da página (servidor) |
| `src/app/painel/respostas/page.tsx` (novo) | Página |
| `src/lib/pesquisas/para-seletor.ts` (novo) | Pesquisas da empresa para o seletor |
| `src/app/painel/nav-painel.tsx`, `src/app/painel/resultados/page.tsx`, `src/lib/resultados/tipos.ts` (editar) | Menu, aviso de suspeitas |
| `README.md`, `CLAUDE.md`, `docs/prints/respostas-lista.jpg` | Documentação |

---

### Task 1: Banco — regra da suspeita, lista de respostas e prova

**Files:**
- Create: `supabase/migrations/20261010000000_respostas_lista.sql`
- Create: `supabase/tests/rls_respostas_lista.sql`
- Modify: `supabase/tests/rls_resultados.sql`
- Regenerate: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces: `public.envios_suspeitos(p_pesquisa_id uuid) returns table (resposta_id uuid)`; `public.respostas_pesquisa(p_pesquisa_id uuid, p_aba text default 'todas', p_pagina int default 1) returns jsonb` no formato abaixo; `resultados_pesquisa` passa a devolver também a chave `suspeitas` (inteiro).

Formato de `respostas_pesquisa` (valores reais, tipos exatos):

```json
{
  "contagens": { "todas": 28, "suspeitas": 12, "descartadas": 1 },
  "pagina": 1,
  "total_paginas": 2,
  "envios": [ {
    "id": "uuid", "criada_em": "2026-10-06T14:00:00+00:00",
    "descartada": false, "suspeita": true, "media": 2.3,
    "itens": [ { "pergunta": "Nota 1?", "tipo": "nota", "ordem": 1,
                 "nota": 2, "texto": null, "funcionario": null } ]
  } ]
}
```

- [ ] **Step 1: Escrever a prova (falha primeiro).** Criar `supabase/tests/rls_respostas_lista.sql` com o conteúdo abaixo.

```sql
-- Prova da Etapa 6B (envios_suspeitos e respostas_pesquisa). Desfaz tudo (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'lista-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'lista-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Dados conhecidos, criados como administrador.
-- Cada linha de VALUES é um envio: (quando depois de t0, nota1, nota2, descartada).
-- Grupos (todos na pesquisa A):
--   g1  4 envios ruins (2,2) em 0/5/10/15 min      -> rajada de exatamente 15 min: os 4 são suspeitos
--   g2  4 envios ruins (1,1) em 3h, +5, +10, +16   -> 16 min: ninguém é suspeito
--   g3  3 envios ruins (1,1) em 6h, +1, +2         -> só 3: ninguém é suspeito
--   g4  4 envios (4,4) média 4,0 em 9h..+3         -> 4,0 é ruim: os 4 são suspeitos
--   g5  4 envios (4,5) média 4,5 em 12h..+3        -> 4,5 não é ruim: ninguém é suspeito
--   tx  4 envios só com texto em 15h..+3           -> sem nota nunca é ruim
--   g6  4 envios ruins (1,1) em 18h..+3            -> os 4 são suspeitos (depois o dono descarta 1)
--   d   1 envio (1,1) já descartado em 21h         -> fora de tudo
do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000a7');
  eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b7');
  t0 timestamptz := now() - interval '2 days';
  pa uuid; pb uuid; n1 uuid; n2 uuid; qeq uuid; qarq uuid; qtx uuid; nb uuid; ana uuid;
  e record; r uuid;
begin
  insert into public.funcionarios (empresa_id, nome) values (ea, 'Ana') returning id into ana;
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Pesquisa A', 'teste-lista-a') returning id into pa;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'Pesquisa B', 'teste-lista-b') returning id into pb;

  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Nota 1?', 'nota', 1, true) returning id into n1;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Nota 2?', 'nota', 2, false) returning id into n2;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Quem?', 'funcionario', 3, false) returning id into qeq;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Nota antiga?', 'nota', 4, false) returning id into qarq;
  update public.perguntas set arquivada = true where id = qarq;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Texto?', 'texto', 5, false) returning id into qtx;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pb, 'Nota B?', 'nota', 1, true) returning id into nb;

  for e in select * from (values
    (interval '0 minutes', 2, 2, false), (interval '5 minutes', 2, 2, false),
    (interval '10 minutes', 2, 2, false), (interval '15 minutes', 2, 2, false),
    (interval '3 hours', 1, 1, false), (interval '3 hours 5 minutes', 1, 1, false),
    (interval '3 hours 10 minutes', 1, 1, false), (interval '3 hours 16 minutes', 1, 1, false),
    (interval '6 hours', 1, 1, false), (interval '6 hours 1 minute', 1, 1, false),
    (interval '6 hours 2 minutes', 1, 1, false),
    (interval '9 hours', 4, 4, false), (interval '9 hours 1 minute', 4, 4, false),
    (interval '9 hours 2 minutes', 4, 4, false), (interval '9 hours 3 minutes', 4, 4, false),
    (interval '12 hours', 4, 5, false), (interval '12 hours 1 minute', 4, 5, false),
    (interval '12 hours 2 minutes', 4, 5, false), (interval '12 hours 3 minutes', 4, 5, false),
    (interval '15 hours', null, null, false), (interval '15 hours 1 minute', null, null, false),
    (interval '15 hours 2 minutes', null, null, false), (interval '15 hours 3 minutes', null, null, false),
    (interval '18 hours', 1, 1, false), (interval '18 hours 1 minute', 1, 1, false),
    (interval '18 hours 2 minutes', 1, 1, false), (interval '18 hours 3 minutes', 1, 1, false),
    (interval '21 hours', 1, 1, true)
  ) as t(quando, a, b, d) loop
    insert into public.respostas (pesquisa_id, created_at, descartada)
      values (pa, t0 + e.quando, e.d) returning id into r;
    if e.a is null then
      insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qtx, 'Só comentário <b>sem</b> nota');
    else
      insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, e.a), (r, n2, e.b);
    end if;
    if e.quando = interval '0 minutes' then
      -- o primeiro envio do g1 ganha funcionário e um item de pergunta arquivada
      insert into public.respostas_itens (resposta_id, pergunta_id, funcionario_id) values (r, qeq, ana);
      insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, qarq, 3);
      perform set_config('app.g1', r::text, true);
    end if;
    if e.quando = interval '18 hours' then
      perform set_config('app.g6', r::text, true);
    end if;
  end loop;

  -- pesquisa B: 4 envios ruins em 4 minutos (rajada na empresa B, que A não pode ver nem descartar)
  for e in select generate_series(0, 3) as m loop
    insert into public.respostas (pesquisa_id, created_at) values (pb, t0 + (e.m || ' minutes')::interval) returning id into r;
    insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, nb, 1);
    perform set_config('app.rb', r::text, true);
  end loop;

  perform set_config('app.pa', pa::text, true);
  perform set_config('app.pb', pb::text, true);
end $$;

-- Visitante sem login não executa nenhuma das duas funções
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.respostas_pesquisa(current_setting('app.pa')::uuid);
    raise exception 'FALHOU: visitante executou respostas_pesquisa';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.envios_suspeitos(current_setting('app.pa')::uuid);
    raise exception 'FALHOU: visitante executou envios_suspeitos';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dono A
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a7","role":"authenticated"}', true);
do $$
declare
  pa uuid := current_setting('app.pa')::uuid;
  pb uuid := current_setting('app.pb')::uuid;
  p1 jsonb; p2 jsonb; s jsonb; d jsonb; e jsonb; res jsonb;
  linhas int;
begin
  p1 := public.respostas_pesquisa(pa);
  if p1->'contagens' <> '{"todas":28,"suspeitas":12,"descartadas":1}'::jsonb then
    raise exception 'FALHOU: contagens = %', p1->'contagens';
  end if;
  if (p1->>'pagina')::int <> 1 or (p1->>'total_paginas')::int <> 2 or jsonb_array_length(p1->'envios') <> 20 then
    raise exception 'FALHOU: paginação da página 1 = % / % / %', p1->>'pagina', p1->>'total_paginas', jsonb_array_length(p1->'envios');
  end if;

  -- Ordem: o mais novo primeiro (o descartado de 21h), depois o g6
  e := p1->'envios'->0;
  if (e->>'descartada')::boolean is not true or (e->>'suspeita')::boolean is not false or (e->>'media')::numeric <> 1.0 then
    raise exception 'FALHOU: primeiro envio = %', e;
  end if;
  -- índices da página 1: 0 d; 1-4 g6 (suspeitos); 5-8 texto; 9-12 g5; 13-16 g4 (suspeitos); 17-19 g3
  for i in 1..4 loop
    if (p1->'envios'->i->>'suspeita')::boolean is not true then raise exception 'FALHOU: g6[%] deveria ser suspeito', i; end if;
  end loop;
  for i in 5..12 loop
    if (p1->'envios'->i->>'suspeita')::boolean is not false then raise exception 'FALHOU: envio % não deveria ser suspeito (texto/4,5)', i; end if;
  end loop;
  for i in 13..16 loop
    if (p1->'envios'->i->>'suspeita')::boolean is not true then raise exception 'FALHOU: g4[%] (média 4,0) deveria ser suspeito', i; end if;
  end loop;
  for i in 17..19 loop
    if (p1->'envios'->i->>'suspeita')::boolean is not false then raise exception 'FALHOU: g3[%] (só 3 ruins) não deveria ser suspeito', i; end if;
  end loop;
  if (p1->'envios'->5->>'media') is not null then raise exception 'FALHOU: envio só com texto deveria ter media null'; end if;
  if p1->'envios'->5->'itens'->0->>'texto' <> 'Só comentário <b>sem</b> nota' then
    raise exception 'FALHOU: o texto do cliente deve voltar como veio (o React escapa na tela)';
  end if;

  -- Página 2: g2 (16 min: não suspeitos) e g1 (rajada de exatamente 15 min: suspeitos)
  p2 := public.respostas_pesquisa(pa, 'todas', 2);
  if (p2->>'pagina')::int <> 2 or jsonb_array_length(p2->'envios') <> 8 then
    raise exception 'FALHOU: página 2 = % envios', jsonb_array_length(p2->'envios');
  end if;
  for i in 0..3 loop
    if (p2->'envios'->i->>'suspeita')::boolean is not false then raise exception 'FALHOU: g2[%] (16 min) não deveria ser suspeito', i; end if;
  end loop;
  for i in 4..7 loop
    if (p2->'envios'->i->>'suspeita')::boolean is not true then raise exception 'FALHOU: g1[%] (15 min) deveria ser suspeito', i; end if;
  end loop;

  -- Itens do primeiro envio do g1: ordenados, com funcionário e pergunta arquivada
  select x into e from jsonb_array_elements(p2->'envios') x where x->>'id' = current_setting('app.g1');
  if (e->>'media')::numeric <> 2.3 or jsonb_array_length(e->'itens') <> 4
     or e->'itens'->2->>'funcionario' <> 'Ana' or e->'itens'->2->>'tipo' <> 'funcionario'
     or (e->'itens'->3->>'nota')::int <> 3 or e->'itens'->3->>'pergunta' <> 'Nota antiga?' then
    raise exception 'FALHOU: itens do envio g1 = %', e;
  end if;

  -- Página além do fim volta para a última; página 0 vira 1
  if (public.respostas_pesquisa(pa, 'todas', 99)->>'pagina')::int <> 2 then raise exception 'FALHOU: página 99 deveria virar 2'; end if;
  if (public.respostas_pesquisa(pa, 'todas', 0)->>'pagina')::int <> 1 then raise exception 'FALHOU: página 0 deveria virar 1'; end if;

  -- Abas
  s := public.respostas_pesquisa(pa, 'suspeitas');
  if jsonb_array_length(s->'envios') <> 12 or (s->>'total_paginas')::int <> 1 then raise exception 'FALHOU: aba suspeitas'; end if;
  if exists (select 1 from jsonb_array_elements(s->'envios') x where (x->>'suspeita')::boolean is not true) then
    raise exception 'FALHOU: aba suspeitas trouxe envio não suspeito';
  end if;
  d := public.respostas_pesquisa(pa, 'descartadas');
  if jsonb_array_length(d->'envios') <> 1 or (d->'envios'->0->>'descartada')::boolean is not true then
    raise exception 'FALHOU: aba descartadas = %', d;
  end if;

  -- Aba inválida: erro 22023
  begin
    perform public.respostas_pesquisa(pa, 'qualquer');
    raise exception 'FALHOU: aba inválida deveria dar erro';
  exception when invalid_parameter_value then null;
  end;

  -- Pesquisa de outra empresa e inexistente: null; suspeitos da outra empresa: nenhum
  if public.respostas_pesquisa(pb) is not null then raise exception 'FALHOU: A viu a lista de B'; end if;
  if public.respostas_pesquisa(gen_random_uuid()) is not null then raise exception 'FALHOU: pesquisa inexistente deveria dar null'; end if;
  if exists (select 1 from public.envios_suspeitos(pb)) then raise exception 'FALHOU: A viu suspeitos de B'; end if;

  -- A não consegue descartar envio de B (0 linhas)
  update public.respostas set descartada = true where id = current_setting('app.rb')::uuid;
  get diagnostics linhas = row_count;
  if linhas <> 0 then raise exception 'FALHOU: A descartou envio de B'; end if;

  -- resultados_pesquisa conta as suspeitas
  res := public.resultados_pesquisa(pa);
  if (res->>'suspeitas')::int <> 12 then raise exception 'FALHOU: resultados.suspeitas = %', res->>'suspeitas'; end if;

  -- A descarta 1 envio do g6: sobram 3 ruins, a rajada desfaz
  update public.respostas set descartada = true where id = current_setting('app.g6')::uuid;
  get diagnostics linhas = row_count;
  if linhas <> 1 then raise exception 'FALHOU: A deveria descartar o próprio envio'; end if;
  if public.respostas_pesquisa(pa)->'contagens' <> '{"todas":28,"suspeitas":8,"descartadas":2}'::jsonb then
    raise exception 'FALHOU: contagens depois do descarte = %', public.respostas_pesquisa(pa)->'contagens';
  end if;
  if (public.resultados_pesquisa(pa)->>'suspeitas')::int <> 8 then raise exception 'FALHOU: resultados.suspeitas depois do descarte'; end if;

  -- Restaurar: a rajada volta
  update public.respostas set descartada = false where id = current_setting('app.g6')::uuid;
  if (public.respostas_pesquisa(pa)->'contagens'->>'suspeitas')::int <> 12 then
    raise exception 'FALHOU: restaurar deveria trazer a rajada de volta';
  end if;
end $$;

-- Dono B: só enxerga a própria pesquisa e a própria rajada
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b7","role":"authenticated"}', true);
do $$
declare
  r jsonb := public.respostas_pesquisa(current_setting('app.pb')::uuid);
begin
  if r->'contagens' <> '{"todas":4,"suspeitas":4,"descartadas":0}'::jsonb then
    raise exception 'FALHOU: contagens da pesquisa B = %', r->'contagens';
  end if;
  if public.respostas_pesquisa(current_setting('app.pa')::uuid) is not null then
    raise exception 'FALHOU: B viu a lista de A';
  end if;
end $$;

select 'TODOS OS TESTES DA LISTA DE RESPOSTAS PASSARAM' as resultado;
rollback;
```

- [ ] **Step 2: Ver falhar.** Carregar as ferramentas do Supabase com ToolSearch (`select:mcp__supabase__execute_sql,mcp__supabase__apply_migration,mcp__supabase__generate_typescript_types,mcp__supabase__get_advisors`) e rodar o arquivo inteiro com `mcp__supabase__execute_sql` (projeto `cvgayvfqzrbdqmlsvcal`). Esperado: erro de função inexistente (`function public.respostas_pesquisa(uuid) does not exist`, ou erro de permissão antes disso na parte do visitante).

- [ ] **Step 3: Escrever a migração** `supabase/migrations/20261010000000_respostas_lista.sql`. Ela tem três partes.

**Parte A: a regra da suspeita.**

```sql
-- Etapa 6B: lista de respostas e selo de suspeita
--
-- Regra: um envio é "ruim" quando a média das notas dele é 4 ou menos. Quatro envios ruins
-- dentro de 15 minutos (exatamente 15 vale), na mesma pesquisa, formam uma rajada, e todos
-- os envios da rajada são suspeitos. Envios descartados não entram na conta. Nada de IP.
-- security invoker: roda com as permissões de quem chama, então o RLS continua valendo.
create function public.envios_suspeitos(p_pesquisa_id uuid)
returns table (resposta_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  with ruins as (
    select r.id, r.created_at
    from public.respostas r
    join public.respostas_itens i on i.resposta_id = r.id
    where r.pesquisa_id = p_pesquisa_id and not r.descartada and i.valor_nota is not null
    group by r.id, r.created_at
    having avg(i.valor_nota) <= 4
  ),
  -- "abre": o 4º envio ruim a contar deste está a 15 minutos ou menos
  marcados as (
    select id, created_at,
           (lead(created_at, 3) over (order by created_at, id) - created_at) <= interval '15 minutes' as abre
    from ruins
  )
  -- suspeito = algum dos 4 últimos (este incluído) abre uma rajada
  select m.id
  from (
    select id,
           coalesce(max(abre::int) over (order by created_at, id rows between 3 preceding and current row), 0) as em_rajada
    from marcados
  ) m
  where m.em_rajada = 1;
$$;

revoke execute on function public.envios_suspeitos(uuid) from public, anon;
grant execute on function public.envios_suspeitos(uuid) to authenticated;
```

**Parte B: a lista.** Função `respostas_pesquisa(p_pesquisa_id uuid, p_aba text default 'todas', p_pagina int default 1) returns jsonb`, `language plpgsql`, `stable`, `security invoker`, `set search_path = ''`. Corpo:

```sql
declare
  c_tamanho constant int := 20;
  v_contagens jsonb;
  v_total int;
  v_total_paginas int;
  v_pagina int := greatest(coalesce(p_pagina, 1), 1);
  v_envios jsonb;
begin
  if p_aba is null or p_aba not in ('todas', 'suspeitas', 'descartadas') then
    raise exception 'aba inválida' using errcode = '22023';
  end if;
  -- Pesquisa que o RLS não deixa ver (ou que não existe): null
  if not exists (select 1 from public.pesquisas where id = p_pesquisa_id) then
    return null;
  end if;

  with susp as (select resposta_id from public.envios_suspeitos(p_pesquisa_id)),
  base as (
    select r.id, r.descartada, (s.resposta_id is not null) as suspeita
    from public.respostas r
    left join susp s on s.resposta_id = r.id
    where r.pesquisa_id = p_pesquisa_id
  )
  select jsonb_build_object(
    'todas', count(*),
    'suspeitas', count(*) filter (where suspeita),
    'descartadas', count(*) filter (where descartada))
  into v_contagens
  from base;

  v_total := (v_contagens->>p_aba)::int;
  v_total_paginas := greatest(ceil(v_total / c_tamanho::numeric)::int, 1);
  v_pagina := least(v_pagina, v_total_paginas);

  with susp as (select resposta_id from public.envios_suspeitos(p_pesquisa_id)),
  base as (
    select r.id, r.created_at, r.descartada, (s.resposta_id is not null) as suspeita
    from public.respostas r
    left join susp s on s.resposta_id = r.id
    where r.pesquisa_id = p_pesquisa_id
  ),
  pagina as (
    select * from base
    where case p_aba when 'todas' then true when 'suspeitas' then suspeita else descartada end
    order by created_at desc, id
    limit c_tamanho offset (v_pagina - 1) * c_tamanho
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id, 'criada_em', f.created_at, 'descartada', f.descartada,
      'suspeita', f.suspeita, 'media', m.media, 'itens', it.itens)
    order by f.created_at desc, f.id), '[]'::jsonb)
  into v_envios
  from pagina f
  left join lateral (
    select round(avg(i.valor_nota)::numeric, 1) as media
    from public.respostas_itens i
    where i.resposta_id = f.id and i.valor_nota is not null
  ) m on true
  left join lateral (
    select coalesce(jsonb_agg(jsonb_build_object(
        'pergunta', q.texto, 'tipo', q.tipo, 'ordem', q.ordem,
        'nota', i.valor_nota, 'texto', i.valor_texto, 'funcionario', fu.nome)
      order by q.ordem), '[]'::jsonb) as itens
    from public.respostas_itens i
    join public.perguntas q on q.id = i.pergunta_id
    left join public.funcionarios fu on fu.id = i.funcionario_id
    where i.resposta_id = f.id
  ) it on true;

  return jsonb_build_object(
    'contagens', v_contagens, 'pagina', v_pagina,
    'total_paginas', v_total_paginas, 'envios', v_envios);
end
```

Terminar com `revoke execute on function public.respostas_pesquisa(uuid, text, int) from public, anon;` e `grant execute ... to authenticated;`. Comentar o código em português (o Caio está aprendendo).

**Parte C: `resultados_pesquisa` com `suspeitas`.** `create or replace function public.resultados_pesquisa(p_pesquisa_id uuid, p_fuso text default 'America/Sao_Paulo') returns jsonb ...` copiando **o corpo inteiro** de `supabase/migrations/20261009000000_resultados_pesquisa.sql` e fazendo só três mudanças: declarar `v_suspeitas int;`; depois de calcular a equipe, `select count(*) into v_suspeitas from public.envios_suspeitos(p_pesquisa_id);`; e acrescentar `'suspeitas', v_suspeitas` ao `jsonb_build_object` final. As permissões da função continuam (não repetir revoke/grant; `create or replace` mantém).

- [ ] **Step 4: Aplicar** com `mcp__supabase__apply_migration` (`name: "respostas_lista"`, mesmo SQL).

- [ ] **Step 5: Ver passar.** Rodar `rls_respostas_lista.sql` de novo. Esperado: última linha `TODOS OS TESTES DA LISTA DE RESPOSTAS PASSARAM`. Se algum teste falhar, corrigir **a função**, não o teste (a menos que o erro seja de digitação no próprio teste; nesse caso explicar no relatório).

- [ ] **Step 6: Atualizar a prova antiga.** Em `supabase/tests/rls_resultados.sql`, no bloco do dono A, depois da checagem de `geral`, acrescentar:

```sql
  -- Nenhuma rajada nos dados desta prova (só 2 envios ruins)
  if (r->>'suspeitas')::int <> 0 then raise exception 'FALHOU: suspeitas = %', r->>'suspeitas'; end if;
```

Rodar `rls_resultados.sql` e os outros 4 testes de RLS em `supabase/tests/` (todos precisam continuar passando).

- [ ] **Step 7: Tipos.** `mcp__supabase__generate_typescript_types` e atualizar `src/lib/supabase/database.types.ts`; conferir `envios_suspeitos` e `respostas_pesquisa` em `Functions`. Se o arquivo gerado diferir em coisas sem relação, acrescentar apenas as duas funções (ordem alfabética).

- [ ] **Step 8: Advisors.** `mcp__supabase__get_advisors` (security e performance): nenhuma novidade causada pelas funções novas (funções `security invoker` com `search_path` fixo não devem aparecer).

- [ ] **Step 9: Commit.**

```bash
git add supabase/migrations/20261010000000_respostas_lista.sql supabase/tests/rls_respostas_lista.sql supabase/tests/rls_resultados.sql src/lib/supabase/database.types.ts
git commit -m "feat: funções envios_suspeitos e respostas_pesquisa e prova de segurança

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Funções puras e tipos da lista (TDD)

**Files:**
- Create: `src/lib/respostas/lista.ts`
- Create: `src/lib/respostas/lista.test.ts`

**Interfaces:**
- Consumes: nada de tarefas anteriores (os tipos espelham o JSON da Task 1).
- Produces (usados nas Tasks 3 a 5):
  - `type Aba = "todas" | "suspeitas" | "descartadas"`, `const ABAS: readonly Aba[]`
  - `type ItemEnvio`, `type Envio`, `type Contagens`, `type ListaRespostas` (formato da Task 1)
  - `lerAba(valor: string | string[] | undefined): Aba` (padrão `"todas"`)
  - `lerPagina(valor: string | string[] | undefined): number` (padrão 1)
  - `formatarDataHora(iso: string): string` -> `"08/10/2026 às 14:03"` no fuso de São Paulo
  - `esquemaIdResposta` (`z.uuid`), `esquemaIdsResposta` (lista de 1 a 20 uuids)
  - `mensagemErroDescarte(): string`

- [ ] **Step 1: Escrever os testes** em `src/lib/respostas/lista.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  esquemaIdResposta,
  esquemaIdsResposta,
  formatarDataHora,
  lerAba,
  lerPagina,
  mensagemErroDescarte,
} from "./lista";

const ID = "0b9f6a3e-6f6e-4a53-9c1f-2f7d3c9a1b11";

describe("lerAba", () => {
  it("aceita as três abas", () => {
    expect(lerAba("todas")).toBe("todas");
    expect(lerAba("suspeitas")).toBe("suspeitas");
    expect(lerAba("descartadas")).toBe("descartadas");
  });
  it("valor inválido, ausente ou repetido vira todas", () => {
    expect(lerAba("outra")).toBe("todas");
    expect(lerAba(undefined)).toBe("todas");
    expect(lerAba(["suspeitas", "todas"])).toBe("todas");
  });
});

describe("lerPagina", () => {
  it("aceita inteiros a partir de 1", () => {
    expect(lerPagina("1")).toBe(1);
    expect(lerPagina("7")).toBe(7);
  });
  it("o resto vira 1", () => {
    for (const v of ["0", "-3", "abc", "2.5", "", " 2", undefined, ["3", "4"]]) {
      expect(lerPagina(v)).toBe(1);
    }
  });
  it("limita números absurdos", () => {
    expect(lerPagina("99999999999")).toBe(1);
  });
});

describe("formatarDataHora", () => {
  it("usa o fuso de São Paulo", () => {
    expect(formatarDataHora("2026-10-08T17:03:00+00:00")).toBe("08/10/2026 às 14:03");
  });
  it("meia-noite é 00:00, não 24:00", () => {
    expect(formatarDataHora("2026-10-08T03:00:00+00:00")).toBe("08/10/2026 às 00:00");
  });
});

describe("esquemas de id", () => {
  it("aceita uuid e recusa o resto", () => {
    expect(esquemaIdResposta.safeParse(ID).success).toBe(true);
    expect(esquemaIdResposta.safeParse("1").success).toBe(false);
  });
  it("lista de 1 a 20 ids", () => {
    expect(esquemaIdsResposta.safeParse([ID]).success).toBe(true);
    expect(esquemaIdsResposta.safeParse([]).success).toBe(false);
    expect(esquemaIdsResposta.safeParse(Array.from({ length: 21 }, () => ID)).success).toBe(false);
    expect(esquemaIdsResposta.safeParse(["x"]).success).toBe(false);
  });
});

describe("mensagemErroDescarte", () => {
  it("é uma frase amigável", () => {
    expect(mensagemErroDescarte()).toMatch(/tente de novo/i);
  });
});
```

- [ ] **Step 2: Ver falhar.** `npm test -- lista` -> falha (módulo não existe).

- [ ] **Step 3: Implementar** `src/lib/respostas/lista.ts`:

```ts
import { z } from "zod";

// O que a função respostas_pesquisa (banco) devolve
export const ABAS = ["todas", "suspeitas", "descartadas"] as const;
export type Aba = (typeof ABAS)[number];

export type ItemEnvio = {
  pergunta: string;
  tipo: "nota" | "texto" | "funcionario";
  ordem: number;
  nota: number | null;
  texto: string | null;
  funcionario: string | null; // nome, no item da pergunta "Quem te atendeu?"
};

export type Envio = {
  id: string;
  criada_em: string; // instante (ISO); a hora na tela é formatada no fuso de São Paulo
  descartada: boolean;
  suspeita: boolean;
  media: number | null; // null = envio sem nenhuma nota
  itens: ItemEnvio[];
};

export type Contagens = { todas: number; suspeitas: number; descartadas: number };

export type ListaRespostas = {
  contagens: Contagens;
  pagina: number;
  total_paginas: number;
  envios: Envio[];
};

// Os parâmetros da URL chegam do navegador (podem ser qualquer coisa): validamos antes de usar.
export function lerAba(valor: string | string[] | undefined): Aba {
  return typeof valor === "string" && (ABAS as readonly string[]).includes(valor) ? (valor as Aba) : "todas";
}

export function lerPagina(valor: string | string[] | undefined): number {
  if (typeof valor !== "string" || !/^[1-9]\d{0,5}$/.test(valor)) return 1;
  return Number(valor);
}

// "08/10/2026 às 14:03", sempre no fuso de São Paulo (hourCycle h23 evita "24:00")
const FORMATADOR = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatarDataHora(iso: string): string {
  const p = Object.fromEntries(FORMATADOR.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}`;
}

// Ids chegam do navegador nas Server Actions: conferimos o formato antes de usar
export const esquemaIdResposta = z.uuid("Resposta inválida.");
export const esquemaIdsResposta = z.array(z.uuid("Resposta inválida.")).min(1).max(20);

export function mensagemErroDescarte(): string {
  return "Não deu para atualizar esta resposta agora. Tente de novo em instantes.";
}
```

- [ ] **Step 4: Ver passar.** `npm test` (todos os testes) e `npm run lint`.

- [ ] **Step 5: Commit.**

```bash
git add src/lib/respostas/lista.ts src/lib/respostas/lista.test.ts
git commit -m "feat: tipos e funções puras da lista de respostas

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Server Actions e botões de descarte

**Files:**
- Create: `src/app/painel/respostas/actions.ts`
- Create: `src/app/painel/respostas/botoes-descarte.tsx`

**Interfaces:**
- Consumes (Task 2): `esquemaIdResposta`, `esquemaIdsResposta`, `mensagemErroDescarte` de `@/lib/respostas/lista`.
- Produces (usado pela Task 4):
  - `type EstadoDescarte = { erro?: string; ok?: number }`
  - Server Actions `descartarResposta(id: string)`, `restaurarResposta(id: string)`, `descartarVarias(ids: string[])`, todas `Promise<EstadoDescarte>`
  - Componentes `BotaoDescarte({ id, descartada }: { id: string; descartada: boolean })` e `BotaoDescartarSuspeitas({ ids }: { ids: string[] })`

- [ ] **Step 1: Ler** `node_modules/next/dist/docs/` sobre Server Actions e `revalidatePath` (regra do projeto), e `src/app/painel/funcionarios/actions.ts` + `linha-funcionario.tsx` (padrão de `useTransition` e erro). Conferir as variantes de `src/components/ui/button.tsx` antes de escolher `variant`/`size`.

- [ ] **Step 2: Escrever** `actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import {
  esquemaIdResposta,
  esquemaIdsResposta,
  mensagemErroDescarte,
} from "@/lib/respostas/lista";
import { createClient } from "@/lib/supabase/server";

export type EstadoDescarte = { erro?: string; ok?: number };

// Muda a coluna "descartada" dos envios pedidos. Quem decide se o envio é do usuário é o RLS:
// envio de outra empresa não é encontrado e o update devolve menos linhas do que pedimos.
async function alterar(ids: string[], descartada: boolean): Promise<EstadoDescarte> {
  const supabase = await createClient();
  const { data: sessao } = await supabase.auth.getClaims();
  if (!sessao?.claims) return { erro: mensagemErroDescarte() };

  const unicos = [...new Set(ids)];
  const { data, error } = await supabase
    .from("respostas")
    .update({ descartada })
    .in("id", unicos)
    .select("id");
  if (error || !data || data.length !== unicos.length) return { erro: mensagemErroDescarte() };

  // Os números de Resultados mudam junto (as descartadas não entram em nada)
  revalidatePath("/painel/respostas");
  revalidatePath("/painel/resultados");
  return { ok: Date.now() };
}

export async function descartarResposta(idRecebido: string): Promise<EstadoDescarte> {
  const id = esquemaIdResposta.safeParse(idRecebido);
  if (!id.success) return { erro: mensagemErroDescarte() };
  return alterar([id.data], true);
}

export async function restaurarResposta(idRecebido: string): Promise<EstadoDescarte> {
  const id = esquemaIdResposta.safeParse(idRecebido);
  if (!id.success) return { erro: mensagemErroDescarte() };
  return alterar([id.data], false);
}

export async function descartarVarias(idsRecebidos: string[]): Promise<EstadoDescarte> {
  const ids = esquemaIdsResposta.safeParse(idsRecebidos);
  if (!ids.success) return { erro: mensagemErroDescarte() };
  return alterar(ids.data, true);
}
```

- [ ] **Step 3: Escrever** `botoes-descarte.tsx` (componente de navegador). Requisitos:
  - `BotaoDescarte`: um botão. Se `descartada` é falso, rótulo "Descartar" e chama `descartarResposta(id)`; se verdadeiro, rótulo "Restaurar" e chama `restaurarResposta(id)`. Usa `useTransition`; enquanto pendente fica `disabled` e mostra "Descartando…" ou "Restaurando…". Se a action devolve `erro`, mostra a mensagem logo abaixo com `role="alert"`.
  - `BotaoDescartarSuspeitas({ ids })`: botão "Descartar as N suspeitas desta página" (singular quando N = 1: "Descartar a suspeita desta página"); chama `descartarVarias(ids)`; mesmo tratamento de pendente e erro. Não renderiza nada se `ids.length === 0`.
  - Alvo de toque mínimo de 44 px (`min-h-11`), foco visível, sem emoji. "Descartar" usa estilo discreto (contorno); nada de vermelho gritante, já que é reversível.
  - Comentários em português explicando `useTransition` em uma frase.

- [ ] **Step 4: Verificar.** `npm run lint` e `npx tsc --noEmit` sem erros. (Teste funcional acontece no Chrome na Task 6; a segurança do `update` já foi provada no SQL da Task 1.)

- [ ] **Step 5: Commit.**

```bash
git add src/app/painel/respostas/actions.ts src/app/painel/respostas/botoes-descarte.tsx
git commit -m "feat: ações e botões para descartar e restaurar respostas

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Página Respostas, menu e lista de pesquisas compartilhada

**Files:**
- Create: `src/lib/pesquisas/para-seletor.ts`
- Create: `src/app/painel/respostas/abas.tsx`, `cartao-envio.tsx`, `paginacao.tsx`, `vazio.tsx`, `page.tsx`
- Modify: `src/app/painel/resultados/page.tsx` (usar a função compartilhada)
- Modify: `src/app/painel/nav-painel.tsx` (link Respostas)

**Interfaces:**
- Consumes (Task 2): `Aba`, `ABAS`, `Contagens`, `Envio`, `ListaRespostas`, `lerAba`, `lerPagina`, `formatarDataHora`. Consumes (Task 3): `BotaoDescarte`, `BotaoDescartarSuspeitas`. Consumes (6A, já existentes): `escolherPesquisaPadrao`, `formatarMedia`, `rotuloFaixa` de `@/lib/resultados/apresentacao`, `faixaDaNota` de `@/lib/notas/faixa`, `SeletorPesquisa` de `../resultados/seletor-pesquisa`, `obterContextoEmpresa` de `@/lib/empresas/contexto`.
- Produces: `listarPesquisasParaSeletor(supabase, empresaId): Promise<{ id: string; titulo: string; slug: string; respostas: number }[]>`.

- [ ] **Step 1: Pesquisas compartilhadas.** Criar `src/lib/pesquisas/para-seletor.ts` movendo a consulta que hoje está em `resultados/page.tsx` (`pesquisas` com `respostas(count)`, `eq("empresa_id", ...)`, `order("created_at", { ascending: false })`, mapeando para `{ id, titulo, slug, respostas }`). O primeiro parâmetro é o cliente do Supabase (tipo `Awaited<ReturnType<typeof createClient>>` de `@/lib/supabase/server`). Alterar `resultados/page.tsx` para chamá-la, **sem mudar o comportamento**. `npm run build` deve continuar passando.

- [ ] **Step 2: Menu.** Em `nav-painel.tsx`, novo item `{ href: "/painel/respostas", rotulo: "Respostas", Icone: MessageSquareText }` (de `lucide-react`) entre "Resultados" e "Funcionários". Conferir que `caminho.startsWith` não confunde `/painel/respostas` com outro item. No celular, só o item ativo mostra o nome (regra que já existe): conferir que 5 itens cabem em 360 px.

- [ ] **Step 3: Peças** (servidor, sem JavaScript no navegador, exceto os botões):
  - `abas.tsx`: `Abas({ pesquisaId, atual, contagens })`, `<nav aria-label="Filtrar respostas">` com três links (`Todas`, `Suspeitas`, `Descartadas`), cada um com a contagem (`Suspeitas (5)`). `href` = `/painel/respostas?pesquisa=${pesquisaId}&aba=${aba}`. A atual tem `aria-current="page"`. Três colunas iguais, alvo de 44 px, cabe em 360 px sem rolagem.
  - `cartao-envio.tsx`: `CartaoEnvio({ envio })`. Mostra `formatarDataHora(envio.criada_em)`; selo **"Suspeita"** (texto, cor manga/coral) quando `suspeita`; etiqueta **"Descartada"** (cinza) e cartão esmaecido (`opacity`, mas texto com contraste suficiente) quando `descartada`; média do envio com `formatarMedia` + `rotuloFaixa` (só se `media !== null`); lista de itens: `nota` -> pergunta, número grande e palavra da faixa (mesmas cores de `cartoes-perguntas.tsx`: `bg-menta-claro text-menta-texto`, `bg-manga-claro text-manga-texto`, `bg-coral/15 text-coral-escuro`); `texto` -> pergunta e a resposta em bloco com `whitespace-pre-wrap break-words`; `funcionario` -> "Atendido por {nome}" (só se houver nome). Texto **sempre** como conteúdo React comum. Rodapé com `<BotaoDescarte id descartada />`. Sem itens: mostra "Sem respostas neste envio".
  - `paginacao.tsx`: `Paginacao({ pesquisaId, aba, pagina, totalPaginas })`: não renderiza nada se `totalPaginas <= 1`. Links "Anterior" e "Próxima" (`?pesquisa=…&aba=…&pagina=N`); o lado sem destino vira `<span aria-disabled="true">` esmaecido; entre eles "Página X de Y". Alvos de 44 px.
  - `vazio.tsx`: `VazioRespostas({ aba })`: textos por aba. `todas`: "Ainda sem respostas" + "Quando um cliente responder, o envio aparece aqui."; `suspeitas`: "Nenhuma resposta suspeita" + "Se aparecer uma rajada de notas ruins em poucos minutos, ela aparece aqui para você decidir."; `descartadas`: "Nenhuma resposta descartada" + "As respostas que você descartar ficam aqui e podem ser restauradas." Mesmo visual do `resultados/vazio.tsx` (sem o botão).

- [ ] **Step 4: Página** `src/app/painel/respostas/page.tsx` (modelo: `resultados/page.tsx`):
  - `export const metadata = { title: "Respostas" }`.
  - `searchParams: Promise<{ pesquisa?: string; aba?: string; pagina?: string }>` (consultar docs do Next 16).
  - `obterContextoEmpresa()`, `getClaims()` com `redirect("/entrar")` se não logado; `listarPesquisasParaSeletor`; `escolherPesquisaPadrao(pesquisas, pedido)`.
  - Sem pesquisa nenhuma: mesmo cartão "Nenhuma pesquisa ainda" da página Resultados.
  - Chama `supabase.rpc("respostas_pesquisa", { p_pesquisa_id, p_aba: lerAba(...), p_pagina: lerPagina(...) })` e converte com `as unknown as ListaRespostas | null`.
  - Erro ou `null`: cartão "Não deu para carregar as respostas agora" + "Recarregue a página em instantes.".
  - Layout: cabeçalho ("Respostas" / "O que seus clientes escreveram."); `SeletorPesquisa` (só com mais de uma pesquisa); `Abas`; se a aba é `suspeitas` e há envios, uma frase explicando a regra ("Marcamos como suspeitas as respostas de uma rajada: 4 ou mais envios com nota média 4 ou menos em 15 minutos. Só você decide: descartar tira a resposta dos números, e dá para restaurar.") e `BotaoDescartarSuspeitas` com os ids dos envios da página; lista de `CartaoEnvio` (`<ul>`); `Paginacao`; envios vazios -> `VazioRespostas`.
  - Se a página devolvida difere da pedida (clamp), apenas mostra a devolvida.
  - `max-w-3xl`, mesma classe de seção `SECAO` e animação `entrada` dos Resultados.

- [ ] **Step 5: Passada de design.** Rodar as skills de design (`impeccable`, `frontend-design`, `emil-design-eng`, `mobile-native`, `animate`, `design:ux-copy`, `design:accessibility-review`) sobre a página e ajustar espaçamento, textos e foco. Não mudar a regra de negócio.

- [ ] **Step 6: Verificar.** `npm run lint`, `npm test`, `npm run build` sem erros.

- [ ] **Step 7: Commit.**

```bash
git add src/lib/pesquisas/para-seletor.ts src/app/painel/respostas src/app/painel/resultados/page.tsx src/app/painel/nav-painel.tsx
git commit -m "feat: página Respostas com abas, selo de suspeita e descarte

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Aviso de suspeitas em Resultados

**Files:**
- Modify: `src/lib/resultados/tipos.ts` (campo `suspeitas`)
- Modify: `src/app/painel/resultados/page.tsx` (aviso)

**Interfaces:**
- Consumes (Task 1): chave `suspeitas` em `resultados_pesquisa`.
- Produces: `Resultados.suspeitas: number`.

- [ ] **Step 1:** Em `tipos.ts`, acrescentar `suspeitas: number;` ao tipo `Resultados`.

- [ ] **Step 2:** Em `resultados/page.tsx`, no ramo com respostas, **antes** de `CartoesTotais`, quando `resultados.suspeitas > 0`, renderizar um aviso (cartão discreto cor manga clara, `role="status"` não é necessário por ser conteúdo de página) com o texto "N respostas suspeitas" (singular: "1 resposta suspeita"), uma frase curta ("Várias notas ruins em poucos minutos. Veja e decida se descarta.") e um link "Ver respostas suspeitas" para `/painel/respostas?pesquisa=${escolhida}&aba=suspeitas`. O link tem alvo de toque de 44 px. Sem emoji.

- [ ] **Step 3: Verificar.** `npm run lint`, `npm test`, `npm run build`.

- [ ] **Step 4: Commit.**

```bash
git add src/lib/resultados/tipos.ts src/app/painel/resultados/page.tsx
git commit -m "feat: aviso de respostas suspeitas na página Resultados

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verificação, documentação, PR e merge

**Files:**
- Modify: `README.md`, `CLAUDE.md`
- Create: `docs/prints/respostas-lista.jpg`

(Passos 1 a 3 são do controlador, não do implementer: o Chrome é controlado por ele.)

- [ ] **Step 1: Chrome com dados de exemplo.** Inserir por SQL, na pesquisa real, uma rajada de teste marcada com microssegundos `777777` (como na 6A): 5 envios com nota 2 em 10 minutos, 2 envios bons e um envio só com texto contendo `<b>teste</b>`. Testar: lista, selo "Suspeita", abas e contagens, descartar um envio (some de Suspeitas, aparece em Descartadas, Resultados muda), restaurar, "Descartar as suspeitas desta página", paginação (inserir envios suficientes para passar de 20), `?aba=lixo`, `?pagina=999`, aviso em Resultados com link para a aba, texto `<b>` aparece literal, navegação por teclado. Tirar print `docs/prints/respostas-lista.jpg` (números de exemplo; sem e-mail ou dados reais). Depois **apagar os dados de exemplo** e confirmar que o banco voltou ao estado original (3 respostas reais). Celular não é testável no Chrome controlado.

- [ ] **Step 2: Qualidade.** `npm run lint`, `npm test` (anotar a contagem), `npm run build`, os 6 arquivos de `supabase/tests/` passando, `git diff main -- package.json` vazio.

- [ ] **Step 3: Documentação.** `README.md`: tela Respostas na seção Telas (com o print), "O que já existe", contagem de testes, árvore de pastas, regra da suspeita em uma frase. `CLAUDE.md`: marcar 6B concluída (data), desenho e plano, pendências (celular; `respostas(count)` das listas ainda conta descartadas; texto da regra fixa no SQL).

- [ ] **Step 4: Commit, push e PR.**

```bash
git add README.md CLAUDE.md docs/prints/respostas-lista.jpg
git commit -m "docs: Etapa 6B concluída

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
git push -u origin etapa-6b-respostas
gh pr create --title "Etapa 6B: respostas, suspeitas e descarte" --body "<resumo + testes + pendências>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 5: Merge** (autorizado pelo Caio, memória `merge-autorizado`): `gh pr merge --merge`, voltar para `main`, `git pull`.

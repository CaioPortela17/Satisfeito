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

  -- painel_pesquisa conta as suspeitas
  res := public.painel_pesquisa(pa);
  if (res->>'suspeitas')::int <> 12 then raise exception 'FALHOU: resultados.suspeitas = %', res->>'suspeitas'; end if;

  -- A descarta 1 envio do g6: sobram 3 ruins, a rajada desfaz
  update public.respostas set descartada = true where id = current_setting('app.g6')::uuid;
  get diagnostics linhas = row_count;
  if linhas <> 1 then raise exception 'FALHOU: A deveria descartar o próprio envio'; end if;
  if public.respostas_pesquisa(pa)->'contagens' <> '{"todas":28,"suspeitas":8,"descartadas":2}'::jsonb then
    raise exception 'FALHOU: contagens depois do descarte = %', public.respostas_pesquisa(pa)->'contagens';
  end if;
  if (public.painel_pesquisa(pa)->>'suspeitas')::int <> 8 then raise exception 'FALHOU: resultados.suspeitas depois do descarte'; end if;

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

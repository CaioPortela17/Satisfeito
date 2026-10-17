-- Prova da função comparar_unidades. Desfaz tudo (rollback).
--   Dono A tem duas empresas: A1 (4 envios no período: notas 10, 10, 6, 2; 1 no anterior; 1 descartado)
--   e A2 (12 envios nota 9 no período). Dono B tem uma empresa com 3 envios que A nunca pode ver.
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'unid-a@exemplo.com', '{"nome_empresa":"Unidade A1"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000bd', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'unid-b@exemplo.com', '{"nome_empresa":"Unidade B"}', now(), now());

do $$
declare
  a1 uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000ad');
  a2 uuid; eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000bd');
  p1 uuid; p2 uuid; pb uuid; q1 uuid; q2 uuid; qb uuid; r uuid; i int; nota int;
begin
  insert into public.empresas (nome, owner_id) values ('Unidade A2', '00000000-0000-0000-0000-0000000000ad') returning id into a2;
  insert into public.pesquisas (empresa_id, titulo, slug) values (a1, 'P1', 'teste-unid-p1') returning id into p1;
  insert into public.pesquisas (empresa_id, titulo, slug) values (a2, 'P2', 'teste-unid-p2') returning id into p2;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'PB', 'teste-unid-pb') returning id into pb;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (p1, 'Nota?', 'nota', 1) returning id into q1;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (p2, 'Nota?', 'nota', 1) returning id into q2;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (pb, 'Nota?', 'nota', 1) returning id into qb;

  -- A1 no período: 10, 10, 6, 2 (média 7,0; NPS null: só 4 envios)
  foreach nota in array array[10, 10, 6, 2] loop
    insert into public.respostas (pesquisa_id, created_at) values (p1, now() - interval '1 day') returning id into r;
    insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, q1, nota);
  end loop;
  -- A1 descartado (fora) e A1 no período anterior (hoje - 10 dias, para 7 dias; dentro do período para 30)
  insert into public.respostas (pesquisa_id, created_at, descartada) values (p1, now() - interval '1 day', true) returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, q1, 1);
  insert into public.respostas (pesquisa_id, created_at) values (p1, now() - interval '10 days') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, q1, 5);

  -- A2: 12 envios nota 9 no período (NPS 100)
  for i in 1..12 loop
    insert into public.respostas (pesquisa_id, created_at) values (p2, now() - ((i) || ' hours')::interval) returning id into r;
    insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, q2, 9);
  end loop;

  -- B: 3 envios
  for i in 1..3 loop
    insert into public.respostas (pesquisa_id, created_at) values (pb, now() - interval '2 hours') returning id into r;
    insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, qb, 4);
  end loop;
end $$;

-- Visitante sem login não executa
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.comparar_unidades();
    raise exception 'FALHOU: visitante executou comparar_unidades';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dono A: vê só as duas empresas dele
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated"}', true);
do $$
declare t jsonb; x jsonb;
begin
  begin
    perform public.comparar_unidades(10);
    raise exception 'FALHOU: p_dias = 10 deveria dar erro';
  exception when invalid_parameter_value then null;
  end;

  -- 7 dias: o envio de 10 dias atrás cai no período anterior
  t := public.comparar_unidades(7);
  if jsonb_array_length(t) <> 2 then raise exception 'FALHOU: A vê % unidades (esperado 2): %', jsonb_array_length(t), t; end if;
  if exists (select 1 from jsonb_array_elements(t) e where e->>'nome' = 'Unidade B') then raise exception 'FALHOU: A viu a unidade de B'; end if;

  x := (select e from jsonb_array_elements(t) e where e->>'nome' = 'Unidade A1');
  if (x->>'envios')::int <> 4 or (x->>'media')::numeric <> 7.0 or jsonb_typeof(x->'nps') <> 'null'
     or (x->>'envios_anterior')::int <> 1 or (x->>'media_anterior')::numeric <> 5.0 then
    raise exception 'FALHOU: A1 (7 dias) = %', x;
  end if;

  x := (select e from jsonb_array_elements(t) e where e->>'nome' = 'Unidade A2');
  if (x->>'envios')::int <> 12 or (x->>'media')::numeric <> 9.0 or (x->>'nps')::int <> 100
     or (x->>'envios_anterior')::int <> 0 or jsonb_typeof(x->'media_anterior') <> 'null' then
    raise exception 'FALHOU: A2 (7 dias) = %', x;
  end if;

  -- 30 dias: o envio de 10 dias atrás entra no período (5 envios, média (10+10+6+2+5)/5 = 6,6)
  t := public.comparar_unidades(30);
  x := (select e from jsonb_array_elements(t) e where e->>'nome' = 'Unidade A1');
  if (x->>'envios')::int <> 5 or (x->>'media')::numeric <> 6.6 or (x->>'envios_anterior')::int <> 0 then
    raise exception 'FALHOU: A1 (30 dias) = %', x;
  end if;

  -- a ordem segue a criação das empresas (A1 antes de A2)
  if public.comparar_unidades(7)->0->>'nome' <> 'Unidade A1' then raise exception 'FALHOU: ordem das unidades'; end if;
end $$;

-- Dono B: só a unidade dele
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bd","role":"authenticated"}', true);
do $$
declare t jsonb := public.comparar_unidades(30);
begin
  if jsonb_array_length(t) <> 1 or t->0->>'nome' <> 'Unidade B' or (t->0->>'envios')::int <> 3 or (t->0->>'media')::numeric <> 4.0 then
    raise exception 'FALHOU: B = %', t;
  end if;
end $$;

reset role;
select 'TODOS OS TESTES DE COMPARAR UNIDADES PASSARAM' as resultado;
rollback;

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
  -- Nenhuma rajada nos dados desta prova (só 2 envios ruins)
  if (r->>'suspeitas')::int <> 0 then raise exception 'FALHOU: suspeitas = %', r->>'suspeitas'; end if;

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

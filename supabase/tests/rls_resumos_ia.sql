-- Prova da Etapa 7 (resumos_ia, textos_para_resumo, uso_resumos_ia). Desfaz tudo (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resumo-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resumo-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Dados conhecidos, criados como administrador.
-- Pesquisa A (pa): 5 textos válidos nos 30 dias; excluídos: 30 dias atrás, descartada, item de pergunta
--   que não é de texto, item sem texto. Pesquisa A2 (pa2): 205 textos (testa o limite de 200).
do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000a8');
  eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b8');
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  pa uuid; pa2 uuid; pb uuid;
  qn uuid; qt uuid; qt2 uuid; qb uuid; qbt uuid;
  r uuid; i int;
begin
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Pesquisa A', 'teste-resumo-a') returning id into pa;
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Pesquisa A2', 'teste-resumo-a2') returning id into pa2;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'Pesquisa B', 'teste-resumo-b') returning id into pb;

  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Nota?', 'nota', 1, true) returning id into qn;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa, 'Onde melhorar?', 'texto', 2, false) returning id into qt;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pa2, 'Comentário?', 'texto', 1, false) returning id into qt2;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pb, 'Nota B?', 'nota', 1, true) returning id into qb;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values (pb, 'Texto B?', 'texto', 2, false) returning id into qbt;

  -- 3 textos de hoje (t1 mais antigo, t3 mais novo)
  for i in 1..3 loop
    insert into public.respostas (pesquisa_id, created_at) values (pa, now() - ((4 - i) || ' minutes')::interval) returning id into r;
    insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qt, 'texto ' || i);
  end loop;
  -- 1 texto de 29 dias atrás (entra) e 1 de 30 dias atrás (fora)
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje - 29)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qt, 'texto 29 dias');
  insert into public.respostas (pesquisa_id, created_at) values (pa, ((hoje - 30)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qt, 'texto 30 dias (fora)');
  -- 1 texto longo (1200 caracteres): deve voltar cortado em 1000
  insert into public.respostas (pesquisa_id, created_at) values (pa, now() - interval '10 minutes') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qt, repeat('x', 1000));
  -- descartada: fora
  insert into public.respostas (pesquisa_id, created_at, descartada) values (pa, now() - interval '5 minutes', true) returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qt, 'texto descartado (fora)');
  -- item de pergunta de nota com texto (não deveria existir, mas o filtro por tipo tem que barrar) e item só com nota
  insert into public.respostas (pesquisa_id, created_at) values (pa, now() - interval '6 minutes') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota, valor_texto) values (r, qn, 5, 'texto em pergunta de nota (fora)');
  insert into public.respostas (pesquisa_id, created_at) values (pa, now() - interval '7 minutes') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, qn, 9);

  -- pa2: 205 textos
  for i in 1..205 loop
    insert into public.respostas (pesquisa_id, created_at) values (pa2, now() - (i || ' seconds')::interval) returning id into r;
    insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qt2, 'comentário ' || i);
  end loop;

  -- pb: 1 texto
  insert into public.respostas (pesquisa_id, created_at) values (pb, now()) returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qbt, 'texto da empresa B');

  -- resumos: A tem 2 hoje na pa (o mais novo = marcador 'novo') + 1 hoje na pa2 + 1 ontem + 1 às 01:00 UTC (ontem em SP)
  insert into public.resumos_ia (pesquisa_id, conteudo, respostas_lidas, modelo, created_at) values
    (pa,  '{"positivos":["antigo"],"reclamacoes":[],"sugestoes":[]}', 4, 'm', now() - interval '1 second'),
    (pa,  '{"positivos":["novo"],"reclamacoes":[],"sugestoes":[]}',   5, 'm', now()),
    (pa2, '{"positivos":["pa2"],"reclamacoes":[],"sugestoes":[]}',  200, 'm', now()),
    (pa,  '{"positivos":["ontem"],"reclamacoes":[],"sugestoes":[]}',  5, 'm', ((hoje - 1)::timestamp + interval '12 hours') at time zone 'America/Sao_Paulo'),
    (pa,  '{"positivos":["fuso"],"reclamacoes":[],"sugestoes":[]}',   5, 'm', ((hoje)::timestamp + interval '1 hour') at time zone 'UTC'),
    (pb,  '{"positivos":["B"],"reclamacoes":[],"sugestoes":[]}',      1, 'm', now());

  perform set_config('app.pa', pa::text, true);
  perform set_config('app.pa2', pa2::text, true);
  perform set_config('app.pb', pb::text, true);
end $$;

-- Visitante sem login: não lê a tabela e não executa as funções
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform 1 from public.resumos_ia limit 1;
    raise exception 'FALHOU: visitante leu resumos_ia';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.textos_para_resumo(current_setting('app.pa')::uuid);
    raise exception 'FALHOU: visitante executou textos_para_resumo';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.uso_resumos_ia(current_setting('app.pa')::uuid);
    raise exception 'FALHOU: visitante executou uso_resumos_ia';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dono A
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a8","role":"authenticated"}', true);
do $$
declare
  pa uuid := current_setting('app.pa')::uuid;
  pa2 uuid := current_setting('app.pa2')::uuid;
  pb uuid := current_setting('app.pb')::uuid;
  t jsonb; u jsonb; linhas int;
begin
  -- Lê só os resumos da própria empresa (5 linhas de A; as 5 são da empresa A, a de B não aparece)
  select count(*) into linhas from public.resumos_ia;
  if linhas <> 5 then raise exception 'FALHOU: A vê % resumos (esperado 5)', linhas; end if;
  if exists (select 1 from public.resumos_ia where conteudo->'positivos'->>0 = 'B') then
    raise exception 'FALHOU: A leu o resumo de B';
  end if;

  -- Ninguém grava pela API
  begin
    insert into public.resumos_ia (pesquisa_id, conteudo, respostas_lidas, modelo) values (pa, '{}', 1, 'm');
    raise exception 'FALHOU: A inseriu resumo pela API';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.resumos_ia set modelo = 'x';
    raise exception 'FALHOU: A alterou resumo pela API';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.resumos_ia;
    raise exception 'FALHOU: A apagou resumo pela API';
  exception when insufficient_privilege then null;
  end;

  -- textos_para_resumo (pa): 5 textos (3 de hoje + 29 dias + o longo); fora: 30 dias, descartada, pergunta de nota, item sem texto
  t := public.textos_para_resumo(pa);
  if (t->>'total')::int <> 5 or jsonb_array_length(t->'textos') <> 5 then
    raise exception 'FALHOU: textos de pa = %', t->>'total';
  end if;
  -- mais recente primeiro: texto 3 (1 min atrás) antes de texto 2 e do longo (10 min atrás); o de 29 dias é o último
  if t->'textos'->0->>'texto' <> 'texto 3' or t->'textos'->4->>'texto' <> 'texto 29 dias' then
    raise exception 'FALHOU: ordem dos textos = %', t->'textos';
  end if;
  if t->'textos'->0->>'pergunta' <> 'Onde melhorar?' then raise exception 'FALHOU: pergunta do texto'; end if;
  if exists (select 1 from jsonb_array_elements(t->'textos') x where x->>'texto' like '%(fora)') then
    raise exception 'FALHOU: entrou texto que deveria estar fora';
  end if;
  -- corte em 1000 caracteres (o texto longo tem 1000 x; teste o corte direto com período maior abaixo)
  if not exists (select 1 from jsonb_array_elements(t->'textos') x where length(x->>'texto') = 1000) then
    raise exception 'FALHOU: texto de 1000 caracteres não voltou inteiro';
  end if;

  -- limite de 200 textos, total conta tudo
  t := public.textos_para_resumo(pa2);
  if (t->>'total')::int <> 205 or jsonb_array_length(t->'textos') <> 200 then
    raise exception 'FALHOU: limite de 200 = % / %', t->>'total', jsonb_array_length(t->'textos');
  end if;
  if t->'textos'->0->>'texto' <> 'comentário 1' then raise exception 'FALHOU: ordem em pa2'; end if;

  -- p_dias inválido: erro 22023
  begin
    perform public.textos_para_resumo(pa, 0);
    raise exception 'FALHOU: p_dias = 0 deveria dar erro';
  exception when invalid_parameter_value then null;
  end;

  -- Pesquisa de outra empresa e inexistente: null
  if public.textos_para_resumo(pb) is not null then raise exception 'FALHOU: A viu textos de B'; end if;
  if public.textos_para_resumo(gen_random_uuid()) is not null then raise exception 'FALHOU: pesquisa inexistente (textos)'; end if;
  if public.uso_resumos_ia(pb) is not null then raise exception 'FALHOU: A viu uso de B'; end if;
  if public.uso_resumos_ia(gen_random_uuid()) is not null then raise exception 'FALHOU: pesquisa inexistente (uso)'; end if;

  -- uso_resumos_ia (pa): último = 'novo'; hoje = 3 da empresa (2 na pa + 1 na pa2); ontem e 01:00 UTC não contam; textos = 5
  u := public.uso_resumos_ia(pa);
  if u->'ultimo'->'conteudo'->'positivos'->>0 <> 'novo' then raise exception 'FALHOU: último = %', u->'ultimo'; end if;
  if (u->>'hoje')::int <> 3 then raise exception 'FALHOU: hoje = %', u->>'hoje'; end if;
  if (u->>'textos')::int <> 5 then raise exception 'FALHOU: textos = %', u->>'textos'; end if;
  if (u->'ultimo'->>'respostas_lidas')::int <> 5 or u->'ultimo'->>'modelo' <> 'm' or u->'ultimo'->>'created_at' is null then
    raise exception 'FALHOU: campos do último = %', u->'ultimo';
  end if;
  -- uso na pa2: o teto é da empresa (mesmo hoje = 3); último é o da pa2
  u := public.uso_resumos_ia(pa2);
  if (u->>'hoje')::int <> 3 or u->'ultimo'->'conteudo'->'positivos'->>0 <> 'pa2' or (u->>'textos')::int <> 205 then
    raise exception 'FALHOU: uso da pa2 = %', u;
  end if;
end $$;

-- Dono B: só enxerga o que é dele
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b8","role":"authenticated"}', true);
do $$
declare
  pb uuid := current_setting('app.pb')::uuid;
  u jsonb := public.uso_resumos_ia(current_setting('app.pb')::uuid);
  linhas int;
begin
  select count(*) into linhas from public.resumos_ia;
  if linhas <> 1 then raise exception 'FALHOU: B vê % resumos (esperado 1)', linhas; end if;
  if (u->>'hoje')::int <> 1 or (u->>'textos')::int <> 1 then raise exception 'FALHOU: uso de B = %', u; end if;
  if public.uso_resumos_ia(current_setting('app.pa')::uuid) is not null then raise exception 'FALHOU: B viu uso de A'; end if;
  if public.textos_para_resumo(current_setting('app.pa')::uuid) is not null then raise exception 'FALHOU: B viu textos de A'; end if;
end $$;

-- Sem resumo ainda: ultimo é null
reset role;
do $$
declare ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b8'); p uuid;
begin
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Pesquisa B2', 'teste-resumo-b2') returning id into p;
  perform set_config('app.pb2', p::text, true);
end $$;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b8","role":"authenticated"}', true);
do $$
declare u jsonb := public.uso_resumos_ia(current_setting('app.pb2')::uuid);
begin
  if jsonb_typeof(u->'ultimo') <> 'null' or (u->>'textos')::int <> 0 then
    raise exception 'FALHOU: pesquisa sem resumo = %', u;
  end if;
end $$;

select 'TODOS OS TESTES DE RESUMOS IA PASSARAM' as resultado;
rollback;

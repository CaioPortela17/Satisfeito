-- Prova da função painel_pesquisa (Etapa 6C). Desfaz tudo (rollback).
-- Fuso: America/Sao_Paulo. "hoje" é a data local. Período de 7 dias = hoje-6 .. hoje; anterior = hoje-13 .. hoje-7.
--
-- Envios do PERÍODO (todos em hoje-1 e hoje-2), nota do envio em parênteses:
--   hoje-1: e1 05:59 n1=10 (10) Ana | e2 06:00 n1=10 (10) Ana | e3 11:59 n1=10 (10) Ana
--           e4 12:00 n1=10 (10) Ana | e5 17:59 n1=7,n2=9 (8)
--   hoje-2: e6 18:00 n1=7,n2=9 (8) | e7 23:59 n1=7,n2=8 (7,5 -> 8) | e8 00:00 n1=6 (6) Bia
--           e9 10:00 n1=6,n2=7 (6,5 -> 7) | e10 14:00 n1=1 (1) Bia
--   + 1 envio só com texto (hoje-1) e 1 descartado (hoje-1, nota 1): o descartado nunca conta
-- Envios do ANTERIOR: 4 em hoje-8 e 1 em hoje-7, todos n1=5, escolhendo Ana. Fora dos dois (7 dias): 1 em hoje-14, n1=1.
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'painel-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'painel-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000ac');
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  pa uuid; n1 uuid; n2 uuid; qeq uuid; qtx uuid; ana uuid; bia uuid; r uuid; e record;
begin
  insert into public.funcionarios (empresa_id, nome) values (ea, 'Ana') returning id into ana;
  insert into public.funcionarios (empresa_id, nome) values (ea, 'Bia') returning id into bia;
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Painel A', 'teste-painel-a') returning id into pa;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (pa, 'Atendimento?', 'nota', 1) returning id into n1;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (pa, 'Comida?', 'nota', 2) returning id into n2;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (pa, 'Quem?', 'funcionario', 3) returning id into qeq;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (pa, 'Comentário?', 'texto', 4) returning id into qtx;

  -- (dias atrás, hora, nota1, nota2, funcionário, descartada)
  for e in select * from (values
    (1, time '05:59', 10, null::int, ana, false), (1, time '06:00', 10, null, ana, false),
    (1, time '11:59', 10, null, ana, false),      (1, time '12:00', 10, null, ana, false),
    (1, time '17:59', 7, 9, null::uuid, false),
    (2, time '18:00', 7, 9, null, false),         (2, time '23:59', 7, 8, null, false),
    (2, time '00:00', 6, null, bia, false),       (2, time '10:00', 6, 7, null, false),
    (2, time '14:00', 1, null, bia, false),
    (1, time '15:00', 1, null, null, true),
    (8, time '12:00', 5, null, ana, false), (8, time '12:01', 5, null, ana, false),
    (8, time '12:02', 5, null, ana, false), (8, time '12:03', 5, null, ana, false),
    (7, time '12:00', 5, null, ana, false),
    (14, time '12:00', 1, null, null, false)
  ) as t(atras, hora, a, b, f, d) loop
    insert into public.respostas (pesquisa_id, created_at, descartada)
      values (pa, ((hoje - e.atras)::timestamp + e.hora) at time zone 'America/Sao_Paulo', e.d) returning id into r;
    insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n1, e.a);
    if e.b is not null then
      insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, n2, e.b);
    end if;
    if e.f is not null then
      insert into public.respostas_itens (resposta_id, pergunta_id, funcionario_id) values (r, qeq, e.f);
    end if;
  end loop;
  -- só com texto
  insert into public.respostas (pesquisa_id, created_at)
    values (pa, ((hoje - 1)::timestamp + time '16:00') at time zone 'America/Sao_Paulo') returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto) values (r, qtx, 'só um comentário');

  perform set_config('app.pa', pa::text, true);
  perform set_config('app.dow2', extract(isodow from (hoje - 2))::text, true);
end $$;

-- Visitante sem login não executa
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.painel_pesquisa(current_setting('app.pa')::uuid);
    raise exception 'FALHOU: visitante executou painel_pesquisa';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dono B: pesquisa de outra empresa = null
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000bc","role":"authenticated"}', true);
do $$
begin
  if public.painel_pesquisa(current_setting('app.pa')::uuid) is not null then
    raise exception 'FALHOU: B viu o painel de A';
  end if;
end $$;

-- Dono A
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ac","role":"authenticated"}', true);
do $$
declare
  pa uuid := current_setting('app.pa')::uuid;
  p jsonb; t jsonb; x jsonb; dow2 int := current_setting('app.dow2')::int;
begin
  -- período inválido
  begin
    perform public.painel_pesquisa(pa, 10);
    raise exception 'FALHOU: p_dias = 10 deveria dar erro';
  exception when invalid_parameter_value then null;
  end;
  if public.painel_pesquisa(gen_random_uuid()) is not null then raise exception 'FALHOU: pesquisa inexistente'; end if;

  p := public.painel_pesquisa(pa, 7);

  -- período
  if (p->'periodo'->>'dias')::int <> 7 then raise exception 'FALHOU: periodo = %', p->'periodo'; end if;

  -- atual: 10 com nota + 1 só texto = 11 envios (o descartado fica de fora); média geral 107/14 = 7,6
  if (p->'atual'->>'envios')::int <> 11 then raise exception 'FALHOU: atual.envios = %', p->'atual'->>'envios'; end if;
  if (p->'atual'->>'media_geral')::numeric <> 7.6 then raise exception 'FALHOU: media_geral = %', p->'atual'->>'media_geral'; end if;

  -- NPS: promotores 4 (e1-e4), neutros 4 (e5, e6, e7 = 7,5 sobe, e9 = 6,5 sobe), detratores 2 (e8, e10); 100*(4-2)/10 = 20
  x := p->'atual'->'nps';
  if (x->>'promotores')::int <> 4 or (x->>'neutros')::int <> 4 or (x->>'detratores')::int <> 2 or (x->>'n')::int <> 10
     or (x->>'valor')::int <> 20 then
    raise exception 'FALHOU: nps = %', x;
  end if;

  -- distribuição: 1-3: 1 | 4-6: 1 | 7-8: 4 | 9-10: 4
  t := p->'atual'->'distribuicao';
  if (t->0->>'envios')::int <> 1 or (t->1->>'envios')::int <> 1 or (t->2->>'envios')::int <> 4 or (t->3->>'envios')::int <> 4
     or t->0->>'faixa' <> '1-3' or t->3->>'faixa' <> '9-10' then
    raise exception 'FALHOU: distribuicao = %', t;
  end if;

  -- anterior: 5 envios, média 5,0, NPS null (só 5 envios com nota); o de hoje-14 fica de fora
  x := p->'anterior';
  if (x->>'envios')::int <> 5 or (x->>'media_geral')::numeric <> 5.0 or jsonb_typeof(x->'nps'->'valor') <> 'null' then
    raise exception 'FALHOU: anterior = %', x;
  end if;

  -- perguntas: Atendimento 7,4 (10 resp., anterior 5,0); Comida 8,3 (4 resp., anterior null)
  t := p->'perguntas';
  if (t->0->>'media')::numeric <> 7.4 or (t->0->>'respostas')::int <> 10 or (t->0->>'media_anterior')::numeric <> 5.0 then
    raise exception 'FALHOU: pergunta 1 = %', t->0;
  end if;
  if (t->1->>'media')::numeric <> 8.3 or (t->1->>'respostas')::int <> 4 or jsonb_typeof(t->1->'media_anterior') <> 'null' then
    raise exception 'FALHOU: pergunta 2 = %', t->1;
  end if;

  -- evolução: 2 dias (hoje-2: 6,4 com 5 envios; hoje-1: 9,3 com 5 envios com nota)
  -- contagens do período anterior: Atendimento teve 5 respostas, Comida nenhuma
  if (p->'perguntas'->0->>'respostas_anterior')::int <> 5 or (p->'perguntas'->1->>'respostas_anterior')::int <> 0 then
    raise exception 'FALHOU: respostas_anterior = %', p->'perguntas';
  end if;

  t := p->'evolucao';
  if jsonb_array_length(t) <> 2 or (t->0->>'media')::numeric <> 6.4 or (t->1->>'media')::numeric <> 9.3 then
    raise exception 'FALHOU: evolucao = %', t;
  end if;

  -- turnos (ordem manha, tarde, noite, madrugada): envios 3/3/2/2 e médias 8,3/6,8/7,8/8,0
  t := p->'turno';
  if jsonb_array_length(t) <> 4 or t->0->>'turno' <> 'manha' or t->1->>'turno' <> 'tarde'
     or t->2->>'turno' <> 'noite' or t->3->>'turno' <> 'madrugada' then
    raise exception 'FALHOU: ordem/quantidade de turnos = %', t;
  end if;
  if (t->0->>'envios')::int <> 3 or (t->1->>'envios')::int <> 3 or (t->2->>'envios')::int <> 2 or (t->3->>'envios')::int <> 2 then
    raise exception 'FALHOU: envios por turno = %', t;
  end if;
  if (t->0->>'media')::numeric <> 8.3 or (t->1->>'media')::numeric <> 6.8
     or (t->2->>'media')::numeric <> 7.8 or (t->3->>'media')::numeric <> 8.0 then
    raise exception 'FALHOU: médias por turno = %', t;
  end if;

  -- dia da semana: sempre 7 linhas; hoje-2 tem 5 envios e média 6,4
  t := p->'dia_semana';
  if jsonb_array_length(t) <> 7 then raise exception 'FALHOU: dia_semana tem % linhas', jsonb_array_length(t); end if;
  x := (select e from jsonb_array_elements(t) e where (e->>'dia')::int = dow2);
  if (x->>'envios')::int <> 5 or (x->>'media')::numeric <> 6.4 then raise exception 'FALHOU: dia_semana(hoje-2) = %', x; end if;

  -- equipe: Ana 10,0 com 4 avaliações (anterior 5,0); Bia 3,5 com 2 avaliações (anterior null)
  t := p->'equipe';
  x := (select e from jsonb_array_elements(t) e where e->>'nome' = 'Ana');
  if (x->>'media')::numeric <> 10.0 or (x->>'avaliacoes')::int <> 4 or (x->>'media_anterior')::numeric <> 5.0 then
    raise exception 'FALHOU: Ana = %', x;
  end if;
  if (x->>'avaliacoes_anterior')::int <> 5 then raise exception 'FALHOU: Ana avaliacoes_anterior = %', x; end if;
  x := (select e from jsonb_array_elements(t) e where e->>'nome' = 'Bia');
  if (x->>'media')::numeric <> 3.5 or (x->>'avaliacoes')::int <> 2 or jsonb_typeof(x->'media_anterior') <> 'null' then
    raise exception 'FALHOU: Bia = %', x;
  end if;
  if (x->>'avaliacoes_anterior')::int <> 0 then raise exception 'FALHOU: Bia avaliacoes_anterior = %', x; end if;

  -- destaques: melhor pergunta Comida (8,3), pior Atendimento (7,4); dia mais fraco = hoje-2 (6,4); melhor funcionário Ana
  x := p->'destaques';
  if x->'melhor_pergunta'->>'texto' <> 'Comida?' or x->'pior_pergunta'->>'texto' <> 'Atendimento?'
     or (x->'dia_mais_fraco'->>'dia')::int <> dow2 or (x->'dia_mais_fraco'->>'media')::numeric <> 6.4
     or x->'melhor_funcionario'->>'nome' <> 'Ana' then
    raise exception 'FALHOU: destaques = %', x;
  end if;

  if p->'suspeitas' is null then raise exception 'FALHOU: faltou suspeitas'; end if;

  -- 30 dias: entra o envio de hoje-14 (e os de hoje-8/-7): 11 + 5 + 1 = 17 envios; anterior (hoje-59..hoje-30): vazio
  p := public.painel_pesquisa(pa, 30);
  if (p->'atual'->>'envios')::int <> 17 or (p->'anterior'->>'envios')::int <> 0 then
    raise exception 'FALHOU: 30 dias = % / %', p->'atual'->>'envios', p->'anterior'->>'envios';
  end if;
  if jsonb_typeof(p->'anterior'->'media_geral') <> 'null' then raise exception 'FALHOU: anterior vazio deveria ter média null'; end if;
end $$;

reset role;
select 'TODOS OS TESTES DO PAINEL PASSARAM' as resultado;
rollback;

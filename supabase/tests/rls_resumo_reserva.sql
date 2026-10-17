-- Prova da reserva do resumo por IA (reservar_resumo_ia) e da contagem por envio. Desfaz tudo (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'reserva-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'reserva-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- A tem DUAS empresas (A1 e A2): o teto vale para o dono, somando as duas. B tem uma.
do $$
declare
  a1 uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000a9');
  a2 uuid; eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b9');
  p1 uuid; p2 uuid; p3 uuid; pb uuid; qt uuid; r uuid;
begin
  insert into public.empresas (nome, owner_id) values ('Empresa A2', '00000000-0000-0000-0000-0000000000a9') returning id into a2;
  insert into public.pesquisas (empresa_id, titulo, slug) values (a1, 'P1', 'teste-reserva-p1') returning id into p1;
  insert into public.pesquisas (empresa_id, titulo, slug) values (a1, 'P2', 'teste-reserva-p2') returning id into p2;
  insert into public.pesquisas (empresa_id, titulo, slug) values (a2, 'P3', 'teste-reserva-p3') returning id into p3;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'PB', 'teste-reserva-pb') returning id into pb;

  -- p1: um envio que respondeu DUAS perguntas de texto (conta como 1 resposta escrita)
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (p1, 'Texto 1?', 'texto', 1) returning id into qt;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (p1, 'Texto 2?', 'texto', 2);
  insert into public.respostas (pesquisa_id) values (p1) returning id into r;
  insert into public.respostas_itens (resposta_id, pergunta_id, valor_texto)
    select r, id, 'comentário ' || ordem from public.perguntas where pesquisa_id = p1;

  perform set_config('app.a', '00000000-0000-0000-0000-0000000000a9', true);
  perform set_config('app.p1', p1::text, true);
  perform set_config('app.p2', p2::text, true);
  perform set_config('app.p3', p3::text, true);
  perform set_config('app.pb', pb::text, true);
end $$;

-- Contagem por envio (dono A, pela API)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a9","role":"authenticated"}', true);
do $$
declare t jsonb := public.textos_para_resumo(current_setting('app.p1')::uuid);
        u jsonb := public.uso_resumos_ia(current_setting('app.p1')::uuid);
begin
  if (t->>'total')::int <> 1 or (t->>'lidas')::int <> 1 or jsonb_array_length(t->'textos') <> 2 then
    raise exception 'FALHOU: 1 envio com 2 textos deveria dar total 1, lidas 1, 2 textos: %', t;
  end if;
  if (u->>'textos')::int <> 1 then raise exception 'FALHOU: uso.textos deveria contar envios: %', u; end if;
end $$;

-- Ninguém pela API chama a reserva (nem logado, nem visitante)
do $$
begin
  begin
    perform public.reservar_resumo_ia(current_setting('app.p1')::uuid, current_setting('app.a')::uuid, 10, 20);
    raise exception 'FALHOU: usuário logado executou reservar_resumo_ia';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.reservar_resumo_ia(current_setting('app.p1')::uuid, current_setting('app.a')::uuid, 10, 20);
    raise exception 'FALHOU: visitante executou reservar_resumo_ia';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Servidor (chave secreta = service_role)
reset role;
set local role service_role;
do $$
declare
  a uuid := current_setting('app.a')::uuid;
  p1 uuid := current_setting('app.p1')::uuid; p2 uuid := current_setting('app.p2')::uuid;
  p3 uuid := current_setting('app.p3')::uuid; pb uuid := current_setting('app.pb')::uuid;
  x jsonb; id1 uuid;
begin
  -- pesquisa que não é do dono: null
  if public.reservar_resumo_ia(pb, a, 10, 20) is not null then raise exception 'FALHOU: reservou pesquisa de outro dono'; end if;
  if public.reservar_resumo_ia(gen_random_uuid(), a, 10, 20) is not null then raise exception 'FALHOU: reservou pesquisa inexistente'; end if;

  -- 1ª reserva em p1: ok
  x := public.reservar_resumo_ia(p1, a, 10, 3);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: 1ª reserva = %', x; end if;
  id1 := (x->>'id')::uuid;

  -- repetir na mesma pesquisa logo em seguida (o "segundo clique"): intervalo, 10 minutos
  x := public.reservar_resumo_ia(p1, a, 10, 3);
  if (x->>'ok')::boolean is not false or x->>'motivo' <> 'intervalo' or (x->>'minutos')::int <> 10 then
    raise exception 'FALHOU: segundo clique = %', x;
  end if;

  -- a reserva ainda não aparece como "último resumo" para a tela
  if jsonb_typeof(public.uso_resumos_ia(p1)->'ultimo') <> 'null' then raise exception 'FALHOU: reserva apareceu como resumo pronto'; end if;

  -- outras pesquisas do dono (inclusive de OUTRA empresa dele) usam o mesmo teto (3): p2 e p3 ok, a 4ª não
  x := public.reservar_resumo_ia(p2, a, 10, 3, 7, true);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: reserva em p2 = %', x; end if;
  -- a reserva guarda o período e se vai citar nomes
  if not exists (select 1 from public.resumos_ia where id = (x->>'id')::uuid and dias = 7 and com_nomes and estado = 'gerando') then
    raise exception 'FALHOU: reserva não guardou dias/com_nomes';
  end if;
  x := public.reservar_resumo_ia(p3, a, 10, 3);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: reserva em p3 (outra empresa do dono) = %', x; end if;
  x := public.reservar_resumo_ia(p3, a, 0, 3);
  if (x->>'ok')::boolean is not false or x->>'motivo' <> 'teto' then raise exception 'FALHOU: teto por dono = %', x; end if;

  -- o teto do dia mostrado na tela soma as duas empresas do dono (3 reservas recentes)
  if (public.uso_resumos_ia(p1)->>'hoje')::int <> 3 then raise exception 'FALHOU: hoje = %', public.uso_resumos_ia(p1)->>'hoje'; end if;

  -- reserva parada há mais de 3 minutos é apagada na próxima tentativa (servidor que caiu)
  update public.resumos_ia set created_at = now() - interval '5 minutes' where id = id1;
  x := public.reservar_resumo_ia(p1, a, 10, 3);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: reserva velha não liberou a vaga = %', x; end if;
  if exists (select 1 from public.resumos_ia where id = id1) then raise exception 'FALHOU: reserva velha não foi apagada'; end if;
end $$;

reset role;
select 'TODOS OS TESTES DA RESERVA DE RESUMO PASSARAM' as resultado;
rollback;

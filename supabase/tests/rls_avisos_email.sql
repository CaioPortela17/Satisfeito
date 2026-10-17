-- Prova dos avisos por e-mail (opções da empresa, avisos_enviados e reservar_aviso). Desfaz tudo (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'aviso-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'aviso-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000ae');
  eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000be');
  pa uuid; pb uuid;
begin
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Pesquisa A', 'teste-aviso-a') returning id into pa;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'Pesquisa B', 'teste-aviso-b') returning id into pb;
  perform set_config('app.pa', pa::text, true);
  perform set_config('app.pb', pb::text, true);
  perform set_config('app.ea', ea::text, true);
end $$;

-- Padrões: aviso de nota baixa ligado, relatório semanal desligado
do $$
declare ea uuid := current_setting('app.ea')::uuid;
begin
  if (select aviso_nota_baixa from public.empresas where id = ea) is not true then raise exception 'FALHOU: aviso_nota_baixa deveria vir ligado'; end if;
  if (select relatorio_semanal from public.empresas where id = ea) is not false then raise exception 'FALHOU: relatorio_semanal deveria vir desligado'; end if;
end $$;

-- Dono A liga/desliga as próprias opções, mas não mexe nas de B e não vê o registro de avisos
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000ae","role":"authenticated"}', true);
do $$
declare ea uuid := current_setting('app.ea')::uuid; n int;
begin
  update public.empresas set relatorio_semanal = true where id = ea;
  if (select relatorio_semanal from public.empresas where id = ea) is not true then raise exception 'FALHOU: dono não conseguiu ligar o relatório semanal'; end if;

  -- empresa de B: o update não acha a linha (RLS) e não altera nada
  update public.empresas set aviso_nota_baixa = false where owner_id = '00000000-0000-0000-0000-0000000000be';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: A alterou a empresa de B'; end if;

  begin
    perform 1 from public.avisos_enviados limit 1;
    raise exception 'FALHOU: dono leu avisos_enviados';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.reservar_aviso(current_setting('app.pa')::uuid, 'nota_baixa', 30, 10);
    raise exception 'FALHOU: dono executou reservar_aviso';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform public.reservar_aviso(current_setting('app.pa')::uuid, 'nota_baixa', 30, 10);
    raise exception 'FALHOU: visitante executou reservar_aviso';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Servidor (chave secreta)
reset role;
set local role service_role;
do $$
declare
  pa uuid := current_setting('app.pa')::uuid;
  pb uuid := current_setting('app.pb')::uuid;
  x jsonb;
begin
  if public.reservar_aviso(gen_random_uuid(), 'nota_baixa', 30, 10) is not null then raise exception 'FALHOU: pesquisa inexistente'; end if;

  -- 1º aviso de nota baixa: pode, e devolve os dados do e-mail
  x := public.reservar_aviso(pa, 'nota_baixa', 30, 10);
  if (x->>'ok')::boolean is not true or x->>'pesquisa' <> 'Pesquisa A' or x->>'empresa' <> 'Empresa A'
     or x->>'dono' <> '00000000-0000-0000-0000-0000000000ae' then
    raise exception 'FALHOU: 1º aviso = %', x;
  end if;

  -- repetir logo em seguida: recente
  x := public.reservar_aviso(pa, 'nota_baixa', 30, 10);
  if (x->>'ok')::boolean is not false or x->>'motivo' <> 'recente' then raise exception 'FALHOU: repetido = %', x; end if;

  -- tipo diferente na mesma pesquisa não conta como repetido
  x := public.reservar_aviso(pa, 'rajada', 360, 10);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: rajada = %', x; end if;

  -- limite por dia da empresa (2 já enviados hoje): com teto 2, o terceiro é barrado
  x := public.reservar_aviso(pa, 'relatorio_semanal', 9360, 2);
  if (x->>'ok')::boolean is not false or x->>'motivo' <> 'teto' then raise exception 'FALHOU: teto = %', x; end if;
  -- ...e com teto maior, o relatório semanal (ligado por A) passa
  x := public.reservar_aviso(pa, 'relatorio_semanal', 9360, 10);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: relatório semanal = %', x; end if;

  -- janela vencida: com janela de 0 minutos o aviso passa de novo
  x := public.reservar_aviso(pa, 'nota_baixa', 0, 10);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: janela 0 = %', x; end if;

  -- B: relatório semanal desligado (padrão) => desligado; o limite de A não vale para B
  x := public.reservar_aviso(pb, 'relatorio_semanal', 9360, 10);
  if (x->>'ok')::boolean is not false or x->>'motivo' <> 'desligado' then raise exception 'FALHOU: B desligado = %', x; end if;
  x := public.reservar_aviso(pb, 'nota_baixa', 30, 10);
  if (x->>'ok')::boolean is not true then raise exception 'FALHOU: B nota baixa = %', x; end if;

  -- tipo inválido não grava
  begin
    perform public.reservar_aviso(pa, 'qualquer', 30, 10);
    raise exception 'FALHOU: aceitou tipo inválido';
  exception when check_violation then null;
  end;

  update public.empresas set aviso_nota_baixa = false where owner_id = '00000000-0000-0000-0000-0000000000be';
  x := public.reservar_aviso(pb, 'rajada', 360, 10);
  if (x->>'ok')::boolean is not false or x->>'motivo' <> 'desligado' then raise exception 'FALHOU: B com aviso desligado = %', x; end if;
end $$;

reset role;
select 'TODOS OS TESTES DOS AVISOS POR E-MAIL PASSARAM' as resultado;
rollback;

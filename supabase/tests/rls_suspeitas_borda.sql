-- Prova da borda da regra de suspeita: média logo acima de 4 não é "ruim". Desfaz tudo (rollback).
-- As notas são inteiras (smallint), então 5 perguntas de nota dão médias como 4,0 e 4,2.
--   x1..x4  4 envios com notas (4,4,4,4,5) = média 4,2 em 4 minutos -> não são ruins: ninguém é suspeito
--   y1..y3  3 envios com média 4,0 + 1 envio com média 4,2, em 4 minutos -> só 3 ruins: ninguém é suspeito
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', 'borda@exemplo.com', '{"nome_empresa":"Empresa Borda"}', now(), now());

do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000c7');
  t0 timestamptz := now() - interval '1 day';
  px uuid; py uuid; qx uuid[] := '{}'; qy uuid[] := '{}'; q uuid; r uuid; i int; k int;
begin
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Borda X', 'teste-borda-x') returning id into px;
  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Borda Y', 'teste-borda-y') returning id into py;
  for i in 1..5 loop
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (px, 'Nota ' || i, 'nota', i) returning id into q;
    qx := qx || q;
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (py, 'Nota ' || i, 'nota', i) returning id into q;
    qy := qy || q;
  end loop;

  -- X: média 4,2 (4,4,4,4,5) em 4 envios seguidos
  for k in 0..3 loop
    insert into public.respostas (pesquisa_id, created_at) values (px, t0 + (k || ' minutes')::interval) returning id into r;
    for i in 1..5 loop
      insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, qx[i], case when i = 5 then 5 else 4 end);
    end loop;
  end loop;

  -- Y: 3 envios de média 4,0 e o 4º de média 4,2
  for k in 0..3 loop
    insert into public.respostas (pesquisa_id, created_at) values (py, t0 + (k || ' minutes')::interval) returning id into r;
    for i in 1..5 loop
      insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota) values (r, qy[i], case when i = 5 and k = 3 then 5 else 4 end);
    end loop;
  end loop;

  perform set_config('app.px', px::text, true);
  perform set_config('app.py', py::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c7","role":"authenticated"}', true);

do $$
begin
  if exists (select 1 from public.envios_suspeitos(current_setting('app.px')::uuid)) then
    raise exception 'FALHOU: média 4,2 foi marcada como suspeita';
  end if;
  if exists (select 1 from public.envios_suspeitos(current_setting('app.py')::uuid)) then
    raise exception 'FALHOU: 3 envios ruins + 1 de média 4,2 formaram rajada';
  end if;
end $$;

rollback;
select 'rls_suspeitas_borda: tudo certo' as resultado;

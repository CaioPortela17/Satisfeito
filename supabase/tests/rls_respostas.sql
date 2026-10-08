-- Prova de segurança da Etapa 5A (slug, respostas e funções públicas). Desfaz tudo (rollback).
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resp-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'resp-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Dados de A e B, criados como administrador
do $$
declare
  ea uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000a3');
  eb uuid := (select id from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b3');
  pa uuid; pp uuid; pb uuid;
begin
  insert into public.funcionarios (empresa_id, nome) values (ea, 'Ana');
  insert into public.funcionarios (empresa_id, nome, ativo) values (ea, 'Zé', false);
  insert into public.funcionarios (empresa_id, nome) values (eb, 'Bia');

  insert into public.pesquisas (empresa_id, titulo, slug) values (ea, 'Mesa', 'teste-a-mesa') returning id into pa;
  insert into public.pesquisas (empresa_id, titulo, slug, ativa) values (ea, 'Pausada', 'teste-a-pausada', false) returning id into pp;
  insert into public.pesquisas (empresa_id, titulo, slug) values (eb, 'Pesquisa B', 'teste-b') returning id into pb;

  insert into public.perguntas (pesquisa_id, texto, tipo, ordem, obrigatoria) values
    (pa, 'Nota?', 'nota', 1, true),
    (pa, 'Melhorar?', 'texto', 2, false),
    (pa, 'Quem?', 'funcionario', 3, true),
    (pa, 'Antiga', 'texto', 4, false),
    (pp, 'Nota P?', 'nota', 1, true),
    (pb, 'Nota B?', 'nota', 1, true);
  update public.perguntas set arquivada = true where texto = 'Antiga';

  perform set_config('app.pa', pa::text, true);
  perform set_config('app.pp', pp::text, true);
  perform set_config('app.pb', pb::text, true);
  perform set_config('app.nota', (select id::text from public.perguntas where texto = 'Nota?'), true);
  perform set_config('app.texto', (select id::text from public.perguntas where texto = 'Melhorar?'), true);
  perform set_config('app.quem', (select id::text from public.perguntas where texto = 'Quem?'), true);
  perform set_config('app.antiga', (select id::text from public.perguntas where texto = 'Antiga'), true);
  perform set_config('app.nota_b', (select id::text from public.perguntas where texto = 'Nota B?'), true);
  perform set_config('app.ana', (select id::text from public.funcionarios where nome = 'Ana'), true);
  perform set_config('app.ze', (select id::text from public.funcionarios where nome = 'Zé'), true);
  perform set_config('app.bia', (select id::text from public.funcionarios where nome = 'Bia'), true);
end $$;

-- Slug: único, formato e default
do $$
begin
  begin
    insert into public.pesquisas (empresa_id, titulo, slug)
    values ((select empresa_id from public.pesquisas where slug = 'teste-b'), 'Dup', 'teste-a-mesa');
    raise exception 'FALHOU: aceitou slug repetido';
  exception when unique_violation then null;
  end;
  begin
    update public.pesquisas set slug = 'Slug Ruim' where slug = 'teste-b';
    raise exception 'FALHOU: aceitou slug fora do formato';
  exception when check_violation then null;
  end;
  insert into public.pesquisas (empresa_id, titulo)
  values ((select empresa_id from public.pesquisas where slug = 'teste-b'), 'Sem slug');
  if (select slug from public.pesquisas where titulo = 'Sem slug') !~ '^pesquisa-[a-z0-9]{8}$' then
    raise exception 'FALHOU: default do slug';
  end if;
  delete from public.pesquisas where titulo = 'Sem slug';
end $$;

-- Visitante sem login
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
declare
  r jsonb;
begin
  begin
    perform count(*) from public.respostas;
    raise exception 'FALHOU: visitante lê respostas';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.respostas_itens;
    raise exception 'FALHOU: visitante lê itens';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.registrar_resposta(current_setting('app.pa')::uuid, '[]'::jsonb);
    raise exception 'FALHOU: visitante chamou registrar_resposta';
  exception when insufficient_privilege then null;
  end;

  r := public.pesquisa_publica('teste-a-mesa');
  if (r->>'ativa')::boolean is not true or r->>'empresa' <> 'Empresa A'
     or jsonb_array_length(r->'perguntas') <> 3 then
    raise exception 'FALHOU: pesquisa_publica ativa (%)', r;
  end if;
  if jsonb_array_length(r->'funcionarios') <> 1 or r->'funcionarios'->0->>'nome' <> 'Ana' then
    raise exception 'FALHOU: só funcionários ativos devem aparecer';
  end if;
  if r::text like '%Antiga%' or r::text like '%owner%' then
    raise exception 'FALHOU: vazou pergunta arquivada ou dado do dono';
  end if;

  r := public.pesquisa_publica('TESTE-A-PAUSADA');
  if (r->>'ativa')::boolean is not false or r ? 'perguntas' or r ? 'id' then
    raise exception 'FALHOU: pausada deveria vir sem perguntas e sem id';
  end if;
  if public.pesquisa_publica('nao-existe') is not null then
    raise exception 'FALHOU: slug inexistente deveria dar null';
  end if;
end $$;

-- Sem equipe ativa, a pergunta "Quem?" some da página pública
reset role;
update public.funcionarios set ativo = false where nome = 'Ana';
set local role anon;
do $$
begin
  if jsonb_array_length(public.pesquisa_publica('teste-a-mesa')->'perguntas') <> 2 then
    raise exception 'FALHOU: pergunta de funcionário deveria sumir sem equipe';
  end if;
end $$;
reset role;
update public.funcionarios set ativo = true where nome = 'Ana';

-- Usuário logado também não chama registrar_resposta
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.registrar_resposta(current_setting('app.pa')::uuid, '[]'::jsonb);
    raise exception 'FALHOU: usuário logado chamou registrar_resposta';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Servidor (service_role): cada recusa e o caso válido
reset role;
set local role service_role;
do $$
declare
  pa uuid := current_setting('app.pa')::uuid;
  nota text := current_setting('app.nota');
  texto text := current_setting('app.texto');
  quem text := current_setting('app.quem');
  ana text := current_setting('app.ana');
  ok_itens jsonb;
  r uuid;

begin
  ok_itens := jsonb_build_array(
    jsonb_build_object('pergunta_id', nota, 'valor_nota', 9),
    jsonb_build_object('pergunta_id', texto, 'valor_texto', 'Mais sal'),
    jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana));

  -- SF101: pausada ou inexistente
  begin perform public.registrar_resposta(current_setting('app.pp')::uuid, ok_itens);
    raise exception 'FALHOU: aceitou pesquisa pausada';
  exception when sqlstate 'SF101' then null; end;
  begin perform public.registrar_resposta(gen_random_uuid(), ok_itens);
    raise exception 'FALHOU: aceitou pesquisa inexistente';
  exception when sqlstate 'SF101' then null; end;

  -- SF105: nada
  begin perform public.registrar_resposta(pa, '[]'::jsonb);
    raise exception 'FALHOU: aceitou resposta vazia';
  exception when sqlstate 'SF105' then null; end;

  -- SF102: pergunta de outra pesquisa, arquivada ou repetida
  begin perform public.registrar_resposta(pa, ok_itens || jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('app.nota_b'), 'valor_nota', 5)));
    raise exception 'FALHOU: aceitou pergunta de outra pesquisa';
  exception when sqlstate 'SF102' then null; end;
  begin perform public.registrar_resposta(pa, ok_itens || jsonb_build_array(
      jsonb_build_object('pergunta_id', current_setting('app.antiga'), 'valor_texto', 'oi')));
    raise exception 'FALHOU: aceitou pergunta arquivada';
  exception when sqlstate 'SF102' then null; end;
  begin perform public.registrar_resposta(pa, ok_itens || jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 3)));
    raise exception 'FALHOU: aceitou pergunta repetida';
  exception when sqlstate 'SF102' then null; end;

  -- SF103: valores que não combinam
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 11),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou nota 11';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7.5),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou nota 7.5';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', '7'),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou nota como texto';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7, 'valor_texto', 'extra'),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
    raise exception 'FALHOU: aceitou campo extra';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, ok_itens - 1 || jsonb_build_array(
      jsonb_build_object('pergunta_id', texto, 'valor_texto', '  ')));
    raise exception 'FALHOU: aceitou texto vazio';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', current_setting('app.ze'))));
    raise exception 'FALHOU: aceitou funcionário inativo';
  exception when sqlstate 'SF103' then null; end;
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', nota, 'valor_nota', 7),
      jsonb_build_object('pergunta_id', quem, 'funcionario_id', current_setting('app.bia'))));
    raise exception 'FALHOU: aceitou funcionário de outra empresa';
  exception when sqlstate 'SF103' then null; end;

  -- SF104: obrigatória faltando
  begin perform public.registrar_resposta(pa, jsonb_build_array(
      jsonb_build_object('pergunta_id', texto, 'valor_texto', 'Só texto')));
    raise exception 'FALHOU: aceitou sem as obrigatórias';
  exception when sqlstate 'SF104' then null; end;

  -- Válido
  r := public.registrar_resposta(pa, ok_itens);
  if (select count(*) from public.respostas_itens where resposta_id = r) <> 3 then
    raise exception 'FALHOU: itens não gravados';
  end if;

  -- Nota inteira escrita com casa decimal (10.0) é gravada como 10
  r := public.registrar_resposta(pa, jsonb_build_array(
    jsonb_build_object('pergunta_id', nota, 'valor_nota', 10.0),
    jsonb_build_object('pergunta_id', quem, 'funcionario_id', ana)));
  if (select valor_nota from public.respostas_itens where resposta_id = r and pergunta_id = nota::uuid) is distinct from 10 then
    raise exception 'FALHOU: nota 10.0 não foi gravada como 10';
  end if;
end $$;

-- Sem equipe ativa, "Quem?" deixa de ser obrigatória
reset role;
update public.funcionarios set ativo = false where nome = 'Ana';
set local role service_role;
do $$
begin
  perform public.registrar_resposta(current_setting('app.pa')::uuid, jsonb_build_array(
    jsonb_build_object('pergunta_id', current_setting('app.nota'), 'valor_nota', 4)));
  -- resposta para a empresa B, para conferir o isolamento abaixo
  perform public.registrar_resposta(current_setting('app.pb')::uuid, jsonb_build_array(
    jsonb_build_object('pergunta_id', current_setting('app.nota_b'), 'valor_nota', 10)));
end $$;
reset role;
update public.funcionarios set ativo = true where nome = 'Ana';

-- Dono A: lê só as próprias respostas; não altera; restrict impede excluir
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
do $$
begin
  if (select count(*) from public.respostas) <> 3 then
    raise exception 'FALHOU: A deveria ver exatamente as 3 respostas dele';
  end if;
  if (select count(*) from public.respostas_itens) <> 6 then
    raise exception 'FALHOU: A deveria ver os 6 itens dele';
  end if;
  begin
    update public.respostas set created_at = now();
    raise exception 'FALHOU: dono alterou resposta';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.pesquisas where id = current_setting('app.pa')::uuid;
    raise exception 'FALHOU: excluiu pesquisa com respostas';
  exception when foreign_key_violation then null;
  end;
  begin
    delete from public.funcionarios where id = current_setting('app.ana')::uuid;
    raise exception 'FALHOU: excluiu funcionário com avaliações';
  exception when foreign_key_violation then null;
  end;
  -- Dono pode mudar o slug da própria pesquisa
  update public.pesquisas set slug = 'teste-a-salao' where id = current_setting('app.pa')::uuid;
  if not exists (select 1 from public.pesquisas where slug = 'teste-a-salao') then
    raise exception 'FALHOU: dono não conseguiu mudar o slug';
  end if;
end $$;

-- Descartar respostas (base da Etapa 6): só o dono, só a coluna descartada
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
do $$
begin
  update public.respostas set descartada = true
   where id = (select id from public.respostas order by created_at limit 1);
  if (select count(*) from public.respostas where descartada) <> 1 then
    raise exception 'FALHOU: dono não conseguiu descartar a própria resposta';
  end if;
  begin
    update public.respostas set pesquisa_id = current_setting('app.pb')::uuid;
    raise exception 'FALHOU: dono alterou outra coluna de respostas';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Dono B não descarta resposta da empresa A (0 linhas afetadas)
reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}', true);
do $$
declare
  n int;
begin
  update public.respostas set descartada = true where pesquisa_id = current_setting('app.pa')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FALHOU: B descartou % resposta(s) da empresa A', n;
  end if;
end $$;

-- Visitante sem login não descarta
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    update public.respostas set descartada = true;
    raise exception 'FALHOU: visitante descartou resposta';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;

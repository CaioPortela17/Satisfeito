-- Prova de segurança das tabelas pesquisas e perguntas. Desfaz tudo no final (rollback).
-- Se algo estiver errado, para com uma mensagem "FALHOU: ...".
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pesq-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'pesq-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Pesquisa e pergunta da empresa B, criadas como administrador
insert into public.pesquisas (empresa_id, titulo)
select id, 'Pesquisa B' from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b2';
insert into public.perguntas (pesquisa_id, texto, tipo, ordem)
select id, 'Nota B', 'nota', 1 from public.pesquisas where titulo = 'Pesquisa B';
select set_config('app.pesquisa_b', (select id::text from public.pesquisas where titulo = 'Pesquisa B'), true);
select set_config('app.pergunta_b', (select id::text from public.perguntas where texto = 'Nota B'), true);

-- Agora como o dono da empresa A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

do $$
declare
  minha_empresa uuid := (select id from public.empresas);
  minha uuid;
  p1 uuid;
  p2 uuid;
begin
  if exists (select 1 from public.pesquisas where titulo = 'Pesquisa B')
     or exists (select 1 from public.perguntas where texto = 'Nota B') then
    raise exception 'FALHOU: A enxerga dados da empresa B';
  end if;

  insert into public.pesquisas (empresa_id, titulo) values (minha_empresa, 'Mesa') returning id into minha;

  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Nota', 'nota', 1) returning id into p1;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Quem?', 'funcionario', 2) returning id into p2;

  -- Segunda pergunta de funcionário: proibida
  begin
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Quem 2?', 'funcionario', 3);
    raise exception 'FALHOU: aceitou duas perguntas de funcionário';
  exception when unique_violation then null;
  end;

  -- Arquivada não conta: depois de arquivar, pode criar outra
  update public.perguntas set arquivada = true where id = p2;
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Quem 3?', 'funcionario', 3);

  -- Limite de 10 não arquivadas (já temos 2: Nota e Quem 3?)
  for i in 4..11 loop
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Texto ' || i, 'texto', i);
  end loop;
  begin
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Demais', 'texto', 12);
    raise exception 'FALHOU: aceitou a 11ª pergunta';
  exception when sqlstate 'SF001' then null;
  end;
  -- Devolver uma arquivada também respeita o limite (p2 é funcionario; usamos uma de texto)
  update public.perguntas set arquivada = true where texto = 'Texto 11';
  insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (minha, 'Texto 12', 'texto', 12);
  begin
    update public.perguntas set arquivada = false where texto = 'Texto 11';
    raise exception 'FALHOU: devolveu pergunta passando do limite';
  exception when sqlstate 'SF001' then null;
  end;

  -- Trocar o tipo: proibido (permissão de coluna)
  begin
    update public.perguntas set tipo = 'texto' where id = p1;
    raise exception 'FALHOU: conseguiu trocar o tipo da pergunta';
  exception when insufficient_privilege then null;
  end;

  -- Excluir pergunta: proibido (só arquivar)
  begin
    delete from public.perguntas where id = p1;
    raise exception 'FALHOU: conseguiu excluir pergunta';
  exception when insufficient_privilege then null;
  end;

  -- Mover pesquisa para outra empresa / pergunta para outra pesquisa: proibido
  begin
    update public.pesquisas set empresa_id = current_setting('app.pesquisa_b')::uuid where id = minha;
    raise exception 'FALHOU: conseguiu mover a pesquisa';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.perguntas set pesquisa_id = current_setting('app.pesquisa_b')::uuid where id = p1;
    raise exception 'FALHOU: conseguiu mover a pergunta';
  exception when insufficient_privilege then null;
  end;

  -- Pergunta na pesquisa de B: proibido
  begin
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem)
    values (current_setting('app.pesquisa_b')::uuid, 'Intrusa', 'texto', 9);
    raise exception 'FALHOU: A criou pergunta na pesquisa de B';
  exception when insufficient_privilege then null;
  end;

  -- Trocar ordem: funciona na mesma pesquisa...
  perform public.trocar_ordem_perguntas(p1, (select id from public.perguntas where texto = 'Quem 3?'));
  if (select ordem from public.perguntas where id = p1) <> 3 then
    raise exception 'FALHOU: a troca de ordem não aconteceu';
  end if;
  -- ...e não mexe em pergunta de B (B é invisível: a função recusa)
  begin
    perform public.trocar_ordem_perguntas(p1, current_setting('app.pergunta_b')::uuid);
    raise exception 'FALHOU: trocou ordem com pergunta de outra empresa';
  exception when sqlstate 'SF002' then null;
  end;

  -- ...nem entre duas pesquisas da MESMA empresa (as duas são visíveis, mas não são a mesma pesquisa)
  declare
    outra uuid;
    pergunta_outra uuid;
  begin
    insert into public.pesquisas (empresa_id, titulo) values (minha_empresa, 'Outra mesa') returning id into outra;
    insert into public.perguntas (pesquisa_id, texto, tipo, ordem) values (outra, 'Nota da outra', 'nota', 1)
      returning id into pergunta_outra;
    begin
      perform public.trocar_ordem_perguntas(p1, pergunta_outra);
      raise exception 'FALHOU: trocou ordem entre pesquisas diferentes da mesma empresa';
    exception when sqlstate 'SF002' then null;
    end;
  end;

  -- Mexer em B não afeta nada (RLS esconde)
  update public.pesquisas set titulo = 'Hackeada' where id = current_setting('app.pesquisa_b')::uuid;
  delete from public.pesquisas where id = current_setting('app.pesquisa_b')::uuid;
  update public.perguntas set texto = 'Hackeada' where id = current_setting('app.pergunta_b')::uuid;

  -- Renomear, pausar e excluir a própria pesquisa: pode (perguntas vão junto)
  update public.pesquisas set titulo = 'Balcão', ativa = false where id = minha;
  if (select titulo || '/' || ativa from public.pesquisas where id = minha) <> 'Balcão/false' then
    raise exception 'FALHOU: dono não conseguiu renomear/pausar';
  end if;
  delete from public.pesquisas where id = minha;
  if exists (select 1 from public.perguntas where pesquisa_id = minha) then
    raise exception 'FALHOU: perguntas não foram junto com a pesquisa';
  end if;
end $$;

-- Criar pesquisa na empresa B: proibido
reset role;
select set_config('app.empresa_b',
  (select id::text from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b2'), true);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
do $$
begin
  begin
    insert into public.pesquisas (empresa_id, titulo) values (current_setting('app.empresa_b')::uuid, 'Intrusa');
    raise exception 'FALHOU: A criou pesquisa na empresa B';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Visitante sem login
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform count(*) from public.pesquisas;
    raise exception 'FALHOU: visitante lê pesquisas';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.perguntas;
    raise exception 'FALHOU: visitante lê perguntas';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Conferência final como administrador
reset role;
do $$
begin
  if (select titulo from public.pesquisas where id = current_setting('app.pesquisa_b')::uuid) is distinct from 'Pesquisa B'
     or (select texto from public.perguntas where id = current_setting('app.pergunta_b')::uuid) is distinct from 'Nota B' then
    raise exception 'FALHOU: dados da empresa B foram alterados ou apagados';
  end if;
end $$;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;

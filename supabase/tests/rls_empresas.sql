-- Prova de segurança da tabela empresas.
-- Roda tudo dentro de uma transação e desfaz no final (rollback): não deixa lixo.
-- Se algo estiver errado, para com uma mensagem "FALHOU: ...".
begin;

-- Três usuários de teste. O trigger deve criar uma empresa para cada.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'teste-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'teste-b@exemplo.com', '{"nome_empresa":"  Empresa B  "}', now(), now()),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'teste-c@exemplo.com', '{}', now(), now());

do $$
begin
  if (select count(*) from public.empresas where owner_id in (
        '00000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-00000000000c')) <> 3 then
    raise exception 'FALHOU: o trigger não criou uma empresa para cada usuário';
  end if;
  if (select nome from public.empresas where owner_id = '00000000-0000-0000-0000-00000000000b') <> 'Empresa B' then
    raise exception 'FALHOU: o nome não teve os espaços removidos';
  end if;
  if (select nome from public.empresas where owner_id = '00000000-0000-0000-0000-00000000000c') <> 'Meu negócio' then
    raise exception 'FALHOU: sem nome, deveria usar "Meu negócio"';
  end if;
end $$;

-- A partir daqui agimos como o usuário A logado
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.empresas) <> 1 then
    raise exception 'FALHOU: o usuário A enxerga empresas que não são dele';
  end if;

  -- Tentar renomear a empresa B não pode afetar nada
  update public.empresas set nome = 'Hackeado'
   where owner_id = '00000000-0000-0000-0000-00000000000b';

  -- Renomear a própria empresa pode
  update public.empresas set nome = 'Empresa A renomeada'
   where owner_id = '00000000-0000-0000-0000-00000000000a';
  if (select nome from public.empresas) <> 'Empresa A renomeada' then
    raise exception 'FALHOU: o dono não conseguiu renomear a própria empresa';
  end if;

  -- Criar empresa pela API: proibido
  begin
    insert into public.empresas (nome, owner_id)
    values ('Falsa', '00000000-0000-0000-0000-00000000000a');
    raise exception 'FALHOU: o usuário conseguiu criar empresa pela API';
  exception when insufficient_privilege then null;
  end;

  -- Trocar o dono da empresa: proibido
  begin
    update public.empresas set owner_id = '00000000-0000-0000-0000-00000000000b'
     where owner_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALHOU: o usuário conseguiu trocar o dono da empresa';
  exception when insufficient_privilege then null;
  end;

  -- Apagar empresa pela API: proibido
  begin
    delete from public.empresas;
    raise exception 'FALHOU: o usuário conseguiu apagar empresa pela API';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Agora como visitante sem login (anon)
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform count(*) from public.empresas;
    raise exception 'FALHOU: visitante sem login consegue ler empresas';
  exception when insufficient_privilege then null;
  end;
end $$;

-- De volta como administrador para conferir que nada vazou
reset role;
do $$
begin
  if (select nome from public.empresas where owner_id = '00000000-0000-0000-0000-00000000000b') <> 'Empresa B' then
    raise exception 'FALHOU: o usuário A conseguiu alterar a empresa B';
  end if;
  if (select count(*) from public.empresas where owner_id in (
        '00000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-00000000000c')) <> 3 then
    raise exception 'FALHOU: alguma empresa foi apagada';
  end if;
end $$;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;

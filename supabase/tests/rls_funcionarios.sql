-- Prova de segurança da tabela funcionarios. Desfaz tudo no final (rollback).
-- Se algo estiver errado, para com uma mensagem "FALHOU: ...".
begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'func-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'func-b@exemplo.com', '{"nome_empresa":"Empresa B"}', now(), now());

-- Funcionária da empresa B, criada como administrador.
-- Guardamos o id da empresa B para os ataques mais abaixo.
insert into public.funcionarios (empresa_id, nome)
select id, 'Bia' from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b1';
select set_config('app.empresa_b',
  (select id::text from public.empresas where owner_id = '00000000-0000-0000-0000-0000000000b1'), true);

-- Agora como o dono da empresa A
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

do $$
declare
  minha_empresa uuid := (select id from public.empresas);
begin
  if exists (select 1 from public.funcionarios where nome = 'Bia') then
    raise exception 'FALHOU: A enxerga funcionário da empresa B';
  end if;

  insert into public.funcionarios (empresa_id, nome) values (minha_empresa, 'Ana');

  begin
    insert into public.funcionarios (empresa_id, nome) values (minha_empresa, 'ANA');
    raise exception 'FALHOU: aceitou nome repetido com maiúsculas diferentes';
  exception when unique_violation then null;
  end;

  if (select count(*) from public.funcionarios) <> 1 then
    raise exception 'FALHOU: A deveria ver só os próprios funcionários';
  end if;

  update public.funcionarios set nome = 'Ana Paula', ativo = false where nome = 'Ana';
  if (select nome || '/' || ativo from public.funcionarios) <> 'Ana Paula/false' then
    raise exception 'FALHOU: dono não conseguiu renomear/desativar';
  end if;

  -- Mexer na funcionária da empresa B não afeta nada (o RLS esconde a linha)
  update public.funcionarios set nome = 'Hackeado'
   where empresa_id = current_setting('app.empresa_b')::uuid;
  delete from public.funcionarios where empresa_id = current_setting('app.empresa_b')::uuid;

  -- Criar funcionário na empresa B: proibido
  begin
    insert into public.funcionarios (empresa_id, nome)
    values (current_setting('app.empresa_b')::uuid, 'Intruso');
    raise exception 'FALHOU: A criou funcionário na empresa B';
  exception when insufficient_privilege then null;
  end;

  -- Mover funcionário para outra empresa: proibido (permissão de coluna)
  begin
    update public.funcionarios set empresa_id = current_setting('app.empresa_b')::uuid;
    raise exception 'FALHOU: conseguiu trocar a empresa do funcionário';
  exception when insufficient_privilege then null;
  end;

  delete from public.funcionarios where nome = 'Ana Paula';
  if (select count(*) from public.funcionarios) <> 0 then
    raise exception 'FALHOU: dono não conseguiu excluir';
  end if;
end $$;

-- Visitante sem login
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$
begin
  begin
    perform count(*) from public.funcionarios;
    raise exception 'FALHOU: visitante consegue ler funcionários';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Conferência final como administrador
reset role;
do $$
begin
  if (select string_agg(nome, ',') from public.funcionarios
       where empresa_id = current_setting('app.empresa_b')::uuid) is distinct from 'Bia' then
    raise exception 'FALHOU: a funcionária da empresa B foi alterada ou apagada';
  end if;
end $$;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;

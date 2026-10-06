-- Etapa 3: funcionários de cada empresa

create table public.funcionarios (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null check (nome = btrim(nome) and char_length(nome) between 1 and 60),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.funcionarios is 'Quem atende os clientes; aparece em "Quem te atendeu?".';

-- Mesmo nome na mesma empresa não pode (sem diferenciar maiúsculas).
-- Começa por empresa_id, então também serve de índice para a chave estrangeira.
create unique index funcionarios_empresa_nome_unico
  on public.funcionarios (empresa_id, lower(nome));

alter table public.funcionarios enable row level security;

-- Regra comum: a empresa do funcionário pertence ao usuário logado
create policy "dono lê os próprios funcionários"
  on public.funcionarios for select to authenticated
  using (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

create policy "dono cria funcionários na própria empresa"
  on public.funcionarios for insert to authenticated
  with check (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

create policy "dono edita os próprios funcionários"
  on public.funcionarios for update to authenticated
  using (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

create policy "dono exclui os próprios funcionários"
  on public.funcionarios for delete to authenticated
  using (exists (
    select 1 from public.empresas e
    where e.id = empresa_id and e.owner_id = (select auth.uid())
  ));

-- Permissões por coluna: ninguém troca o funcionário de empresa.
-- Visitante sem login: nada (a Etapa 5 libera só o necessário para a pesquisa).
revoke all on public.funcionarios from anon, authenticated;
grant select, delete on public.funcionarios to authenticated;
grant insert (empresa_id, nome) on public.funcionarios to authenticated;
grant update (nome, ativo) on public.funcionarios to authenticated;

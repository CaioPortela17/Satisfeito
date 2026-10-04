-- Etapa 2: empresas
-- Cada conta (auth.users) é dona de exatamente uma empresa.

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 100),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.empresas is 'Negócios que usam o Satisfeito. Uma por conta.';

-- RLS: sem uma policy, ninguém acessa nada
alter table public.empresas enable row level security;

create policy "dono lê a própria empresa"
  on public.empresas for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "dono edita a própria empresa"
  on public.empresas for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Permissões por coluna: visitante não toca na tabela;
-- usuário logado só lê e só pode alterar o nome (nunca o owner_id).
-- Inserir e apagar: ninguém pela API (só o trigger cria).
revoke all on public.empresas from anon, authenticated;
grant select on public.empresas to authenticated;
grant update (nome) on public.empresas to authenticated;

-- Cria a empresa automaticamente quando alguém se cadastra.
-- security definer: roda com permissão do dono da função (precisa inserir
-- mesmo sem policy de insert). search_path vazio evita que alguém troque
-- as tabelas que a função usa.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.empresas (nome, owner_id)
  values (
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'nome_empresa'), 100), ''), 'Meu negócio'),
    new.id
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

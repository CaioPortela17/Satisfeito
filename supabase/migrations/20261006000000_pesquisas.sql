-- Etapa 4: pesquisas e perguntas de cada empresa

create table public.pesquisas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  titulo text not null check (titulo = btrim(titulo) and char_length(titulo) between 1 and 80),
  ativa boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.pesquisas is 'Pesquisas de satisfação; ativa = recebendo respostas.';

create index pesquisas_empresa_id_idx on public.pesquisas (empresa_id);

create table public.perguntas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas (id) on delete cascade,
  texto text not null check (texto = btrim(texto) and char_length(texto) between 1 and 120),
  tipo text not null check (tipo in ('nota', 'texto', 'funcionario')),
  ordem integer not null,
  obrigatoria boolean not null default false,
  arquivada boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.perguntas is
  'Perguntas de uma pesquisa. arquivada = tirada da pesquisa, mas as respostas antigas ficam.';

-- Começa por pesquisa_id: também serve de índice para a chave estrangeira
create index perguntas_pesquisa_ordem_idx on public.perguntas (pesquisa_id, ordem);

-- No máximo uma "Quem te atendeu?" valendo por pesquisa
create unique index perguntas_uma_de_funcionario
  on public.perguntas (pesquisa_id)
  where tipo = 'funcionario' and not arquivada;

-- No máximo 10 perguntas valendo por pesquisa (pesquisa curta = mais respostas).
-- Erro próprio SF001, traduzido na interface.
create function public.limitar_perguntas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.arquivada and (
    select count(*) from public.perguntas p
    where p.pesquisa_id = new.pesquisa_id and not p.arquivada and p.id <> new.id
  ) >= 10 then
    raise exception 'Limite de 10 perguntas por pesquisa' using errcode = 'SF001';
  end if;
  return new;
end;
$$;

create trigger perguntas_limite
  before insert or update of arquivada on public.perguntas
  for each row execute function public.limitar_perguntas();

-- Subir/descer: troca a ordem de duas perguntas da mesma pesquisa de uma vez só.
-- security invoker: roda com as permissões de quem chama, então o RLS vale
-- (pergunta de outra empresa é invisível e cai no erro SF002).
create function public.trocar_ordem_perguntas(a uuid, b uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ordem_a integer;
  ordem_b integer;
  pesquisa_a uuid;
  pesquisa_b uuid;
begin
  select ordem, pesquisa_id into ordem_a, pesquisa_a from public.perguntas where id = a;
  select ordem, pesquisa_id into ordem_b, pesquisa_b from public.perguntas where id = b;
  if pesquisa_a is null or pesquisa_b is null or pesquisa_a <> pesquisa_b then
    raise exception 'Perguntas inválidas para troca' using errcode = 'SF002';
  end if;
  update public.perguntas set ordem = ordem_b where id = a;
  update public.perguntas set ordem = ordem_a where id = b;
end;
$$;

revoke execute on function public.trocar_ordem_perguntas(uuid, uuid) from public, anon;
grant execute on function public.trocar_ordem_perguntas(uuid, uuid) to authenticated;
revoke execute on function public.limitar_perguntas() from public, anon, authenticated;

alter table public.pesquisas enable row level security;
alter table public.perguntas enable row level security;

-- pesquisas: a empresa pertence ao usuário logado
create policy "dono lê as próprias pesquisas"
  on public.pesquisas for select to authenticated
  using (exists (select 1 from public.empresas e
                 where e.id = empresa_id and e.owner_id = (select auth.uid())));

create policy "dono cria pesquisas na própria empresa"
  on public.pesquisas for insert to authenticated
  with check (exists (select 1 from public.empresas e
                      where e.id = empresa_id and e.owner_id = (select auth.uid())));

create policy "dono edita as próprias pesquisas"
  on public.pesquisas for update to authenticated
  using (exists (select 1 from public.empresas e
                 where e.id = empresa_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.empresas e
                      where e.id = empresa_id and e.owner_id = (select auth.uid())));

create policy "dono exclui as próprias pesquisas"
  on public.pesquisas for delete to authenticated
  using (exists (select 1 from public.empresas e
                 where e.id = empresa_id and e.owner_id = (select auth.uid())));

-- perguntas: a pesquisa é de uma empresa do usuário logado
create policy "dono lê as próprias perguntas"
  on public.perguntas for select to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

create policy "dono cria perguntas nas próprias pesquisas"
  on public.perguntas for insert to authenticated
  with check (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                      where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

create policy "dono edita as próprias perguntas"
  on public.perguntas for update to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                      where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

-- Permissões por coluna: ninguém troca empresa, pesquisa nem tipo; pergunta não se exclui (arquiva).
-- Visitante sem login: nada (a Etapa 5 libera só o necessário).
revoke all on public.pesquisas from anon, authenticated;
grant select, delete on public.pesquisas to authenticated;
grant insert (empresa_id, titulo) on public.pesquisas to authenticated;
grant update (titulo, ativa) on public.pesquisas to authenticated;

revoke all on public.perguntas from anon, authenticated;
grant select on public.perguntas to authenticated;
grant insert (pesquisa_id, texto, tipo, ordem, obrigatoria) on public.perguntas to authenticated;
grant update (texto, ordem, obrigatoria, arquivada) on public.perguntas to authenticated;

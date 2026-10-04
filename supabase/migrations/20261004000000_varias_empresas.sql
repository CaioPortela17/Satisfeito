-- Etapa 2.5: um login pode ter várias empresas (ex.: várias unidades da Bebelu)

-- Sai a regra "uma empresa por conta"; fica um índice comum para as buscas por dono
alter table public.empresas drop constraint empresas_owner_id_key;
create index empresas_owner_id_idx on public.empresas (owner_id);

-- O dono de uma empresa nova é sempre quem está logado
alter table public.empresas alter column owner_id set default auth.uid();

-- Nome sem espaços nas pontas (o formulário já limpa; o banco garante)
alter table public.empresas
  add constraint empresas_nome_sem_espacos check (nome = btrim(nome));

-- Criar empresas: só para si mesmo
create policy "dono cria empresas para si"
  on public.empresas for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

-- Só a coluna nome pode ser enviada: owner_id vem do default (auth.uid())
grant insert (nome) on public.empresas to authenticated;

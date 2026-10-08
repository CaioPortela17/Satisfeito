-- Etapa 5A: link público (slug), respostas e funções públicas

-- Slug: final do link /p/<slug>. O app gera do nome da empresa; o default só cobre
-- pesquisas antigas e inserções sem slug.
alter table public.pesquisas
  add column slug text not null
    default ('pesquisa-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

alter table public.pesquisas
  add constraint pesquisas_slug_formato
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  add constraint pesquisas_slug_unico unique (slug);

grant insert (slug) on public.pesquisas to authenticated;
grant update (slug) on public.pesquisas to authenticated;

-- Cada envio de um cliente
create table public.respostas (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas (id) on delete restrict,
  created_at timestamptz not null default now()
);
comment on table public.respostas is 'Cada envio de um cliente. Gravado só por registrar_resposta.';
create index respostas_pesquisa_data_idx on public.respostas (pesquisa_id, created_at);

-- Cada resposta dada dentro de um envio
create table public.respostas_itens (
  id uuid primary key default gen_random_uuid(),
  resposta_id uuid not null references public.respostas (id) on delete cascade,
  pergunta_id uuid not null references public.perguntas (id) on delete restrict,
  valor_nota smallint check (valor_nota between 1 and 10),
  valor_texto text check (valor_texto = btrim(valor_texto) and char_length(valor_texto) between 1 and 1000),
  funcionario_id uuid references public.funcionarios (id) on delete restrict,
  unique (resposta_id, pergunta_id)
);
create index respostas_itens_pergunta_idx on public.respostas_itens (pergunta_id);
create index respostas_itens_funcionario_idx on public.respostas_itens (funcionario_id);

alter table public.respostas enable row level security;
alter table public.respostas_itens enable row level security;

-- O dono lê as respostas das próprias pesquisas (painel da Etapa 6)
create policy "dono lê as próprias respostas"
  on public.respostas for select to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

create policy "dono lê os próprios itens"
  on public.respostas_itens for select to authenticated
  using (exists (select 1 from public.respostas r
                 join public.pesquisas q on q.id = r.pesquisa_id
                 join public.empresas e on e.id = q.empresa_id
                 where r.id = resposta_id and e.owner_id = (select auth.uid())));

-- Ninguém grava pela API: só a função registrar_resposta (chamada pelo servidor)
revoke all on public.respostas from anon, authenticated;
revoke all on public.respostas_itens from anon, authenticated;
grant select on public.respostas to authenticated;
grant select on public.respostas_itens to authenticated;

-- Leitura pública: só o necessário para montar a página do cliente.
-- security definer: roda como dono da função (o visitante não tem acesso às tabelas).
create function public.pesquisa_publica(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v record;
  v_tem_equipe boolean;
begin
  select q.id, q.titulo, q.ativa, q.empresa_id, e.nome as empresa
    into v
    from public.pesquisas q
    join public.empresas e on e.id = q.empresa_id
   where q.slug = lower(p_slug);
  if not found then
    return null;
  end if;

  if not v.ativa then
    return jsonb_build_object('ativa', false, 'titulo', v.titulo, 'empresa', v.empresa);
  end if;

  v_tem_equipe := exists (select 1 from public.funcionarios f where f.empresa_id = v.empresa_id and f.ativo);

  return jsonb_build_object(
    'ativa', true,
    'id', v.id,
    'titulo', v.titulo,
    'empresa', v.empresa,
    'perguntas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'texto', p.texto, 'tipo', p.tipo,
                                          'obrigatoria', p.obrigatoria) order by p.ordem)
        from public.perguntas p
       where p.pesquisa_id = v.id and not p.arquivada
         and (p.tipo <> 'funcionario' or v_tem_equipe)), '[]'::jsonb),
    'funcionarios', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'nome', f.nome) order by f.nome)
        from public.funcionarios f
       where f.empresa_id = v.empresa_id and f.ativo), '[]'::jsonb)
  );
end;
$$;

revoke execute on function public.pesquisa_publica(text) from public;
grant execute on function public.pesquisa_publica(text) to anon, authenticated;

-- Gravação: confere tudo e grava. Só o servidor (service_role) chama,
-- depois de aplicar as proteções (carimbo de tempo).
create function public.registrar_resposta(p_pesquisa_id uuid, p_itens jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_ativa boolean;
  v_tem_equipe boolean;
  v_item jsonb;
  v_pergunta record;
  v_vistas uuid[] := '{}';
  v_nota numeric;
  v_texto text;
  v_resposta uuid;
begin
  select empresa_id, ativa into v_empresa, v_ativa from public.pesquisas where id = p_pesquisa_id;
  if v_empresa is null or not v_ativa then
    raise exception 'Pesquisa indisponível' using errcode = 'SF101';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhuma resposta' using errcode = 'SF105';
  end if;

  v_tem_equipe := exists (select 1 from public.funcionarios f where f.empresa_id = v_empresa and f.ativo);

  -- Confere cada item antes de gravar qualquer coisa
  for v_item in select value from jsonb_array_elements(p_itens) loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'Item inválido' using errcode = 'SF102';
    end if;

    select p.id, p.tipo into v_pergunta
      from public.perguntas p
     where p.id::text = v_item->>'pergunta_id' and p.pesquisa_id = p_pesquisa_id and not p.arquivada;
    if not found or v_pergunta.id = any(v_vistas) then
      raise exception 'Pergunta inválida' using errcode = 'SF102';
    end if;
    v_vistas := v_vistas || v_pergunta.id;

    if v_pergunta.tipo = 'nota' then
      if (v_item - 'pergunta_id' - 'valor_nota') <> '{}'::jsonb
         or coalesce(jsonb_typeof(v_item->'valor_nota'), '') <> 'number' then
        raise exception 'Nota inválida' using errcode = 'SF103';
      end if;
      v_nota := (v_item->>'valor_nota')::numeric;
      if v_nota <> trunc(v_nota) or v_nota < 1 or v_nota > 10 then
        raise exception 'Nota inválida' using errcode = 'SF103';
      end if;
    elsif v_pergunta.tipo = 'texto' then
      if (v_item - 'pergunta_id' - 'valor_texto') <> '{}'::jsonb
         or coalesce(jsonb_typeof(v_item->'valor_texto'), '') <> 'string' then
        raise exception 'Texto inválido' using errcode = 'SF103';
      end if;
      v_texto := v_item->>'valor_texto';
      if v_texto <> btrim(v_texto) or char_length(v_texto) not between 1 and 1000 then
        raise exception 'Texto inválido' using errcode = 'SF103';
      end if;
    else
      if (v_item - 'pergunta_id' - 'funcionario_id') <> '{}'::jsonb
         or coalesce(jsonb_typeof(v_item->'funcionario_id'), '') <> 'string'
         or not exists (select 1 from public.funcionarios f
                         where f.id::text = v_item->>'funcionario_id'
                           and f.empresa_id = v_empresa and f.ativo) then
        raise exception 'Funcionário inválido' using errcode = 'SF103';
      end if;
    end if;
  end loop;

  -- Obrigatórias: a de funcionário só conta se houver equipe ativa
  if exists (select 1 from public.perguntas p
              where p.pesquisa_id = p_pesquisa_id and not p.arquivada and p.obrigatoria
                and (p.tipo <> 'funcionario' or v_tem_equipe)
                and not (p.id = any(v_vistas))) then
    raise exception 'Falta obrigatória' using errcode = 'SF104';
  end if;

  insert into public.respostas (pesquisa_id) values (p_pesquisa_id) returning id into v_resposta;

  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota, valor_texto, funcionario_id)
  select v_resposta,
         (i->>'pergunta_id')::uuid,
         (i->>'valor_nota')::smallint,
         i->>'valor_texto',
         (i->>'funcionario_id')::uuid
    from jsonb_array_elements(p_itens) i;

  return v_resposta;
end;
$$;

-- O Supabase dá execute em funções novas para anon/authenticated por padrão: tiramos.
revoke execute on function public.registrar_resposta(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_resposta(uuid, jsonb) to service_role;

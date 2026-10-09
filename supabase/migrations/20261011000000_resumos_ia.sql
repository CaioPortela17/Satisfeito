-- Etapa 7: resumo por IA das respostas escritas
--
-- resumos_ia guarda cada resumo gerado. O dono só LÊ (RLS); quem grava é o servidor
-- (chave secreta), depois de conferir que a pesquisa é do usuário.
create table public.resumos_ia (
  id uuid primary key default gen_random_uuid(),
  pesquisa_id uuid not null references public.pesquisas (id) on delete cascade,
  conteudo jsonb not null,
  respostas_lidas integer not null check (respostas_lidas >= 0),
  modelo text not null,
  tokens_entrada integer,
  tokens_saida integer,
  created_at timestamptz not null default now()
);
comment on table public.resumos_ia is 'Resumos gerados pela IA. Gravados só pelo servidor.';
create index resumos_ia_pesquisa_idx on public.resumos_ia (pesquisa_id, created_at desc);

alter table public.resumos_ia enable row level security;

create policy "dono lê os próprios resumos"
  on public.resumos_ia for select to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

revoke all on public.resumos_ia from anon, authenticated;
grant select on public.resumos_ia to authenticated;

-- textos_para_resumo: devolve as respostas escritas da pesquisa (até 200, das mais novas
-- para as mais antigas) e o total. Ignora respostas descartadas. Cada texto é cortado em
-- 1000 caracteres. Como é "security invoker", o RLS vale: pesquisa de outra empresa => null.
create function public.textos_para_resumo(
  p_pesquisa_id uuid,
  p_dias int default 30,
  p_fuso text default 'America/Sao_Paulo'
) returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone p_fuso)::date;
  v_resultado jsonb;
begin
  if p_dias < 1 or p_dias > 365 then
    raise exception 'período inválido' using errcode = '22023';
  end if;

  -- Pesquisa que não existe (ou que não é sua): null
  if not exists (select 1 from public.pesquisas where id = p_pesquisa_id) then
    return null;
  end if;

  with base as (
    select r.created_at, q.texto as pergunta, left(i.valor_texto, 1000) as texto
    from public.respostas r
    join public.respostas_itens i on i.resposta_id = r.id
    join public.perguntas q on q.id = i.pergunta_id
    where r.pesquisa_id = p_pesquisa_id
      and not r.descartada
      and q.tipo = 'texto'
      and i.valor_texto is not null
      and (r.created_at at time zone p_fuso)::date > v_hoje - p_dias
  ),
  recentes as (
    select * from base order by created_at desc limit 200
  )
  select jsonb_build_object(
    'total', (select count(*) from base),
    'textos', coalesce(
      (select jsonb_agg(jsonb_build_object('pergunta', pergunta, 'texto', texto) order by created_at desc)
       from recentes),
      '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$$;

-- uso_resumos_ia: dados para a tela do resumo: o último resumo da pesquisa, quantos resumos
-- a EMPRESA já gerou hoje (o teto diário é por empresa) e quantos textos há nos últimos 30 dias.
create function public.uso_resumos_ia(
  p_pesquisa_id uuid,
  p_fuso text default 'America/Sao_Paulo'
) returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_hoje date := (now() at time zone p_fuso)::date;
  v_ultimo jsonb;
  v_hoje_n int;
  v_textos int;
begin
  select empresa_id into v_empresa from public.pesquisas where id = p_pesquisa_id;
  if v_empresa is null then
    return null;
  end if;

  select to_jsonb(u) into v_ultimo
  from (
    select id, conteudo, respostas_lidas, modelo, created_at
    from public.resumos_ia
    where pesquisa_id = p_pesquisa_id
    order by created_at desc
    limit 1
  ) u;

  select count(*) into v_hoje_n
  from public.resumos_ia s
  join public.pesquisas p on p.id = s.pesquisa_id
  where p.empresa_id = v_empresa
    and (s.created_at at time zone p_fuso)::date = v_hoje;

  select count(*) into v_textos
  from public.respostas r
  join public.respostas_itens i on i.resposta_id = r.id
  join public.perguntas q on q.id = i.pergunta_id
  where r.pesquisa_id = p_pesquisa_id
    and not r.descartada
    and q.tipo = 'texto'
    and i.valor_texto is not null
    and (r.created_at at time zone p_fuso)::date > v_hoje - 30;

  return jsonb_build_object('ultimo', v_ultimo, 'hoje', v_hoje_n, 'textos', v_textos);
end;
$$;

revoke execute on function public.textos_para_resumo(uuid, int, text) from public, anon;
grant execute on function public.textos_para_resumo(uuid, int, text) to authenticated;
revoke execute on function public.uso_resumos_ia(uuid, text) from public, anon;
grant execute on function public.uso_resumos_ia(uuid, text) to authenticated;

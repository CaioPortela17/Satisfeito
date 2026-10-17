-- Etapa 7B: relatório para a equipe. O resumo passa a guardar o período, se citou nomes e o
-- retrato dos números usados (assim o texto copiado depois é igual ao que foi gerado).
alter table public.resumos_ia
  add column dias int not null default 30 check (dias in (7, 30, 90)),
  add column com_nomes boolean not null default false,
  add column numeros jsonb;

-- uso_resumos_ia agora conta os envios com texto do PERÍODO escolhido (p_dias) e devolve também
-- dias, com_nomes e numeros do último resumo. Troca a função antiga (um parâmetro novo criaria um
-- segundo "overload" e a chamada ficaria ambígua).
drop function public.uso_resumos_ia(uuid, text);
create function public.uso_resumos_ia(
  p_pesquisa_id uuid,
  p_fuso text default 'America/Sao_Paulo',
  p_dias int default 30
) returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_dono uuid;
  v_hoje date := (now() at time zone p_fuso)::date;
  v_ultimo jsonb;
  v_hoje_n int;
  v_textos int;
begin
  if p_dias < 1 or p_dias > 365 then
    raise exception 'período inválido' using errcode = '22023';
  end if;

  select q.empresa_id, e.owner_id into v_empresa, v_dono
  from public.pesquisas q join public.empresas e on e.id = q.empresa_id
  where q.id = p_pesquisa_id;
  if v_empresa is null then
    return null;
  end if;

  select to_jsonb(u) into v_ultimo
  from (
    select id, conteudo, respostas_lidas, modelo, created_at, dias, com_nomes, numeros
    from public.resumos_ia
    where pesquisa_id = p_pesquisa_id and estado = 'pronto'
    order by created_at desc
    limit 1
  ) u;

  select count(*) into v_hoje_n
  from public.resumos_ia s
  join public.pesquisas p on p.id = s.pesquisa_id
  join public.empresas e on e.id = p.empresa_id
  where e.owner_id = v_dono
    and (s.estado = 'pronto' or s.created_at > now() - interval '3 minutes')
    and (s.created_at at time zone p_fuso)::date = v_hoje;

  select count(distinct r.id) into v_textos
  from public.respostas r
  join public.respostas_itens i on i.resposta_id = r.id
  join public.perguntas q on q.id = i.pergunta_id
  where r.pesquisa_id = p_pesquisa_id
    and not r.descartada
    and q.tipo = 'texto'
    and i.valor_texto is not null
    and (r.created_at at time zone p_fuso)::date > v_hoje - p_dias;

  return jsonb_build_object('ultimo', v_ultimo, 'hoje', v_hoje_n, 'textos', v_textos);
end;
$$;

revoke execute on function public.uso_resumos_ia(uuid, text, int) from public, anon;
grant execute on function public.uso_resumos_ia(uuid, text, int) to authenticated;

-- reservar_resumo_ia: a reserva agora também guarda o período e se vai citar nomes.
drop function public.reservar_resumo_ia(uuid, uuid, int, int, text);
create function public.reservar_resumo_ia(
  p_pesquisa_id uuid,
  p_dono uuid,
  p_intervalo_min int,
  p_teto int,
  p_dias int default 30,
  p_com_nomes boolean default false,
  p_fuso text default 'America/Sao_Paulo'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono_ok boolean;
  v_hoje_n int;
  v_ultimo timestamptz;
  v_id uuid;
begin
  select true into v_dono_ok
  from public.pesquisas q join public.empresas e on e.id = q.empresa_id
  where q.id = p_pesquisa_id and e.owner_id = p_dono;
  if v_dono_ok is not true then
    return null;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('resumo:' || p_dono::text, 0));

  delete from public.resumos_ia where estado = 'gerando' and created_at < now() - interval '3 minutes';

  select count(*) into v_hoje_n
  from public.resumos_ia s
  join public.pesquisas q on q.id = s.pesquisa_id
  join public.empresas e on e.id = q.empresa_id
  where e.owner_id = p_dono
    and (s.created_at at time zone p_fuso)::date = (now() at time zone p_fuso)::date;
  if v_hoje_n >= p_teto then
    return jsonb_build_object('ok', false, 'motivo', 'teto');
  end if;

  select max(created_at) into v_ultimo from public.resumos_ia where pesquisa_id = p_pesquisa_id;
  if v_ultimo is not null and v_ultimo + make_interval(mins => p_intervalo_min) > now() then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'intervalo',
      'minutos', ceil(extract(epoch from (v_ultimo + make_interval(mins => p_intervalo_min) - now())) / 60)::int
    );
  end if;

  insert into public.resumos_ia (pesquisa_id, conteudo, respostas_lidas, modelo, estado, dias, com_nomes)
  values (p_pesquisa_id, '{}'::jsonb, 0, '', 'gerando', p_dias, p_com_nomes)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke execute on function public.reservar_resumo_ia(uuid, uuid, int, int, int, boolean, text) from public, anon, authenticated;
grant execute on function public.reservar_resumo_ia(uuid, uuid, int, int, int, boolean, text) to service_role;

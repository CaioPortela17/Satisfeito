-- Resumo por IA: reserva da vaga (sem corrida), teto por dono e contagem por envio.
--
-- 1) estado: 'gerando' enquanto a IA trabalha, 'pronto' quando o resumo está salvo.
--    A vaga é reservada ANTES de chamar a IA, então dois cliques ao mesmo tempo não passam
--    do intervalo nem do teto. Reserva que ficou parada (servidor caiu) vale por 3 minutos.
alter table public.resumos_ia
  add column estado text not null default 'pronto' check (estado in ('gerando', 'pronto'));

-- 2) textos_para_resumo: "total" e "lidas" agora contam ENVIOS (um cliente que respondeu duas
--    perguntas de texto conta uma vez). Os textos (até 200 itens) continuam sendo os itens.
create or replace function public.textos_para_resumo(
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

  if not exists (select 1 from public.pesquisas where id = p_pesquisa_id) then
    return null;
  end if;

  with base as (
    select r.id as resposta_id, r.created_at, q.texto as pergunta, left(i.valor_texto, 1000) as texto
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
    'total', (select count(distinct resposta_id) from base),
    'lidas', (select count(distinct resposta_id) from recentes),
    'textos', coalesce(
      (select jsonb_agg(jsonb_build_object('pergunta', pergunta, 'texto', texto) order by created_at desc)
       from recentes),
      '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end;
$$;

-- 3) uso_resumos_ia: o teto do dia agora é por DONO (soma das empresas dele), o último resumo
--    ignora reservas em andamento e "textos" conta envios.
create or replace function public.uso_resumos_ia(
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
  v_dono uuid;
  v_hoje date := (now() at time zone p_fuso)::date;
  v_ultimo jsonb;
  v_hoje_n int;
  v_textos int;
begin
  select q.empresa_id, e.owner_id into v_empresa, v_dono
  from public.pesquisas q join public.empresas e on e.id = q.empresa_id
  where q.id = p_pesquisa_id;
  if v_empresa is null then
    return null;
  end if;

  select to_jsonb(u) into v_ultimo
  from (
    select id, conteudo, respostas_lidas, modelo, created_at
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
    and (r.created_at at time zone p_fuso)::date > v_hoje - 30;

  return jsonb_build_object('ultimo', v_ultimo, 'hoje', v_hoje_n, 'textos', v_textos);
end;
$$;

-- 4) reservar_resumo_ia: só o servidor (chave secreta) chama. Confere que a pesquisa é do dono,
--    fila por dono (lock até o fim da transação), vê teto e intervalo e, se der, grava a reserva.
--    Devolve null (pesquisa não é do dono), {ok:false, motivo, minutos?} ou {ok:true, id}.
create function public.reservar_resumo_ia(
  p_pesquisa_id uuid,
  p_dono uuid,
  p_intervalo_min int,
  p_teto int,
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

  insert into public.resumos_ia (pesquisa_id, conteudo, respostas_lidas, modelo, estado)
  values (p_pesquisa_id, '{}'::jsonb, 0, '', 'gerando')
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

revoke execute on function public.reservar_resumo_ia(uuid, uuid, int, int, text) from public, anon, authenticated;
grant execute on function public.reservar_resumo_ia(uuid, uuid, int, int, text) to service_role;

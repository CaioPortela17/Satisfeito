-- Etapa 8 (melhorias): comparar as unidades (empresas) do mesmo dono.
--
-- Uma linha por empresa do usuário, com o período escolhido (7, 30 ou 90 dias) e o anterior: respostas,
-- nota média e NPS (só com 10 respostas com nota ou mais). Mesmas regras do painel_pesquisa: descartadas
-- ficam fora e a nota do envio é a média das notas dele, arredondada.
-- security invoker: o RLS vale, então cada dono só enxerga as próprias empresas e respostas.
create function public.comparar_unidades(
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
  v_ini date;
  v_ini_ant date;
  v_resultado jsonb;
begin
  if p_dias is null or p_dias not in (7, 30, 90) then
    raise exception 'período inválido' using errcode = '22023';
  end if;
  v_ini := v_hoje - (p_dias - 1);
  v_ini_ant := v_ini - p_dias;

  with env as (
    select p.empresa_id, r.id,
           (r.created_at at time zone p_fuso)::date as d,
           coalesce(sum(i.valor_nota), 0) as soma,
           count(i.valor_nota) as n_notas,
           case when count(i.valor_nota) > 0 then round(avg(i.valor_nota))::int end as nota_envio
    from public.respostas r
    join public.pesquisas p on p.id = r.pesquisa_id
    left join public.respostas_itens i on i.resposta_id = r.id
    where not r.descartada
      and (r.created_at at time zone p_fuso)::date >= v_ini_ant
    group by p.empresa_id, r.id, r.created_at
  ),
  por_empresa as (
    select empresa_id,
           count(*) filter (where d >= v_ini) as envios,
           round(sum(soma) filter (where d >= v_ini)::numeric / nullif(sum(n_notas) filter (where d >= v_ini), 0), 1) as media,
           count(nota_envio) filter (where d >= v_ini) as n_nps,
           count(*) filter (where d >= v_ini and nota_envio >= 9) as prom,
           count(*) filter (where d >= v_ini and nota_envio <= 6) as det,
           count(*) filter (where d < v_ini) as envios_ant,
           round(sum(soma) filter (where d < v_ini)::numeric / nullif(sum(n_notas) filter (where d < v_ini), 0), 1) as media_ant,
           count(nota_envio) filter (where d < v_ini) as n_nps_ant,
           count(*) filter (where d < v_ini and nota_envio >= 9) as prom_ant,
           count(*) filter (where d < v_ini and nota_envio <= 6) as det_ant
    from env
    group by empresa_id
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'nome', e.nome,
      'envios', coalesce(x.envios, 0),
      'media', x.media,
      'nps', case when coalesce(x.n_nps, 0) >= 10 then round(100.0 * (x.prom - x.det) / x.n_nps)::int end,
      'envios_anterior', coalesce(x.envios_ant, 0),
      'media_anterior', x.media_ant,
      'nps_anterior', case when coalesce(x.n_nps_ant, 0) >= 10 then round(100.0 * (x.prom_ant - x.det_ant) / x.n_nps_ant)::int end
    ) order by e.created_at), '[]'::jsonb)
  into v_resultado
  from public.empresas e
  left join por_empresa x on x.empresa_id = e.id;

  return v_resultado;
end;
$$;

revoke execute on function public.comparar_unidades(int, text) from public, anon;
grant execute on function public.comparar_unidades(int, text) to authenticated;

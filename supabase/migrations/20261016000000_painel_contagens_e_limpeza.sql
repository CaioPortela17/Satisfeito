-- Etapa 6C (ajuste): o painel passa a devolver quantas respostas/avaliações cada pergunta e cada pessoa teve no
-- PERÍODO ANTERIOR (respostas_anterior, avaliacoes_anterior), para a comparação usar a contagem certa em vez de
-- uma régua aproximada. E sai a função antiga resultados_pesquisa, que a tela não usa mais.
create or replace function public.painel_pesquisa(
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
  v_ini date;
  v_ini_ant date;
  v_atual jsonb;
  v_anterior jsonb;
  v_perguntas jsonb;
  v_evolucao jsonb;
  v_dia_semana jsonb;
  v_turno jsonb;
  v_equipe jsonb;
  v_destaques jsonb;
  v_suspeitas int;
begin
  if p_dias is null or p_dias not in (7, 30, 90) then
    raise exception 'período inválido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.pesquisas where id = p_pesquisa_id) then
    return null;
  end if;

  v_ini := v_hoje - (p_dias - 1);
  v_ini_ant := v_ini - p_dias;

  -- Bloco de números de um período: envios, média geral, NPS e distribuição
  select jsonb_build_object(
    'envios', count(*),
    'media_geral', round(sum(soma)::numeric / nullif(sum(n_notas), 0), 1),
    'nps', jsonb_build_object(
      'valor', case when count(nota_envio) >= 10
                    then round(100.0 * (count(*) filter (where nota_envio >= 9) - count(*) filter (where nota_envio <= 6))
                               / count(nota_envio))::int end,
      'promotores', count(*) filter (where nota_envio >= 9),
      'neutros', count(*) filter (where nota_envio between 7 and 8),
      'detratores', count(*) filter (where nota_envio <= 6),
      'n', count(nota_envio)),
    'distribuicao', jsonb_build_array(
      jsonb_build_object('faixa', '1-3', 'envios', count(*) filter (where nota_envio between 1 and 3)),
      jsonb_build_object('faixa', '4-6', 'envios', count(*) filter (where nota_envio between 4 and 6)),
      jsonb_build_object('faixa', '7-8', 'envios', count(*) filter (where nota_envio between 7 and 8)),
      jsonb_build_object('faixa', '9-10', 'envios', count(*) filter (where nota_envio between 9 and 10))))
  into v_atual
  from public.painel_envios(p_pesquisa_id, v_ini_ant, p_fuso) where d >= v_ini;

  select jsonb_build_object(
    'envios', count(*),
    'media_geral', round(sum(soma)::numeric / nullif(sum(n_notas), 0), 1),
    'nps', jsonb_build_object(
      'valor', case when count(nota_envio) >= 10
                    then round(100.0 * (count(*) filter (where nota_envio >= 9) - count(*) filter (where nota_envio <= 6))
                               / count(nota_envio))::int end,
      'n', count(nota_envio)))
  into v_anterior
  from public.painel_envios(p_pesquisa_id, v_ini_ant, p_fuso) where d < v_ini;

  -- Média de cada pergunta de nota (não arquivada), no período e no anterior
  select coalesce(jsonb_agg(
    jsonb_build_object('id', q.id, 'texto', q.texto, 'ordem', q.ordem,
                       'media', m.media, 'respostas', coalesce(m.n, 0), 'media_anterior', m.media_ant,
                       'respostas_anterior', coalesce(m.n_ant, 0))
    order by q.ordem), '[]'::jsonb)
  into v_perguntas
  from public.perguntas q
  left join lateral (
    select round(avg(x.valor_nota) filter (where x.d >= v_ini)::numeric, 1) as media,
           count(*) filter (where x.d >= v_ini) as n,
           round(avg(x.valor_nota) filter (where x.d < v_ini)::numeric, 1) as media_ant,
           count(*) filter (where x.d < v_ini) as n_ant
    from (
      select i.valor_nota, (r.created_at at time zone p_fuso)::date as d
      from public.respostas_itens i
      join public.respostas r on r.id = i.resposta_id
      where i.pergunta_id = q.id and not r.descartada and i.valor_nota is not null
        and (r.created_at at time zone p_fuso)::date >= v_ini_ant
    ) x
  ) m on true
  where q.pesquisa_id = p_pesquisa_id and q.tipo = 'nota' and not q.arquivada;

  -- Evolução: nota média por dia (só dias com nota) dentro do período
  select coalesce(jsonb_agg(
    jsonb_build_object('dia', t.d, 'media', t.media, 'respostas', t.n) order by t.d), '[]'::jsonb)
  into v_evolucao
  from (
    select d, round(sum(soma)::numeric / sum(n_notas), 1) as media, count(*) as n
    from public.painel_envios(p_pesquisa_id, v_ini_ant, p_fuso)
    where d >= v_ini and n_notas > 0
    group by d
  ) t;

  -- Dia da semana (1 = segunda ... 7 = domingo): sempre as 7 linhas; envios = envios com nota
  select jsonb_agg(jsonb_build_object('dia', s.dia, 'media', t.media, 'envios', coalesce(t.n, 0)) order by s.dia)
  into v_dia_semana
  from generate_series(1, 7) as s(dia)
  left join (
    select extract(isodow from d)::int as dia,
           round(sum(soma)::numeric / sum(n_notas), 1) as media,
           count(*) as n
    from public.painel_envios(p_pesquisa_id, v_ini_ant, p_fuso)
    where d >= v_ini and n_notas > 0
    group by 1
  ) t on t.dia = s.dia;

  -- Turnos: manhã, tarde, noite, madrugada (sempre as 4 linhas)
  select jsonb_agg(jsonb_build_object('turno', s.turno, 'media', t.media, 'envios', coalesce(t.n, 0)) order by s.ordem)
  into v_turno
  from (values ('manha', 1), ('tarde', 2), ('noite', 3), ('madrugada', 4)) as s(turno, ordem)
  left join (
    select case
             when extract(hour from ts) < 6 then 'madrugada'
             when extract(hour from ts) < 12 then 'manha'
             when extract(hour from ts) < 18 then 'tarde'
             else 'noite'
           end as turno,
           round(sum(soma)::numeric / sum(n_notas), 1) as media,
           count(*) as n
    from public.painel_envios(p_pesquisa_id, v_ini_ant, p_fuso)
    where d >= v_ini and n_notas > 0
    group by 1
  ) t on t.turno = s.turno;

  -- Equipe: média de todas as notas dos envios em que o cliente escolheu a pessoa (só quem teve avaliação no período)
  select coalesce(jsonb_agg(
    jsonb_build_object('id', f.id, 'nome', f.nome, 'ativo', f.ativo,
                       'media', e.media, 'avaliacoes', e.n, 'media_anterior', e.media_ant,
                       'avaliacoes_anterior', coalesce(e.n_ant, 0))
    order by e.media desc, e.n desc, f.nome), '[]'::jsonb)
  into v_equipe
  from (
    select it.funcionario_id as fid,
           round(avg(nt.valor_nota) filter (where env.d >= v_ini)::numeric, 1) as media,
           count(distinct env.id) filter (where env.d >= v_ini) as n,
           round(avg(nt.valor_nota) filter (where env.d < v_ini)::numeric, 1) as media_ant,
           count(distinct env.id) filter (where env.d < v_ini) as n_ant
    from public.painel_envios(p_pesquisa_id, v_ini_ant, p_fuso) env
    join public.respostas_itens it on it.resposta_id = env.id and it.funcionario_id is not null
    join public.respostas_itens nt on nt.resposta_id = env.id and nt.valor_nota is not null
    group by it.funcionario_id
    having count(distinct env.id) filter (where env.d >= v_ini) > 0
  ) e
  join public.funcionarios f on f.id = e.fid;

  -- Destaques (cada um pode ser null): exigem dados suficientes
  with pq as (
    select (e->>'id')::uuid as id, e->>'texto' as texto, (e->>'media')::numeric as media, (e->>'ordem')::int as ordem
    from jsonb_array_elements(v_perguntas) e
    where (e->>'respostas')::int >= 3 and e->>'media' is not null
  ),
  dias as (
    select (e->>'dia')::int as dia, (e->>'media')::numeric as media, (e->>'envios')::int as envios
    from jsonb_array_elements(v_dia_semana) e
    where (e->>'envios')::int >= 3 and e->>'media' is not null
  ),
  eq as (
    select (e->>'id')::uuid as id, e->>'nome' as nome, (e->>'media')::numeric as media, (e->>'avaliacoes')::int as avaliacoes
    from jsonb_array_elements(v_equipe) e
    where (e->>'avaliacoes')::int >= 3
  )
  select jsonb_build_object(
    'melhor_pergunta',
      (select to_jsonb(x) from (select id, texto, media from pq order by media desc, ordem limit 1) x
       where (select count(*) from pq) >= 2 and (select max(media) <> min(media) from pq)),
    'pior_pergunta',
      (select to_jsonb(x) from (select id, texto, media from pq order by media, ordem limit 1) x
       where (select count(*) from pq) >= 2 and (select max(media) <> min(media) from pq)),
    'dia_mais_fraco',
      (select to_jsonb(x) from (select dia, media, envios from dias order by media, dia limit 1) x
       where (select count(*) from dias) >= 2 and (select max(media) <> min(media) from dias)),
    'melhor_funcionario',
      (select to_jsonb(x) from (select id, nome, media, avaliacoes from eq order by media desc, avaliacoes desc, nome limit 1) x))
  into v_destaques;

  select count(*) into v_suspeitas from public.envios_suspeitos(p_pesquisa_id);

  return jsonb_build_object(
    'periodo', jsonb_build_object('dias', p_dias, 'inicio', v_ini, 'fim', v_hoje),
    'atual', v_atual,
    'anterior', v_anterior,
    'perguntas', v_perguntas,
    'evolucao', v_evolucao,
    'dia_semana', v_dia_semana,
    'turno', v_turno,
    'equipe', v_equipe,
    'destaques', v_destaques,
    'suspeitas', v_suspeitas);
end;
$$;

revoke execute on function public.painel_pesquisa(uuid, int, text) from public, anon;
grant execute on function public.painel_pesquisa(uuid, int, text) to authenticated;

drop function public.resultados_pesquisa(uuid, text);

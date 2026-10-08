-- Etapa 6A: números da página Resultados
--
-- security invoker: a função roda com as permissões de QUEM chama. Assim o RLS continua
-- valendo: o dono só enxerga pesquisas, respostas e funcionários da própria empresa.
-- Se a pesquisa não é visível para quem chama, devolve null.
-- Respostas descartadas não contam em nada.
create function public.resultados_pesquisa(p_pesquisa_id uuid, p_fuso text default 'America/Sao_Paulo')
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_hoje date := (now() at time zone p_fuso)::date;
  v_totais jsonb;
  v_perguntas jsonb;
  v_evolucao jsonb;
  v_equipe jsonb;
begin
  if not exists (select 1 from public.pesquisas where id = p_pesquisa_id) then
    return null;
  end if;

  -- Totais (envios). "Últimos 7 dias" = hoje e os 6 anteriores; "30 dias" = hoje e os 29 anteriores
  select jsonb_build_object(
    'hoje',        count(*) filter (where t.d = v_hoje),
    'sete_dias',   count(*) filter (where t.d > v_hoje - 7),
    'trinta_dias', count(*) filter (where t.d > v_hoje - 30),
    'geral',       count(*))
  into v_totais
  from (
    select (r.created_at at time zone p_fuso)::date as d
    from public.respostas r
    where r.pesquisa_id = p_pesquisa_id and not r.descartada
  ) t;

  -- Média de cada pergunta de nota (não arquivada)
  select coalesce(jsonb_agg(
    jsonb_build_object('id', q.id, 'texto', q.texto, 'ordem', q.ordem,
                       'media', m.media, 'respostas', coalesce(m.n, 0))
    order by q.ordem), '[]'::jsonb)
  into v_perguntas
  from public.perguntas q
  left join lateral (
    select round(avg(i.valor_nota)::numeric, 1) as media, count(*) as n
    from public.respostas_itens i
    join public.respostas r on r.id = i.resposta_id
    where i.pergunta_id = q.id and not r.descartada and i.valor_nota is not null
  ) m on true
  where q.pesquisa_id = p_pesquisa_id and q.tipo = 'nota' and not q.arquivada;

  -- Evolução: nota média por dia (todas as notas juntas), últimos 30 dias, só dias com nota
  select coalesce(jsonb_agg(
    jsonb_build_object('dia', t.d, 'media', t.media, 'respostas', t.n)
    order by t.d), '[]'::jsonb)
  into v_evolucao
  from (
    select (r.created_at at time zone p_fuso)::date as d,
           round(avg(i.valor_nota)::numeric, 1) as media,
           count(distinct r.id) as n
    from public.respostas r
    join public.respostas_itens i on i.resposta_id = r.id and i.valor_nota is not null
    where r.pesquisa_id = p_pesquisa_id and not r.descartada
      and (r.created_at at time zone p_fuso)::date > v_hoje - 30
    group by 1
  ) t;

  -- Equipe: média de todas as notas dos envios em que o cliente escolheu o funcionário
  select coalesce(jsonb_agg(
    jsonb_build_object('id', f.id, 'nome', f.nome, 'ativo', f.ativo,
                       'media', e.media, 'avaliacoes', e.n)
    order by e.media desc, e.n desc, f.nome), '[]'::jsonb)
  into v_equipe
  from (
    select it.funcionario_id as fid,
           round(avg(nt.valor_nota)::numeric, 1) as media,
           count(distinct r.id) as n
    from public.respostas r
    join public.respostas_itens it on it.resposta_id = r.id and it.funcionario_id is not null
    join public.respostas_itens nt on nt.resposta_id = r.id and nt.valor_nota is not null
    where r.pesquisa_id = p_pesquisa_id and not r.descartada
    group by it.funcionario_id
  ) e
  join public.funcionarios f on f.id = e.fid;

  return jsonb_build_object(
    'totais', v_totais, 'perguntas', v_perguntas, 'evolucao', v_evolucao, 'equipe', v_equipe);
end $$;

-- Só quem está logado executa
revoke execute on function public.resultados_pesquisa(uuid, text) from public, anon;
grant execute on function public.resultados_pesquisa(uuid, text) to authenticated;

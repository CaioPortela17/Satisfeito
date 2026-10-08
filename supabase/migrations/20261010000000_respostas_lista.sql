-- Etapa 6B: lista de respostas e selo de suspeita
--
-- Regra: um envio é "ruim" quando a média das notas dele é 4 ou menos. Quatro envios ruins
-- dentro de 15 minutos (exatamente 15 vale), na mesma pesquisa, formam uma rajada, e todos
-- os envios da rajada são suspeitos. Envios descartados não entram na conta. Nada de IP.
-- security invoker: roda com as permissões de quem chama, então o RLS continua valendo.
create function public.envios_suspeitos(p_pesquisa_id uuid)
returns table (resposta_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  -- 1) envios ruins (média das notas <= 4), sem os descartados; envio sem nota nunca é ruim
  with ruins as (
    select r.id, r.created_at
    from public.respostas r
    join public.respostas_itens i on i.resposta_id = r.id
    where r.pesquisa_id = p_pesquisa_id and not r.descartada and i.valor_nota is not null
    group by r.id, r.created_at
    having avg(i.valor_nota) <= 4
  ),
  -- 2) "abre": o 4º envio ruim a contar deste (lead 3) está a 15 minutos ou menos dele
  marcados as (
    select id, created_at,
           (lead(created_at, 3) over (order by created_at, id) - created_at) <= interval '15 minutes' as abre
    from ruins
  )
  -- 3) suspeito = algum dos 4 últimos (este incluído) abre uma rajada
  select m.id
  from (
    select id,
           coalesce(max(abre::int) over (order by created_at, id rows between 3 preceding and current row), 0) as em_rajada
    from marcados
  ) m
  where m.em_rajada = 1;
$$;

revoke execute on function public.envios_suspeitos(uuid) from public, anon;
grant execute on function public.envios_suspeitos(uuid) to authenticated;

-- Lista de envios de uma pesquisa, com abas (todas / suspeitas / descartadas) e páginas de 20.
-- Devolve null se a pesquisa não existe ou não é da empresa de quem chama (o RLS esconde).
create function public.respostas_pesquisa(
  p_pesquisa_id uuid, p_aba text default 'todas', p_pagina int default 1)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  c_tamanho constant int := 20;
  v_contagens jsonb;
  v_total int;
  v_total_paginas int;
  v_pagina int := greatest(coalesce(p_pagina, 1), 1);
  v_envios jsonb;
begin
  if p_aba is null or p_aba not in ('todas', 'suspeitas', 'descartadas') then
    raise exception 'aba inválida' using errcode = '22023';
  end if;
  -- Pesquisa que o RLS não deixa ver (ou que não existe): null
  if not exists (select 1 from public.pesquisas where id = p_pesquisa_id) then
    return null;
  end if;

  -- Contagens de cada aba (para os números nas abas)
  with susp as (select resposta_id from public.envios_suspeitos(p_pesquisa_id)),
  base as (
    select r.id, r.descartada, (s.resposta_id is not null) as suspeita
    from public.respostas r
    left join susp s on s.resposta_id = r.id
    where r.pesquisa_id = p_pesquisa_id
  )
  select jsonb_build_object(
    'todas', count(*),
    'suspeitas', count(*) filter (where suspeita),
    'descartadas', count(*) filter (where descartada))
  into v_contagens
  from base;

  -- Quantas páginas tem a aba escolhida; página fora do limite vira a última (ou a 1ª)
  v_total := (v_contagens->>p_aba)::int;
  v_total_paginas := greatest(ceil(v_total / c_tamanho::numeric)::int, 1);
  v_pagina := least(v_pagina, v_total_paginas);

  -- Os envios da página, do mais novo para o mais antigo, com média e itens
  with susp as (select resposta_id from public.envios_suspeitos(p_pesquisa_id)),
  base as (
    select r.id, r.created_at, r.descartada, (s.resposta_id is not null) as suspeita
    from public.respostas r
    left join susp s on s.resposta_id = r.id
    where r.pesquisa_id = p_pesquisa_id
  ),
  pagina as (
    select * from base
    where case p_aba when 'todas' then true when 'suspeitas' then suspeita else descartada end
    order by created_at desc, id
    limit c_tamanho offset (v_pagina - 1) * c_tamanho
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', f.id, 'criada_em', f.created_at, 'descartada', f.descartada,
      'suspeita', f.suspeita, 'media', m.media, 'itens', it.itens)
    order by f.created_at desc, f.id), '[]'::jsonb)
  into v_envios
  from pagina f
  left join lateral (
    select round(avg(i.valor_nota)::numeric, 1) as media
    from public.respostas_itens i
    where i.resposta_id = f.id and i.valor_nota is not null
  ) m on true
  left join lateral (
    select coalesce(jsonb_agg(jsonb_build_object(
        'pergunta', q.texto, 'tipo', q.tipo, 'ordem', q.ordem,
        'nota', i.valor_nota, 'texto', i.valor_texto, 'funcionario', fu.nome)
      order by q.ordem), '[]'::jsonb) as itens
    from public.respostas_itens i
    join public.perguntas q on q.id = i.pergunta_id
    left join public.funcionarios fu on fu.id = i.funcionario_id
    where i.resposta_id = f.id
  ) it on true;

  return jsonb_build_object(
    'contagens', v_contagens, 'pagina', v_pagina,
    'total_paginas', v_total_paginas, 'envios', v_envios);
end
$$;

revoke execute on function public.respostas_pesquisa(uuid, text, int) from public, anon;
grant execute on function public.respostas_pesquisa(uuid, text, int) to authenticated;

-- resultados_pesquisa passa a devolver também 'suspeitas' (quantos envios estão marcados).
-- Mesmo corpo da Etapa 6A, com três mudanças: v_suspeitas declarada, calculada e devolvida.
create or replace function public.resultados_pesquisa(p_pesquisa_id uuid, p_fuso text default 'America/Sao_Paulo')
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
  v_suspeitas int;
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

  -- Quantos envios estão marcados como suspeitos (para o aviso no painel)
  select count(*) into v_suspeitas from public.envios_suspeitos(p_pesquisa_id);

  return jsonb_build_object(
    'totais', v_totais, 'perguntas', v_perguntas, 'evolucao', v_evolucao, 'equipe', v_equipe,
    'suspeitas', v_suspeitas);
end $$;

-- Nenhuma pergunta é obrigatória: o cliente responde só o que quiser (pelo menos uma coisa).
-- A coluna perguntas.obrigatoria continua existindo, mas todas ficam false e a função não confere mais.
update public.perguntas set obrigatoria = false where obrigatoria;

create or replace function public.registrar_resposta(p_pesquisa_id uuid, p_itens jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_empresa uuid;
  v_ativa boolean;
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
      if (v_item - 'pergunta_id' - 'valor_nota' - 'valor_texto') <> '{}'::jsonb
         or coalesce(jsonb_typeof(v_item->'valor_nota'), '') <> 'number' then
        raise exception 'Nota inválida' using errcode = 'SF103';
      end if;
      v_nota := (v_item->>'valor_nota')::numeric;
      if v_nota <> trunc(v_nota) or v_nota < 1 or v_nota > 10 then
        raise exception 'Nota inválida' using errcode = 'SF103';
      end if;
      -- Texto junto da nota: só para nota abaixo de 7
      if v_item ? 'valor_texto' then
        v_texto := v_item->>'valor_texto';
        if v_nota >= 7
           or jsonb_typeof(v_item->'valor_texto') <> 'string'
           or v_texto <> btrim(v_texto)
           or char_length(v_texto) not between 1 and 1000 then
          raise exception 'Texto inválido' using errcode = 'SF103';
        end if;
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

  insert into public.respostas (pesquisa_id) values (p_pesquisa_id) returning id into v_resposta;

  insert into public.respostas_itens (resposta_id, pergunta_id, valor_nota, valor_texto, funcionario_id)
  select v_resposta,
         (i->>'pergunta_id')::uuid,
         (i->>'valor_nota')::numeric::smallint,
         i->>'valor_texto',
         (i->>'funcionario_id')::uuid
    from jsonb_array_elements(p_itens) i;

  return v_resposta;
end;
$$;

revoke execute on function public.registrar_resposta(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_resposta(uuid, jsonb) to service_role;

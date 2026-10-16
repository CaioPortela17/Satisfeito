-- Limite de 10 perguntas sem corrida: duas inserções ao mesmo tempo na mesma pesquisa
-- liam a contagem 9 e as duas passavam. Agora cada pesquisa tem uma "fila": o lock de
-- consulta (advisory) dura até o fim da transação e faz a segunda inserção esperar a primeira.
create or replace function public.limitar_perguntas()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.arquivada then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.pesquisa_id::text, 0));
    if (
      select count(*) from public.perguntas p
      where p.pesquisa_id = new.pesquisa_id and not p.arquivada and p.id <> new.id
    ) >= 10 then
      raise exception 'Limite de 10 perguntas por pesquisa' using errcode = 'SF001';
    end if;
  end if;
  return new;
end;
$$;

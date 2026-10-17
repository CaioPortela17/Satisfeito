-- Avisos por e-mail ao dono: nota baixa, rajada suspeita e relatório semanal.
--
-- 1) Duas opções por empresa: o aviso de nota baixa vem LIGADO (é um aviso sobre o negócio do próprio dono,
--    ele desliga quando quiser) e o relatório semanal vem DESLIGADO (usa IA e gasta crédito, então o dono escolhe).
alter table public.empresas
  add column aviso_nota_baixa boolean not null default true,
  add column relatorio_semanal boolean not null default false;

grant update (aviso_nota_baixa, relatorio_semanal) on public.empresas to authenticated;

-- 2) Registro dos avisos enviados: serve para não mandar o mesmo aviso em sequência (janela) nem passar de um
--    limite por dia. Só o servidor (chave secreta) lê e grava: sem policy e sem permissão para o usuário.
create table public.avisos_enviados (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  pesquisa_id uuid references public.pesquisas (id) on delete cascade,
  tipo text not null check (tipo in ('nota_baixa', 'rajada', 'relatorio_semanal')),
  created_at timestamptz not null default now()
);
comment on table public.avisos_enviados is 'Avisos por e-mail já enviados ao dono. Só o servidor lê e grava.';
create index avisos_enviados_pesquisa_idx on public.avisos_enviados (pesquisa_id, tipo, created_at desc);
create index avisos_enviados_empresa_idx on public.avisos_enviados (empresa_id, created_at desc);
alter table public.avisos_enviados enable row level security;
revoke all on public.avisos_enviados from anon, authenticated;

-- 3) reservar_aviso: o servidor pede "posso mandar este aviso agora?". Confere se a opção está ligada, se já
--    não saiu um igual dentro da janela e se a empresa não passou do limite das últimas 24 horas. Se pode, já
--    grava o registro (a reserva) e devolve os dados para montar o e-mail. Fila por empresa (lock), então dois
--    envios ao mesmo tempo não furam o limite. Devolve null se a pesquisa não existe.
create function public.reservar_aviso(
  p_pesquisa_id uuid,
  p_tipo text,
  p_janela_min int,
  p_teto_dia int
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_id uuid;
begin
  select p.id as pesquisa_id, p.titulo, e.id as empresa_id, e.nome as empresa_nome, e.owner_id,
         e.aviso_nota_baixa, e.relatorio_semanal
  into v
  from public.pesquisas p join public.empresas e on e.id = p.empresa_id
  where p.id = p_pesquisa_id;
  if not found then
    return null;
  end if;

  if (p_tipo in ('nota_baixa', 'rajada') and not v.aviso_nota_baixa)
     or (p_tipo = 'relatorio_semanal' and not v.relatorio_semanal) then
    return jsonb_build_object('ok', false, 'motivo', 'desligado');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('aviso:' || v.empresa_id::text, 0));

  if exists (
    select 1 from public.avisos_enviados a
    where a.pesquisa_id = p_pesquisa_id and a.tipo = p_tipo
      and a.created_at > now() - make_interval(mins => p_janela_min)
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'recente');
  end if;

  if (select count(*) from public.avisos_enviados a
      where a.empresa_id = v.empresa_id and a.created_at > now() - interval '24 hours') >= p_teto_dia then
    return jsonb_build_object('ok', false, 'motivo', 'teto');
  end if;

  insert into public.avisos_enviados (empresa_id, pesquisa_id, tipo)
  values (v.empresa_id, p_pesquisa_id, p_tipo)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'dono', v.owner_id,
    'empresa', v.empresa_nome,
    'pesquisa', v.titulo
  );
end;
$$;

revoke execute on function public.reservar_aviso(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.reservar_aviso(uuid, text, int, int) to service_role;

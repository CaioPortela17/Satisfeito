-- Etapa 5B: o dono pode descartar respostas suspeitas (a tela chega na Etapa 6)

alter table public.respostas
  add column descartada boolean not null default false;

comment on column public.respostas.descartada is
  'Resposta descartada pelo dono. Não entra nas médias: as consultas da Etapa 6 devem filtrar "not descartada".';

-- O dono só pode mudar esta coluna (nunca created_at nem pesquisa_id)
grant update (descartada) on public.respostas to authenticated;

create policy "dono descarta as próprias respostas"
  on public.respostas for update to authenticated
  using (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                 where q.id = pesquisa_id and e.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.pesquisas q join public.empresas e on e.id = q.empresa_id
                      where q.id = pesquisa_id and e.owner_id = (select auth.uid())));

# Etapa 6C: dashboard completo (Parte 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tela `/painel/resultados` mostra um dashboard completo para 7, 30 ou 90 dias, com comparação com o período anterior, distribuição das notas e NPS, dia da semana e turno, e destaques.

**Architecture:** Uma função SQL `painel_pesquisa` (security invoker) calcula tudo de uma vez; a página lê o resultado, valida o período da URL (`?dias=`) e entrega a componentes pequenos. Regras de apresentação (variação, "poucos dados", nomes de dias) ficam em funções puras testadas em `src/lib/painel/`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind 4, Supabase (Postgres, RLS), Recharts, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-dashboard-e-relatorio-design.md` (seção "Parte 1: dashboard")

## Global Constraints

- Interface em português, sem emojis; ícones de marca em `src/components/icones/`, genéricos do `lucide-react`.
- Períodos aceitos: 7, 30 ou 90 dias; padrão 30; valor inválido na URL cai para 30.
- Nota do envio = média das notas do envio, arredondada (0,5 sobe). NPS: 9–10 promotor, 7–8 neutro, 1–6 detrator; só aparece com 10 envios com nota ou mais.
- Comparação com o período anterior só com 5 envios ou mais nos dois períodos; dia/turno com menos de 3 envios = "poucos dados"; destaques exigem 3 respostas/envios/avaliações.
- Turnos (fuso America/Sao_Paulo): madrugada 0h–5h59, manhã 6h–11h59, tarde 12h–17h59, noite 18h–23h59.
- Respostas descartadas ficam fora de tudo. Next.js 16: consultar `node_modules/next/dist/docs/` antes de mexer em rotas/params.
- Seguir o `DESIGN.md`; acessibilidade: cor nunca é o único sinal, alvos de toque de 44 px, gráfico com alternativa em texto.

## File Structure

- Create `supabase/migrations/20261014000000_painel_pesquisa.sql`: função `painel_pesquisa`.
- Create `supabase/tests/rls_painel_pesquisa.sql`: prova da função.
- Create `src/lib/painel/tipos.ts`: tipos do JSON devolvido.
- Create `src/lib/painel/periodo.ts` (+ `.test.ts`): `lerDias`, `DIAS_VALIDOS`.
- Create `src/lib/painel/apresentacao.ts` (+ `.test.ts`): variação, nomes de dia/turno, barras.
- Modify `src/lib/supabase/database.types.ts`: tipo da função nova.
- Create `src/app/painel/resultados/seletor-periodo.tsx`, `cartoes-resumo.tsx`, `destaques.tsx`, `distribuicao-notas.tsx`, `dia-e-turno.tsx`.
- Modify `src/app/painel/resultados/page.tsx`, `cartoes-perguntas.tsx`, `ranking-equipe.tsx`, `grafico-evolucao.tsx`, `seletor-pesquisa.tsx` (preserva `dias` na URL).
- Delete (cleanup): `cartoes-totais.tsx`; migração de limpeza remove `resultados_pesquisa` só depois de nada mais usá-la.

---

### Task 1: Função `painel_pesquisa` (banco)

**Files:**
- Create: `supabase/migrations/20261014000000_painel_pesquisa.sql`
- Create: `supabase/tests/rls_painel_pesquisa.sql`

**Interfaces:**
- Produces: `public.painel_pesquisa(p_pesquisa_id uuid, p_dias int default 30, p_fuso text default 'America/Sao_Paulo') returns jsonb`. `null` se a pesquisa não é visível; erro `22023` se `p_dias` não é 7, 30 ou 90. Forma do JSON na Task 2.

- [ ] **Step 1: Escrever o teste SQL (falha: função não existe)** — conteúdo completo em `supabase/tests/rls_painel_pesquisa.sql` (cenário: 10 envios no período com horários nas fronteiras dos turnos, 5 no período anterior, 1 fora dos dois, 1 descartado, 1 só com texto; Ana e Bia como equipe). Ver o arquivo.
- [ ] **Step 2: Rodar (via MCP `execute_sql`) e ver falhar** com "function public.painel_pesquisa does not exist".
- [ ] **Step 3: Escrever a migração** com a função (ver o arquivo): CTE `env` (um registro por envio com data local, soma e quantidade de notas), `env_p`/`env_a` (período e anterior, com `nota_envio = round(media)::int`), NPS e distribuição por contagens com `filter`, perguntas com `lateral`, evolução, dia da semana (1..7 sempre presentes), turnos (4 sempre presentes), equipe com `media_anterior`, destaques calculados a partir dos jsonb e `suspeitas` via `envios_suspeitos`.
- [ ] **Step 4: Aplicar a migração (MCP `apply_migration`) e rodar o teste: PASSA.**
- [ ] **Step 5: Commit** `feat: função painel_pesquisa (dashboard do período com comparação)`.

### Task 2: Tipos e funções puras

**Files:**
- Create: `src/lib/painel/tipos.ts`, `periodo.ts`, `periodo.test.ts`, `apresentacao.ts`, `apresentacao.test.ts`
- Modify: `src/lib/supabase/database.types.ts` (adicionar `painel_pesquisa` em `Functions`)

**Interfaces:**
- Produces (tipos): `Painel`, `Periodo = 7 | 30 | 90`.
- Produces (periodo): `DIAS_VALIDOS: readonly [7, 30, 90]`, `lerDias(valor: string | undefined): Periodo` (padrão 30).
- Produces (apresentacao): `MIN_COMPARACAO = 5`, `MIN_CELULA = 3`, `MIN_NPS = 10`, `variacao(...)`, `textoVariacao(...)`, `NOMES_DIA`, `ROTULOS_TURNO`, `percentual(parte, total)`, `faixaNps(valor)`.
- [ ] Teste primeiro (Vitest) para cada função, ver falhar, implementar, ver passar, commit `feat: tipos e regras de apresentação do painel`.

### Task 3: Seletor de período e cartões de resumo

**Files:** Create `seletor-periodo.tsx`, `cartoes-resumo.tsx`; modify `page.tsx`, `seletor-pesquisa.tsx`.

- `SeletorPeriodo` (client): grupo de 3 botões (7/30/90 dias) com `aria-pressed`, navega por `?pesquisa=..&dias=..` com `router.replace`; 44 px de altura.
- `CartoesResumo`: três cartões (Respostas, Nota média, NPS) com a variação (seta lucide + texto "0,3 a mais que no período anterior"; "poucos dados para comparar"); NPS com `faixaNps` escrita e "poucos dados" abaixo de 10 envios.
- `page.tsx` chama `painel_pesquisa(escolhida, dias)` no lugar de `resultados_pesquisa` e repassa `dias` ao seletor de pesquisa.
- [ ] Implementar, `npx tsc --noEmit`, lint, conferir no navegador, commit `feat: seletor de período e cartões de resumo`.

### Task 4: Destaques, distribuição e dia/turno

**Files:** Create `destaques.tsx`, `distribuicao-notas.tsx`, `dia-e-turno.tsx`; modify `page.tsx`.

- `Destaques`: até 4 cartões (melhor pergunta, pior pergunta, dia mais fraco, melhor funcionário); cartão com valor `null` não aparece; a seção some se não houver nenhum.
- `DistribuicaoNotas`: 4 barras horizontais (1–3, 4–6, 7–8, 9–10) com número e porcentagem escritos; cores das faixas existentes + rótulos.
- `DiaETurno`: duas listas de barras (7 dias; 4 turnos) com nota média e nº de envios; célula com menos de 3 envios esmaecida e com o texto "poucos dados"; a melhor e a pior (com dados suficientes) levam o rótulo escrito "melhor"/"mais fraco".
- [ ] Implementar, tipos e lint, conferir no navegador em 360 px e 1280 px, commit `feat: destaques, distribuição das notas e dia/turno`.

### Task 5: Evolução, perguntas e equipe no período + limpeza

**Files:** Modify `grafico-evolucao.tsx` (título e texto vazio dependem do período), `cartoes-perguntas.tsx` (variação por pergunta), `ranking-equipe.tsx` (variação por pessoa), `page.tsx` (ordem final das seções); delete `cartoes-totais.tsx`.

- [ ] Ajustar, `npx vitest run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- [ ] Teste no Chrome: período 7/30/90, pesquisa sem respostas, poucos dados, teclado, 360 px.
- [ ] README (pt e en) e CLAUDE.md: Etapa 6C concluída; migração de limpeza de `resultados_pesquisa` anotada como pendência.
- [ ] Commit, PR e merge.

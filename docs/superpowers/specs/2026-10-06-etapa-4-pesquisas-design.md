# Etapa 4 — Pesquisas e perguntas

A empresa logada cria pesquisas, edita as perguntas (nota 1–10, texto livre, "Quem te atendeu?") e pausa ou retoma cada pesquisa. Tudo na empresa atual do seletor, com dados isolados por RLS. A página pública, o `slug` e o QR code ficam para a Etapa 5.

Desenho aprovado pelo Caio em 2026-10-06 (revisão detalhada no fim do projeto).

## 1. Decisões (aprovadas)

| Assunto | Decisão |
|---|---|
| Pesquisa nova | Já vem com perguntas sugeridas (seção 3) |
| Mudar perguntas depois de ter respostas | Pode mudar texto, ordem e obrigatoriedade; **não pode excluir**: "Tirar da pesquisa" arquiva (some para o cliente, respostas antigas continuam) |
| Quantas pesquisas | Várias por empresa; cada uma pausável (`ativa`) |
| Forma de editar | Cada mudança salva na hora (Server Action por ação), sem "Salvar" geral |
| Reordenar | Botões subir/descer (teclado, leitor de tela, celular com uma mão); sem arrastar e sem biblioteca nova |
| Tipo da pergunta | Não muda depois de criado (estragaria respostas antigas) |
| Limites | Máx. 10 perguntas não arquivadas; máx. 1 "Quem te atendeu?" não arquivada por pesquisa |
| Prévia "Ver como o cliente vê" | Fica para a Etapa 5, junto com a página pública |
| Design | Toda tela passa por todas as skills de design aplicáveis antes do commit (pedido do Caio) |

## 2. Banco de dados

Migração `supabase/migrations/20261006000000_pesquisas.sql`.

**`pesquisas`**: `id uuid pk`, `empresa_id uuid not null → empresas(id) on delete cascade`, `titulo text not null` (sem espaços nas pontas, 1–80), `ativa boolean not null default true`, `created_at timestamptz not null default now()`. Índice em `empresa_id`.

**`perguntas`**: `id uuid pk`, `pesquisa_id uuid not null → pesquisas(id) on delete cascade`, `texto text not null` (sem espaços nas pontas, 1–120), `tipo text not null check (tipo in ('nota','texto','funcionario'))`, `ordem int not null`, `obrigatoria boolean not null default false`, `arquivada boolean not null default false`, `created_at`. Índice em `(pesquisa_id, ordem)`.

Regras no banco (valem mesmo para chamadas diretas à API):
- Índice único parcial: uma `funcionario` não arquivada por pesquisa.
- Trigger `before insert or update of arquivada`: recusa a 11ª pergunta não arquivada (erro com código próprio, traduzido na interface).
- `ordem`: o servidor grava `max(ordem)+1` ao adicionar; subir/descer troca a `ordem` com a vizinha numa função `trocar_ordem_perguntas(a uuid, b uuid)` (`security invoker`, as duas da mesma pesquisa), para a troca ser atômica.

RLS (mesmo padrão da Etapa 3):
- `pesquisas`: dono da empresa lê, cria, edita e exclui (`exists` em `empresas` com `owner_id = auth.uid()`).
- `perguntas`: o mesmo, passando por `pesquisas → empresas`.
- Permissões por coluna: `insert (empresa_id, titulo)` / `update (titulo, ativa)` em pesquisas; `insert (pesquisa_id, texto, tipo, ordem, obrigatoria)` / `update (texto, ordem, obrigatoria, arquivada)` em perguntas. Ninguém troca `empresa_id`, `pesquisa_id` nem `tipo`.
- `delete` de perguntas: **não concedido** (só arquivar). `delete` de pesquisas: concedido (na Etapa 5, bloqueado quando houver respostas).
- `anon`: nada nesta etapa.

## 3. Pesquisa nova

Ação `criarPesquisa` (empresa atual vem do servidor):
1. Insere a pesquisa com título "Pesquisa de satisfação".
2. Insere as sugeridas, em ordem:
   1. "Que nota você dá para o nosso atendimento?" — `nota`, obrigatória
   2. "Quem te atendeu?" — `funcionario`, opcional — **só se** a empresa tiver funcionário ativo
   3. "Quer contar mais alguma coisa?" — `texto`, opcional
3. Redireciona para o editor.

As sugeridas ficam em `src/lib/pesquisas/sugeridas.ts` (função pura `perguntasSugeridas(temFuncionarios)`, testada).

## 4. Telas

Seguem PRODUCT.md (fundo menta, cartões brancos, ameixa nos botões principais, sem emojis, ícones próprios em `src/components/icones/`, ícones genéricos do lucide).

**Menu**: terceiro link "Pesquisas" no trilho segmentado.

**`/painel/pesquisas` (lista)**
- Cada pesquisa: título, nº de perguntas, estado com palavra + cor: "Recebendo respostas" (menta) / "Pausada" (manga). Clicar abre o editor.
- Botão "Criar pesquisa".
- Vazio: ícone próprio, "Sua primeira pesquisa fica pronta em 1 minuto." e o botão.

**`/painel/pesquisas/[id]` (editor)**
- Título editável no lugar (Enter salva, Esc cancela); botão Pausar/Retomar; menu ⋯ do topo com "Excluir pesquisa" (confirmação).
- Perguntas em ordem: ícone + palavra do tipo (Nota 1 a 10 / Texto livre / Quem te atendeu), texto, selo "Obrigatória"; setas subir/descer (desabilitadas nas pontas); menu ⋯: Editar texto, Tornar obrigatória/opcional, Tirar da pesquisa.
- "Adicionar pergunta": escolhe o tipo, escreve o texto. "Quem te atendeu?" some da escolha se já houver uma; com 10 perguntas o botão fica desabilitado com "Pesquisas curtas recebem mais respostas. O limite é 10 perguntas."
- "Tiradas da pesquisa": seção recolhida (`<details>`) com "Devolver" em cada uma (respeita os limites).
- Avisos: pergunta de funcionário sem funcionário ativo → "Cadastre a equipe para essa pergunta aparecer." (link); nenhuma pergunta de nota → "Sem uma pergunta de nota, o painel não terá médias."
- `[id]` inválido ou de outra empresa → `notFound()` (página 404 já existente).

Acessibilidade (aprendizados da Etapa 3): foco nunca se perde (volta ao gatilho após editar; após subir/descer, o foco acompanha a pergunta), erros com `role="alert"`, sucesso anunciado em `role="status"`, alvos ≥ 44px, nada só por cor.

## 5. Código

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/pesquisas/esquemas.ts` (+ teste) | zod: título, texto da pergunta, tipo, ids; `mensagemErroPesquisa(codigo)` |
| `src/lib/pesquisas/sugeridas.ts` (+ teste) | Perguntas sugeridas |
| `src/lib/pesquisas/tipos.ts` | Rótulo e ícone de cada tipo |
| `supabase/migrations/20261006000000_pesquisas.sql` | Tabelas, regras, RLS, função de troca |
| `supabase/tests/rls_pesquisas.sql` | Prova de segurança e das regras |
| `src/app/painel/pesquisas/actions.ts` | Server Actions |
| `src/app/painel/pesquisas/page.tsx` | Lista |
| `src/app/painel/pesquisas/[id]/page.tsx` + componentes cliente | Editor |
| `src/components/icones/icone-*.tsx` | Ícones próprios (lista vazia, tipos de pergunta) |
| `src/app/painel/nav-painel.tsx` | Link "Pesquisas" |
| `src/app/painel/page.tsx` | Passo 2 dos "Primeiros passos" deixa de ser "Em breve" |

Toda action: valida com zod, pega a empresa atual com `obterContextoEmpresa()`, confere que a pesquisa é dela (o RLS garante de novo), traduz erros do banco, chama `revalidatePath`.

## 6. Testes

- Vitest: esquemas, sugeridas, tradução de erros.
- `rls_pesquisas.sql`: isolamento entre empresas; visitante sem acesso; não mover pesquisa/pergunta; não trocar tipo; não excluir pergunta; limite de 10; uma só `funcionario`; troca de ordem só dentro da mesma pesquisa.
- Chrome (computador e celular, 639px): criar, renomear, pausar, adicionar cada tipo, limite, subir/descer, obrigatória, tirar e devolver, excluir pesquisa, teclado.
- Advisors do Supabase sem nada novo.

## 7. Fora do escopo

Página pública, `slug`, QR code e prévia (Etapa 5); bloqueio de exclusão com respostas (Etapa 5); modelos de pesquisa por ramo; arrastar para reordenar; duplicar pesquisa.

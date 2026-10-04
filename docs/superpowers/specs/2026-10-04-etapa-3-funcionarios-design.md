# Etapa 3 — Cadastro de funcionários

**Data:** 2026-10-04
**Status:** desenho **aprovado** pelo Caio.
**Próximo passo:** plano em `docs/superpowers/plans/2026-10-04-etapa-3-funcionarios.md` → implementar.

Os funcionários aparecem na pesquisa como a pergunta "Quem te atendeu?" (Etapa 5) e no ranking do painel (Etapa 6). Esta etapa só cria o cadastro.

---

## 1. Decisões (aprovadas)

| Tema | Decisão |
|---|---|
| Dados | **Só o nome** (foto e função podem vir depois sem refazer nada) |
| Saída de funcionário | **Desativar** (some da pesquisa, mantém histórico, pode reativar) **e Excluir** (apaga de vez, sempre disponível, com confirmação) |
| Nomes repetidos | Proibido **na mesma empresa**, sem diferenciar maiúsculas ("ana" = "Ana"); empresas diferentes podem repetir |
| Bibliotecas | Nenhuma nova (componentes `dropdown-menu` e `alert-dialog` do shadcn usam o `radix-ui` já instalado) |

## 2. Banco de dados

**Tabela `public.funcionarios`**

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `empresa_id` | uuid | FK `empresas(id)` `on delete cascade`, obrigatório |
| `nome` | text | obrigatório, 1–60 caracteres, sem espaços nas pontas (check) |
| `ativo` | boolean | `default true` |
| `created_at` | timestamptz | `default now()` |

- Índice único `(empresa_id, lower(nome))` → nome repetido na mesma empresa dá erro `23505`, traduzido para: *"Já existe um funcionário com esse nome. Diferencie, por exemplo: Ana Paula ou Ana C."*
- Índice em `empresa_id` (consultas e RLS).

**RLS e permissões**
- RLS ligado. Policies para `authenticated`, todas com a regra "a empresa é do usuário logado":
  `exists (select 1 from public.empresas e where e.id = empresa_id and e.owner_id = (select auth.uid()))`
  - `select`, `insert` (with check), `update` (using + with check), `delete`.
- Permissões por coluna: `insert (empresa_id, nome)`, `update (nome, ativo)` → ninguém troca o funcionário de empresa nem mexe em `id`/`created_at`.
- `anon`: nenhum acesso nesta etapa. Na Etapa 5 o público poderá ler **só `id` e `nome` de funcionários ativos** de pesquisas ativas.
- Teste de segurança `supabase/tests/rls_funcionarios.sql` (mesmo estilo da Etapa 2): dono vê/cria/renomeia/desativa/exclui os próprios; não vê, não cria, não altera e não exclui os de outra empresa; não move funcionário de empresa; anon não lê; nome repetido (maiúsculas diferentes) é recusado.

**Nota para a Etapa 5:** a FK `respostas_itens.funcionario_id` deve usar `on delete set null` — ao excluir um funcionário, as respostas continuam valendo para as outras perguntas e o ranking deixa de mostrar a pessoa.

## 3. Telas

**Menu do painel:** links **Início** e **Funcionários** no cabeçalho (no celular, em linha abaixo do logo), além de **Sair**. Link ativo destacado.

**`/painel/funcionarios`**
- Título "Funcionários" + subtítulo *Quem aparece na pergunta "Quem te atendeu?"*
- Formulário de adicionar no topo: campo "Nome do funcionário" + botão **Adicionar**. Enter adiciona; após sucesso o campo limpa e continua focado (cadastro em sequência).
- **Ativos (N)**: cada linha com o nome e um menu **⋯** com **Renomear**, **Desativar**, **Excluir**.
- **Inativos (N)**: abaixo, visual apagado, botão **Reativar** visível + menu ⋯ (Renomear, Excluir).
- **Renomear**: a linha vira um campo editável com **Salvar** / **Cancelar** (Esc cancela).
- **Excluir**: janela de confirmação — *"Excluir {nome}? Isso não pode ser desfeito. Se essa pessoa só saiu da empresa, prefira Desativar: o histórico de avaliações continua guardado."* Botões **Cancelar** e **Excluir**.
- **Lista vazia**: ícone próprio `IconeEquipe` + *"Nenhum funcionário ainda. Adicione quem atende seus clientes. Se você atende sozinho, pode pular esta parte."*
- Erros e confirmações anunciados para leitores de tela (`aria-live`).

**Painel inicial:** o cartão "Tudo pronto por aqui" ganha o atalho **"Cadastrar funcionários →"**.

## 4. Código

- Validação: `esquemaNomeFuncionario` (zod) em `src/lib/funcionarios/esquemas.ts` — trim, 1–60 caracteres; ids validados como uuid.
- Server Actions em `src/app/painel/funcionarios/actions.ts`: `adicionarFuncionario`, `renomearFuncionario`, `alterarAtivo`, `excluirFuncionario`. Todas usam o cliente do servidor (RLS faz o isolamento) e chamam `revalidatePath`.
- A empresa do usuário é buscada no servidor (`empresas` filtrada pelo RLS), nunca enviada pelo formulário.

## 5. Testes

1. **Vitest:** `esquemaNomeFuncionario` (vazio, só espaços, 60 vs 61 caracteres, trim) e a tradução do erro de nome repetido.
2. **Banco:** `rls_funcionarios.sql` + advisors do Supabase sem alertas novos.
3. **Navegador** (o Caio entra na conta na janela do Chrome controlada): adicionar vários em sequência, nome repetido, renomear, desativar, reativar, excluir com confirmação, lista vazia; celular e computador.
- **Pronto quando:** `lint`, `build`, `npm test`, teste do banco e advisors passando → commits, PR, README atualizado.

## 6. Fora do escopo

Foto e função do funcionário · ordenar a lista manualmente · funcionário com login próprio · importar lista.

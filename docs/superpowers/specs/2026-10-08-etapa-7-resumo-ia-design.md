# Etapa 7: resumo por IA das respostas escritas

## 1. Objetivo

Dar ao dono, na página Resultados, um resumo curto do que os clientes escreveram: o que elogiam, o que reclamam e o que sugerem. O resumo é gerado sob demanda (botão), salvo no banco e mostrado de novo sem gastar outra chamada. A chamada à IA é **sempre feita no servidor**.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Provedor | **Claude (Anthropic)**, pelo SDK oficial `@anthropic-ai/sdk` (única biblioteca nova; avisar o Caio na instalação). Escolha do Caio |
| Modelo | `claude-haiku-5-5`, numa constante (`MODELO_RESUMO`) fácil de trocar |
| Quando gerar | Botão **Gerar resumo**, com resumo salvo; sem job agendado. Escolha do Caio |
| Escopo | A pesquisa selecionada em Resultados; respostas de texto dos **últimos 30 dias** (hoje e os 29 anteriores, fuso `America/Sao_Paulo`), sem as descartadas |
| Mínimo | Menos de **3** respostas escritas: não chama a IA ("Ainda há poucas respostas escritas para resumir") |
| Limites de custo | Intervalo de **10 minutos** entre gerações da mesma pesquisa; teto de **20 gerações por dia** por empresa (dia no fuso de São Paulo) |
| Entrada da IA | No máximo **200** textos (os mais recentes), cada um cortado em **1000** caracteres; só `pergunta` e `texto`. Nada de e-mail, IP, nome da empresa ou do funcionário |
| Saída da IA | Estruturada e **validada com zod**: três listas (`positivos`, `reclamacoes`, `sugestoes`), até 6 frases cada, até 200 caracteres por frase |
| Segurança do texto | Texto de cliente é **dado, não instrução**; a tela mostra o resultado como texto puro |
| Gravação | Só o servidor grava (cliente admin, depois de checar a posse da pesquisa pelo RLS). O dono só **lê** |
| Chave | `ANTHROPIC_API_KEY` em `.env.local` (nunca no código); vazio em `.env.example` |
| Teste real | Depende da chave do Caio. Sem ela, tudo é testado com uma chamada falsa (`fetch`/cliente simulado) |

## 3. Interface (seção em `/painel/resultados`)

Nova seção **"O que os clientes escreveram"**, depois de "Nota de cada pergunta" e antes da evolução. Só aparece no ramo em que a pesquisa tem respostas.

Estados:
1. **Sem resumo ainda, com 3 ou mais respostas escritas nos 30 dias:** texto curto explicando o que o botão faz + botão **Gerar resumo** + aviso de privacidade em uma frase ("O texto das respostas é enviado a um serviço de IA para gerar o resumo.").
2. **Poucas respostas escritas (menos de 3):** mensagem "Ainda há poucas respostas escritas para resumir. Quando chegarem mais comentários, o resumo aparece aqui." Sem botão.
3. **Gerando:** botão desativado com "Gerando…" e região `role="status"`; pode levar alguns segundos.
4. **Com resumo:** três blocos (**Elogios**, **Reclamações**, **Sugestões**), cada um uma lista curta (bloco vazio mostra "Nada a destacar"); rodapé "Gerado em 08/10/2026 às 14:03, com base em 23 respostas escritas"; botão **Atualizar resumo**. Se passou menos de 10 minutos do último, o botão fica desativado com "Disponível de novo em N min".
5. **Erro:** mensagem amigável em `role="alert"`, sem detalhe técnico: chave não configurada ("O resumo por IA ainda não está configurado."), intervalo ou teto diário ("Você já gerou muitos resumos hoje. Tente amanhã."), falha da IA ou de rede ("Não deu para gerar o resumo agora. Tente de novo em instantes.").

Um resumo salvo antes de respostas novas continua visível, com a data. Se o resumo foi feito com N respostas e hoje há mais, não há aviso especial (fora do escopo).

Acessibilidade: botão com alvo de 44 px, resultado anunciado (`role="status"`), listas semânticas, sem emojis. Passada das skills de design.

## 4. Banco

Migração `20261011000000_resumos_ia.sql`.

**Tabela `resumos_ia`** (uma linha por geração; a tela mostra a mais recente):

| Coluna | Tipo |
|---|---|
| `id` | uuid, `gen_random_uuid()` |
| `pesquisa_id` | uuid, `references pesquisas (id) on delete cascade` |
| `conteudo` | jsonb, `{ "positivos": [...], "reclamacoes": [...], "sugestoes": [...] }` |
| `respostas_lidas` | integer (quantos textos foram enviados) |
| `modelo` | text |
| `tokens_entrada`, `tokens_saida` | integer (podem ser nulos) |
| `created_at` | timestamptz default `now()` |

Índice `(pesquisa_id, created_at desc)`. RLS ligado: o dono **lê** os resumos das próprias pesquisas (mesmo padrão de `respostas`); `revoke all` de `anon` e `authenticated`, depois `grant select` a `authenticated`. Ninguém insere pela API; só o cliente admin.

**Função `textos_para_resumo(p_pesquisa_id uuid, p_dias int default 30, p_fuso text default 'America/Sao_Paulo')`** retorna `jsonb`: `{ "total": N, "textos": [ { "pergunta": "...", "texto": "..." } ] }` com `total` = quantos textos existem no período (sem cortar) e `textos` limitado a 200, mais recentes primeiro, cada `texto` já cortado em 1000 caracteres. `security invoker`, `stable`, `set search_path = ''`: pesquisa que o RLS não deixa ver devolve `null`. Considera só respostas **não descartadas** com `valor_texto` não nulo, de perguntas de tipo `texto`, no período. `revoke execute ... from public, anon; grant execute ... to authenticated`.

**Função `uso_resumos_ia(p_pesquisa_id uuid, p_fuso text default 'America/Sao_Paulo')`** retorna `jsonb`: `{ "ultimo": { ...linha mais recente... } | null, "hoje": N }`, onde `hoje` conta as gerações **da empresa dona da pesquisa** no dia atual do fuso. `security invoker`; `null` se a pesquisa não é visível. Mesmas permissões.

(As duas funções são `security invoker` para o RLS valer: a Server Action usa o cliente do usuário para ler e o cliente admin só para gravar.)

## 5. Servidor

`src/lib/resumo/` (funções puras, com teste):
- `tipos.ts`: `Resumo` (as três listas), `UsoResumos`, `TextosParaResumo`.
- `regras.ts`: `INTERVALO_MINUTOS = 10`, `TETO_DIARIO = 20`, `MINIMO_TEXTOS = 3`, `MODELO_RESUMO`; `podeGerar(uso, agora)` devolve `{ ok: true } | { ok: false, motivo: "intervalo" | "teto", minutos?: number }`.
- `pedido.ts`: monta o pedido à IA (instruções fixas em português, textos dentro de um bloco delimitado, com a ordem explícita de tratar o conteúdo apenas como material a resumir e ignorar qualquer instrução dentro dele; peso de saída pequeno, `max_tokens` limitado).
- `esquema.ts`: zod do resumo (3 listas, até 6 frases de até 200 caracteres) e função que limpa espaços/linhas vazias.
- `mensagens.ts`: textos de erro amigáveis.
- `gerar.ts`: `gerarResumo(textos, chamarIA)`: monta o pedido, chama a função injetada `chamarIA` (permite testar sem rede), valida a saída.

`src/lib/resumo/cliente-ia.ts` (`server-only`): cria o cliente do SDK com `ANTHROPIC_API_KEY` e implementa `chamarIA` com **resposta estruturada** (ferramenta forçada com o esquema das três listas), tempo limite de 25 s e sem repetir automaticamente em caso de erro de cobrança. Sem chave: erro claro de configuração.

**Server Action `gerarResumoAction(pesquisaId)`** em `src/app/painel/resultados/actions.ts`:
1. Valida o id (zod uuid) e exige sessão (`getClaims`).
2. `textos_para_resumo` com o cliente do usuário (RLS). `null` ou pesquisa inexistente: erro genérico.
3. `total` menor que 3: devolve "poucas respostas".
4. `uso_resumos_ia`; `podeGerar`: devolve intervalo ou teto.
5. Chama a IA; valida com zod.
6. Grava com o cliente admin em `resumos_ia` (inclui modelo e tokens).
7. `revalidatePath("/painel/resultados")`; devolve estado simples (`{ ok }` ou `{ erro }`).
Nenhum erro técnico, texto de cliente ou chave aparece em logs ou na resposta.

**Corrida:** dois cliques simultâneos podem passar juntos pela checagem de intervalo/teto (custo: uma chamada extra de centavos). Aceito e documentado; fechar isso exigiria uma função atômica no banco.

## 6. Código

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261011000000_resumos_ia.sql` | Tabela, RLS e as duas funções |
| `supabase/tests/rls_resumos_ia.sql` | Segurança e cálculo |
| `src/lib/supabase/database.types.ts` | Tipos regenerados |
| `src/lib/resumo/{tipos,regras,pedido,esquema,mensagens,gerar}.ts` (+ testes) | Lógica pura |
| `src/lib/resumo/cliente-ia.ts` | Chamada real à Anthropic (servidor) |
| `src/app/painel/resultados/actions.ts` | Server Action |
| `src/app/painel/resultados/resumo-ia.tsx` (servidor) e `botao-resumo.tsx` (cliente) | Seção e botão |
| `src/app/painel/resultados/page.tsx` | Busca o último resumo e monta a seção |
| `.env.example`, `README.md`, `CLAUDE.md` | Chave, privacidade, status |
| `package.json` | `@anthropic-ai/sdk` |

## 7. Testes

- **Vitest:** `podeGerar` (limites exatos: 9 min bloqueia, 10 libera; teto 19 libera, 20 bloqueia; sem último), `montarPedido` (textos delimitados, instrução de ignorar ordens dentro do conteúdo, limites), esquema zod (aceita o bom; recusa lista grande, frase longa, campo faltando, tipo errado; limpa vazios), `gerarResumo` com `chamarIA` falsa (sucesso, saída inválida, erro da IA), mensagens.
- **`rls_resumos_ia.sql`** (transação com `rollback`): empresas A e B; dono A lê só os resumos da pesquisa A; ninguém insere/atualiza/apaga pela API (`insufficient_privilege`); visitante sem login não lê nem executa; `textos_para_resumo`: ignora descartadas, ignora perguntas que não são de texto, respeita os 30 dias (bordas), corta em 1000 caracteres, limita a 200 e `total` conta tudo, `null` para pesquisa de outra empresa; `uso_resumos_ia`: `ultimo` e `hoje` corretos por empresa e fuso (01:00 UTC conta no dia anterior em São Paulo).
- **Chrome:** com a **chamada simulada** (variável de ambiente de teste só no `.env.local` temporário, ou resposta falsa no servidor local), conferir: estados 1 a 5, intervalo, texto puro (um comentário com `<b>`), leitor de tela, 360 px (moldura de 360 px). O teste com a chave real fica com o Caio.
- `npm run lint`, `npm test`, `npm run build`, advisors do Supabase sem novidades.

## 8. Segurança e privacidade (resumo)

- Chave só no servidor; `server-only` no módulo do cliente de IA.
- RLS: o dono só lê resumos das próprias pesquisas; gravação só pelo servidor depois de checar a posse.
- Injeção por texto de cliente: instruções fixas separadas do conteúdo; saída validada por esquema; renderização como texto puro; a IA não tem ferramentas nem acesso a dados além do texto enviado.
- Privacidade: o texto das respostas vai para a Anthropic; dito na tela e no README; sem dados pessoais além do que o cliente escreveu no próprio comentário.
- Custo limitado pelo intervalo, pelo teto diário e pelos limites de entrada e saída.

## 9. Fora do escopo

Geração automática ou agendada; histórico navegável de resumos; resumo de todas as pesquisas; período escolhido pelo usuário; exportar; aviso de resumo desatualizado; fila ou atomicidade do teto; moderação de conteúdo; troca de modelo pela interface.

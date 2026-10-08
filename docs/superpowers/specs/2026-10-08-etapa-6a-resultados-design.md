# Etapa 6A: página Resultados (totais, médias, evolução e ranking da equipe)

## 1. Objetivo

Dar ao dono, em uma página, a resposta de "como estamos indo?": quantas respostas chegaram, que nota cada pergunta está tirando, como a nota evolui e quem da equipe atende melhor. A página nova é **Resultados** (`/painel/resultados`) e mostra **uma pesquisa por vez**.

A 6B (depois) cuida da lista de respostas, do selo de suspeita (rajada de notas ruins) e do botão descartar. Os números da 6A já **ignoram respostas descartadas** (`descartada = true`, coluna criada na 5B), então a 6B encaixa sem refazer nada.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Divisão | 6A números e gráficos; 6B respostas, suspeitas e descarte (escolha do Caio) |
| Escopo | Uma pesquisa por vez, com seletor (escolha do Caio) |
| Onde calcular | Função no banco `resultados_pesquisa` (soma e média no Postgres); o servidor só formata |
| Segurança da função | `security invoker`: roda com as regras de RLS de quem chama. Pesquisa de outra empresa devolve `null` |
| Fuso do "hoje" | `America/Sao_Paulo` (constante no app) |
| Biblioteca nova | **Recharts** (já prevista no `CLAUDE.md`), só no componente do gráfico |
| Menu | Novo item **Resultados** entre "Início" e "Funcionários"; a página inicial continua com os primeiros passos |
| Período | Fixo: Hoje, Últimos 7 dias, Últimos 30 dias (sem filtro livre) |

## 3. Página `/painel/resultados`

Da esquerda para a direita e de cima para baixo (uma coluna no celular):

1. **Seletor de pesquisa**, controlado por `?pesquisa=<id>` na URL. Padrão: a pesquisa mais recente **que já tem respostas**; se nenhuma tem, a mais recente. Com uma só pesquisa o seletor não aparece. Se o id da URL não for de uma pesquisa da empresa atual, usa o padrão.
2. **Totais**: três cartões, **Hoje**, **Últimos 7 dias** e **Últimos 30 dias**, com a quantidade de respostas (envios). "Últimos N dias" conta o dia de hoje mais os N-1 anteriores, no fuso de São Paulo.
3. **Média por pergunta de nota**: um cartão por pergunta de nota **não arquivada**, com a média (uma casa decimal, vírgula), a faixa (boa, atenção, ruim) em cor **e em palavra** e o número de respostas.
4. **Evolução**: gráfico de linha da nota média por dia nos últimos 30 dias (todas as perguntas de nota juntas). Dias sem resposta ficam sem ponto (a linha não inventa valor).
5. **Ranking da equipe**: funcionários por nota média (maior primeiro; empate pelo maior número de avaliações), com o número de avaliações. Quem tem **menos de 3 avaliações** recebe a etiqueta "poucas avaliações" e fica **depois** de quem tem 3 ou mais. Aparece só se a pesquisa tem pergunta de funcionário e há avaliações. Funcionário inativo com avaliações continua aparecendo, com a etiqueta "inativo".
6. **Sem respostas ainda**: no lugar das seções 2 a 5, uma tela vazia que explica como receber a primeira resposta, com atalho para o link e o QR da pesquisa (`/painel/pesquisas/<id>`).

**Como a nota da equipe é calculada:** a nota de um funcionário é a média de **todas as notas dadas nos envios em que o cliente o escolheu** em "Quem te atendeu?". Envio sem nota não conta.

## 4. Banco: `resultados_pesquisa`

Migração `20261009000000_resultados_pesquisa.sql`:

```
resultados_pesquisa(p_pesquisa_id uuid, p_fuso text default 'America/Sao_Paulo') returns jsonb
```

- `language sql` ou `plpgsql`, `stable`, **`security invoker`**, `set search_path = ''`.
- Se a pesquisa não é visível para quem chama (RLS), devolve `null`.
- Considera só respostas com `not descartada`.
- O dia de cada resposta é `(created_at at time zone p_fuso)::date`; "hoje" é a data atual nesse fuso.
- Formato do retorno:

```json
{
  "totais": { "hoje": 3, "sete_dias": 21, "trinta_dias": 80, "geral": 120 },
  "perguntas": [ { "id": "uuid", "texto": "…", "ordem": 1, "media": 8.4, "respostas": 80 } ],
  "evolucao": [ { "dia": "2026-10-08", "media": 8.1, "respostas": 5 } ],
  "equipe": [ { "id": "uuid", "nome": "Ana", "ativo": true, "media": 9.1, "avaliacoes": 12 } ]
}
```

- `perguntas`: só tipo `nota` e `arquivada = false`, por `ordem`; pergunta sem respostas aparece com `media: null` e `respostas: 0`.
- `evolucao`: só dias com resposta, do mais antigo para o mais novo, últimos 30 dias; `media` é a média de todas as notas do dia.
- `equipe`: ordenada como na seção 3 (a etiqueta "poucas avaliações" é regra de apresentação, calculada no TypeScript, não no banco).
- Médias com 1 casa decimal (`round(..., 1)`).
- Permissão: `revoke execute from public, anon`; `grant execute to authenticated`. O visitante sem login não chama.

## 5. Código

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261009000000_resultados_pesquisa.sql` | Função |
| `supabase/tests/rls_resultados.sql` | Prova de segurança e de cálculo |
| `src/lib/resultados/tipos.ts` | Tipo `Resultados` (o que a função devolve) |
| `src/lib/resultados/apresentacao.ts` (+ teste) | Funções puras: `formatarMedia` ("8,4"), `rotuloFaixa`, `ordenarEquipe` (3+ avaliações primeiro), `poucasAvaliacoes`, `rotuloDia` ("08/10"), `escolherPesquisaPadrao` |
| `src/app/painel/resultados/page.tsx` | Página (servidor): lê empresa atual, pesquisas, chama a função |
| `src/app/painel/resultados/seletor-pesquisa.tsx` | Seletor (cliente), troca `?pesquisa=` |
| `src/app/painel/resultados/cartoes-totais.tsx`, `cartoes-perguntas.tsx`, `ranking-equipe.tsx`, `vazio.tsx` | Peças da página (servidor) |
| `src/app/painel/resultados/grafico-evolucao.tsx` | Gráfico (cliente, Recharts) + tabela escondida para leitor de tela |
| `src/app/painel/nav-painel.tsx` | Novo link Resultados (ícone do lucide-react) |
| `src/lib/supabase/database.types.ts` | Regenerado |
| `README.md`, `CLAUDE.md`, `.env.example` (nada novo) | Status e documentação |

`npm install recharts` (e conferir `git diff package.json`: só ele). Avisar o Caio e explicar por quê na hora da instalação. A versão deve ser compatível com React 19.

## 6. Interface e acessibilidade

- Segue o `PRODUCT.md` e o `DESIGN.md` (se existir) e a identidade já usada no painel: cartões brancos arredondados, sombra leve, fonte Bricolage Grotesque, cores da marca. **Sem emojis**; ícones próprios em `src/components/icones/` quando precisar de um (ex.: ilustração do estado vazio); ícones genéricos do `lucide-react`.
- Notas sempre com **número e palavra** (boa = menta, atenção = manga, ruim = coral), nunca só cor.
- Mobile-first: o dono olha no celular no balcão. Cartões em coluna, gráfico com altura fixa e largura 100%, ranking em lista (sem tabela larga).
- Gráfico: `role="img"` com `aria-label` resumindo ("Nota média por dia nos últimos 30 dias, de X a Y"), cores com contraste, e uma `<table class="sr-only">` com data, média e quantidade. Sem animação que dependa de movimento forte; respeita `prefers-reduced-motion`.
- Estados: carregando (esqueleto simples), vazio, erro (mensagem amigável em português se a função falhar; nada técnico na tela).
- Passada das skills de design (`impeccable`, `frontend-design`, `emil-design-eng`, `mobile-native`, `animate`, `design:ux-copy`, `design:accessibility-review`).

## 7. Testes

- **Vitest** (`apresentacao.test.ts`): `formatarMedia` (vírgula, uma casa, `null` vira traço), faixas por nota, ordem da equipe (3+ avaliações antes; empate pelo número de avaliações; menos de 3 por último), `poucasAvaliacoes` (2 sim, 3 não), `rotuloDia`, `escolherPesquisaPadrao` (com respostas, sem respostas, id inválido).
- **`rls_resultados.sql`** (começa e termina em transação com `rollback`): duas empresas (A e B) com pesquisas e respostas conhecidas. Conferir: totais de hoje, 7 e 30 dias e geral com respostas em datas diferentes; resposta descartada **não** entra; média por pergunta e por dia; ranking com empate e funcionário inativo; pergunta arquivada fora; pergunta sem respostas com `media null`; dono A não vê a pesquisa de B (`null`); visitante sem login não executa (`insufficient_privilege`); fuso (resposta às 01:00 UTC conta no dia anterior em São Paulo).
- **Chrome:** página com dados (cartões, gráfico, ranking), com uma pesquisa só (sem seletor), com várias (troca por `?pesquisa=`), sem respostas (tela vazia) e no celular (639 px). Teclado e leitor de tela no seletor e na tabela do gráfico.
- `npm run lint`, `npm test`, `npm run build`, advisors do Supabase sem novidades.

## 8. Fora do escopo

Lista de respostas, selo de suspeita e botão descartar (6B); resumo com IA (Etapa 7); filtro de período livre; exportar; comparar pesquisas; visão agregada da empresa; média por unidade ou turno.

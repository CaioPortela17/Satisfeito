# Dashboard completo e relatório para a equipe (Etapas 6C e 7B)

Data: 2026-10-15. Pedido do Caio: o resumo por IA passa a ser um relatório que o dono copia e manda para a equipe, cobrindo todos os dados (não só os textos), e a tela de Resultados vira um dashboard completo.

## Decisões já tomadas (com o Caio)

| Tema | Decisão |
|---|---|
| Destino do relatório | WhatsApp: texto simples com `*negrito*` e listas curtas, botão "Copiar para WhatsApp". Sem emojis (regra do projeto). |
| Período | O dono escolhe 7, 30 ou 90 dias. Padrão: 30 dias. Tudo é comparado com o período anterior de mesmo tamanho. |
| Equipe no relatório | O dono escolhe antes de gerar: "Citar nomes e notas" (desligado por padrão) ou só a equipe como um todo. Sem a opção ligada, nenhum nome de funcionário vai para a IA. |
| Blocos novos | Comparação com o período anterior; distribuição das notas e NPS; dia da semana e horário; melhor e pior da semana. |
| Conteúdo da IA | Descreve e sugere 2 ou 3 ações. Só usa fatos dos dados. |
| Como montar | Números calculados pelo banco; a IA só escreve a prosa; o servidor junta os dois no texto final (opção A). |

## Ordem de trabalho

Duas partes, cada uma com plano, código e teste próprios:

1. **Parte 1 (6C): dashboard.** Função `painel_pesquisa` + tela nova. A Parte 2 usa os mesmos números.
2. **Parte 2 (7B): relatório.** IA nova + montagem do texto + botão Copiar.

## Parte 1: dashboard

### Função `painel_pesquisa(p_pesquisa_id, p_dias, p_fuso)`

`security invoker` (o RLS vale), `stable`, devolve `null` se a pesquisa não é visível. `p_dias` só aceita 7, 30 ou 90 (outro valor: erro 22023). Respostas descartadas ficam fora de tudo. "Período" = hoje e os `p_dias - 1` dias anteriores, no fuso de São Paulo (mesma convenção de `resultados_pesquisa`). "Período anterior" = os `p_dias` dias imediatamente antes.

Conceitos (definidos aqui para o banco, a tela e o relatório usarem o mesmo):

- **Nota do envio** = média das notas dadas naquele envio, arredondada para o inteiro mais próximo (0,5 sobe). Envio sem nota não entra em distribuição nem NPS.
- **NPS** (por nota do envio): 9 e 10 = promotor, 7 e 8 = neutro, 1 a 6 = detrator. NPS = % promotores menos % detratores, inteiro de -100 a 100. Só é mostrado com **10 envios com nota ou mais**; com menos, devolve `null` ("poucos dados").
- **Distribuição**: quantos envios por faixa de nota do envio: 1 a 3, 4 a 6, 7 a 8, 9 a 10.
- **Turnos** (horário local): madrugada 0h–5h59, manhã 6h–11h59, tarde 12h–17h59, noite 18h–23h59.
- **Dia da semana**: segunda a domingo.
- **Média geral** = média de todas as notas do período (igual à evolução atual).

Formato do retorno (campos principais; o plano detalha os tipos):

```
periodo   { dias, inicio, fim }
atual     { envios, media_geral, nps { valor|null, promotores, neutros, detratores, n },
            distribuicao [ {faixa, envios} ] }
anterior  { envios, media_geral, nps { valor|null, n } }
perguntas [ { id, texto, ordem, media|null, respostas, media_anterior|null } ]
evolucao  [ { dia, media, respostas } ]          -- um ponto por dia com nota
dia_semana [ { dia (1..7), media|null, envios } ]
turno      [ { turno, media|null, envios } ]
equipe     [ { id, nome, ativo, media, avaliacoes, media_anterior|null } ]
destaques  { melhor_pergunta, pior_pergunta, dia_mais_fraco, melhor_funcionario }  -- cada um pode ser null
suspeitas  inteiro (mesma regra de hoje)
```

Regras de honestidade com poucos dados (valem na tela e no relatório):

- Comparação com o período anterior: só mostra a variação quando **os dois períodos têm 5 envios ou mais**; senão a tela mostra "poucos dados para comparar".
- Dia da semana e turno: célula com menos de **3 envios** aparece esmaecida e sem destaque ("poucos dados").
- Destaques: melhor/pior pergunta exigem 2 perguntas de nota e 3 respostas em cada; dia mais fraco exige 3 envios nesse dia; melhor funcionário exige 3 avaliações (mesma regra "poucas avaliações" de hoje). O que não atende vira `null` e o cartão some.
- Os nomes de funcionários arquivados/inativos aparecem como hoje (histórico).

`resultados_pesquisa` continua no banco até a tela nova entrar; depois é removida em uma migração de limpeza (dívida registrada).

### Tela `/painel/resultados`

Parâmetros na URL: `?pesquisa=<id>&dias=7|30|90` (valor inválido cai para 30). Do topo para baixo, mobile-first:

1. Cabeçalho, seletor de pesquisa (já existe) e seletor de período (3 botões em grupo, com `aria-pressed`).
2. Aviso de respostas suspeitas (já existe).
3. Cartões de resumo: respostas, nota média e NPS, cada um com a variação em relação ao período anterior (seta e número; cor nunca é o único sinal).
4. Destaques: até 4 cartões curtos (melhor e pior pergunta, dia mais fraco, melhor funcionário).
5. Distribuição das notas: barras horizontais das 4 faixas com número e porcentagem.
6. Evolução ao longo do tempo (gráfico atual, agora no período escolhido, com tabela alternativa para leitor de tela como hoje).
7. Dia da semana e turno: duas fileiras de barras com a nota média e o número de envios.
8. Nota de cada pergunta (cartões atuais, com a variação).
9. Equipe (ranking atual).
10. Relatório para a equipe (Parte 2).

Interface em português, sem emojis. Ícones próprios em `src/components/icones/` quando forem decorativos de marca; setas e afins vêm do `lucide-react`. O visual segue `DESIGN.md` e passa pelas skills de design e acessibilidade do projeto. Cores de gráfico seguem as de hoje (`--chart-*`); legendas e rótulos em texto, para não depender de cor.

## Parte 2: relatório para a equipe

### O que a IA recebe

- Os números do painel do período (agregados, sem texto de cliente): totais, notas, NPS, comparação, dia/turno, destaques.
- Se "Citar nomes e notas" estiver ligado: nome, média e número de avaliações de quem tem 3 avaliações ou mais. Desligado: nenhum nome sai do servidor.
- Os textos dos clientes do período (até 200 itens de até 1000 caracteres, como hoje), tratados como **dado**, nunca como instrução.

### O que a IA devolve

Pela ferramenta `registrar_resumo` (como hoje), com um esquema maior:

```
panorama     texto curto (até 400 caracteres)
elogios      lista (até 6 itens de até 200 caracteres)
reclamacoes  lista (idem)
sugestoes    lista (idem; o que os clientes sugeriram)
acoes        lista de 2 a 3 itens (o que a equipe pode fazer, até 200 caracteres cada)
```

A IA não escreve tabelas nem blocos de números. Quando a prosa cita um número, ele precisa existir nos dados enviados.

### Montagem do texto de WhatsApp

Função pura `montarRelatorioWhatsApp(numeros, resumo, opcoes)` (testada), no servidor e no navegador:

```
*Relatório de satisfação: <pesquisa>*
<período, ex.: últimos 30 dias (15/09 a 14/10)>

*Panorama*
<panorama da IA>
Respostas: 48 (12 a mais que no período anterior)
Nota média: 8,4 (0,3 a mais)
NPS: 52

*Dias e turnos*
Melhor: sábado, noite (9,1). Mais fraco: segunda, tarde (7,2).

*Equipe*                      (só com nomes ligados)
Ana 9,0 (14 avaliações) ...

*O que os clientes elogiaram*
- ...
*O que os clientes reclamaram*
- ...
*O que os clientes sugeriram*
- ...
*Ações para esta semana*
- ...
```

Os números vêm de um **retrato dos números** salvo junto do resumo (`numeros`), assim o texto copiado depois é igual ao que foi gerado. Seções sem conteúdo são omitidas. Meta de tamanho: até cerca de 2000 caracteres.

### Validação dos números da IA

Antes de salvar, o servidor procura números na prosa da IA (panorama, elogios, reclamações, sugestões, ações) e confere se cada um aparece nos dados enviados ou é um número pequeno de contagem de itens. Número desconhecido: trata como resposta inválida (mesmo caminho do erro de formato de hoje, com 1 nova tentativa) e a reserva é liberada.

### Armazenamento

Migração em `resumos_ia`: colunas novas `dias int not null default 30`, `com_nomes boolean not null default false`, `numeros jsonb` (retrato). O `conteudo` ganha `panorama` e `acoes` (opcionais, para os resumos antigos continuarem abrindo). A reserva de vaga, o intervalo de 10 minutos, o teto de 20 por dia por dono e o mínimo de 3 envios com texto **não mudam**.

### Tela

Na seção "Relatório para a equipe": caixa de seleção "Citar nomes e notas da equipe" (desligada), botão "Gerar relatório", a prévia do relatório (texto puro, nunca HTML) e o botão **Copiar para WhatsApp** (usa `navigator.clipboard` com alternativa; avisa "Copiado" em região `aria-live`). O aviso de privacidade passa a dizer que números agregados e textos vão a um serviço de IA, e que nomes só vão se a opção estiver ligada.

## Fora do escopo

PDF e e-mail; envio direto pelo WhatsApp; relatório agendado semanal; comparar pesquisas diferentes; exportar gráficos como imagem; escolha de modelo de IA mais forte (decidir depois do teste com a chave real).

## Testes

- **SQL** (`rls_painel_pesquisa.sql`): dono de outra empresa recebe `null`; descartadas ficam fora; limites de NPS (9, 7, 6) e arredondamento da nota do envio; o corte de 10 envios do NPS; 5 envios para a comparação; fronteiras dos turnos (5h59, 6h00, 17h59, 18h00, 23h59, 0h00) e do fuso; período anterior sem sobreposição; `p_dias` inválido; faixas da distribuição.
- **Unitários**: `montarRelatorioWhatsApp` (com e sem nomes, seções vazias, plural); validação de números da IA; formatação de variações e "poucos dados".
- **Navegador**: seletor de período, mobile (360 px), teclado e leitor de tela, estado vazio e com poucos dados, copiar.
- **Segurança**: nomes só saem para a IA com a opção ligada (teste unitário do montador da entrada); texto de cliente nunca vira instrução nem HTML.

## Pontos em aberto

- Padrão de período: 30 dias (confirmar com o uso real; para reunião semanal talvez 7).
- Modelo de IA: manter `claude-haiku-5-5` até o primeiro teste real; trocar só se a qualidade do relatório não for boa o bastante.

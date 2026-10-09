# Satisfeito — Sistema de pesquisa de satisfação

## Sobre o projeto
SaaS de pesquisa de satisfação para negócios locais (restaurantes, lanchonetes, lojas), inspirado na Falaê.
Primeiro cliente: a lanchonete Bebelu. Depois, o objetivo é vender para outros negócios.
O projeto também é portfólio e estudo, então o desenvolvedor (Caio, estudante de Ciência da Computação) quer **entender** o código, não só recebê-lo pronto.

## Como funciona

### Lado da empresa (com login)
- Cria conta e faz login
- Cadastra funcionários (opcional)
- Cria pesquisas com perguntas de três tipos:
  - `nota`: escala de 1 a 10
  - `texto`: resposta livre
  - `funcionario`: cliente escolhe quem o atendeu ("Quem te atendeu?")
- Gera link e QR code da pesquisa para colocar na mesa, no balcão ou na nota fiscal
- Acompanha os resultados no dashboard

### Lado do cliente (sem login)
- Acessa a pesquisa pelo QR code, responde no celular e envia
- Precisa ser rápido (menos de 30 segundos) e mobile-first

### Dashboard
- Média de cada pergunta de nota e evolução ao longo do tempo
- Ranking dos funcionários por nota média
- Total de respostas no dia, na semana e no mês
- Lista das respostas recentes
- Resumo escrito gerado por IA a partir das respostas de texto (pontos positivos, reclamações, sugestões)

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase: autenticação + banco Postgres, com RLS para que cada empresa só veja os próprios dados
- Recharts para os gráficos
- API de IA (Claude ou OpenAI) para o resumo escrito, chamada sempre do servidor, nunca do navegador

## Banco de dados
- `empresas`: id, nome, owner_id (usuário do Supabase Auth), created_at
- `funcionarios`: id, empresa_id, nome, ativo, created_at
- `pesquisas`: id, empresa_id, titulo, ativa, slug (usado no link público), created_at
- `perguntas`: id, pesquisa_id, texto, tipo (`nota` | `texto` | `funcionario`), ordem, obrigatoria
- `respostas`: id, pesquisa_id, created_at (cada envio de um cliente)
- `respostas_itens`: id, resposta_id, pergunta_id, valor_nota, valor_texto, funcionario_id

Regras de acesso:
- A empresa só lê e edita os próprios dados (funcionários, pesquisas, perguntas, respostas)
- O público (cliente sem login) só pode ler pesquisas ativas e inserir respostas, nunca ler respostas

## Proteção contra respostas falsas (fazer na Etapa 5)
Pedido do Caio: impedir que alguém responda várias vezes para prejudicar a nota. Combinar:
1. Marca no navegador ("já respondeu hoje")
2. Tempo mínimo de resposta (~3s) contra robôs
3. Cloudflare Turnstile (anti-robô invisível) — biblioteca/serviço novo, avisar antes
4. Painel marca respostas "suspeitas" (rajada de notas ruins em poucos minutos) e o dono pode descartar
**Não usar** nenhum limite ou sinal por IP, nem exigir identificação para responder: decisão do Caio, porque o Wi-Fi do local é compartilhado e isso atrapalharia clientes reais.
Consequência: o envio da resposta passa por uma Server Action (que aplica as regras) em vez de insert direto do público no banco.

## Decisões registradas
- **Nome da empresa não é único** (negócios diferentes podem ter o mesmo nome). O que será único é o `slug` do link público da pesquisa (Etapa 5); se já existir, sugerir outro (ex.: `bebelu-2`).
- **E-mails de login**: no plano gratuito do Supabase os modelos não são editáveis, então os e-mails saem no padrão (em inglês) e o link volta para `/auth/confirm?code=...`. Ao publicar o site: comprar domínio + configurar SMTP próprio (Resend) no Supabase e traduzir/estilizar os e-mails.

- **Turnstile falha fechando**: sem token válido (ou Cloudflare fora do ar) a resposta não é gravada; não enviamos IP à Cloudflare. Secret errada devolve HTTP 400 e vira "indisponível" (erro de configuração, não do cliente)

## Ordem de desenvolvimento
1. Estrutura do projeto Next.js + Tailwind + conexão com Supabase
2. Login e cadastro da empresa
3. CRUD de funcionários
4. CRUD de pesquisas e perguntas
5. Página pública da pesquisa + QR code
6. Dashboard com médias e gráficos
7. Resumo com IA
8. Teste real na Bebelu e ajustes

## Regras para o Claude
- Responda e comente em português; o texto da interface também é em português
- Trabalhe em passos pequenos: uma funcionalidade por vez
- Antes de criar ou alterar vários arquivos, explique rapidamente o plano
- Depois de gerar código, explique as partes importantes de forma simples (o Caio está aprendendo)
- Não instale bibliotecas novas sem avisar e explicar por quê
- Nunca coloque chaves de API ou segredos no código; use `.env.local` e garanta que ele está no `.gitignore`
- Ao terminar uma etapa que funciona, sugira uma mensagem de commit
- **Toda interface usa as skills de design** (pedido do Caio, 2026-10-04): `impeccable` (PRODUCT.md / DESIGN.md, direções, critique, polish, audit), `frontend-design`, `emil-design-eng`, `mobile-native`, `animate`, `design:ux-copy` e `design:accessibility-review`. Siga o `DESIGN.md` quando existir
- **Sem emojis na interface**: pedido do Caio. Para cada ícone, criar um SVG próprio com as cores da marca em `src/components/icones/` (ex.: `IconeEmail`, `IconeOla`). Ícones genéricos de interface (setas, fechar, etc.) podem vir do `lucide-react`
- O projeto usa Next.js 16; siga as regras de @AGENTS.md (consultar `node_modules/next/dist/docs/` antes de escrever código)

## Status
- [x] Etapa 1: estrutura do projeto (Next.js 16 + Tailwind 4 + Supabase projeto `satisfeito`, ref `cvgayvfqzrbdqmlsvcal`, região sa-east-1)
- [x] Etapa 2: login e cadastro da empresa — concluída e testada de ponta a ponta (cadastro, confirmação por e-mail, entrar, sair, esqueci a senha). Decisões e identidade visual em `docs/superpowers/specs/2026-10-03-etapa-2-login-design.md`; plano em `docs/superpowers/plans/2026-10-03-etapa-2-login.md`
- [x] Etapa 2.5: várias empresas por login (seletor no painel, "Adicionar empresa", página 404) — feita no branch `etapa-3-funcionarios`
- [x] Etapa 3: funcionários — concluída e testada no Chrome (adicionar, repetido, vazio, renomear, Esc, desativar, reativar, excluir, teclado e leitor de tela); RLS testado de novo. Desenho: `docs/superpowers/specs/2026-10-04-etapa-3-funcionarios-design.md`; plano: `docs/superpowers/plans/2026-10-04-etapa-3-funcionarios.md`. Menu do painel = trilho segmentado creme (ativo ameixa, ícones lucide). Pendências anotadas: testar no celular de verdade; borda dos campos (`--input`) com contraste baixo (1,3:1, WCAG pede 3:1), vale para o projeto todo
- [x] Etapa 4: pesquisas e perguntas — concluída em 2026-10-06. Desenho: `docs/superpowers/specs/2026-10-06-etapa-4-pesquisas-design.md`; plano: `docs/superpowers/plans/2026-10-06-etapa-4-pesquisas.md`. Pendências: testar no celular de verdade; detalhes menores deixados para depois (limite de 10 sem lock contra inserções simultâneas; teste SF002 entre duas pesquisas da mesma empresa; texto "pendente" em Pausar/Retomar; aviso "sem equipe" falso se a contagem falhar)
- [x] Etapa 5A: página pública `/p/[slug]`, link editável, QR code, cartaz, tabelas de respostas e funções `pesquisa_publica`/`registrar_resposta` — concluída em 2026-10-08, com teste de segurança `rls_respostas.sql`. Desenho: `docs/superpowers/specs/2026-10-06-etapa-5a-pesquisa-publica-design.md`; plano: `docs/superpowers/plans/2026-10-06-etapa-5a-pesquisa-publica.md`. Pendência: testar no celular de verdade
- [x] Etapa 5B: Turnstile + coluna `respostas.descartada` — concluída em 2026-10-08 (marca no navegador e tempo mínimo já vinham da 5A). Desenho: `docs/superpowers/specs/2026-10-08-etapa-5b-turnstile-design.md`; plano: `docs/superpowers/plans/2026-10-08-etapa-5b-turnstile.md`. **Suspeitas (rajada de notas ruins) + tela de descartar ficam na Etapa 6**; consultas de média devem filtrar `not descartada`. Antes de publicar: criar o widget real do Turnstile na Cloudflare e trocar as chaves de teste do `.env.local`/hospedagem
- [x] Etapa 6A: página `/painel/resultados` (totais hoje/7/30 dias, nota por pergunta, gráfico de evolução com Recharts, ranking da equipe) — concluída em 2026-10-08. Desenho: `docs/superpowers/specs/2026-10-08-etapa-6a-resultados-design.md`; plano: `docs/superpowers/plans/2026-10-08-etapa-6a-resultados.md`. Função `resultados_pesquisa` (`security invoker`) ignora respostas descartadas. Pendências: testar no celular de verdade (o Chrome controlado não muda o tamanho da janela); a lista de `/painel/pesquisas` agora mostra o final do link, as perguntas e as respostas recebidas (sem as descartadas) para distinguir pesquisas com o mesmo título — resolvido em 2026-10-09
- [x] Etapa 6B: página `/painel/respostas` (lista, abas Todas/Suspeitas/Descartadas, selo de suspeita, Descartar/Restaurar, descarte em lote) e aviso de suspeitas em Resultados — concluída em 2026-10-08. Desenho: `docs/superpowers/specs/2026-10-08-etapa-6b-respostas-design.md`; plano: `docs/superpowers/plans/2026-10-08-etapa-6b-respostas.md`. Regra da suspeita (fixa no SQL, função `envios_suspeitos`): envio ruim = média das notas ≤ 4; 4 ou mais envios ruins em até 15 min na mesma pesquisa = rajada. Pendências: testar no celular de verdade (a largura de 360 px foi conferida num iframe); print da página Respostas para o README (o Chrome controlado precisa estar com a janela visível); `respostas(count)` das listas ainda conta descartadas; `envios_suspeitos` roda 2x por chamada de lista (ok na escala atual); botão Descartar usa `disabled` durante o envio (Firefox/Safari podem perder o foco na aba Todas; trocar por `aria-disabled`); teste de borda 4,1 no SQL
- [x] Etapa 7: resumo por IA — botão "Gerar resumo" em `/painel/resultados` (últimos 30 dias, respostas de texto não descartadas) com Claude (`claude-haiku-5-5`, `@anthropic-ai/sdk`), salvo em `resumos_ia` — concluída em 2026-10-09. Desenho: `docs/superpowers/specs/2026-10-08-etapa-7-resumo-ia-design.md`; plano: `docs/superpowers/plans/2026-10-08-etapa-7-resumo-ia.md`. Decisões: mínimo 3 textos, intervalo de 10 min por pesquisa, teto de 20 resumos/dia por empresa, até 200 textos de 1000 caracteres, só o servidor grava (cliente admin depois de conferir dono e limites), texto de cliente tratado como dado. **Pendências: o Caio precisa criar a chave em console.anthropic.com, pôr crédito e colocar `ANTHROPIC_API_KEY` no `.env.local` e na hospedagem, e fazer um teste com a chave real (os testes usaram um servidor falso via `ANTHROPIC_BASE_URL`; o id do modelo nunca foi conferido contra a API de verdade)**; print da seção para o README; testar no celular de verdade. Limitações conhecidas: a corrida de dois cliques ao mesmo tempo pode passar do intervalo; o teto é por empresa (um login com várias empresas teria vários tetos; fechar com teto por dono ou reserva de linha antes da chamada); `podeGerar` deixa passar `created_at` inválido; "com base em N respostas escritas" conta itens de texto
- Repositório vai ficar público, licença MIT (`LICENSE`); prints do README em `docs/prints/` (números de exemplo)
- Decisão: nota da equipe = média das notas dos envios em que o cliente escolheu a pessoa; menos de 3 avaliações = "poucas avaliações"; evolução e equipe incluem notas de perguntas arquivadas (histórico)
- Dica: no Chrome controlado, o Caio precisa estar logado na aba do grupo do Claude e a janela não pode ficar minimizada (senão as capturas de tela travam). O zoom do navegador em 100% evita confusão de rolagem
- Dica: o servidor em segundo plano costuma cair por falta de memória; peça ao Caio para rodar `npm run start` no terminal dele
- Dica: subagentes usam aspas tipográficas como \u201C/\u201D em strings JS e &ldquo;/&rdquo; em JSX (a ferramenta de edição troca as aspas curvas por aspas retas)

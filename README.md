# Satisfeito

[English](README.en.md) | **Português**

> Pesquisa de satisfação simples e rápida para negócios locais — restaurantes, lanchonetes e lojas.

O cliente escaneia um **QR code** na mesa, no balcão ou na nota fiscal, responde em menos de 30 segundos pelo celular, e o dono do negócio acompanha tudo num **painel** com médias, gráficos, ranking dos funcionários e um **resumo escrito por IA** do que os clientes estão dizendo.

O primeiro cliente é a lanchonete **Bebelu**. Depois, a ideia é oferecer o Satisfeito para outros negócios.

**Demonstração online:** https://satisfeito.vercel.app

> 🚧 **Em desenvolvimento.** Este README é atualizado a cada etapa concluída.

---

## Como vai funcionar

**Para a empresa (com login)**
- Cria conta e entra no painel
- Cadastra funcionários (opcional)
- Monta pesquisas com três tipos de pergunta:
  - **Nota** — escala de 1 a 10
  - **Texto** — resposta livre
  - **Funcionário** — "Quem te atendeu?"
- Gera o link e o QR code da pesquisa
- Acompanha os resultados no painel

**Para o cliente (sem login)**
- Abre a pesquisa pelo QR code, responde e envia — rápido e pensado para celular

**Painel**
- Média de cada pergunta de nota e evolução ao longo do tempo
- Ranking dos funcionários por nota média
- Total de respostas no dia, na semana e no mês
- Respostas recentes
- Relatório para a equipe escrito por IA, pronto para copiar no WhatsApp: panorama, elogios, reclamações, sugestões e ações

---

## Telas

| Página inicial | Entrar |
|---|---|
| ![Página inicial do satisfeito?!](docs/prints/inicio.png) | ![Tela de login](docs/prints/entrar.jpg) |

**Pesquisa que o cliente responde pelo celular** (a página abre pelo QR code, sem login):

![Pesquisa pública com nota, "Quem te atendeu?" e comentário](docs/prints/pesquisa-publica.jpg)

**Painel da empresa** (com login):

| Funcionários | Pesquisas |
|---|---|
| ![Lista de funcionários](docs/prints/painel-funcionarios.jpg) | ![Lista de pesquisas](docs/prints/painel-pesquisas.jpg) |

| Link e QR code da pesquisa | Perguntas da pesquisa |
|---|---|
| ![Link, QR code e cartaz](docs/prints/painel-link-qr.jpg) | ![Editor de perguntas](docs/prints/painel-perguntas.jpg) |

**Resultados** (período de 7, 30 ou 90 dias, comparação com o período anterior, NPS, distribuição das notas, destaques, dia da semana e turno, evolução e ranking da equipe):

![Cartões de resumo e destaques](docs/prints/dashboard-topo.jpg)

![Nota por dia da semana e por turno](docs/prints/dashboard-dia-turno.jpg)

**Mais recursos do painel**
- **Unidades** (`/painel/unidades`, só aparece com mais de uma empresa): nota média, respostas e NPS de cada empresa lado a lado, com comparação com o período anterior
- **Baixar planilha (CSV)** na página Respostas: abre direto no Excel em português (separador `;`), com proteção contra fórmulas digitadas pelo cliente
- **Avisos por e-mail** (cartão no Início): aviso de nota baixa e de rajada de notas ruins, no máximo 1 a cada 30 minutos por pesquisa e 10 por dia por empresa; o e-mail nunca leva o texto do cliente. Usa o Resend (`RESEND_API_KEY` e `EMAIL_REMETENTE`); sem as variáveis, desligado
- **Relatório semanal automático** (opcional, desligado por padrão): todo dia às 8h (horário de Brasília) a Vercel chama `/api/cron/relatorio-semanal` (`vercel.json`, protegida por `CRON_SECRET`), que manda por e-mail, às empresas que ligaram a opção, o relatório dos últimos 7 dias de cada pesquisa ativa que ainda não recebeu um nesta semana (sem nomes de funcionários; até 4 por execução)
- **Avaliação da IA** (`npm run avaliar-ia`): roda 4 cenários fixos (mês bom, sem comentários, comentário com ordem escondida, com nomes) na API de verdade, imprime os relatórios e confere o que não pode dar errado (número inventado, nome fora da hora, emoji, ordem obedecida). Use antes de trocar o modelo ou as instruções; precisa de `ANTHROPIC_API_KEY` e gasta centavos
- **Excluir minha conta** (Início > Minha conta e dados): apaga a conta, empresas, pesquisas, respostas e relatórios de uma vez (direito de exclusão da LGPD). Pede o e-mail da conta para confirmar
- Páginas **/termos** e **/privacidade** (LGPD) com links na home, no cadastro e na pesquisa pública. São um modelo inicial, **precisam de revisão de um advogado** antes de vender
- Página de erro amigável e registro de erros do servidor em JSON (sem parâmetros de URL) nos logs da hospedagem
- CI no GitHub Actions: tipos, lint, testes, build e testes de segurança do banco num Supabase local, a cada PR

**Respostas** (abas Todas, Suspeitas e Descartadas, selo de suspeita e botão Descartar):

![Lista de respostas com respostas suspeitas](docs/prints/respostas.jpg)

**Relatório para a equipe** (texto pronto para copiar e mandar no WhatsApp):

![Relatório para a equipe](docs/prints/relatorio-equipe.jpg)

> Os números desses prints são de exemplo, criados só para a demonstração, e o texto da IA no relatório foi simulado (sem chamar a API de verdade).

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS 4 |
| Banco e login | [Supabase](https://supabase.com) — Postgres + Auth, com RLS (Row Level Security) |
| Gráficos | [Recharts](https://recharts.org) |
| Anti-robô | [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) (invisível, sem usar IP) |
| IA | [Claude](https://www.anthropic.com/claude) (API da Anthropic, SDK `@anthropic-ai/sdk`), chamada só pelo servidor |

---

## Progresso

- [x] **Etapa 1** — Estrutura do projeto: Next.js + TypeScript + Tailwind e conexão com o Supabase
- [x] **Etapa 2** — Login e cadastro da empresa
- [x] **Etapa 3** — Cadastro de funcionários (e várias empresas por login)
- [x] **Etapa 4** — Criação de pesquisas e perguntas
- [x] **Etapa 5A** — Página pública da pesquisa, link, QR code e cartaz
- [x] **Etapa 5B** — Proteção contra robôs (Cloudflare Turnstile) e a coluna para descartar respostas
- [x] **Etapa 6A** — Resultados: totais, nota de cada pergunta, evolução e ranking da equipe
- [x] **Etapa 6B** — Lista de respostas, selo de respostas suspeitas e descarte
- [x] **Etapa 7** — Resumo com IA das respostas escritas (elogios, reclamações e sugestões)
- [x] **Etapa 7B** — Relatório para a equipe (IA + texto pronto para o WhatsApp, com opção de citar nomes)
- [x] **Etapa 6C** — Dashboard completo: período de 7, 30 ou 90 dias, comparação com o período anterior, NPS, distribuição das notas, dia da semana e turno, destaques
- [ ] **Etapa 8** — Teste real na Bebelu e ajustes

### O que já existe

**Identidade visual satisfeito?!**
- Paleta coral, manga, menta, ameixa e creme; fonte Bricolage Grotesque; ícone `?!` na aba do navegador
- Componentes [shadcn/ui](https://ui.shadcn.com) (Radix) adaptados à marca, com botões e campos pensados para o toque no celular
- Ícones próprios em SVG (sem emojis)

**Conta da empresa**
- Página inicial com "Criar conta" e "Entrar"
- **Cadastro** em uma tela (nome do negócio, e-mail e senha) com confirmação por e-mail
- **Entrar**, **sair** e **esqueci a senha** (link por e-mail → nova senha)
- **Painel** protegido com a saudação da empresa e os primeiros passos
- **Várias empresas por login** (ex.: duas unidades): seletor no topo do painel e "Adicionar empresa"
- Mensagens de erro em português e formulários que não perdem o que foi digitado

**Funcionários**
- Página `/painel/funcionarios`: adicionar em sequência (o campo continua focado), renomear, desativar, reativar e excluir com confirmação
- Nome único por empresa, sem diferenciar maiúsculas ("Ana" e "ana" são o mesmo), com aviso explicando como diferenciar
- Inativos somem da pesquisa, mas o histórico fica guardado
- Funciona pelo teclado e com leitor de tela: o foco nunca se perde, e erros e cadastros são anunciados

**Pesquisas**
- Página `/painel/pesquisas`: lista com o estado de cada pesquisa ("Recebendo respostas" ou "Pausada"); cada item mostra o final do link, o número de perguntas e as respostas recebidas (sem as descartadas), para distinguir pesquisas com o mesmo título
- Criar pesquisa já com perguntas sugeridas: uma nota obrigatória, "Quem te atendeu?" (só se a empresa tiver funcionários ativos) e um comentário livre
- Editor da pesquisa: título editável, Pausar/Retomar e Excluir com confirmação
- Perguntas dos 3 tipos (nota, texto livre e "Quem te atendeu?"), cada uma com ícone próprio: subir/descer, tornar obrigatória/opcional, editar o texto, tirar da pesquisa e devolver depois
- Limite de 10 perguntas e uma só "Quem te atendeu?" por pesquisa, garantidos também no banco
- Avisos quando falta pergunta de nota ("sem nota") ou quando não há funcionários para a pergunta de equipe ("sem equipe")
- Funciona pelo teclado e com leitor de tela

**Resultados**
- Página `/painel/resultados`: uma pesquisa por vez, com seletor quando a empresa tem mais de uma (a pesquisa mais recente com respostas abre primeiro)
- Seletor de período (7, 30 ou 90 dias, padrão 30; `?dias=` na URL) e cartões de respostas, nota média e NPS, cada um comparado com o período anterior ("poucos dados para comparar" com menos de 5 respostas)
- NPS (só com 10 respostas com nota ou mais) e distribuição das notas em 4 faixas, sempre com número, porcentagem e palavra
- Dia da semana e turno (manhã, tarde, noite, madrugada) com a nota média de cada um; célula com menos de 3 respostas aparece esmaecida
- Destaques: pergunta mais bem avaliada e mais fraca, dia mais fraco e quem mais agradou (só aparecem com dados suficientes)
- Nota média de cada pergunta, sempre com número e palavra ("Ótimo", "Pode melhorar", "Ruim"), nunca só cor
- Gráfico da nota média por dia no período escolhido (eixo de tempo real), com tabela escondida para leitor de tela
- Ranking da equipe pela nota média dos clientes que escolheram cada pessoa; quem tem menos de 3 avaliações aparece depois, com a etiqueta "poucas avaliações"
- Respostas descartadas não entram em nenhum número; pesquisa sem respostas mostra como receber a primeira
- Os números saem de uma função do banco (`painel_pesquisa`, `security invoker`), então o RLS vale: cada empresa só vê a própria pesquisa

**Respostas, suspeitas e descarte**
- Página `/painel/respostas`: lista as respostas de uma pesquisa, da mais recente para a mais antiga, 20 por página, com abas **Todas**, **Suspeitas** e **Descartadas** (cada uma com a quantidade)
- Cada resposta mostra data e hora (horário de São Paulo), notas com número e palavra, texto livre e a pessoa escolhida em "Quem te atendeu?". Texto de cliente é sempre mostrado como texto puro
- **Selo "Suspeita":** uma resposta é ruim quando a média das notas dela é 4 ou menos; 4 ou mais respostas ruins em até 15 minutos, na mesma pesquisa, formam uma rajada e todas ganham o selo. O selo só avisa: quem decide é o dono. Não usa IP nem identificação
- Botões **Descartar** e **Restaurar** (reversíveis) e, na aba Suspeitas, "Descartar as suspeitas desta página". Descartar tira a resposta de todos os números de Resultados; a página anuncia o resultado para leitor de tela
- A página Resultados mostra um aviso "N respostas suspeitas" com link para a aba Suspeitas
- A regra e a lista saem de funções do banco (`envios_suspeitos` e `respostas_pesquisa`, `security invoker`), então o RLS vale: cada empresa só vê e descarta as próprias respostas

**Resumo por IA**
- Seção "Relatório para a equipe" em `/painel/resultados`: o botão **Gerar relatório** manda os números do período escolhido (7, 30 ou 90 dias) e as respostas de texto (sem as descartadas) para o Claude, que escreve a prosa: panorama, elogios, reclamações, sugestões e 2 ou 3 ações. O sistema monta o texto final para **WhatsApp** (negrito com `*`, listas curtas, sem emojis) com os números calculados pelo banco, e o botão **Copiar para WhatsApp** copia tudo. O último relatório fica salvo (`resumos_ia`, com o retrato dos números usados) e aparece de novo sem gastar outra chamada
- A IA nunca escreve os números: se o panorama ou as ações citarem um número que não está nos dados, o servidor recusa e tenta de novo uma vez. A opção **Citar nomes e notas da equipe** vem desligada; desligada, nenhum nome de funcionário é enviado à IA nem aparece no texto
- Com menos de 5 respostas no período a IA nem é chamada. **Limites de custo:** 10 minutos entre dois relatórios da mesma pesquisa e no máximo 20 por dia por dono (somando as empresas dele); no máximo 200 textos de até 1000 caracteres por pedido
- **A chamada à IA acontece só no servidor** (Server Action); a chave `ANTHROPIC_API_KEY` nunca vai ao navegador. O banco só deixa o dono **ler** os resumos; quem grava é o servidor, depois de conferir que a pesquisa é do usuário (RLS)
- **Privacidade:** o texto das respostas é enviado à Anthropic para gerar o resumo (isso aparece na tela, ao lado do botão). Não vão e-mail, IP, nome da empresa nem nome de funcionário
- **Texto de cliente é dado, não instrução:** o pedido separa as instruções do conteúdo, neutraliza `<`, `>` e quebras de linha dos comentários, obriga a IA a responder por uma ferramenta com formato fixo e valida/limpa a resposta antes de salvar. A tela mostra tudo como texto puro
- A lógica (regras, pedido, validação) é testada sem rede, com uma IA falsa: `npm test` não gasta dinheiro

**Página pública, link e QR code**
- Cada pesquisa tem um link próprio (`/p/<slug>`), com o slug sugerido a partir do nome da empresa e editável (único no sistema; se já existir, a tela avisa)
- No editor: copiar o link, baixar o QR code em SVG e abrir um cartaz pronto para imprimir
- Página do cliente pensada para o celular: nota de 1 a 10, texto livre e "Quem te atendeu?", com tela de agradecimento
- Pesquisa pausada mostra um aviso em vez do formulário
- O envio passa por uma Server Action que usa a chave secreta só no servidor; o banco valida tudo de novo (pergunta da pesquisa, nota inteira de 1 a 10, funcionário ativo da mesma empresa, obrigatórias)
- Pesquisa ou funcionário com respostas não podem ser excluídos (pausar ou desativar em vez disso)
- **Proteção contra respostas falsas:** tempo mínimo de 3 segundos, marca "já respondeu hoje" no navegador e um teste invisível do Cloudflare Turnstile. O servidor confere o resultado com a Cloudflare antes de gravar; se a verificação falhar, a resposta não é aceita. **Nenhum sinal por IP é usado**, porque o Wi-Fi do local é compartilhado e isso atrapalharia clientes reais

**Segurança**
- Coluna `respostas.descartada`: o dono pode descartar respostas das próprias pesquisas (e só mexer nessa coluna); a tela de descarte é a página Respostas
- Tabelas `respostas` e `respostas_itens`: só o dono da empresa lê; o público nunca lê. A leitura pública da pesquisa passa pela função `pesquisa_publica` (devolve só o necessário) e a gravação pela função `registrar_resposta`, que só o servidor consegue chamar
- Tabela `empresas` criada automaticamente no cadastro (trigger no banco) e protegida por **RLS**: cada conta só vê e edita as próprias empresas; visitante sem login não vê nada
- Tabela `funcionarios` também com **RLS**: o dono só mexe nos funcionários das próprias empresas, e ninguém consegue mover um funcionário para outra empresa
- Tabelas `pesquisas` e `perguntas` também com **RLS**: o dono só mexe nas próprias; o tipo da pergunta, a pesquisa e a empresa não mudam depois de criados; pergunta não se exclui, se arquiva; a troca de ordem é atômica, numa função `security invoker`
- Sessão em cookies verificada no servidor (`getClaims`), renovada por um *proxy* que também bloqueia páginas para quem não está logado
- Proteção contra redirecionamento para sites falsos, cabeçalhos de segurança (anti-clickjacking etc.) e validação de todos os formulários no servidor com [zod](https://zod.dev)

**Testes**
- 181 testes automáticos com [Vitest](https://vitest.dev) (validações, redirecionamento seguro, faixas de nota, escolha da empresa atual, slug, formulário de resposta, Turnstile, apresentação dos resultados, lista de respostas, regras e pedido do resumo por IA)
- Testes de segurança do banco em `supabase/tests/` (`rls_empresas.sql`, `rls_funcionarios.sql`, `rls_pesquisas.sql`, `rls_respostas.sql`, `rls_respostas_lista.sql`, `rls_resumos_ia.sql`, `rls_resumo_reserva.sql`, `rls_painel_pesquisa.sql` e `rls_suspeitas_borda.sql`), que provam o isolamento entre empresas

---

## Rodando localmente

**Pré-requisitos:** Node.js 20 ou mais recente e um projeto no Supabase.

```bash
# 1. Instale as dependências
npm install

# 2. Crie o arquivo de variáveis de ambiente
cp .env.example .env.local
#    e preencha com a URL e a chave publicável do seu projeto
#    (Supabase > Project Settings > API Keys)

# 3. Rode o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endereço do projeto no Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável — pode ir para o navegador, pois quem protege os dados é o RLS |
| `SUPABASE_SECRET_KEY` | Chave secreta, **só no servidor** (nunca com `NEXT_PUBLIC_`): usada para gravar as respostas dos clientes |
| `NEXT_PUBLIC_TURNSTILE_SITE` | Chave pública do widget Turnstile (Cloudflare). Em desenvolvimento, use as [chaves de teste](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) da Cloudflare |
| `TURNSTILE_SECRET_KEY` | Chave secreta do Turnstile, **só no servidor** |
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic para o resumo por IA ([console.anthropic.com](https://console.anthropic.com), precisa de crédito), **só no servidor**. Sem ela, o resto funciona e o botão avisa que o resumo ainda não está configurado |
| `CARIMBO_SEGREDO` | Segredo que assina o carimbo de tempo da pesquisa pública (gere com o comando do `.env.example`) |
| `NEXT_PUBLIC_SITE_URL` | Endereço público do site, usado nos links dos e-mails (em desenvolvimento: `http://localhost:3000`) |

### Configuração do Supabase

1. **Banco:** aplique os arquivos de `supabase/migrations/` em ordem (pelo SQL Editor ou pela CLI do Supabase).
2. **Authentication → URL Configuration:** *Site URL* `http://localhost:3000` e, em *Redirect URLs*, `http://localhost:3000/**`.
3. **Authentication → Sign In / Providers → Email:** "Confirm email" ligado e senha mínima de **8** caracteres.

> No plano gratuito, o Supabase só envia e-mails para os membros da equipe do projeto, poucos por hora, e os modelos de e-mail não podem ser editados. Para produção será configurado um serviço de e-mail próprio (SMTP).

O `.env.local` **nunca** vai para o git (está no `.gitignore`). Chaves secretas, como a `service_role` ou a da IA, nunca levam o prefixo `NEXT_PUBLIC_` e nunca são usadas no navegador.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção (também checa os tipos) |
| `npm run start` | Roda a versão de produção |
| `npm run lint` | Procura problemas no código com o ESLint |
| `npm test` | Roda os testes automáticos (Vitest) |
| `npm run test:watch` | Roda os testes de novo a cada arquivo salvo |

---

## Estrutura de pastas

```
src/
├── proxy.ts                  # Roda antes de cada página: renova a sessão e protege rotas
├── app/                      # Páginas e rotas (App Router)
│   ├── layout.tsx            # Layout base (fonte, idioma)
│   ├── page.tsx              # Página inicial
│   ├── (auth)/               # Telas de conta (o grupo não aparece no endereço)
│   │   ├── actions.ts        # Server Actions: entrar, cadastrar, esqueci/redefinir senha
│   │   ├── entrar/  cadastro/  esqueci-senha/  redefinir-senha/
│   ├── auth/confirm/         # Recebe o clique no link do e-mail e cria a sessão
│   └── painel/               # Área logada (menu e seletor de empresa)
│       ├── empresas/         # Trocar e adicionar empresa
│       ├── funcionarios/     # Lista, formulário e ações dos funcionários
│       ├── pesquisas/        # Lista, ações, editor (`[id]/`) e cartaz das pesquisas
│       ├── resultados/       # Totais, notas, gráfico e ranking da equipe
│       ├── respostas/        # Lista de respostas, abas, selo de suspeita e descarte
│   └── p/[slug]/             # Página pública da pesquisa (cliente, sem login)
├── components/
│   ├── ui/                   # Componentes do shadcn/ui adaptados à marca
│   ├── marca/                # Logo satisfeito?!
│   ├── icones/               # Ícones próprios em SVG
│   └── formulario/           # Peças de formulário (mensagem de erro)
└── lib/
    ├── auth/                 # Validações (zod), mensagens de erro, redirecionamento seguro
    ├── empresas/             # Qual empresa está aberta no painel
    ├── funcionarios/         # Validação do nome do funcionário
    ├── notas/                # Faixas de nota (boa / atenção / ruim)
    ├── respostas/            # Validação e montagem do envio do cliente; leitura da lista de respostas
    ├── resumo/               # Regras, pedido, validação e chamada da IA (resumo das respostas escritas)
    ├── resultados/           # Tipos e formatação dos números da página Resultados
    ├── pesquisas/            # Validações, perguntas sugeridas e rótulos dos tipos
    └── supabase/             # Clientes do Supabase, proxy e tipos do banco
supabase/
├── migrations/               # SQL do banco (tabelas, RLS, trigger)
└── tests/                    # Testes de segurança do RLS
docs/                         # Desenho, plano e identidade visual de cada etapa
```

---

## Segurança

- Cada empresa só acessa os próprios dados, garantido no **banco** por regras de RLS, e não só na interface
- O público (cliente sem login) só pode ler pesquisas ativas e enviar respostas — nunca ler respostas
- Segredos ficam apenas em variáveis de ambiente no servidor

---

## Licença

Distribuído sob a licença [MIT](LICENSE).

Feito por **Caio Portela**.

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
2. IP **não bloqueia** (Wi-Fi do local é compartilhado): só sinaliza respostas repetidas da mesma conexão como "suspeitas". Guardar só hash do IP (LGPD), nunca o IP
3. Tempo mínimo de resposta (~3s) contra robôs
4. Cloudflare Turnstile (anti-robô invisível) — biblioteca/serviço novo, avisar antes
5. Painel marca respostas "suspeitas" (rajada de notas ruins / mesmo IP) e o dono pode descartar
Consequência: o envio da resposta passa por uma Server Action (que aplica as regras) em vez de insert direto do público no banco.
Futuro: incentivo "deixe seu e-mail e ganhe desconto"; código único por nota fiscal (premium).

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
- O projeto usa Next.js 16; siga as regras de @AGENTS.md (consultar `node_modules/next/dist/docs/` antes de escrever código)

## Status
- [x] Etapa 1: estrutura do projeto (Next.js 16 + Tailwind 4 + Supabase projeto `satisfeito`, ref `cvgayvfqzrbdqmlsvcal`, região sa-east-1)
- [ ] Etapa 2: login e cadastro da empresa — **desenho em andamento**. Antes de qualquer coisa, leia `docs/superpowers/specs/2026-10-03-etapa-2-login-design.md` (todas as decisões já aprovadas e o próximo passo). Não refaça perguntas que já estão respondidas lá.

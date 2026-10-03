# Satisfeito

> Pesquisa de satisfação simples e rápida para negócios locais — restaurantes, lanchonetes e lojas.

O cliente escaneia um **QR code** na mesa, no balcão ou na nota fiscal, responde em menos de 30 segundos pelo celular, e o dono do negócio acompanha tudo num **painel** com médias, gráficos, ranking dos funcionários e um **resumo escrito por IA** do que os clientes estão dizendo.

O primeiro cliente é a lanchonete **Bebelu**. Depois, a ideia é oferecer o Satisfeito para outros negócios.

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
- Resumo com IA: pontos positivos, reclamações e sugestões

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) + React 19 |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS 4 |
| Banco e login | [Supabase](https://supabase.com) — Postgres + Auth, com RLS (Row Level Security) |
| Gráficos | Recharts *(etapa 6)* |
| IA | API de IA chamada só pelo servidor *(etapa 7)* |

---

## Progresso

- [x] **Etapa 1** — Estrutura do projeto: Next.js + TypeScript + Tailwind e conexão com o Supabase
- [ ] **Etapa 2** — Login e cadastro da empresa *(em planejamento)*
- [ ] **Etapa 3** — Cadastro de funcionários
- [ ] **Etapa 4** — Criação de pesquisas e perguntas
- [ ] **Etapa 5** — Página pública da pesquisa + QR code
- [ ] **Etapa 6** — Painel com médias e gráficos
- [ ] **Etapa 7** — Resumo com IA
- [ ] **Etapa 8** — Teste real na Bebelu e ajustes

### O que já existe

- Projeto Next.js com TypeScript, Tailwind e ESLint configurados
- Projeto no Supabase criado na região de São Paulo (`sa-east-1`), perto dos usuários
- Dois "clientes" do Supabase prontos para uso:
  - `src/lib/supabase/client.ts` — para componentes que rodam no **navegador**
  - `src/lib/supabase/server.ts` — para código que roda no **servidor**; lê a sessão do usuário pelos cookies, o que permite ao RLS saber quem está pedindo os dados
- Página inicial temporária que testa a conexão com o Supabase

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

Abra [http://localhost:3000](http://localhost:3000). Se aparecer **"Conectado ao Supabase ✅"**, está tudo certo.

### Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endereço do projeto no Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave publicável — pode ir para o navegador, pois quem protege os dados é o RLS |

O `.env.local` **nunca** vai para o git (está no `.gitignore`). Chaves secretas, como a `service_role` ou a da IA, nunca levam o prefixo `NEXT_PUBLIC_` e nunca são usadas no navegador.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção (também checa os tipos) |
| `npm run start` | Roda a versão de produção |
| `npm run lint` | Procura problemas no código com o ESLint |

---

## Estrutura de pastas

```
src/
├── app/                 # Páginas e rotas (App Router)
│   ├── layout.tsx       # Layout base de todas as páginas
│   └── page.tsx         # Página inicial (teste de conexão, por enquanto)
└── lib/
    └── supabase/
        ├── client.ts    # Cliente Supabase para o navegador
        └── server.ts    # Cliente Supabase para o servidor
```

---

## Segurança

- Cada empresa só acessa os próprios dados, garantido no **banco** por regras de RLS, e não só na interface
- O público (cliente sem login) só pode ler pesquisas ativas e enviar respostas — nunca ler respostas
- Segredos ficam apenas em variáveis de ambiente no servidor

---

Feito por **Caio Portela**, estudante de Ciência da Computação.

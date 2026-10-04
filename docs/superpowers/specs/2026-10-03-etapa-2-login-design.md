# Etapa 2 — Login, cadastro da empresa e identidade visual

**Data:** 2026-10-03
**Status:** desenho **aprovado** por completo (telas, segurança, banco, identidade visual e testes).
**Próximo passo ao retomar:** plano de implementação em `docs/superpowers/plans/` (skill `writing-plans`) → implementar.

---

## 1. Decisões gerais (aprovadas)

| Tema | Decisão |
|---|---|
| Nome visível | **satisfeito?!** (em domínio, pacote e links continua `satisfeito`) |
| Sensação da marca | Acolhedor + vibrante (cores quentes e fortes, cantos arredondados) |
| Componentes | **shadcn/ui** sobre Tailwind (Radix por baixo). **Não** usar PrimeReact junto |
| Login | **E-mail + senha** com confirmação por e-mail. "Entrar com Google" numa etapa posterior |
| Cadastro | **Uma tela só:** nome do negócio + e-mail + senha |
| Conta × empresa | 1 conta = 1 empresa (por enquanto) |
| Validação | **zod** nos formulários, no servidor |

## 2. Telas e fluxo (aprovado)

1. **`/`** — apresentação curta + botões "Criar conta" e "Entrar"
2. **`/cadastro`** — nome do negócio, e-mail, senha (mín. 8) → tela "Confira seu e-mail"
3. **`/auth/confirm`** — rota que valida o link do e-mail (`verifyOtp` com `token_hash`) e manda para `/painel` logado
4. **`/entrar`** — e-mail e senha, erros em português claro
5. **`/esqueci-senha`** e **`/redefinir-senha`** — recuperação de senha
6. **`/painel`** — protegido; "Olá, {empresa} 👋", botão **Sair**, espaço para as próximas etapas

**Proteção:** `proxy.ts` (antigo middleware no Next 16) renova a sessão e redireciona (`/painel` sem login → `/entrar`; logado em `/entrar` → `/painel`). O painel **também** confere o usuário no servidor (duas camadas).

**Formulários:** Server Actions; botão com estado "Entrando…" e bloqueio de clique duplo.

## 3. Segurança do login (aprovado)

- No servidor usar **`getClaims()` / `getUser()`** (verificam a assinatura do JWT). **Nunca** confiar em `getSession()` no servidor.
- Access token de 1h + refresh token rotativo com detecção de reuso (padrão do Supabase).
- Cookies `Secure` + `SameSite=Lax` em produção.
- CSRF: Server Actions do Next checam a origem.
- **Sem redirecionamento aberto:** parâmetro `next` só aceita caminhos internos (começa com `/`, não com `//`).
- "Esqueci a senha" sempre responde "se o e-mail existir, enviamos o link" (não revela contas).
- Limite de tentativas do Supabase Auth; CAPTCHA só se aparecer abuso.
- Cabeçalhos de segurança em `next.config.ts` (ex.: `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`).
- **Tarefas manuais do Caio no painel do Supabase:**
  - Authentication → Providers → Email: senha mínima 8
  - Authentication → URL Configuration: Site URL e Redirect URLs (localhost e, depois, o domínio)
  - (Plano gratuito não tem checagem de senhas vazadas — ok por enquanto)

## 4. Banco de dados (aprovado)

**Tabela `public.empresas`**

| coluna | tipo | regra |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `nome` | text | obrigatório, 1–100 caracteres (check) |
| `owner_id` | uuid | `unique`, FK `auth.users(id)` `on delete cascade` |
| `created_at` | timestamptz | `default now()` |

**Trigger** `on auth.users after insert` → função `handle_new_user()`:
- `security definer`, `set search_path = ''`, `revoke execute` de `public`/`anon`/`authenticated`
- Lê `raw_user_meta_data->>'nome_empresa'`, aplica `trim`, limita a 100 caracteres, com valor padrão "Meu negócio" se vier vazio (o formulário já valida antes)

**RLS** (ligado):
- `select` e `update`: `to authenticated using (owner_id = (select auth.uid()))` (update também com `with check`)
- `insert` e `delete`: **nenhuma** policy (só o trigger cria; exclusão de conta fica para depois)
- `anon`: sem acesso

**Organização:** SQL salvo em `supabase/migrations/` e aplicado no projeto Supabase; gerar tipos TypeScript em `src/lib/supabase/database.types.ts`; rodar o verificador de segurança (advisors) depois de cada mudança.

## 5. Identidade visual (aprovada)

Rascunho aprovado: [`docs/design/identidade-visual-aprovada.html`](../../design/identidade-visual-aprovada.html) (abra no navegador).

**Fonte:** Bricolage Grotesque (Google Fonts, via `next/font`).

**Paleta**

| Nome | Hex | Uso |
|---|---|---|
| Coral | `#FF5A4E` | Cor principal da empresa (login/painel), faixa "Ruim" |
| Manga | `#FFC23C` | Pesquisa do cliente, faixa "Atenção", "!" do logo |
| Menta | `#14B8A6` | Faixa "Boa", indicadores positivos |
| Ameixa | `#2A1F2D` | Texto, botão principal do login |
| Creme | `#FFF8F3` | Fundo |
| Cinza | `#6B5F6E` | Texto secundário |

**Logo:** "satisfeito" em ameixa + "?" coral (`#EE4638`, um tom mais escuro para contraste) + "!" manga (`#FFC23C`).
- O "!" manga em fundo claro tem contraste baixo — **o Caio escolheu assim mesmo após aviso** (logotipo é exceção do WCAG). Em tamanho pequeno usar `#8F6500`. No site, o logo será SVG com `aria-label="Satisfeito"`.
- Ícone: "?!" num quadrado arredondado (versão final ainda a desenhar com o mesmo esquema de cores).

**Regras de cor**
- Botões coloridos (coral, manga, menta) usam **texto escuro** (ameixa), nunca branco.
- **Pesquisa do cliente:** manga (barra de progresso, nota escolhida, botão); fundo das notas `#FFF1CC`.
- **Login:** cartão branco, botão ameixa, link "Criar conta" em `#C2321F`.
- **Telas de login/cadastro/senha:** fundo da página **menta** (`#14B8A6`) com o cartão branco por cima (decisão do Caio, 2026-10-04; coral foi testado e descartado porque o "?" do logo sumia).
- **Painel:** cada nota com cor da faixa + **número** + **etiqueta escrita** (nunca só a cor):
  - **Boa** (menta) 8 a 10 — etiqueta `#D5F5F0` / `#0B6B60`
  - **Atenção** (manga) 6 a 7,9 — etiqueta `#FFF1CC` / `#7A5200`
  - **Ruim** (coral) abaixo de 6 — etiqueta `#FFE1DD` / `#A3261B`
  - Perguntas ordenadas da melhor para a pior; legenda das faixas abaixo. Limites ajustáveis depois.
- Todo texto deve passar WCAG AA (exceto o "!" do logo, decisão do Caio).

## 6. Testes (aprovado)

1. **Banco/segurança:** duas empresas de teste (A e B); provar que A não lê/edita B, `anon` não vê nada, ninguém insere empresa pela API, trigger cria a empresa no cadastro. Advisors do Supabase com zero alertas.
2. **Vitest** (biblioteca nova, `npm test`), com TDD: schemas zod dos formulários, função de redirecionamento seguro, função de faixa da nota (Boa/Atenção/Ruim).
3. **Teste manual no navegador:** cadastro → e-mail → entrar → sair → esqueci a senha → `/painel` sem login; celular e computador; revisão de acessibilidade e de segurança no fim.
- **Depois:** Playwright (testes automáticos de navegador) na Etapa 5.
- **Definição de pronto:** `lint`, `build`, `npm test` e advisors passando → commit, push e atualizar o README.

## 7. Fora do escopo da Etapa 2

Login com Google · funcionários com login próprio · várias empresas por conta · exclusão de conta · serviço de e-mail próprio (Resend) · CAPTCHA · página de vendas completa.

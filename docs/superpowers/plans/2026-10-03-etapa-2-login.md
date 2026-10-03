# Etapa 2 — Login e cadastro da empresa: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A empresa consegue criar conta (nome do negócio + e-mail + senha), confirmar o e-mail, entrar, recuperar a senha, ver o painel com o nome da empresa e sair, com a identidade visual satisfeito?! e dados isolados por RLS.

**Architecture:** Next.js 16 App Router com Server Actions para os formulários e `@supabase/ssr` guardando a sessão em cookies. Um `src/proxy.ts` renova a sessão e protege rotas; páginas protegidas conferem o usuário de novo no servidor com `getClaims()`. A tabela `empresas` é criada por trigger no cadastro e protegida por RLS. A interface usa shadcn/ui com os tokens da marca.

**Tech Stack:** Next.js 16.3 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase (Postgres + Auth) · zod 4 · Vitest

**Spec:** `docs/superpowers/specs/2026-10-03-etapa-2-login-design.md` (leia antes de começar). Mockup aprovado: `docs/design/identidade-visual-aprovada.html`.

## Global Constraints

- Projeto Supabase: `satisfeito`, ref **`cvgayvfqzrbdqmlsvcal`**, região `sa-east-1`. Use as ferramentas MCP `mcp__supabase__*` com esse `project_id`.
- Next 16: o antigo `middleware` agora é **`proxy`**. Antes de escrever código do Next, consulte `node_modules/next/dist/docs/` (regra do `AGENTS.md`).
- No servidor, identidade **sempre** via `supabase.auth.getClaims()` (ou `getUser()`). **Nunca** `getSession()` para decidir acesso.
- Toda a interface e as mensagens são em **português do Brasil**; comentários do código também.
- Nome visível: **satisfeito?!**; nome técnico: `satisfeito`.
- Cores (hex exatos): coral `#FF5A4E`, coral do logo `#EE4638`, coral escuro `#C2321F`, manga `#FFC23C`, manga claro `#FFF1CC`, manga para texto pequeno `#8F6500`, menta `#14B8A6`, menta claro `#D5F5F0`, menta para texto `#0B6B60`, ameixa `#2A1F2D`, creme `#FFF8F3`, cinza `#6B5F6E`.
- Botões coloridos usam **texto ameixa**, nunca branco. Todo texto passa WCAG AA, exceto o "!" manga do logo grande (decisão do Caio).
- Fonte: **Bricolage Grotesque** via `next/font/google`.
- Senha: mínimo 8, máximo 72 caracteres.
- Nunca colocar segredos no código. Só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` existem, em `.env.local`.
- Bibliotecas novas permitidas nesta etapa (já aprovadas): `vitest`, `zod`, e as dependências que o `shadcn` instala. Nenhuma outra sem perguntar ao Caio.
- Cada tarefa termina com `npm run lint` e `npm run build` passando, além dos testes da tarefa, e com um commit. O Caio está aprendendo: depois de cada tarefa, explique em português simples o que foi feito.
- Mensagens de commit em português, no estilo `tipo: descrição`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `vitest.config.ts` | Configuração dos testes |
| `src/lib/notas/faixa.ts` (+ `.test.ts`) | Faixa da nota: boa / atencao / ruim |
| `src/lib/auth/redirect-seguro.ts` (+ `.test.ts`) | Só aceita destinos internos (evita redirecionamento aberto) |
| `src/lib/auth/esquemas.ts` (+ `.test.ts`) | Regras de validação (zod) dos formulários |
| `src/lib/auth/mensagens-erro.ts` (+ `.test.ts`) | Traduz códigos de erro do Supabase para português |
| `supabase/migrations/20261003000000_empresas.sql` | Tabela `empresas`, RLS e trigger |
| `supabase/tests/rls_empresas.sql` | Prova de segurança do RLS (roda e desfaz tudo) |
| `src/lib/supabase/database.types.ts` | Tipos gerados do banco |
| `src/lib/supabase/{client,server}.ts` | Clientes (modificados: tipos + cookies seguros) |
| `src/lib/supabase/proxy.ts` | Renova sessão e decide redirecionamentos |
| `src/proxy.ts` | Ponto de entrada do proxy do Next |
| `next.config.ts` | Cabeçalhos de segurança |
| `src/app/globals.css` | Tokens da marca + tema do shadcn |
| `src/app/layout.tsx` | Fonte, idioma, metadados |
| `src/components/ui/*` | Componentes do shadcn (gerados) |
| `src/components/marca/logo.tsx` | Logo satisfeito?! |
| `src/components/formulario/erro-do-campo.tsx` | Mensagem de erro abaixo de um campo |
| `src/app/page.tsx` | Página inicial |
| `src/app/(auth)/layout.tsx` | Moldura das telas de login (logo + cartão) |
| `src/app/(auth)/actions.ts` | Server Actions: entrar, cadastrar, esqueciSenha, redefinirSenha |
| `src/app/(auth)/entrar/{page,formulario-entrar}.tsx` | Tela Entrar |
| `src/app/(auth)/cadastro/{page,formulario-cadastro}.tsx` | Tela Cadastro |
| `src/app/(auth)/cadastro/verifique-email/page.tsx` | "Confira seu e-mail" |
| `src/app/(auth)/esqueci-senha/{page,formulario-esqueci-senha}.tsx` | Pedir link de nova senha |
| `src/app/(auth)/redefinir-senha/{page,formulario-redefinir-senha}.tsx` | Criar a nova senha |
| `src/app/auth/confirm/route.ts` | Valida o link do e-mail e cria a sessão |
| `src/app/painel/{layout,page,actions}.tsx/ts` | Painel protegido + Sair |

---

### Task 1: Vitest + funções puras (faixa da nota e redirecionamento seguro)

**Files:**
- Create: `vitest.config.ts`
- Create: `src/lib/notas/faixa.ts`, `src/lib/notas/faixa.test.ts`
- Create: `src/lib/auth/redirect-seguro.ts`, `src/lib/auth/redirect-seguro.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces: `faixaDaNota(nota: number): Faixa` e `type Faixa = "boa" | "atencao" | "ruim"` em `@/lib/notas/faixa`
- Produces: `caminhoSeguro(destino: string | null | undefined, padrao?: string): string` em `@/lib/auth/redirect-seguro` (padrão `"/painel"`)

- [ ] **Step 1: Instalar o Vitest**

Run: `npm install -D vitest`
Expected: `added N packages` sem erros.

- [ ] **Step 2: Criar `vitest.config.ts`**

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mesmo atalho "@/..." do tsconfig, para os testes acharem os arquivos
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Adicionar scripts no `package.json`**

Em `"scripts"`, adicionar:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Escrever os testes que falham**

`src/lib/notas/faixa.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { faixaDaNota } from "./faixa";

describe("faixaDaNota", () => {
  it("8 a 10 é boa", () => {
    expect(faixaDaNota(10)).toBe("boa");
    expect(faixaDaNota(8)).toBe("boa");
  });

  it("6 até menos de 8 é atenção", () => {
    expect(faixaDaNota(7.99)).toBe("atencao");
    expect(faixaDaNota(6)).toBe("atencao");
  });

  it("abaixo de 6 é ruim", () => {
    expect(faixaDaNota(5.99)).toBe("ruim");
    expect(faixaDaNota(1)).toBe("ruim");
  });
});
```

`src/lib/auth/redirect-seguro.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { caminhoSeguro } from "./redirect-seguro";

describe("caminhoSeguro", () => {
  it("aceita caminhos internos", () => {
    expect(caminhoSeguro("/painel")).toBe("/painel");
    expect(caminhoSeguro("/redefinir-senha")).toBe("/redefinir-senha");
  });

  it("usa o padrão quando não há destino", () => {
    expect(caminhoSeguro(null)).toBe("/painel");
    expect(caminhoSeguro(undefined)).toBe("/painel");
    expect(caminhoSeguro("")).toBe("/painel");
  });

  it("bloqueia sites externos", () => {
    expect(caminhoSeguro("https://golpe.com")).toBe("/painel");
    expect(caminhoSeguro("//golpe.com")).toBe("/painel");
    expect(caminhoSeguro("/\\golpe.com")).toBe("/painel");
    expect(caminhoSeguro("javascript:alert(1)")).toBe("/painel");
  });

  it("respeita um padrão diferente", () => {
    expect(caminhoSeguro("https://golpe.com", "/entrar")).toBe("/entrar");
  });
});
```

- [ ] **Step 5: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./faixa"` e `"./redirect-seguro"`.

- [ ] **Step 6: Implementar**

`src/lib/notas/faixa.ts`:
```ts
// Faixas usadas no painel para colorir as notas (escala de 1 a 10).
// boa = menta, atencao = manga, ruim = coral.
export type Faixa = "boa" | "atencao" | "ruim";

export function faixaDaNota(nota: number): Faixa {
  if (nota >= 8) return "boa";
  if (nota >= 6) return "atencao";
  return "ruim";
}
```

`src/lib/auth/redirect-seguro.ts`:
```ts
// Evita "redirecionamento aberto": um link como /entrar?next=https://golpe.com
// não pode mandar o usuário para fora do nosso site depois do login.
// Só aceitamos caminhos internos, que começam com uma única "/".
export function caminhoSeguro(
  destino: string | null | undefined,
  padrao = "/painel",
): string {
  if (!destino) return padrao;
  if (!destino.startsWith("/")) return padrao;
  // "//site.com" e "/\site.com" são entendidos pelo navegador como outro site
  if (destino.startsWith("//") || destino.startsWith("/\\")) return padrao;
  return destino;
}
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npm test`
Expected: PASS — 2 arquivos, 7 testes.

- [ ] **Step 8: Lint, build e commit**

Run: `npm run lint && npm run build`
Expected: sem erros.

```bash
git add package.json package-lock.json vitest.config.ts src/lib/notas src/lib/auth/redirect-seguro.ts src/lib/auth/redirect-seguro.test.ts
git commit -m "test: configura Vitest e adiciona faixa da nota e redirecionamento seguro"
```

---

### Task 2: Validação dos formulários (zod) e mensagens de erro em português

**Files:**
- Create: `src/lib/auth/esquemas.ts`, `src/lib/auth/esquemas.test.ts`
- Create: `src/lib/auth/mensagens-erro.ts`, `src/lib/auth/mensagens-erro.test.ts`

**Interfaces:**
- Produces (em `@/lib/auth/esquemas`): `esquemaCadastro` → `{ nomeEmpresa: string; email: string; senha: string }`, `esquemaEntrar` → `{ email; senha }`, `esquemaEsqueciSenha` → `{ email }`, `esquemaRedefinirSenha` → `{ senha; confirmacao }`
- Produces (em `@/lib/auth/mensagens-erro`): `mensagemDeErro(codigo?: string): string`

- [ ] **Step 1: Instalar o zod**

Run: `npm install zod`
Then: `npm ls zod`. Expected: versão `4.x`. (Se vier 3.x, pare e avise: a API abaixo é a da v4.)

- [ ] **Step 2: Escrever os testes que falham**

`src/lib/auth/esquemas.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  esquemaCadastro,
  esquemaEntrar,
  esquemaEsqueciSenha,
  esquemaRedefinirSenha,
} from "./esquemas";

function errosDos(resultado: { success: boolean; error?: z.ZodError }) {
  return resultado.error ? z.flattenError(resultado.error).fieldErrors : {};
}

describe("esquemaCadastro", () => {
  it("aceita dados válidos e limpa espaços e maiúsculas do e-mail", () => {
    const r = esquemaCadastro.safeParse({
      nomeEmpresa: "  Bebelu  ",
      email: "  Dono@Bebelu.com.BR ",
      senha: "senhaforte",
    });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({
      nomeEmpresa: "Bebelu",
      email: "dono@bebelu.com.br",
      senha: "senhaforte",
    });
  });

  it("recusa nome vazio, e-mail inválido e senha curta", () => {
    const r = esquemaCadastro.safeParse({ nomeEmpresa: "   ", email: "nao-e-email", senha: "123" });
    expect(r.success).toBe(false);
    const erros = errosDos(r);
    expect(erros.nomeEmpresa?.[0]).toBe("Digite o nome do seu negócio.");
    expect(erros.email?.[0]).toBe("Digite um e-mail válido.");
    expect(erros.senha?.[0]).toBe("A senha precisa ter pelo menos 8 caracteres.");
  });

  it("recusa nome com mais de 100 caracteres e senha com mais de 72", () => {
    const r = esquemaCadastro.safeParse({
      nomeEmpresa: "a".repeat(101),
      email: "a@b.com",
      senha: "x".repeat(73),
    });
    const erros = errosDos(r);
    expect(erros.nomeEmpresa?.[0]).toBe("O nome pode ter no máximo 100 caracteres.");
    expect(erros.senha?.[0]).toBe("A senha pode ter no máximo 72 caracteres.");
  });

  it("recusa campos ausentes (ex.: formulário adulterado)", () => {
    const r = esquemaCadastro.safeParse({ nomeEmpresa: null, email: null, senha: null });
    expect(r.success).toBe(false);
  });
});

describe("esquemaEntrar", () => {
  it("pede a senha mas não exige tamanho mínimo (contas antigas)", () => {
    const vazio = esquemaEntrar.safeParse({ email: "a@b.com", senha: "" });
    expect(errosDos(vazio).senha?.[0]).toBe("Digite sua senha.");
    expect(esquemaEntrar.safeParse({ email: "a@b.com", senha: "123" }).success).toBe(true);
  });
});

describe("esquemaEsqueciSenha", () => {
  it("valida só o e-mail", () => {
    expect(esquemaEsqueciSenha.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(esquemaEsqueciSenha.safeParse({ email: "x" }).success).toBe(false);
  });
});

describe("esquemaRedefinirSenha", () => {
  it("exige as duas senhas iguais", () => {
    const r = esquemaRedefinirSenha.safeParse({ senha: "senhanova1", confirmacao: "senhanova2" });
    expect(errosDos(r).confirmacao?.[0]).toBe("As senhas não são iguais.");
    expect(
      esquemaRedefinirSenha.safeParse({ senha: "senhanova1", confirmacao: "senhanova1" }).success,
    ).toBe(true);
  });
});
```

`src/lib/auth/mensagens-erro.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { mensagemDeErro } from "./mensagens-erro";

describe("mensagemDeErro", () => {
  it("traduz códigos conhecidos do Supabase", () => {
    expect(mensagemDeErro("invalid_credentials")).toBe("E-mail ou senha incorretos.");
    expect(mensagemDeErro("email_not_confirmed")).toBe(
      "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.",
    );
    expect(mensagemDeErro("over_email_send_rate_limit")).toBe(
      "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.",
    );
  });

  it("usa uma mensagem genérica para códigos desconhecidos ou ausentes", () => {
    const generica = "Algo deu errado. Tente de novo em instantes.";
    expect(mensagemDeErro("codigo_que_nao_existe")).toBe(generica);
    expect(mensagemDeErro(undefined)).toBe(generica);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — não encontra `./esquemas` e `./mensagens-erro`.

- [ ] **Step 4: Implementar**

`src/lib/auth/esquemas.ts`:
```ts
import { z } from "zod";

// As mesmas regras valem no servidor. Nunca confiamos só no navegador,
// porque qualquer pessoa pode enviar um formulário "na mão".

const email = z
  .string("Digite um e-mail válido.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Digite um e-mail válido."));

// 72 é o limite do algoritmo de senha (bcrypt) usado pelo Supabase
const senhaNova = z
  .string("A senha precisa ter pelo menos 8 caracteres.")
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

export const esquemaCadastro = z.object({
  nomeEmpresa: z
    .string("Digite o nome do seu negócio.")
    .trim()
    .min(1, "Digite o nome do seu negócio.")
    .max(100, "O nome pode ter no máximo 100 caracteres."),
  email,
  senha: senhaNova,
});

export const esquemaEntrar = z.object({
  email,
  senha: z.string("Digite sua senha.").min(1, "Digite sua senha."),
});

export const esquemaEsqueciSenha = z.object({ email });

export const esquemaRedefinirSenha = z
  .object({ senha: senhaNova, confirmacao: z.string() })
  .refine((dados) => dados.senha === dados.confirmacao, {
    message: "As senhas não são iguais.",
    path: ["confirmacao"],
  });
```

`src/lib/auth/mensagens-erro.ts`:
```ts
// O Supabase devolve códigos em inglês (error.code).
// Aqui traduzimos para mensagens claras em português.
const MENSAGENS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.",
  weak_password: "Essa senha é fraca demais. Use pelo menos 8 caracteres.",
  same_password: "A nova senha precisa ser diferente da atual.",
  over_email_send_rate_limit: "Muitos e-mails enviados. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
};

const GENERICA = "Algo deu errado. Tente de novo em instantes.";

export function mensagemDeErro(codigo?: string): string {
  return (codigo && MENSAGENS[codigo]) || GENERICA;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS — 4 arquivos de teste. Se algum teste de mensagem do zod falhar porque a mensagem veio diferente, confira em `node_modules/zod` como a v4 recebe a mensagem (`z.string("msg")` define o erro de tipo) e ajuste **o código**, não o texto esperado.

- [ ] **Step 6: Lint, build e commit**

Run: `npm run lint && npm run build`

```bash
git add package.json package-lock.json src/lib/auth
git commit -m "feat: validação dos formulários de login com zod e mensagens de erro em português"
```

---

### Task 3: Banco de dados — tabela `empresas`, trigger, RLS e prova de segurança

**Files:**
- Create: `supabase/migrations/20261003000000_empresas.sql`
- Create: `supabase/tests/rls_empresas.sql`
- Create: `src/lib/supabase/database.types.ts` (gerado)
- Modify: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`

**Interfaces:**
- Produces: tabela `public.empresas (id, nome, owner_id, created_at)`; o metadado de cadastro **`nome_empresa`** vira `empresas.nome`
- Produces: tipo `Database` em `@/lib/supabase/database.types`; `createClient()` dos dois arquivos passa a ser tipado com ele

- [ ] **Step 1: Escrever o teste de segurança primeiro**

`supabase/tests/rls_empresas.sql`:
```sql
-- Prova de segurança da tabela empresas.
-- Roda tudo dentro de uma transação e desfaz no final (rollback): não deixa lixo.
-- Se algo estiver errado, para com uma mensagem "FALHOU: ...".
begin;

-- Dois usuários de teste. O trigger deve criar uma empresa para cada.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'teste-a@exemplo.com', '{"nome_empresa":"Empresa A"}', now(), now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'teste-b@exemplo.com', '{"nome_empresa":"  Empresa B  "}', now(), now()),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'teste-c@exemplo.com', '{}', now(), now());

do $$
begin
  if (select count(*) from public.empresas where owner_id in (
        '00000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-00000000000c')) <> 3 then
    raise exception 'FALHOU: o trigger não criou uma empresa para cada usuário';
  end if;
  if (select nome from public.empresas where owner_id = '00000000-0000-0000-0000-00000000000b') <> 'Empresa B' then
    raise exception 'FALHOU: o nome não teve os espaços removidos';
  end if;
  if (select nome from public.empresas where owner_id = '00000000-0000-0000-0000-00000000000c') <> 'Meu negócio' then
    raise exception 'FALHOU: sem nome, deveria usar "Meu negócio"';
  end if;
end $$;

-- A partir daqui agimos como o usuário A logado
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

do $$
begin
  if (select count(*) from public.empresas) <> 1 then
    raise exception 'FALHOU: o usuário A enxerga empresas que não são dele';
  end if;

  -- Tentar renomear a empresa B não pode afetar nada
  update public.empresas set nome = 'Hackeado'
   where owner_id = '00000000-0000-0000-0000-00000000000b';

  -- Renomear a própria empresa pode
  update public.empresas set nome = 'Empresa A renomeada'
   where owner_id = '00000000-0000-0000-0000-00000000000a';
  if (select nome from public.empresas) <> 'Empresa A renomeada' then
    raise exception 'FALHOU: o dono não conseguiu renomear a própria empresa';
  end if;

  -- Criar empresa pela API: proibido
  begin
    insert into public.empresas (nome, owner_id)
    values ('Falsa', '00000000-0000-0000-0000-00000000000a');
    raise exception 'FALHOU: o usuário conseguiu criar empresa pela API';
  exception when insufficient_privilege then null;
  end;

  -- Trocar o dono da empresa: proibido
  begin
    update public.empresas set owner_id = '00000000-0000-0000-0000-00000000000b'
     where owner_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALHOU: o usuário conseguiu trocar o dono da empresa';
  exception when insufficient_privilege then null;
  end;

  -- Apagar empresa pela API: proibido
  begin
    delete from public.empresas;
    raise exception 'FALHOU: o usuário conseguiu apagar empresa pela API';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Agora como visitante sem login (anon)
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $$
begin
  begin
    perform count(*) from public.empresas;
    raise exception 'FALHOU: visitante sem login consegue ler empresas';
  exception when insufficient_privilege then null;
  end;
end $$;

-- De volta como administrador para conferir que nada vazou
reset role;
do $$
begin
  if (select nome from public.empresas where owner_id = '00000000-0000-0000-0000-00000000000b') <> 'Empresa B' then
    raise exception 'FALHOU: o usuário A conseguiu alterar a empresa B';
  end if;
  if (select count(*) from public.empresas where owner_id in (
        '00000000-0000-0000-0000-00000000000a',
        '00000000-0000-0000-0000-00000000000b',
        '00000000-0000-0000-0000-00000000000c')) <> 3 then
    raise exception 'FALHOU: alguma empresa foi apagada';
  end if;
end $$;

select 'TODOS OS TESTES DE SEGURANÇA PASSARAM' as resultado;
rollback;
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `mcp__supabase__execute_sql` com `project_id: "cvgayvfqzrbdqmlsvcal"` e o conteúdo do arquivo.
Expected: erro `relation "public.empresas" does not exist`.

- [ ] **Step 3: Escrever a migração**

`supabase/migrations/20261003000000_empresas.sql`:
```sql
-- Etapa 2: empresas
-- Cada conta (auth.users) é dona de exatamente uma empresa.

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 100),
  owner_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.empresas is 'Negócios que usam o Satisfeito. Uma por conta.';

-- RLS: sem uma policy, ninguém acessa nada
alter table public.empresas enable row level security;

create policy "dono lê a própria empresa"
  on public.empresas for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "dono edita a própria empresa"
  on public.empresas for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Permissões por coluna: visitante não toca na tabela;
-- usuário logado só lê e só pode alterar o nome (nunca o owner_id).
-- Inserir e apagar: ninguém pela API (só o trigger cria).
revoke all on public.empresas from anon, authenticated;
grant select on public.empresas to authenticated;
grant update (nome) on public.empresas to authenticated;

-- Cria a empresa automaticamente quando alguém se cadastra.
-- security definer: roda com permissão do dono da função (precisa inserir
-- mesmo sem policy de insert). search_path vazio evita que alguém troque
-- as tabelas que a função usa.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.empresas (nome, owner_id)
  values (
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'nome_empresa'), 100), ''), 'Meu negócio'),
    new.id
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 4: Aplicar a migração**

Run: `mcp__supabase__apply_migration` com `project_id: "cvgayvfqzrbdqmlsvcal"`, `name: "empresas"`, `query`: conteúdo do arquivo.
Expected: sucesso.

- [ ] **Step 5: Rodar o teste de segurança e ver passar**

Run: `mcp__supabase__execute_sql` com o conteúdo de `supabase/tests/rls_empresas.sql`.
Expected: `TODOS OS TESTES DE SEGURANÇA PASSARAM`, sem nenhum `FALHOU`.
Depois confira que nada ficou para trás: `select count(*) from auth.users where email like 'teste-%@exemplo.com';` → `0`.

- [ ] **Step 6: Verificador de segurança do Supabase**

Run: `mcp__supabase__get_advisors` com `type: "security"` e depois `type: "performance"`.
Expected: nenhum alerta sobre `empresas` ou `handle_new_user`. Se aparecer o alerta de função `security definer` exposta no schema `public`, mova a função para um schema `private` (crie `create schema if not exists private;`, recrie a função lá e aponte o trigger para `private.handle_new_user()`), salve isso numa nova migração e rode o teste do Step 5 de novo.

- [ ] **Step 7: Gerar os tipos TypeScript**

Run: `mcp__supabase__generate_typescript_types` com `project_id: "cvgayvfqzrbdqmlsvcal"`.
Salve o conteúdo retornado, exatamente como veio, em `src/lib/supabase/database.types.ts`.

- [ ] **Step 8: Tipar os clientes e deixar cookies seguros em produção**

`src/lib/supabase/client.ts` (substituir tudo):
```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Cliente para usar em Client Components (arquivos com "use client"),
// ou seja, código que roda no navegador do usuário.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    // Em produção (HTTPS), o cookie da sessão só trafega por conexão segura
    { cookieOptions: { secure: process.env.NODE_ENV === "production" } },
  );
}
```

`src/lib/supabase/server.ts` (substituir tudo):
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Cliente para usar no servidor: Server Components, Server Actions e Route Handlers.
// Ele lê a sessão do usuário a partir dos cookies da requisição, então o
// Supabase sabe "quem está pedindo" e o RLS consegue filtrar os dados.
// Crie um cliente novo a cada requisição (não guarde em variável global).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components não podem gravar cookies. Tudo bem ignorar:
            // o proxy (src/proxy.ts) cuida de renovar a sessão.
          }
        },
      },
    },
  );
}
```

- [ ] **Step 9: Lint, build, testes e commit**

Run: `npm run lint && npm run build && npm test`
Expected: tudo passa. A página inicial ainda mostra "Conectado ao Supabase ✅", agora sem o aviso de tabela inexistente.

```bash
git add supabase src/lib/supabase
git commit -m "feat: tabela empresas com RLS, trigger de cadastro e teste de segurança"
```

---

### Task 4: Base visual — shadcn/ui, tokens da marca, fonte, logo e página inicial

**Files:**
- Create (gerados): `components.json`, `src/lib/utils.ts`, `src/components/ui/{button,input,label,card,alert}.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/components/marca/logo.tsx`, `src/components/formulario/erro-do-campo.tsx`

**Interfaces:**
- Produces: `<Logo className? pequeno? />` em `@/components/marca/logo`
- Produces: `<ErroDoCampo id erros? />` em `@/components/formulario/erro-do-campo`
- Produces: classes Tailwind da marca: `bg-coral`, `text-coral-texto`, `text-coral-escuro`, `bg-manga`, `bg-manga-claro`, `text-manga`, `text-manga-texto`, `bg-menta`, `bg-menta-claro`, `text-menta-texto`, `bg-ameixa`, `text-ameixa`, `bg-creme`
- Produces: componentes `Button`, `Input`, `Label`, `Card*`, `Alert`/`AlertDescription` em `@/components/ui/*`

- [ ] **Step 1: Iniciar o shadcn**

Run: `npx shadcn@latest init --help` e confira as opções desta versão.
Depois: `npx shadcn@latest init` aceitando os padrões, com **base color: Neutral**.
Expected: cria `components.json` e `src/lib/utils.ts`, e altera `src/app/globals.css`. Anote quais pacotes ele instalou (`git diff package.json`) para explicar ao Caio.

- [ ] **Step 2: Adicionar os componentes**

Run: `npx shadcn@latest add button input label card alert`
Expected: arquivos em `src/components/ui/`.

- [ ] **Step 3: Tokens da marca no `globals.css`**

No `src/app/globals.css` gerado:
1. Substitua o bloco `:root { ... }` inteiro por:
```css
:root {
  /* Marca satisfeito?! */
  --coral: #ff5a4e;
  --coral-texto: #ee4638; /* coral um tom mais escuro: passa contraste em texto grande */
  --coral-escuro: #c2321f; /* coral para texto pequeno */
  --manga: #ffc23c;
  --manga-claro: #fff1cc;
  --manga-texto: #8f6500; /* amarelo legível em texto pequeno */
  --menta: #14b8a6;
  --menta-claro: #d5f5f0;
  --menta-texto: #0b6b60;
  --ameixa: #2a1f2d;
  --creme: #fff8f3;

  /* Tema do shadcn apontando para a marca */
  --radius: 0.875rem;
  --background: var(--creme);
  --foreground: var(--ameixa);
  --card: #ffffff;
  --card-foreground: var(--ameixa);
  --popover: #ffffff;
  --popover-foreground: var(--ameixa);
  --primary: var(--ameixa);
  --primary-foreground: var(--creme);
  --secondary: #ffede8;
  --secondary-foreground: var(--ameixa);
  --muted: #f1e9e5;
  --muted-foreground: #6b5f6e;
  --accent: var(--manga-claro);
  --accent-foreground: var(--ameixa);
  --destructive: var(--coral-escuro);
  --border: #e9dcd6;
  --input: #e9dcd6;
  --ring: var(--coral-texto);
}
```
2. Apague o bloco `.dark { ... }` (por enquanto só tema claro; modo escuro fica para depois).
3. Dentro do bloco `@theme inline { ... }` que já existe, adicione:
```css
  --font-sans: var(--font-bricolage);
  --color-coral: var(--coral);
  --color-coral-texto: var(--coral-texto);
  --color-coral-escuro: var(--coral-escuro);
  --color-manga: var(--manga);
  --color-manga-claro: var(--manga-claro);
  --color-manga-texto: var(--manga-texto);
  --color-menta: var(--menta);
  --color-menta-claro: var(--menta-claro);
  --color-menta-texto: var(--menta-texto);
  --color-ameixa: var(--ameixa);
  --color-creme: var(--creme);
```
Se o bloco tiver linhas `--font-sans`/`--font-mono` apontando para Geist, troque/remova para não ficarem duplicadas.

- [ ] **Step 4: Layout com a fonte e o idioma**

`src/app/layout.tsx` (substituir tudo):
```tsx
import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "satisfeito?!", template: "%s · satisfeito?!" },
  description: "Pesquisa de satisfação rápida para negócios locais.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Logo e erro de campo**

`src/components/marca/logo.tsx`:
```tsx
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  /** Use em tamanhos pequenos: troca o "!" por um amarelo mais escuro e legível */
  pequeno?: boolean;
};

// O leitor de tela lê só "Satisfeito"; as cores são decoração.
export function Logo({ className, pequeno = false }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="Satisfeito"
      className={cn("font-extrabold leading-none tracking-tight text-ameixa", className)}
    >
      <span aria-hidden="true">
        satisfeito
        <span className="text-coral-texto">?</span>
        <span className={pequeno ? "text-manga-texto" : "text-manga"}>!</span>
      </span>
    </span>
  );
}
```

`src/components/formulario/erro-do-campo.tsx`:
```tsx
// Mensagem de erro que aparece logo abaixo de um campo do formulário.
// O id é ligado ao campo por aria-describedby, para leitores de tela.
export function ErroDoCampo({ id, erros }: { id: string; erros?: string[] }) {
  if (!erros?.length) return null;
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {erros[0]}
    </p>
  );
}
```

- [ ] **Step 6: Página inicial**

`src/app/page.tsx` (substituir tudo — sai a página de teste de conexão):
```tsx
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <Logo className="text-5xl sm:text-6xl" />
      <h1 className="mt-8 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
        Descubra o que seus clientes acham, em 30 segundos.
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        Um QR code na mesa, uma pesquisa rápida no celular e um painel que mostra o que
        melhorar no seu negócio.
      </p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Button asChild size="lg" className="bg-coral text-ameixa hover:bg-coral/90">
          <Link href="/cadastro">Criar conta grátis</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Verificar no navegador**

Run: `npm run lint && npm run build && npm test`
Depois `npm run dev` e abra `http://localhost:3000` em largura de celular (375px) e de computador: logo com "?" coral e "!" manga, fonte Bricolage, fundo creme, botão coral com texto escuro. Compare com `docs/design/identidade-visual-aprovada.html`. Rode o detector de design (`impeccable detect src/app src/components`) e corrija contrastes, exceto o "!" manga do logo grande.

- [ ] **Step 8: Commit**

```bash
git add components.json package.json package-lock.json src/app src/components src/lib/utils.ts
git commit -m "feat: identidade visual satisfeito?! com shadcn/ui, tokens da marca e página inicial"
```

---

### Task 5: Proxy (sessão e proteção de rotas) e cabeçalhos de segurança

**Files:**
- Create: `src/lib/supabase/proxy.ts`, `src/proxy.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: tipo `Database` (Task 3)
- Produces: `atualizarSessao(request: NextRequest): Promise<NextResponse>` em `@/lib/supabase/proxy`
- Comportamento: sem login em `/painel*` ou `/redefinir-senha*` → `307` para `/entrar?next=<caminho>`; logado em `/entrar*` ou `/cadastro*` → `307` para `/painel`

- [ ] **Step 1: Lógica da sessão**

`src/lib/supabase/proxy.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

// Páginas que exigem login
const ROTAS_PROTEGIDAS = ["/painel", "/redefinir-senha"];
// Páginas que não fazem sentido para quem já está logado
const ROTAS_SO_VISITANTE = ["/entrar", "/cadastro"];

function estaEm(caminho: string, rotas: string[]) {
  return rotas.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
}

// Roda antes de cada página: renova o token da sessão (se venceu)
// e devolve os cookies atualizados para o navegador.
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Atualiza os cookies para as páginas desta requisição...
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          // ...e para o navegador
          cookiesToSet.forEach(({ name, value, options }) =>
            resposta.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([chave, valor]) => resposta.headers.set(chave, valor));
        },
      },
    },
  );

  // IMPORTANTE: não coloque código entre createServerClient e getClaims().
  // getClaims() confere a assinatura do token; é ele que renova a sessão.
  const { data } = await supabase.auth.getClaims();
  const logado = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!logado && estaEm(pathname, ROTAS_PROTEGIDAS)) {
    const url = request.nextUrl.clone();
    url.pathname = "/entrar";
    url.search = "";
    url.searchParams.set("next", pathname);
    return redirecionarMantendoCookies(url, resposta);
  }

  if (logado && estaEm(pathname, ROTAS_SO_VISITANTE)) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    url.search = "";
    return redirecionarMantendoCookies(url, resposta);
  }

  return resposta;
}

// Um redirecionamento é uma resposta nova: copiamos os cookies renovados
// para ela, senão o usuário perderia a sessão.
function redirecionarMantendoCookies(url: URL, base: NextResponse) {
  const redirecionamento = NextResponse.redirect(url);
  base.cookies.getAll().forEach((cookie) => redirecionamento.cookies.set(cookie));
  return redirecionamento;
}
```

- [ ] **Step 2: Ponto de entrada do proxy**

`src/proxy.ts`:
```ts
import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await atualizarSessao(request);
}

export const config = {
  matcher: [
    // Roda em tudo, menos arquivos estáticos e imagens
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3: Cabeçalhos de segurança**

`next.config.ts` (substituir tudo):
```ts
import type { NextConfig } from "next";

// Cabeçalhos enviados em todas as páginas
const cabecalhosDeSeguranca = [
  // Impede que o site seja embutido em outro (golpe de "clique falso")
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // O navegador não tenta "adivinhar" o tipo dos arquivos
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não vaza o endereço completo da página para outros sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O site não usa câmera, microfone nem localização
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosDeSeguranca }];
  },
};

export default nextConfig;
```

- [ ] **Step 4: Verificar**

Run: `npm run lint && npm run build && npm test`
Depois, com `npm run dev` rodando:
- `curl -sI http://localhost:3000/painel` → `HTTP/1.1 307` com `location: /entrar?next=%2Fpainel`
- `curl -sI http://localhost:3000/` → `200` com os cabeçalhos `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy`, `permissions-policy`

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/lib/supabase/proxy.ts next.config.ts
git commit -m "feat: proxy que renova a sessão e protege rotas, mais cabeçalhos de segurança"
```

---

### Task 6: Telas Entrar e Cadastro

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/actions.ts`
- Create: `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/entrar/formulario-entrar.tsx`
- Create: `src/app/(auth)/cadastro/page.tsx`, `src/app/(auth)/cadastro/formulario-cadastro.tsx`
- Create: `src/app/(auth)/cadastro/verifique-email/page.tsx`

**Interfaces:**
- Consumes: `esquemaCadastro`, `esquemaEntrar` (Task 2); `mensagemDeErro` (Task 2); `caminhoSeguro` (Task 1); `createClient` de `@/lib/supabase/server`; `Logo`, `ErroDoCampo`, componentes `ui` (Task 4)
- Produces: `type EstadoFormulario = { erro?: string; sucesso?: string; erros?: Record<string, string[] | undefined>; valores?: Record<string, string> }` e Server Actions `entrar`, `cadastrar` em `src/app/(auth)/actions.ts` (Task 7 acrescenta `esqueciSenha` e `redefinirSenha` no mesmo arquivo)

- [ ] **Step 1: Moldura das telas de login**

`src/app/(auth)/layout.tsx`:
```tsx
import Link from "next/link";
import { Logo } from "@/components/marca/logo";

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 rounded-md" aria-label="Página inicial">
        <Logo className="text-4xl" />
      </Link>
      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)] sm:p-8">
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Server Actions**

`src/app/(auth)/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { esquemaCadastro, esquemaEntrar } from "@/lib/auth/esquemas";
import { mensagemDeErro } from "@/lib/auth/mensagens-erro";
import { caminhoSeguro } from "@/lib/auth/redirect-seguro";
import { createClient } from "@/lib/supabase/server";

// O que a action devolve para o formulário mostrar na tela
export type EstadoFormulario = {
  erro?: string;
  sucesso?: string;
  erros?: Record<string, string[] | undefined>;
  // Valores digitados (nunca a senha), para o formulário não "apagar" após um erro
  valores?: Record<string, string>;
};

function texto(formData: FormData, campo: string) {
  const valor = formData.get(campo);
  return typeof valor === "string" ? valor : "";
}

export async function entrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = { email: texto(formData, "email"), senha: texto(formData, "senha") };
  const valores = { email: dados.email };

  const resultado = esquemaEntrar.safeParse(dados);
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors, valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resultado.data.email,
    password: resultado.data.senha,
  });
  if (error) return { erro: mensagemDeErro(error.code), valores };

  redirect(caminhoSeguro(texto(formData, "next")));
}

export async function cadastrar(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = {
    nomeEmpresa: texto(formData, "nomeEmpresa"),
    email: texto(formData, "email"),
    senha: texto(formData, "senha"),
  };
  const valores = { nomeEmpresa: dados.nomeEmpresa, email: dados.email };

  const resultado = esquemaCadastro.safeParse(dados);
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors, valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: resultado.data.email,
    password: resultado.data.senha,
    // Vai para raw_user_meta_data; o trigger do banco usa para criar a empresa
    options: { data: { nome_empresa: resultado.data.nomeEmpresa } },
  });
  if (error) return { erro: mensagemDeErro(error.code), valores };

  // Mesmo que o e-mail já tenha conta, o Supabase responde "ok" sem enviar nada:
  // assim ninguém descobre quais e-mails estão cadastrados.
  redirect("/cadastro/verifique-email");
}
```

- [ ] **Step 3: Formulário Entrar**

`src/app/(auth)/entrar/formulario-entrar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { entrar, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioEntrar({ next }: { next?: string }) {
  // useActionState: chama a Server Action e guarda o que ela devolveu.
  // "pendente" fica true enquanto o servidor responde.
  const [estado, acao, pendente] = useActionState(entrar, estadoInicial);

  return (
    <form action={acao} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />

      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={estado.valores?.email}
          aria-invalid={Boolean(estado.erros?.email)}
          aria-describedby={estado.erros?.email ? "email-erro" : undefined}
        />
        <ErroDoCampo id="email-erro" erros={estado.erros?.email} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link href="/esqueci-senha" className="text-sm underline underline-offset-4">
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(estado.erros?.senha)}
          aria-describedby={estado.erros?.senha ? "senha-erro" : undefined}
        />
        <ErroDoCampo id="senha-erro" erros={estado.erros?.senha} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-coral-escuro underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Página Entrar**

`src/app/(auth)/entrar/page.tsx`:
```tsx
import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormularioEntrar } from "./formulario-entrar";

export const metadata: Metadata = { title: "Entrar" };

const AVISOS: Record<string, string> = {
  "link-invalido": "Esse link expirou ou já foi usado. Entre com sua senha ou peça um novo.",
};

export default async function PaginaEntrar({ searchParams }: PageProps<"/entrar">) {
  const { next, erro } = await searchParams;
  const aviso = typeof erro === "string" ? AVISOS[erro] : undefined;

  return (
    <>
      <h1 className="text-2xl font-semibold">Que bom te ver de novo</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Entre para ver o que seus clientes acharam.
      </p>
      {aviso && (
        <Alert className="mb-4">
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}
      <FormularioEntrar next={typeof next === "string" ? next : undefined} />
    </>
  );
}
```

- [ ] **Step 5: Formulário e página Cadastro**

`src/app/(auth)/cadastro/formulario-cadastro.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cadastrar, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioCadastro() {
  const [estado, acao, pendente] = useActionState(cadastrar, estadoInicial);

  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="nomeEmpresa">Nome do seu negócio</Label>
        <Input
          id="nomeEmpresa"
          name="nomeEmpresa"
          autoComplete="organization"
          placeholder="Ex.: Lanchonete Bebelu"
          maxLength={100}
          required
          defaultValue={estado.valores?.nomeEmpresa}
          aria-invalid={Boolean(estado.erros?.nomeEmpresa)}
          aria-describedby={estado.erros?.nomeEmpresa ? "nome-erro" : undefined}
        />
        <ErroDoCampo id="nome-erro" erros={estado.erros?.nomeEmpresa} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={estado.valores?.email}
          aria-invalid={Boolean(estado.erros?.email)}
          aria-describedby={estado.erros?.email ? "email-erro" : undefined}
        />
        <ErroDoCampo id="email-erro" erros={estado.erros?.email} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          aria-invalid={Boolean(estado.erros?.senha)}
          aria-describedby={estado.erros?.senha ? "senha-erro" : "senha-dica"}
        />
        {estado.erros?.senha ? (
          <ErroDoCampo id="senha-erro" erros={estado.erros.senha} />
        ) : (
          <p id="senha-dica" className="text-sm text-muted-foreground">
            Pelo menos 8 caracteres.
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full bg-coral text-ameixa hover:bg-coral/90"
        disabled={pendente}
      >
        {pendente ? "Criando conta…" : "Criar conta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-semibold text-coral-escuro underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
```

`src/app/(auth)/cadastro/page.tsx`:
```tsx
import type { Metadata } from "next";
import { FormularioCadastro } from "./formulario-cadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function PaginaCadastro() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Crie sua conta</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Em poucos minutos sua primeira pesquisa está no ar.
      </p>
      <FormularioCadastro />
    </>
  );
}
```

- [ ] **Step 6: Tela "Confira seu e-mail"**

`src/app/(auth)/cadastro/verifique-email/page.tsx`:
```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Confira seu e-mail" };

export default function PaginaVerifiqueEmail() {
  return (
    <div className="text-center">
      <div aria-hidden="true" className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-manga-claro text-3xl">
        ✉️
      </div>
      <h1 className="text-2xl font-semibold">Confira seu e-mail</h1>
      <p className="mt-2 text-muted-foreground">
        Enviamos um link de confirmação. Abra o e-mail e toque no link para ativar sua conta.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Não chegou? Olhe a caixa de spam ou espere alguns minutos.
      </p>
      <Link href="/entrar" className="mt-6 inline-block text-sm font-semibold underline underline-offset-4">
        Voltar para Entrar
      </Link>
    </div>
  );
}
```

- [ ] **Step 7: Verificar**

Run: `npm run lint && npm run build && npm test`
Com `npm run dev`:
- `/entrar` e `/cadastro` abrem, no celular (375px) e no computador.
- Enviar o cadastro vazio → mensagens em português embaixo de cada campo, sem perder o que foi digitado.
- Entrar com senha errada num e-mail qualquer → "E-mail ou senha incorretos."
- Usar o teclado: Tab percorre os campos na ordem e o foco é visível.
- (O e-mail de confirmação de verdade só é testado na Task 9, depois da configuração do painel do Supabase.)

- [ ] **Step 8: Commit**

```bash
git add "src/app/(auth)"
git commit -m "feat: telas de entrar e cadastro com Server Actions e validação"
```

---

### Task 7: Confirmação por e-mail e recuperação de senha

**Files:**
- Create: `src/app/auth/confirm/route.ts`
- Modify: `src/app/(auth)/actions.ts` (adicionar `esqueciSenha` e `redefinirSenha`)
- Create: `src/app/(auth)/esqueci-senha/page.tsx`, `src/app/(auth)/esqueci-senha/formulario-esqueci-senha.tsx`
- Create: `src/app/(auth)/redefinir-senha/page.tsx`, `src/app/(auth)/redefinir-senha/formulario-redefinir-senha.tsx`

**Interfaces:**
- Consumes: `EstadoFormulario`, `texto()` (Task 6, mesmo arquivo); `esquemaEsqueciSenha`, `esquemaRedefinirSenha`, `mensagemDeErro` (Task 2); `caminhoSeguro` (Task 1)
- Produces: rota `GET /auth/confirm?token_hash=…&type=email|recovery&next=/…`; actions `esqueciSenha`, `redefinirSenha`
- Os e-mails do Supabase apontarão para essa rota (configuração da Task 9):
  - Confirmar cadastro: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
  - Redefinir senha: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`

- [ ] **Step 1: Rota de confirmação**

`src/app/auth/confirm/route.ts`:
```ts
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { caminhoSeguro } from "@/lib/auth/redirect-seguro";
import { createClient } from "@/lib/supabase/server";

// O link do e-mail traz um token_hash. Aqui trocamos esse token por uma sessão
// (cookies) e mandamos a pessoa para dentro do sistema, já logada.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = caminhoSeguro(searchParams.get("next"));

  if (tokenHash && tipo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(destino, request.url));
    }
  }

  // Link vencido, já usado ou adulterado
  return NextResponse.redirect(new URL("/entrar?erro=link-invalido", request.url));
}
```

- [ ] **Step 2: Novas actions**

Em `src/app/(auth)/actions.ts`:
1. Troque o import dos esquemas por:
```ts
import {
  esquemaCadastro,
  esquemaEntrar,
  esquemaEsqueciSenha,
  esquemaRedefinirSenha,
} from "@/lib/auth/esquemas";
```
2. Acrescente no fim do arquivo:
```ts
export async function esqueciSenha(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const dados = { email: texto(formData, "email") };
  const valores = { email: dados.email };

  const resultado = esquemaEsqueciSenha.safeParse(dados);
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors, valores };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(resultado.data.email);

  // Só mostramos erro de "muitas tentativas". Qualquer outro caso recebe a
  // mesma resposta, para não revelar se o e-mail tem conta ou não.
  if (error?.code?.startsWith("over_")) {
    return { erro: mensagemDeErro(error.code), valores };
  }
  return {
    sucesso: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.",
  };
}

export async function redefinirSenha(
  _estadoAnterior: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const resultado = esquemaRedefinirSenha.safeParse({
    senha: texto(formData, "senha"),
    confirmacao: texto(formData, "confirmacao"),
  });
  if (!resultado.success) {
    return { erros: z.flattenError(resultado.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: resultado.data.senha });
  if (error) return { erro: mensagemDeErro(error.code) };

  redirect("/painel");
}
```

- [ ] **Step 3: Esqueci a senha**

`src/app/(auth)/esqueci-senha/formulario-esqueci-senha.tsx`:
```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esqueciSenha, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioEsqueciSenha() {
  const [estado, acao, pendente] = useActionState(esqueciSenha, estadoInicial);

  if (estado.sucesso) {
    return (
      <div className="space-y-4">
        <Alert role="status">
          <AlertDescription>{estado.sucesso}</AlertDescription>
        </Alert>
        <Link href="/entrar" className="block text-center text-sm font-semibold underline underline-offset-4">
          Voltar para Entrar
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">E-mail da conta</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={estado.valores?.email}
          aria-invalid={Boolean(estado.erros?.email)}
          aria-describedby={estado.erros?.email ? "email-erro" : undefined}
        />
        <ErroDoCampo id="email-erro" erros={estado.erros?.email} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Enviando…" : "Enviar link"}
      </Button>

      <Link href="/entrar" className="block text-center text-sm underline underline-offset-4">
        Lembrei a senha
      </Link>
    </form>
  );
}
```

`src/app/(auth)/esqueci-senha/page.tsx`:
```tsx
import type { Metadata } from "next";
import { FormularioEsqueciSenha } from "./formulario-esqueci-senha";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function PaginaEsqueciSenha() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Esqueceu a senha?</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Digite seu e-mail e enviaremos um link para você criar uma nova.
      </p>
      <FormularioEsqueciSenha />
    </>
  );
}
```

- [ ] **Step 4: Redefinir a senha**

`src/app/(auth)/redefinir-senha/formulario-redefinir-senha.tsx`:
```tsx
"use client";

import { useActionState } from "react";
import { ErroDoCampo } from "@/components/formulario/erro-do-campo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redefinirSenha, type EstadoFormulario } from "../actions";

const estadoInicial: EstadoFormulario = {};

export function FormularioRedefinirSenha() {
  const [estado, acao, pendente] = useActionState(redefinirSenha, estadoInicial);

  return (
    <form action={acao} className="space-y-4" noValidate>
      {estado.erro && (
        <Alert variant="destructive">
          <AlertDescription>{estado.erro}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="senha">Nova senha</Label>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          aria-invalid={Boolean(estado.erros?.senha)}
          aria-describedby={estado.erros?.senha ? "senha-erro" : "senha-dica"}
        />
        {estado.erros?.senha ? (
          <ErroDoCampo id="senha-erro" erros={estado.erros.senha} />
        ) : (
          <p id="senha-dica" className="text-sm text-muted-foreground">
            Pelo menos 8 caracteres.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmacao">Repita a nova senha</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(estado.erros?.confirmacao)}
          aria-describedby={estado.erros?.confirmacao ? "confirmacao-erro" : undefined}
        />
        <ErroDoCampo id="confirmacao-erro" erros={estado.erros?.confirmacao} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
```

`src/app/(auth)/redefinir-senha/page.tsx`:
```tsx
import type { Metadata } from "next";
import { FormularioRedefinirSenha } from "./formulario-redefinir-senha";

export const metadata: Metadata = { title: "Nova senha" };

// Protegida pelo proxy: só chega aqui quem abriu o link do e-mail (sessão de recuperação)
export default function PaginaRedefinirSenha() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Crie uma nova senha</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Escolha uma senha que você não use em outros sites.
      </p>
      <FormularioRedefinirSenha />
    </>
  );
}
```

- [ ] **Step 5: Verificar**

Run: `npm run lint && npm run build && npm test`
Com `npm run dev`:
- `curl -sI "http://localhost:3000/auth/confirm?token_hash=falso&type=email"` → `307` para `/entrar?erro=link-invalido`; abrir no navegador mostra o aviso.
- `curl -sI "http://localhost:3000/auth/confirm?token_hash=falso&type=email&next=https://golpe.com"` → continua indo para `/entrar?erro=link-invalido` (nunca para fora).
- `/esqueci-senha` com qualquer e-mail válido → mensagem neutra "Se existir uma conta…".
- `/redefinir-senha` sem login → redireciona para `/entrar?next=%2Fredefinir-senha`.

- [ ] **Step 6: Commit**

```bash
git add src/app/auth "src/app/(auth)"
git commit -m "feat: confirmação de e-mail e recuperação de senha"
```

---

### Task 8: Painel protegido e botão Sair

**Files:**
- Create: `src/app/painel/actions.ts`, `src/app/painel/layout.tsx`, `src/app/painel/page.tsx`

**Interfaces:**
- Consumes: `createClient` (servidor, tipado), `Logo`, `Button`
- Produces: action `sair()`; página `/painel` que mostra `empresas.nome` do usuário logado

- [ ] **Step 1: Action Sair**

`src/app/painel/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
```

- [ ] **Step 2: Layout do painel**

`src/app/painel/layout.tsx`:
```tsx
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";
import { sair } from "./actions";

export default function LayoutPainel({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/painel" className="rounded-md" aria-label="Painel">
            <Logo className="text-2xl" />
          </Link>
          <form action={sair}>
            <Button type="submit" variant="ghost">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Página do painel**

`src/app/painel/page.tsx`:
```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Painel" };

export default async function PaginaPainel() {
  const supabase = await createClient();

  // Segunda camada de proteção: o proxy já barra quem não está logado,
  // mas a página confere de novo, verificando a assinatura do token.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/entrar");

  // Não precisamos filtrar por usuário: o RLS do banco só devolve a empresa dele
  const { data: empresa } = await supabase.from("empresas").select("nome").maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground">Bem-vindo ao seu painel</p>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {empresa?.nome ?? "tudo bem"}{" "}
          <span aria-hidden="true">👋</span>
        </h1>
      </div>

      <section className="rounded-3xl bg-card p-6 shadow-[0_8px_24px_rgba(42,31,45,0.08)]">
        <h2 className="text-lg font-semibold">Tudo pronto por aqui</h2>
        <p className="mt-1 text-muted-foreground">
          Em breve você vai cadastrar seus funcionários, criar pesquisas e acompanhar as notas
          dos seus clientes neste painel.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `npm run lint && npm run build && npm test`
- `curl -sI http://localhost:3000/painel` sem login → `307` para `/entrar?next=%2Fpainel`.
- (O fluxo logado completo é testado na Task 9.)

- [ ] **Step 5: Commit**

```bash
git add src/app/painel
git commit -m "feat: painel protegido com o nome da empresa e botão sair"
```

---

### Task 9: Configuração do Supabase (Caio), teste completo, revisões e documentação

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Configuração manual no painel do Supabase (o Caio faz, com orientação)**

Projeto `satisfeito` → https://supabase.com/dashboard/project/cvgayvfqzrbdqmlsvcal
1. **Authentication → URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: adicionar `http://localhost:3000/**`
2. **Authentication → Emails → Templates → Confirm signup**: trocar `{{ .ConfirmationURL }}` por
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   (aproveitar para traduzir o texto do e-mail para português)
3. **Authentication → Emails → Templates → Reset password**: trocar `{{ .ConfirmationURL }}` por
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/redefinir-senha`
4. **Authentication → Providers (ou Sign In / Providers) → Email**: "Confirm email" ligado; senha mínima **8**.

Aviso: no plano gratuito, o e-mail padrão do Supabase **só entrega para e-mails da equipe do projeto** (o e-mail da conta do Caio) e tem limite de poucos envios por hora. Use o e-mail da conta do Supabase nos testes.

- [ ] **Step 2: Teste completo no navegador**

Com `npm run dev`, em largura de celular e de computador:
1. `/cadastro` com o nome "Bebelu (teste)", o e-mail da conta do Caio e uma senha de 8+ caracteres → "Confira seu e-mail".
2. Abrir o e-mail → clicar no link → cai em `/painel` mostrando "Olá, Bebelu (teste) 👋".
3. Conferir no banco: `select nome, owner_id from public.empresas;` → 1 linha com o nome.
4. **Sair** → vai para `/entrar`; abrir `/painel` → volta para `/entrar?next=%2Fpainel`.
5. Entrar com a senha → vai para o painel. Estando logado, abrir `/entrar` → vai para `/painel`.
6. Sair → `/esqueci-senha` → e-mail → link → `/redefinir-senha` → nova senha → painel. Sair e entrar com a nova senha.
7. Clicar de novo no link de recuperação antigo → `/entrar` com "Esse link expirou ou já foi usado…".

- [ ] **Step 3: Revisões**

- Rodar de novo o `supabase/tests/rls_empresas.sql` e os advisors (security e performance): zero alertas.
- Revisão de acessibilidade (skill `design:accessibility-review`) nas telas `/`, `/entrar`, `/cadastro`, `/painel`: contraste, foco visível, rótulos, uso só com teclado.
- Revisão de segurança (skill `security-review`) nas mudanças da etapa.
- Corrigir o que aparecer e repetir `npm run lint && npm run build && npm test`.

- [ ] **Step 4: Documentação**

- `README.md`: marcar a Etapa 2 como concluída; em "O que já existe", descrever login, cadastro, recuperação de senha, painel, RLS e testes; adicionar `npm test` na tabela de comandos; atualizar a estrutura de pastas; adicionar uma seção "Configuração do Supabase" com os passos do Step 1.
- `CLAUDE.md`: marcar a Etapa 2 como concluída e apontar a Etapa 3 como próxima.

- [ ] **Step 5: Commit e push**

```bash
git add README.md CLAUDE.md
git commit -m "docs: Etapa 2 concluída — login, cadastro e painel"
git push
```

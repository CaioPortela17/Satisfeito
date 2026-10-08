# Etapa 5B: Cloudflare Turnstile (anti-robô) e base para descartar respostas

## 1. Objetivo

Impedir que robôs enviem respostas em massa para prejudicar a nota. A 5A já fez duas das quatro proteções do `CLAUDE.md` (tempo mínimo de 3 s e marca "já respondeu hoje"). A 5B entrega a terceira, o **Cloudflare Turnstile**, e deixa pronta no banco a base da quarta (respostas suspeitas e descarte), cuja tela nasce na Etapa 6.

Decisões do Caio que continuam valendo: **nenhum limite ou sinal por IP** e **nenhuma identificação obrigatória** (o Wi-Fi do local é compartilhado).

## 2. Decisões

| Tema | Decisão |
|---|---|
| Escopo | Turnstile agora; tela de suspeitas, selo e botão descartar na Etapa 6 (escolha do Caio) |
| Como integrar | Script oficial da Cloudflare com `next/script`, **sem pacote npm novo** |
| Modo do widget | Gerenciado: quase sempre invisível para o cliente |
| Falha da Cloudflare | **Fecha**: sem token válido a resposta não é aceita (mensagem amigável) |
| IP | Não enviamos `remoteip` à Cloudflare (parâmetro opcional) |
| Chaves em desenvolvimento | Chaves de teste oficiais da Cloudflare (sempre passam) |

## 3. Fluxo

1. A página `/p/[slug]` carrega o script `https://challenges.cloudflare.com/turnstile/v0/api.js` (`next/script`, `afterInteractive`, `?render=explicit`).
2. Um componente `WidgetTurnstile` (cliente) desenha o widget numa `div`, com a *site key* pública. Quando a Cloudflare aprova, o callback grava o token num `<input type="hidden" name="cf-turnstile-response">` dentro do formulário. Se o token expira ou dá erro, o campo é limpo e o widget se reinicia.
3. O botão **Enviar** fica desabilitado até existir token. O texto de apoio ("Confirmando que você é uma pessoa...") é anunciado por `aria-live`.
4. Na Server Action `enviarResposta`, o novo passo vem **primeiro**, antes do carimbo e do banco: `verificarTurnstile(token, segredo)`. Se falhar, devolve `{ erro }` e nada é gravado.
5. Depois do envio (com sucesso ou erro) o widget é reiniciado, porque cada token só vale uma vez.

## 4. Verificação no servidor

`src/lib/respostas/turnstile.ts` (puro, com `fetch` injetável para testar):

```
verificarTurnstile(token, segredo, buscar = fetch) → "ok" | "invalido" | "indisponivel"
```

- Token vazio ou maior que 2048 caracteres → `invalido` (sem chamar a rede).
- POST `https://challenges.cloudflare.com/turnstile/v0/siteverify`, corpo `secret` + `response` (**sem `remoteip`**), com limite de 5 s (`AbortSignal.timeout`).
- Resposta `success: true` → `ok`; `success: false` → `invalido`; erro de rede, tempo esgotado, status não 2xx ou JSON inesperado → `indisponivel`.
- A action traduz: `invalido` → "Não conseguimos confirmar que você é uma pessoa. Recarregue a página e tente de novo."; `indisponivel` → "Não deu para verificar agora. Tente de novo em instantes." Nenhum detalhe técnico chega ao cliente.
- Segredo ausente em `process.env` → mensagem genérica (mesmo padrão do `CARIMBO_SEGREDO`).

## 5. Variáveis de ambiente

| Variável | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | navegador | pública por natureza |
| `TURNSTILE_SECRET_KEY` | só servidor | nunca com `NEXT_PUBLIC_` |

Em desenvolvimento: site key `1x00000000000000000000AA` e secret `1x0000000000000000000000000000000AA` (sempre passam; também existem pares que sempre falham, úteis para testar a mensagem de erro). O Caio cria o widget real na conta gratuita da Cloudflare (Turnstile → Add widget, modo *Managed*, domínio `localhost` e depois o domínio real) antes de publicar. Os nomes entram no `.env.example` e a tabela do README é atualizada.

## 6. Cabeçalhos de segurança

O `next.config.ts` só define `frame-ancestors 'none'` (não restringe scripts nem iframes que a página carrega), então o script e o iframe da Cloudflare funcionam sem mudança. Se no futuro for criada uma CSP completa, será preciso liberar `challenges.cloudflare.com` em `script-src` e `frame-src`.

## 7. Banco (base para a Etapa 6)

Migração `20261008000000_respostas_descartadas.sql`:

- `alter table respostas add column descartada boolean not null default false`.
- `grant update (descartada) on respostas to authenticated` (só essa coluna).
- Policy `"dono descarta as próprias respostas"`: `for update to authenticated`, `using` e `with check` iguais à policy de leitura (a pesquisa da resposta pertence a uma empresa do usuário).
- Comentário na coluna: descartada não entra nas médias (as consultas da Etapa 6 devem filtrar `not descartada`).
- A detecção de "rajada de notas ruins" será calculada na leitura, na Etapa 6, sem coluna extra.

## 8. Código

| Arquivo | Mudança |
|---|---|
| `src/lib/respostas/turnstile.ts` (+ teste) | `verificarTurnstile` |
| `src/lib/respostas/mensagens.ts` (+ teste) | mensagens do Turnstile |
| `src/app/p/[slug]/widget-turnstile.tsx` | componente cliente com o widget |
| `src/app/p/[slug]/formulario-resposta.tsx` | campo escondido, botão desabilitado sem token, reinício do widget |
| `src/app/p/[slug]/actions.ts` | novo primeiro passo de verificação |
| `supabase/migrations/20261008000000_respostas_descartadas.sql` | coluna e policy |
| `supabase/tests/rls_respostas.sql` | casos de descarte |
| `.env.example`, `README.md`, `CLAUDE.md` | variáveis, status e decisão |

## 9. Interface e acessibilidade

Sem emojis; textos em português. O widget invisível não tem aparência; se a Cloudflare pedir interação, ela aparece acima do botão, com altura reservada para a página não pular. O estado "confirmando" tem texto visível e `aria-live="polite"`. Segue o `DESIGN.md`; passada das skills de design e `design:accessibility-review`.

## 10. Testes

- **Vitest** (`turnstile.test.ts`): token vazio e longo demais; `success: true`; `success: false`; rede caída; tempo esgotado; status 500; JSON inesperado; o corpo enviado contém `secret` e `response` e **não** contém `remoteip`.
- **`rls_respostas.sql`:** o dono descarta a própria resposta; não descarta a de outra empresa (0 linhas afetadas); não consegue alterar outras colunas (`created_at`, `pesquisa_id`); visitante sem login não descarta.
- **Chrome:** com as chaves de teste que passam, responder e enviar; com a chave que falha, aparece a mensagem e nada é gravado; com o script bloqueado (sem token) o botão fica desabilitado e a mensagem de apoio aparece; formulário continua funcionando no celular (639 px).
- `npm run lint`, `npm test`, `npm run build` e advisors do Supabase sem novidades.

## 11. Fora do escopo

Qualquer sinal por IP; identificação obrigatória; tela de respostas, selo "suspeita", botão descartar e detecção de rajada (Etapa 6); CSP completa.

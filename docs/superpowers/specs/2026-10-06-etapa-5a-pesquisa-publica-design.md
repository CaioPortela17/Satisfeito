# Etapa 5A — Página pública da pesquisa, link, QR code e respostas

O cliente abre a pesquisa pelo QR code (`/p/[slug]`), responde no celular numa tela só e envia. O dono ganha no editor o link, o QR code para baixar e um cartaz para imprimir. As respostas vão para o banco por uma Server Action com duas proteções simples (tempo mínimo e marca no navegador). Turnstile e respostas suspeitas ficam para a **5B**, junto com o painel (Etapa 6).

Aprovado pelo Caio em 2026-10-06.

## 1. Decisões

| Assunto | Decisão |
|---|---|
| Divisão | 5A agora (página, link, QR, respostas, tempo mínimo, marca no navegador); 5B com a Etapa 6 (Turnstile, suspeitas, descartar) |
| Link | `/p/[slug]`; slug gerado do nome da empresa (`bebelu`, `bebelu-2`…), editável no editor com aviso de que QR impresso para de funcionar |
| Formato | Todas as perguntas numa tela só, botão Enviar no fim, tela de "Obrigado!" |
| Texto livre | Sempre opcional; a pergunta sugerida de texto passa a ser "Onde podemos melhorar?" (só pesquisas novas) |
| Gravação | Jeito A: função `pesquisa_publica(slug)` (visitante pode chamar) para ler; função `registrar_resposta` (só o servidor, com chave secreta) para gravar; visitante sem permissão em nenhuma tabela |
| Proteções 5A | Carimbo de hora assinado (HMAC) com mínimo de 3 s e validade de 2 h; marca "respondeu hoje" no `localStorage`. Sem IP, sem identificação |
| QR code | Biblioteca `qrcode` (MIT), só no servidor, gera SVG nas cores da marca. Aprovada pelo Caio |
| `server-only` | `import "server-only"` (suportado pelo Next sem instalar) no cliente com chave secreta |

## 2. Banco de dados

Migração `supabase/migrations/20261007000000_respostas.sql`.

**`pesquisas.slug`**: `text not null unique`, formato `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–60 caracteres. Pesquisas existentes recebem `pesquisa-` + 8 primeiros caracteres do id. `insert (slug)` e `update (slug)` concedidos ao dono.

**`respostas`**: `id`, `pesquisa_id → pesquisas on delete restrict`, `created_at`. Índice em `(pesquisa_id, created_at)`.

**`respostas_itens`**: `id`, `resposta_id → respostas on delete cascade`, `pergunta_id → perguntas on delete restrict`, `valor_nota smallint check 1–10`, `valor_texto text check (= btrim, 1–1000)`, `funcionario_id → funcionarios on delete restrict`, `unique (resposta_id, pergunta_id)`. Índices nas chaves estrangeiras.

Consequências do `restrict`: pesquisa com respostas não se exclui (erro 23503 → "Essa pesquisa já tem respostas. Pause em vez de excluir."); funcionário com avaliações não se exclui (23503 → "Essa pessoa já tem avaliações. Desative em vez de excluir: o histórico continua guardado.").

**RLS**: o dono lê respostas e itens das próprias pesquisas (preparando a Etapa 6). Ninguém insere, altera ou apaga pela API. Visitante: nada nas tabelas.

**`pesquisa_publica(p_slug text) returns jsonb`** — `security definer`, `search_path = ''`, execute para `anon` e `authenticated`. Devolve `null` se o slug não existe. Se pausada: `{ ativa: false, titulo, empresa }`. Se ativa: `{ ativa: true, id, titulo, empresa, perguntas: [{ id, texto, tipo, obrigatoria }], funcionarios: [{ id, nome }] }` — perguntas não arquivadas em ordem; a de `funcionario` só entra se houver funcionário ativo; funcionários ativos por nome.

**`registrar_resposta(p_pesquisa_id uuid, p_itens jsonb) returns uuid`** — `security definer`, `search_path = ''`, execute **só** para `service_role`. `p_itens` = `[{ pergunta_id, valor_nota?, valor_texto?, funcionario_id? }]`. Recusa (códigos próprios): pesquisa inexistente ou pausada (`SF101`); item de pergunta de outra pesquisa, arquivada ou repetida (`SF102`); valor que não combina com o tipo, nota fora de 1–10, texto vazio/longo, funcionário inativo ou de outra empresa (`SF103`); obrigatória sem resposta (`SF104`; a de funcionário só conta se houver funcionário ativo); nenhum item (`SF105`). Grava a resposta e os itens e devolve o id.

## 3. Proteções (5A)

- **Carimbo de hora**: a página pública gera `criarCarimbo(agora)` = `"<ms>.<hmac-sha256(ms, CARIMBO_SEGREDO)>"` e põe num campo escondido. `enviarResposta` usa `verificarCarimbo`: assinatura errada → recusa; menos de 3 s → "Ops, foi rápido demais. Confira as respostas e envie de novo."; mais de 2 h → "Essa página ficou aberta muito tempo. Recarregue e responda de novo."
- **Marca no navegador**: depois de enviar, `localStorage["satisfeito:respondeu:<pesquisaId>"] = "AAAA-MM-DD"`. Abrindo de novo no mesmo dia, mostra "Você já respondeu hoje. Valeu!" no lugar do formulário. Leitura em `try/catch` (navegação privada): sem marca, mostra o formulário.

## 4. Telas

**`/p/[slug]` (cliente, sem login, mobile-first)** — fundo menta, cartão branco, nome da empresa e título no topo.
- Nota: botões 1–10 (duas fileiras de 5 no celular, uma de 10 no computador), `radiogroup` acessível; ao escolher, mostra a palavra da faixa (Ruim / Pode melhorar / Ótimo) com a cor de `faixaDaNota`.
- Quem te atendeu: botões com inicial + nome (`radiogroup`).
- Texto: `textarea` (máx. 1000), placeholder "Escreva aqui, se quiser".
- Obrigatórias marcadas com "Obrigatória"; ao enviar sem elas, erro no próprio campo e foco no primeiro faltando.
- Enviar (largura toda) → tela "Obrigado!" (ícone próprio) com o nome da empresa.
- Pausada: "Essa pesquisa está pausada no momento. Volte outra hora!". Slug inexistente: página 404 existente.
- Sem menu do painel; título da aba com o nome da empresa.

**Editor (`/painel/pesquisas/[id]`)** — novo cartão "Link e QR code":
- Link completo (`NEXT_PUBLIC_SITE_URL` + `/p/` + slug) com botão Copiar (anuncia "Link copiado").
- Editar o final do link (slug), com o aviso "Se você já imprimiu o QR code, ele para de funcionar." Slug inválido ou em uso → erro claro.
- QR code (SVG) na tela; "Baixar QR code" (arquivo `.svg`); "Imprimir cartaz" → `/painel/pesquisas/[id]/cartaz`.

**Cartaz (`/painel/pesquisas/[id]/cartaz`)** — página limpa para impressão (A4/A5): nome da empresa, "Conta pra gente como foi!", QR grande, "Leva menos de 30 segundos", link escrito. CSS de impressão esconde o resto; botão "Imprimir" (`window.print()`), escondido na impressão.

## 5. Código

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/pesquisas/slug.ts` (+ teste) | `gerarSlug(nome)`, `candidatosDeSlug(base)`, `esquemaSlug` |
| `src/lib/respostas/carimbo.ts` (+ teste) | `criarCarimbo`, `verificarCarimbo` (puras, segredo como parâmetro) |
| `src/lib/respostas/formulario.ts` (+ teste) | Lê o `FormData` da resposta (`nota:<id>`, `texto:<id>`, `funcionario:<id>`) e valida com zod |
| `src/lib/respostas/mensagens.ts` (+ teste) | Traduz `SF101…SF105` |
| `src/lib/supabase/admin.ts` | Cliente com `SUPABASE_SECRET_KEY` (`server-only`), só para `registrar_resposta` |
| `src/lib/qr.ts` | `gerarQrSvg(texto)` com `qrcode` |
| `supabase/migrations/20261007000000_respostas.sql`, `supabase/tests/rls_respostas.sql` | Banco e prova |
| `src/app/p/[slug]/page.tsx`, `formulario-resposta.tsx`, `actions.ts` | Página pública e envio |
| `src/app/painel/pesquisas/[id]/cartao-link-qr.tsx`, `cartaz/page.tsx` | Link, QR e cartaz |
| `src/app/painel/pesquisas/actions.ts` | `criarPesquisa` gera slug; nova `alterarSlug` |

Variáveis novas no `.env.local` (e nomes no `.env.example`): `SUPABASE_SECRET_KEY` (o Caio copia do painel do Supabase), `CARIMBO_SEGREDO` (32 bytes aleatórios, gerado localmente). Nenhuma com `NEXT_PUBLIC_`.

## 6. Testes

- Vitest: slug, carimbo (assinatura, 3 s, 2 h, adulterado), leitura do formulário, mensagens.
- `rls_respostas.sql`: visitante não lê/insere nas tabelas; `pesquisa_publica` devolve só o previsto (pausada sem perguntas; arquivadas fora; funcionário só com equipe ativa); `registrar_resposta` negado a `anon`/`authenticated`; como `service_role`, recusa cada caso SF101–SF105 e grava o caso válido; dono lê as próprias respostas e não as de outra empresa; `restrict` impede excluir pesquisa e funcionário com respostas; slug único e formato.
- Chrome (computador e celular): responder, obrigatória faltando, rápido demais, já respondeu, pausada, 404, copiar link, mudar slug, baixar QR, cartaz.

## 7. Fora do escopo (5B / Etapa 6)

Cloudflare Turnstile; marcar respostas suspeitas; descartar; mostrar respostas no painel; PNG do QR.

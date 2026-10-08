# Etapa 6B: lista de respostas, selo de suspeita e descarte

## 1. Objetivo

Dar ao dono uma página para **ler os envios um a um**, ver quais parecem um ataque de notas ruins (rajada) e **descartá-los** (ou restaurá-los). Os números da 6A já ignoram respostas descartadas (`respostas.descartada`, criada na 5B), então descartar aqui muda Resultados na hora, sem refazer nada.

## 2. Decisões

| Tema | Decisão |
|---|---|
| Onde | Página nova **Respostas** (`/painel/respostas`), item novo no menu entre "Resultados" e "Funcionários" (escolha do Caio) |
| Escopo | Uma pesquisa por vez, mesmo seletor de Resultados (`titulo (slug)`) |
| Regra da suspeita | **4 ou mais envios ruins em 15 minutos, na mesma pesquisa** (escolha do Caio). "Envio ruim" = média das notas do envio **menor ou igual a 4,0**. Todos os envios da rajada ganham o selo |
| Sinais proibidos | Nada de IP nem identificação (decisão do projeto: Wi-Fi compartilhado) |
| Onde calcular | Função no banco `respostas_pesquisa`, `security invoker`; a suspeita é calculada na hora, não gravada |
| Descarte | Reversível ("Restaurar"), sem janela de confirmação. Escrita direta pelo servidor com a permissão da 5B (`update` só da coluna `descartada`, protegido por RLS) |
| Lote | Aba Suspeitas tem "Descartar as suspeitas desta página" |
| Resultados | Passa a avisar "N respostas suspeitas" com link para a aba Suspeitas |
| Biblioteca nova | Nenhuma |

Nota sobre o limite: a cor "Ruim" do painel começa abaixo de 6 (`faixaDaNota`). O selo usa um corte mais duro (4,0 ou menos) de propósito: uma nota 5 sozinha é opinião, não ataque. O corte fica como constante no SQL e na documentação.

## 3. Regra da suspeita (exata)

Considera só envios **não descartados** da pesquisa. Envio sem nenhuma nota (só texto) nunca é "ruim".

1. Envio ruim = `avg(valor_nota) <= 4` entre os itens do envio.
2. Ordene os envios ruins por `created_at`. Para cada envio ruim na posição *k*, ele **abre uma rajada** se o envio ruim na posição *k+3* existe e `created_at[k+3] - created_at[k] <= 15 minutos` (exatamente 15 min vale).
3. Um envio ruim é **suspeito** se pertence a alguma rajada: isto é, se algum dos envios nas posições *k-3 .. k* abre uma rajada.
4. Envio descartado sai do cálculo (descartar parte da rajada pode fazer o resto deixar de ser suspeito; é o esperado).

Implementação sugerida: `lead(created_at, 3) over (order by created_at)` e `max(abre::int) over (order by created_at rows between 3 preceding and current row)`.

## 4. Banco

Migração `20261010000000_respostas_lista.sql`:

```
respostas_pesquisa(p_pesquisa_id uuid, p_aba text default 'todas', p_pagina int default 1,
                   p_fuso text default 'America/Sao_Paulo') returns jsonb
```

- `plpgsql`, `stable`, **`security invoker`**, `set search_path = ''`. Pesquisa que o chamador não enxerga (RLS) devolve `null`.
- `p_aba`: `todas` (todos os envios, inclusive descartados), `suspeitas` (não descartados e suspeitos), `descartadas`. Valor desconhecido: erro `22023`.
- Tamanho da página fixo: 20. `p_pagina < 1` vira 1. Ordem: mais recente primeiro, desempate por `id`.
- Retorno:

```json
{
  "contagens": { "todas": 120, "suspeitas": 5, "descartadas": 2 },
  "pagina": 1, "total_paginas": 6,
  "envios": [ {
    "id": "uuid", "criada_em": "2026-10-08T14:03:00-03:00 (timestamptz em ISO)",
    "descartada": false, "suspeita": true, "media": 3.5,
    "itens": [ { "pergunta": "Como foi o atendimento?", "tipo": "nota", "ordem": 1,
                 "nota": 3, "texto": null, "funcionario": null } ]
  } ]
}
```

- `itens` por `ordem` da pergunta; inclui perguntas arquivadas (histórico). `funcionario` é o nome (para item de tipo `funcionario`).
- `contagens.todas` é todos os envios (incluindo descartados), como mostra a aba.
- `resultados_pesquisa` ganha a chave `suspeitas` (inteiro) por **migração nova** que recria a função (mesma lógica da suspeita, extraída para uma função auxiliar `envios_suspeitos(p_pesquisa_id uuid)` `stable security invoker` usada pelas duas).
- Permissões: `revoke execute ... from public, anon; grant execute ... to authenticated` (as duas funções novas).
- `database.types.ts` regenerado.

## 5. Página `/painel/respostas`

URL: `?pesquisa=<id>&aba=todas|suspeitas|descartadas&pagina=N`. Valores inválidos viram o padrão (pesquisa padrão = `escolherPesquisaPadrao`, aba `todas`, página 1). Página além do fim: volta à última.

Conteúdo:

1. Seletor de pesquisa (reaproveita `seletor-pesquisa`; some com uma só pesquisa).
2. Abas **Todas (n) / Suspeitas (n) / Descartadas (n)** como links (sem JavaScript), a aba atual com `aria-current="page"`.
3. Lista de cartões. Cada envio mostra: data e hora no fuso de São Paulo; notas com **número e palavra**; texto livre; funcionário escolhido; selo **Suspeita** (texto, não só cor); etiqueta **Descartada** com cartão esmaecido; botão **Descartar** ou **Restaurar**.
4. Na aba Suspeitas, botão "Descartar as suspeitas desta página" (descarta só os envios visíveis, com contagem no texto).
5. Paginação: "Anterior" / "Próxima" e "Página X de Y".
6. Estados vazios por aba (ex.: Suspeitas vazia: "Nenhuma resposta suspeita. Se aparecer uma rajada de notas ruins, ela aparece aqui."); sem pesquisas: aponta para criar uma; erro da função: mensagem amigável em português.

Segurança e conteúdo:
- Texto de cliente é renderizado como texto (React escapa); nunca `dangerouslySetInnerHTML`.
- Server Actions `descartarResposta(id)`, `restaurarResposta(id)`, `descartarVarias(ids)`: exigem usuário logado, validam UUID(s) e limitam `descartarVarias` a 20 ids. O `update` filtra por id; o RLS impede mexer em envio de outra empresa. Mudou 0 linhas: erro amigável. Depois: `revalidatePath("/painel/respostas")` e `"/painel/resultados"`.
- Botão pendente: desativa e mostra "Descartando…" (padrão já usado no painel).

## 6. Código

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/20261010000000_respostas_lista.sql` | `envios_suspeitos`, `respostas_pesquisa`, recria `resultados_pesquisa` com `suspeitas` |
| `supabase/tests/rls_respostas_lista.sql` | Segurança e cálculo |
| `src/lib/respostas/lista.ts` (+ teste) | Tipos do retorno; `lerAba`, `lerPagina` (parâmetros da URL); `rotuloEnvio` se precisar |
| `src/app/painel/respostas/page.tsx` | Página (servidor) |
| `src/app/painel/respostas/abas.tsx`, `cartao-envio.tsx`, `paginacao.tsx`, `vazio.tsx` | Peças (servidor) |
| `src/app/painel/respostas/botoes-descarte.tsx` | Botões (cliente, `useTransition`) |
| `src/app/painel/respostas/actions.ts` | Server Actions de descarte |
| `src/app/painel/nav-painel.tsx` | Link Respostas |
| `src/app/painel/resultados/` | Aviso de suspeitas (tipos + página) |
| `src/lib/resultados/tipos.ts`, `database.types.ts` | `suspeitas` |
| `README.md`, `CLAUDE.md` | Status, tela, regra da suspeita |

Ícones: genéricos do `lucide-react`; sem emoji. Selo e estados com texto.

## 7. Interface e acessibilidade

- Identidade do painel (cartões brancos, Bricolage Grotesque, cores da marca). Selo "Suspeita" em manga/coral com texto; "Descartada" em cinza com texto.
- Mobile-first: cartões em coluna, botões com alvo de toque de pelo menos 44 px.
- Abas são links; foco visível; resultado do descarte anunciado (`role="status"`).
- Passada das skills de design (`impeccable`, `frontend-design`, `emil-design-eng`, `mobile-native`, `animate`, `design:ux-copy`, `design:accessibility-review`).

## 8. Testes

- **Vitest** (`lista.test.ts`): `lerAba` (válidas, inválida, ausente), `lerPagina` (número, 0, negativo, texto, decimal, ausente).
- **`rls_respostas_lista.sql`** (transação com `rollback`): empresas A e B; dono A não vê nem descarta envios da B (`null` e 0 linhas); visitante sem login sem permissão; rajada de exatamente 4 ruins em 15 min marca os 4; 3 ruins não marcam; 4 em 16 min não marcam; média 4,0 é ruim e 4,1 não; envio só com texto não é ruim; envio descartado sai da rajada; abas e contagens; paginação (21 envios = 2 páginas, ordem); `resultados_pesquisa.suspeitas` bate; pergunta arquivada aparece nos itens.
- **Chrome** (dados de exemplo apagados depois): lista, selo, descartar, restaurar, lote, paginação, aba vazia, `?aba=` inválido, aviso em Resultados, teclado. Celular não é testável no Chrome controlado (limite já conhecido).
- `npm run lint`, `npm test`, `npm run build`, advisors do Supabase sem novidades.

## 9. Fora do escopo

Excluir definitivamente; exportar; busca ou filtro por texto/data/funcionário; resumo com IA (Etapa 7); notificação por e-mail; configurar a regra da rajada na interface (o corte fica fixo no SQL); desfazer em lote.

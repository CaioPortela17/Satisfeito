import type { Metadata } from "next";
import { Lista, PaginaLegal, Secao } from "@/components/legal/pagina-legal";
import { DATA_PRIVACIDADE, emailDeContato } from "@/lib/legal/contato";

export const metadata: Metadata = { title: "Política de privacidade" };

export default function Privacidade() {
  const contato = emailDeContato();
  return (
    <PaginaLegal titulo="Política de privacidade" atualizadoEm={DATA_PRIVACIDADE}>
      <p>
        O satisfeito?! ajuda negócios locais a ouvir os clientes. Aqui explicamos, sem juridiquês, quais dados passam por
        aqui, para quê, com quem dividimos e como você pode pedir a sua parte. Há dois grupos de pessoas: o{" "}
        <strong>dono do negócio</strong> (quem tem conta) e o <strong>cliente</strong> (quem responde a pesquisa).
      </p>

      <Secao titulo="Quem é o responsável por cada dado">
        <p>
          O <strong>cliente</strong> responde uma pesquisa que o negócio escolheu fazer. Sobre as respostas, o{" "}
          <strong>negócio é o controlador</strong> e o satisfeito?! atua como operador, guardando e organizando os dados
          para ele. Sobre os dados da <strong>conta</strong> do dono (e-mail, senha, nome do negócio), o satisfeito?! é o
          controlador.
        </p>
      </Secao>

      <Secao titulo="O que coletamos do cliente que responde">
        <Lista
          itens={[
            "As notas e os textos que o cliente escolher escrever.",
            "O dia e a hora da resposta.",
            "Não pedimos nome, e-mail, telefone nem login para responder. A pesquisa é anônima.",
            "Não gravamos o endereço IP do cliente no nosso banco de dados. A hospedagem e a Cloudflare (proteção contra robôs) processam dados técnicos, como o IP, só para o site funcionar e se proteger de abuso.",
            "O navegador guarda uma marca local (\"já respondi hoje\") para evitar respostas repetidas. Ela fica no próprio aparelho.",
          ]}
        />
        <p>
          Por favor, <strong>não escreva dados pessoais nem sensíveis</strong> (como CPF, telefone, saúde) nos campos de
          texto. Eles são lidos pelo negócio e resumidos por inteligência artificial.
        </p>
      </Secao>

      <Secao titulo="O que coletamos do dono do negócio">
        <Lista
          itens={[
            "E-mail e senha da conta (a senha é guardada protegida, nunca em texto aberto).",
            "Nome do negócio, nomes dos funcionários que você cadastrar, pesquisas, perguntas e as respostas recebidas.",
          ]}
        />
      </Secao>

      <Secao titulo="Para que usamos os dados">
        <Lista
          itens={[
            "Mostrar ao dono as notas, os gráficos e as respostas.",
            "Escrever o relatório para a equipe com ajuda de inteligência artificial (veja abaixo).",
            "Proteger o serviço contra robôs, respostas falsas e abuso.",
          ]}
        />
        <p>Não vendemos dados e não usamos as respostas para publicidade.</p>
      </Secao>

      <Secao titulo="Inteligência artificial">
        <p>
          Quando o dono gera um relatório, enviamos à Anthropic (empresa de inteligência artificial, nos Estados Unidos) os{" "}
          <strong>números do período</strong> e os <strong>textos que os clientes escreveram</strong>, sem nome nem contato
          deles. Isso
          é uma transferência internacional de dados. O resultado é guardado na conta do dono.
        </p>
      </Secao>

      <Secao titulo="Com quem dividimos (serviços que usamos)">
        <Lista
          itens={[
            "Supabase: banco de dados e login, em servidores no Brasil (São Paulo).",
            "Vercel: hospedagem do site.",
            "Cloudflare: verificação anti-robô (Turnstile) na pesquisa pública.",
            "Anthropic: inteligência artificial do relatório (apenas quando o dono pede).",
          ]}
        />
        <p>Também podemos divulgar dados se a lei ou uma ordem da justiça exigir.</p>
      </Secao>

      <Secao titulo="Por quanto tempo guardamos">
        <p>
          Guardamos os dados enquanto a conta do dono existir. Ele pode descartar respostas no painel (o descarte é
          reversível e tira a resposta dos números). O dono pode excluir a conta a qualquer momento, em Início &gt; Minha conta e
          dados: isso apaga a conta e tudo que é dela (empresas, pesquisas, respostas e relatórios), sem volta.
        </p>
      </Secao>

      <Secao titulo="Seus direitos">
        <p>
          Pela LGPD, você pode pedir confirmação de que tratamos seus dados, acesso, correção, anonimização, apagamento,
          portabilidade e informações sobre com quem compartilhamos, e pode retirar o consentimento quando ele for a base do
          tratamento. Como a pesquisa é anônima, para pedir sobre uma resposta de cliente é preciso dizer a qual negócio e
          aproximadamente quando ela foi enviada.
        </p>
        {contato ? (
          <p>
            Para pedir qualquer uma dessas coisas, escreva para{" "}
            <a className="font-semibold underline underline-offset-4" href={`mailto:${contato}`}>
              {contato}
            </a>
            .
          </p>
        ) : (
          <p>Para pedir qualquer uma dessas coisas, fale com o negócio que fez a pesquisa ou com quem lhe indicou o satisfeito?!.</p>
        )}
      </Secao>

      <Secao titulo="Segurança">
        <p>
          Usamos conexão protegida (HTTPS), regras de acesso no banco para que cada negócio só veja os próprios dados, proteção
          contra robôs e respostas falsas, e guardamos as chaves de acesso só no servidor. Nenhum sistema é perfeito: se
          houver um incidente que afete você, avisaremos como a lei determina.
        </p>
      </Secao>

      <Secao titulo="Mudanças nesta política">
        <p>Se mudarmos algo importante, atualizamos esta página e a data no topo.</p>
      </Secao>
    </PaginaLegal>
  );
}

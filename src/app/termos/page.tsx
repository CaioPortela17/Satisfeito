import type { Metadata } from "next";
import Link from "next/link";
import { Lista, PaginaLegal, Secao } from "@/components/legal/pagina-legal";
import { DATA_TERMOS, emailDeContato } from "@/lib/legal/contato";

export const metadata: Metadata = { title: "Termos de uso" };

export default function Termos() {
  const contato = emailDeContato();
  return (
    <PaginaLegal titulo="Termos de uso" atualizadoEm={DATA_TERMOS}>
      <p>
        Estes termos valem para quem cria uma conta no satisfeito?! (o <strong>dono do negócio</strong>). Ao criar a conta,
        você declara que leu e concorda com eles e com a{" "}
        <Link href="/privacidade" className="font-semibold underline underline-offset-4">
          política de privacidade
        </Link>
        .
      </p>

      <Secao titulo="O que é o serviço">
        <p>
          Uma ferramenta para criar pesquisas de satisfação, compartilhar por link ou QR code, receber respostas anônimas e
          acompanhar os resultados, inclusive com relatórios escritos por inteligência artificial.
        </p>
      </Secao>

      <Secao titulo="Sua conta">
        <Lista
          itens={[
            "Você precisa ter capacidade legal para contratar e informar dados verdadeiros.",
            "Você é responsável pela segurança da sua senha e por tudo que acontece na conta.",
            "Cada pessoa mantém uma conta própria; não compartilhe o acesso.",
          ]}
        />
      </Secao>

      <Secao titulo="Como você pode usar">
        <Lista
          itens={[
            "Use para conhecer a opinião dos seus clientes, de forma honesta.",
            "Não use para enganar, assediar, discriminar, fazer spam ou coletar dados pessoais sem necessidade.",
            "Não tente burlar as proteções do serviço, acessar dados de outros negócios nem sobrecarregar o sistema.",
            "Não crie respostas falsas para inflar ou derrubar notas.",
          ]}
        />
      </Secao>

      <Secao titulo="Os dados dos seus clientes">
        <p>
          Sobre as respostas dos seus clientes, você é o responsável pelo tratamento e nós somos o operador. Avise seus
          clientes de que a pesquisa existe e para que ela serve. Use o relatório com cuidado: as notas são sobre o
          atendimento, e o uso delas é uma decisão sua.
        </p>
      </Secao>

      <Secao titulo="Inteligência artificial">
        <p>
          Os relatórios são gerados por IA e podem conter erros ou interpretações imprecisas. Os números vêm do sistema, mas a
          redação da IA deve ser conferida por você antes de enviar à equipe. Decisões sobre pessoas (como advertências ou
          demissões) não devem se basear só em um relatório automático.
        </p>
      </Secao>

      <Secao titulo="Disponibilidade e mudanças">
        <p>
          Trabalhamos para o serviço funcionar sempre, mas ele pode ter interrupções, manutenções e mudanças de recursos. Não
          garantimos que estará disponível ou livre de falhas o tempo todo. Avisaremos mudanças importantes.
        </p>
      </Secao>

      <Secao titulo="Responsabilidade">
        <p>
          O serviço é oferecido como está. Dentro do que a lei permite, não respondemos por lucros cessantes, perda de
          clientes ou decisões tomadas com base nos resultados. Isso não afasta direitos que a lei garante e que não podem ser
          afastados.
        </p>
      </Secao>

      <Secao titulo="Encerramento">
        <p>
          Você pode parar de usar a qualquer momento e pedir o encerramento da conta e a exclusão dos dados. Podemos suspender
          contas que violem estes termos ou coloquem o serviço ou outras pessoas em risco.
        </p>
      </Secao>

      <Secao titulo="Mudanças nos termos e contato">
        <p>Se alterarmos estes termos de forma relevante, atualizamos a página e a data no topo.</p>
        {contato && (
          <p>
            Dúvidas ou pedidos:{" "}
            <a className="font-semibold underline underline-offset-4" href={`mailto:${contato}`}>
              {contato}
            </a>
            .
          </p>
        )}
      </Secao>
    </PaginaLegal>
  );
}

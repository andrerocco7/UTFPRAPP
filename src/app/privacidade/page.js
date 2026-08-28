import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Basquete UTFPR",
  description: "Quais dados o painel do basquete da UTFPR guarda, por quê e quem tem acesso.",
};

const ATUALIZADO = "28 de agosto de 2026";
const CONTATO = "andrerocco@alunos.utfpr.edu.br";

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto px-5 py-10 md:py-14">
      <h1 className="text-2xl md:text-3xl font-bold mb-1">Política de Privacidade</h1>
      <p className="text-[13px] text-[var(--text-muted)] mb-8">
        Painel do Basquete UTFPR · atualizada em {ATUALIZADO}
      </p>

      <Section title="O que é este aplicativo">
        <p>
          O Basquete UTFPR é um painel de uso interno das equipes de basquete da Universidade
          Tecnológica Federal do Paraná. Ele serve para a comissão técnica organizar treinos,
          competições, escalações e o acompanhamento individual dos atletas. Não é um produto
          comercial, não exibe anúncios e não está aberto ao público.
        </p>
      </Section>

      <Section title="Quem é responsável">
        <p>
          O painel é mantido pelo técnico das equipes, que também é o responsável pelos dados aqui
          registrados. Para qualquer dúvida, correção ou pedido de exclusão, escreva para{" "}
          <a href={`mailto:${CONTATO}`} className="text-[var(--accent)] underline">
            {CONTATO}
          </a>
          .
        </p>
      </Section>

      <Section title="Quais dados são coletados">
        <p>Quando você entra com sua conta institucional Google, recebemos apenas:</p>
        <ul>
          <li>seu nome e seu endereço de e-mail institucional.</li>
        </ul>
        <p>
          O acesso é solicitado apenas para identificar você. Não pedimos permissão para ler
          e-mails, arquivos, agenda, contatos ou qualquer outro dado da sua Conta do Google.
        </p>
        <p>Além disso, a comissão técnica registra no painel:</p>
        <ul>
          <li>curso, posição em quadra e situação no elenco (ativo, em observação, lesionado ou afastado);</li>
          <li>observações técnicas sobre sua evolução como atleta;</li>
          <li>convocações e cortes por competição;</li>
          <li>resultados de treinos de arremesso — tentativas e acertos por ponto da quadra.</li>
        </ul>
        <p>
          <strong>Não coletamos CPF, RG, telefone, endereço, data de nascimento, dados bancários
          nem dados de saúde.</strong> Nenhuma senha é criada ou armazenada: a autenticação é feita
          inteiramente pelo Google.
        </p>
      </Section>

      <Section title="Por que esses dados são usados">
        <p>
          Exclusivamente para a gestão esportiva das equipes: montar treinos, acompanhar a evolução
          técnica de cada atleta, decidir escalações e organizar a participação em competições
          universitárias. Os dados não são usados para nenhuma outra finalidade.
        </p>
      </Section>

      <Section title="Quem pode ver">
        <p>
          A comissão técnica vê os dados de todos os atletas. Cada atleta, ao entrar, vê a própria
          ficha — incluindo as observações técnicas registradas sobre ela ou ele — além dos treinos,
          jogadas e competições da sua equipe. Nenhum atleta tem acesso à ficha de outro.
        </p>
      </Section>

      <Section title="Com quem compartilhamos">
        <p>
          Com ninguém. Os dados não são vendidos, cedidos, alugados nem usados para publicidade. Não
          há rastreadores de terceiros nem ferramentas de análise de comportamento no aplicativo.
        </p>
        <p>
          Para funcionar, o painel usa dois serviços de infraestrutura: a Vercel, que hospeda o site,
          e o Neon, que hospeda o banco de dados em servidores no Brasil. Eles processam os dados
          apenas para manter o serviço no ar.
        </p>
      </Section>

      <Section title="Por quanto tempo guardamos">
        <p>
          Enquanto você fizer parte das equipes. Ao sair, seus dados podem ser removidos a pedido, e
          são apagados junto com todo o histórico associado — observações, convocações e registros de
          arremesso.
        </p>
      </Section>

      <Section title="Seus direitos">
        <p>
          Conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode a qualquer momento
          pedir para ver todos os dados que temos sobre você, corrigir informações erradas, solicitar
          a exclusão dos seus dados ou revogar o acesso do aplicativo à sua Conta do Google — isso
          último direto em{" "}
          <a
            href="https://myaccount.google.com/permissions"
            className="text-[var(--accent)] underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          .
        </p>
        <p>
          Basta escrever para{" "}
          <a href={`mailto:${CONTATO}`} className="text-[var(--accent)] underline">
            {CONTATO}
          </a>
          . Pedidos são atendidos em até 15 dias.
        </p>
      </Section>

      <Section title="Alterações nesta política">
        <p>
          Se algo mudar, a data no topo desta página é atualizada. Mudanças relevantes serão avisadas
          às equipes.
        </p>
      </Section>

      <div className="mt-10 pt-6 border-t border-[var(--border)]">
        <Link href="/" className="text-[13px] text-[var(--text-muted)] hover:text-[var(--accent)]">
          ← Voltar ao painel
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-7">
      <h2 className="font-display font-semibold text-[15px] uppercase tracking-wide mb-2">
        {title}
      </h2>
      <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[var(--text-muted)] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_strong]:text-[var(--text)]">
        {children}
      </div>
    </section>
  );
}

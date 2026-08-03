import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LogoDce from '../components/LogoDce';
import { api } from '../services/api';
import './Documento.css';

/**
 * Termos de Uso e Política de Privacidade.
 *
 * O texto descreve o que o sistema realmente faz — quais dados coleta, para
 * quê, quem vê e por quanto tempo. Ao mudar o funcionamento, atualize aqui E
 * suba VERSAO_TERMOS no backend, senão o aceite registrado deixa de
 * corresponder ao que a pessoa leu.
 */
export default function Termos() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api
      .get('/config-publica')
      .then(({ data }) => setConfig(data))
      .catch(() => setConfig(null));
  }, []);

  const dce = config?.dce?.nomeCompleto ?? 'Diretório Central de Estudantes Matheus Teixeira';
  const contato = config?.dce?.email ?? 'dce@atitus.edu.br';
  const versao = config?.termos?.versao ?? '1.0';
  const vigencia = config?.termos?.vigencia
    ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
        new Date(`${config.termos.vigencia}T00:00:00Z`),
      )
    : '02/08/2026';

  return (
    <div className="doc">
      <header className="doc__topo">
        <Link to="/" aria-label="Início">
          <LogoDce cor="branco" escala={0.5} />
        </Link>
        <Link to="/cadastro" className="btn btn-contorno-claro btn-sm">
          Criar conta
        </Link>
      </header>

      <main className="doc__main">
        <article className="doc__papel">
          <p className="doc__meta">
            Versão {versao} · Em vigor desde {vigencia}
          </p>

          <h1>Termos de Uso e Política de Privacidade</h1>

          <p className="doc__intro">
            Este documento explica as regras para usar o sistema de Carteira de Identificação
            Estudantil do {dce} e como tratamos os seus dados pessoais, conforme a Lei Geral de
            Proteção de Dados (Lei nº 13.709/2018).
          </p>

          <h2>1. Quem somos</h2>
          <p>
            O sistema é operado pelo <strong>{dce}</strong>, o Diretório Central de Estudantes da
            ATITUS, responsável pela emissão da Carteira de Identificação Estudantil (CIE) prevista
            na Lei Federal nº 12.933/2013.
          </p>
          <p>
            Para qualquer assunto relacionado aos seus dados, o contato é <strong>{contato}</strong>.
          </p>

          <h2>2. O que o sistema faz</h2>
          <p>
            Permite que estudantes solicitem a CIE pela internet: você cria uma conta, informa seus
            dados, envia foto e comprovante de matrícula, paga a taxa e, após a conferência pelo
            DCE, recebe a carteirinha digital por e-mail. A versão física é retirada no DCE.
          </p>

          <h2>3. Dados que coletamos</h2>
          <p>Coletamos apenas o necessário para emitir o documento:</p>
          <ul>
            <li>
              <strong>Identificação:</strong> nome completo, CPF, data de nascimento e foto.
            </li>
            <li>
              <strong>Vínculo acadêmico:</strong> matrícula, curso, nível de ensino e comprovante de
              matrícula.
            </li>
            <li>
              <strong>Contato:</strong> e-mail e número de WhatsApp.
            </li>
            <li>
              <strong>Registros de uso:</strong> data do aceite destes termos e o endereço IP no
              momento do cadastro.
            </li>
          </ul>
          <p className="doc__nota">
            Não coletamos dados de pagamento. O PIX acontece diretamente entre você e o banco; o
            sistema guarda apenas se o DCE confirmou ou não o recebimento.
          </p>

          <h2>4. Por que tratamos esses dados</h2>
          <ul>
            <li>
              <strong>Emitir a carteirinha:</strong> os dados de identificação e vínculo são
              impressos no documento, como exige o padrão nacional da CIE.
            </li>
            <li>
              <strong>Confirmar que você é estudante:</strong> o comprovante de matrícula é o que
              sustenta a declaração, feita no verso do documento, de que o DCE atesta sua condição
              de estudante.
            </li>
            <li>
              <strong>Falar com você:</strong> confirmação de cadastro, entrega da carteirinha e
              avisos sobre o pagamento e a retirada da via física.
            </li>
          </ul>

          <h2>5. O que fica público</h2>
          <p>
            A carteirinha traz um QR Code que leva a uma página de validação <strong>aberta</strong>,
            para que estabelecimentos confiram a autenticidade do documento. Quem escanear o código
            vê:
          </p>
          <ul>
            <li>seu nome completo, sua foto, curso, nível e matrícula;</li>
            <li>o CPF <strong>parcialmente oculto</strong> (por exemplo, ***.456.789-**);</li>
            <li>as datas de emissão e validade.</li>
          </ul>
          <p className="doc__nota">
            O QR Code é único e imprevisível: a página só abre para quem tiver o código impresso na
            sua carteirinha. Seu e-mail, WhatsApp, comprovante de matrícula e CPF completo{' '}
            <strong>nunca</strong> aparecem nessa página.
          </p>

          <h2>6. Quem tem acesso</h2>
          <ul>
            <li>
              <strong>Você</strong>, a qualquer momento, pela sua área do estudante.
            </li>
            <li>
              <strong>A diretoria do DCE</strong>, para conferir o pagamento, validar a matrícula e
              emitir o documento.
            </li>
            <li>
              <strong>Prestadores de serviço</strong> estritamente necessários para o sistema
              funcionar: o provedor de envio de e-mail e o serviço de hospedagem.
            </li>
          </ul>
          <p>
            <strong>Não vendemos, alugamos nem compartilhamos seus dados</strong> com terceiros para
            fins comerciais, publicidade ou qualquer finalidade alheia à emissão da carteirinha.
          </p>

          <h2>7. Por quanto tempo guardamos</h2>
          <p>
            Mantemos seus dados enquanto sua carteirinha estiver válida e pelo prazo necessário para
            o DCE comprovar a regularidade das emissões. O comprovante de matrícula pode ser
            descartado após a emissão, já que sua função se encerra ali.
          </p>

          <h2>8. Seus direitos</h2>
          <p>A LGPD garante que você pode, a qualquer momento:</p>
          <ul>
            <li>saber quais dados seus temos e obter uma cópia;</li>
            <li>corrigir dados incompletos ou errados;</li>
            <li>pedir a exclusão dos seus dados;</li>
            <li>revogar o consentimento dado aqui.</li>
          </ul>
          <p>
            Para exercer qualquer um deles, escreva para <strong>{contato}</strong>. Respondemos em
            até 15 dias.
          </p>
          <p className="doc__nota">
            Atenção: pedir a exclusão dos dados <strong>invalida a sua carteirinha</strong>, porque
            sem eles não há como sustentar o documento nem responder à validação pública. Não há
            devolução do valor pago.
          </p>

          <h2>9. Segurança</h2>
          <p>
            Sua senha é guardada de forma cifrada e não pode ser lida por ninguém, nem pela
            diretoria do DCE. O comprovante de matrícula fica em área restrita, acessível apenas a
            você e ao DCE, e nunca por link público. O acesso ao sistema é feito por conexão
            criptografada.
          </p>
          <p>
            Nenhum sistema é infalível. Se ocorrer um incidente que possa gerar risco a você,
            avisaremos você e a Autoridade Nacional de Proteção de Dados, como manda a lei.
          </p>

          <h2>10. Suas obrigações</h2>
          <ul>
            <li>Informar dados verdadeiros e atualizados.</li>
            <li>Enviar comprovante de matrícula autêntico e vigente.</li>
            <li>Não emprestar, ceder ou permitir o uso da sua carteirinha por outra pessoa.</li>
            <li>Guardar sua senha e não compartilhá-la.</li>
          </ul>
          <p className="doc__nota">
            Fraudar dados ou documentos leva ao cancelamento da carteirinha, sem devolução do valor
            pago, e pode caracterizar crime previsto no Código Penal.
          </p>

          <h2>11. Pagamento e cancelamento</h2>
          <p>
            A taxa cobre a emissão da carteirinha digital e da via física. O DCE confere o
            comprovante manualmente; se o pagamento não for identificado, o pedido é recusado e você
            pode reenviar o comprovante.
          </p>
          <p>
            Se você desistir antes da emissão, procure o DCE pelos canais de contato. Depois de
            emitida, a carteirinha não é reembolsável, porque o documento já foi produzido.
          </p>

          <h2>12. Mudanças neste texto</h2>
          <p>
            Podemos atualizar este documento. Quando a mudança for relevante, avisaremos pelo e-mail
            cadastrado e a versão indicada no topo desta página será alterada.
          </p>

          <div className="doc__rodape">
            <p>
              Ao criar uma conta, você declara que leu e concorda com estes Termos de Uso e com a
              Política de Privacidade.
            </p>
            <div className="doc__acoes">
              <Link to="/cadastro" className="btn btn-primario">
                Criar minha conta
              </Link>
              <Link to="/" className="btn btn-contorno">
                Voltar para o início
              </Link>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

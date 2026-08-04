# Conformidade com o Padrão Nacional da CIE

Análise feita em 02/08/2026 contra o **Padrão Nacional da Carteira de
Identificação Estudantil, ano base 2026** (ANPG, UNE e UBES) e a **Portaria ITI
nº 78, de 24/12/2018**, que a Lei 12.933/2013 e o Decreto 8.537/2015 tornam
obrigatórios para qualquer entidade que emita CIE.

Existe para responder uma pergunta que vai voltar: *o que ainda falta para esta
carteirinha valer meia-entrada?*

## O que já cumprimos

**Conteúdo da face** (item 1.b), na ordem exigida pela norma:

| Exigido | Onde |
| --- | --- |
| Nome civil completo | `usuarios.nome` |
| Nome da instituição de ensino | `DCE_INSTITUICAO` |
| Grau de escolaridade | `perfis_estudante.nivel` |
| Curso | `perfis_estudante.curso` |
| Data de nascimento | `perfis_estudante.data_nascimento` |
| CPF | `perfis_estudante.cpf` |
| Código de uso | `carteirinhas.codigo_uso` |
| Validade **no verso** | `carteirinhas.data_validade` |

**Validade**: 31 de março do ano seguinte ao da emissão, conforme a norma.
A arte original trazia "agosto de 2027", o que estava errado.

**Foto** na proporção 3x4, recortada no upload.

**Código de uso**: sequência alfanumérica única por carteirinha, alfabeto sem
caracteres ambíguos, com unicidade garantida por índice no banco.

**QR Code** único por carteirinha, apontando para a rota pública de validação.

**Cadastramento** (item 3.a): cadastro completo, foto e comprovante de matrícula
do semestre corrente, com guarda do arquivo em área restrita.

**Canal de atendimento ao estudante** (item 3.i): WhatsApp do DCE impresso no
verso.

## Removido depois, por decisão do DCE

**Documento de identidade.** O padrão exige RG, CNH, RNE ou passaporte impresso
na face, em campo separado do CPF. Chegou a ser implementado, e em 04/08/2026 o
DCE pediu para tirar — do formulário e do cartão. As colunas seguem no banco,
sem uso, porque havia dado gravado.

## O que NÃO cumprimos

Nada disto é questão de layout ou de campo, e nenhum cabe no orçamento atual.

**Certificado de Atributo ICP-Brasil.** A norma exige que cada CIE tenha um
certificado de atributo (DOC-ICP-16, tipo autônomo) assinado com certificado
digital **A3 ou A4 de pessoa jurídica** do DCE, mais manutenção de Lista de
Certificados de Atributos Revogados. Nosso QR aponta para nossa própria página
de validação, que é outra coisa.

**Repositório de Chaves Públicas.** A chave pública do certificado precisa ser
entregue à UNE/UBES/ANPG em `meiaentrada.org.br/chaves-publicas`. A norma chama
isso de *"condição essencial para a emissão válida da CIE"*.

**Modelo gráfico nacional.** A CIE tem modelo único, descrito no "Manual de
Aplicação dos Elementos Gráficos", fornecido apenas mediante solicitação formal.
A entidade emissora tem direito a no máximo **50% de características locais**.
Nossa arte é livre.

**Elementos gráficos de segurança**: fundo de tramas anti-scanner, microletras e
tinta sensível a ultravioleta. Impossíveis em PNG ou PDF.

**Personalização em gráfica de segurança** com ISO 9001, homologada por pelo
menos duas bandeiras de cartão de crédito. Cartão PVC de 86 × 54 × 0,76 mm.

**Infraestrutura** (item 3.c): data center com PCI DSS Nível 1, SOC 1/2/3,
FIPS 140-2, redundância geográfica com mais de 100 km entre os sítios, DMZ e
acesso por tunelamento. Um VPS único não atende.

**Guarda digital** (item 3.d): criptografia de 256 bits, auditoria de quem
visualizou cada arquivo e disponibilidade de 99,9999%.

## A decisão em aberto

O verso impresso diz **"DOCUMENTO VÁLIDO PARA MEIA-ENTRADA"** e cita a Lei
12.933/2013. Pela análise acima, o documento não sustenta essa afirmação.

O risco prático é o aluno pagar, apresentar no cinema e ser recusado. O risco
formal está no item 3.e da norma: emissão fora do padrão pode levar à exclusão
do sistema nacional de validação, *"sem prejuízo de configuração de ilícito
civil, criminal ou administrativo"*.

Vale separar duas coisas que se confundem com facilidade:

**O DCE pode emitir CIE.** O item 3.a lista os DCEs entre os emissores
legítimos. Esse direito não está em discussão.

**O documento emitido precisa ser reconhecível pelo sistema nacional.** É aqui
que mora a lacuna. O QR deve levar ao certificado de atributo (Portaria ITI 78,
item 3) e a conferência é feita pelo aplicativo da UNE/UBES/ANPG, que valida a
cadeia ICP-Brasil (item 5.3). Nosso QR leva à nossa própria página: funciona
para quem abre o link no navegador, mas não para quem usa o app oficial.

## Como encerrar a dúvida

A análise acima é leitura dos documentos, não parecer jurídico. Quem responde em
definitivo são as entidades nacionais. Pergunta objetiva a fazer à UEE-RS ou à
UNE:

> O DCE pretende emitir CIE por sistema próprio. É obrigatório o certificado de
> atributo ICP-Brasil e o registro da chave pública no repositório nacional?
> Existe processo de adesão para DCEs que não têm essa estrutura?

Conforme a resposta, dois caminhos:

**Se houver adesão**, este sistema continua valendo muito — cadastro, triagem e
conferência de matrícula —, só não é ele que assina a CIE.

**Se não houver**, a saída é assumir o que a carteirinha é: documento de
identificação do DCE, que prova vínculo estudantil e dá acesso ao que a entidade
negociar localmente. Legítimo e útil, mas exige reescrever o verso sem citar
meia-entrada nem a Lei 12.933/2013.

Enquanto a resposta não chega, o risco de emitir para aluno pagante é o aluno
ser recusado e reclamar com o DCE.

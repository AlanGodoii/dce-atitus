import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { formatarCpf, formatarTelefoneExibicao } from '../utils/validadores.js';
import { ROTULO_NIVEL } from '../validators/perfil.validator.js';
import {
  calcularValidade,
  gerarArquivosCarteirinha,
  gerarCodigoUso,
  reemitirCarteirinha,
} from '../services/carteirinha.service.js';
import { enviarCarteirinhaAprovada, enviarPagamentoRejeitado } from '../services/email.service.js';
import { urlValidacao } from '../services/qrcode.service.js';

const INCLUDE_COMPLETO = {
  carteirinha: {
    include: {
      perfil: { include: { usuario: true } },
    },
  },
  confirmadoPor: { select: { id: true, nome: true } },
};

function serializarPagamento(pagamento) {
  const { carteirinha } = pagamento;
  const { perfil } = carteirinha;
  const { usuario } = perfil;

  return {
    pagamentoId: pagamento.id,
    status: pagamento.status,
    observacaoEstudante: pagamento.comprovanteInfo,
    solicitadoEm: pagamento.criadoEm,
    confirmadoEm: pagamento.confirmadoEm,
    confirmadoPor: pagamento.confirmadoPor?.nome ?? null,
    carteirinha: {
      id: carteirinha.id,
      status: carteirinha.status,
      dataEmissao: carteirinha.dataEmissao,
      dataValidade: carteirinha.dataValidade,
    },
    estudante: {
      usuarioId: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      whatsapp: usuario.whatsapp,
      whatsappFormatado: usuario.whatsapp ? formatarTelefoneExibicao(usuario.whatsapp) : null,
      cpfFormatado: formatarCpf(perfil.cpf),
      matricula: perfil.matricula,
      curso: perfil.curso,
      nivelRotulo: ROTULO_NIVEL[perfil.nivel] ?? perfil.nivel,
      fotoUrl: perfil.fotoUrl,
      perfilId: perfil.id,
      // O arquivo em si sai por rota autenticada, nunca por URL publica.
      temComprovante: Boolean(perfil.comprovanteArquivo),
      comprovanteTipo: perfil.comprovanteTipo,
      comprovanteEm: perfil.comprovanteEm,
    },
  };
}

/**
 * Monta o filtro de busca por pessoa (nome, e-mail, CPF ou matrícula).
 * Só entra na busca por CPF se o termo tiver dígitos — senão `contains: ''`
 * casaria com todo mundo e o filtro perderia o sentido.
 */
function filtroBuscaPerfil(busca) {
  const termo = String(busca ?? '').trim();
  if (!termo) return null;

  const digitos = termo.replace(/\D/g, '');

  return {
    OR: [
      { usuario: { nome: { contains: termo, mode: 'insensitive' } } },
      { usuario: { email: { contains: termo, mode: 'insensitive' } } },
      { matricula: { contains: termo, mode: 'insensitive' } },
      ...(digitos.length >= 3 ? [{ cpf: { contains: digitos } }] : []),
    ],
  };
}

export async function listarPagamentosPendentes(req, res) {
  const busca = String(req.query.busca ?? '').trim();
  const filtro = filtroBuscaPerfil(busca);

  const [pagamentos, totalNaFila] = await Promise.all([
    prisma.pagamento.findMany({
      where: {
        status: 'pendente',
        ...(filtro ? { carteirinha: { perfil: filtro } } : {}),
      },
      include: INCLUDE_COMPLETO,
      orderBy: { criadoEm: 'asc' }, // fila: quem avisou primeiro e conferido primeiro
    }),
    // Total sem filtro, para o painel continuar mostrando o tamanho real da fila.
    prisma.pagamento.count({ where: { status: 'pendente' } }),
  ]);

  return res.json({
    total: pagamentos.length,
    totalNaFila,
    busca: busca || null,
    pagamentos: pagamentos.map(serializarPagamento),
  });
}

async function buscarPagamentoPendente(id) {
  const pagamento = await prisma.pagamento.findUnique({
    where: { id },
    include: INCLUDE_COMPLETO,
  });

  if (!pagamento) throw AppError.naoEncontrado('Pagamento não encontrado.');
  if (pagamento.status !== 'pendente') {
    throw AppError.conflito(
      `Este pagamento já foi ${pagamento.status === 'confirmado' ? 'confirmado' : 'rejeitado'}.`,
    );
  }
  return pagamento;
}

export async function aprovarPagamento(req, res) {
  const pagamento = await buscarPagamentoPendente(req.params.id);
  const { carteirinha } = pagamento;
  const { perfil } = carteirinha;
  const { usuario } = perfil;

  const dataEmissao = new Date();
  const dataValidade = calcularValidade(dataEmissao);

  // 1. Marca como aprovada e cria o QR. Isso e o que precisa ser atomico:
  //    a partir daqui a carteirinha existe oficialmente.
  const emitida = await prisma.$transaction(async (tx) => {
    await tx.pagamento.update({
      where: { id: pagamento.id },
      data: {
        status: 'confirmado',
        confirmadoPorId: req.usuario.id,
        confirmadoEm: new Date(),
        comprovanteInfo: req.body?.observacao?.trim() || pagamento.comprovanteInfo,
      },
    });

    // Ambos so nascem aqui, na aprovacao, e nunca mudam depois: o uuid porque
    // ja esta impresso dentro do QR de quem imprimiu, e o codigo de uso porque
    // e o que o aluno dita quando alguem confere a carteirinha por telefone.
    const codigoUso = carteirinha.codigoUso ?? (await gerarCodigoUso(tx));

    return tx.carteirinha.update({
      where: { id: carteirinha.id },
      data: {
        status: 'aprovada',
        qrCodeUuid: carteirinha.qrCodeUuid ?? crypto.randomUUID(),
        codigoUso,
        dataEmissao,
        dataValidade,
      },
    });
  });

  // 2. Renderiza os arquivos. Se o Puppeteer falhar, a aprovacao continua valida
  //    e o admin pode mandar regerar - nao perdemos a confirmacao do pagamento.
  let arquivos = null;
  let erroGeracao = null;
  try {
    arquivos = await gerarArquivosCarteirinha({ carteirinha: emitida, perfil, usuario });
    await prisma.carteirinha.update({
      where: { id: emitida.id },
      data: { arquivoUrl: arquivos.frenteUrl, arquivoVersoUrl: arquivos.versoUrl },
    });
  } catch (erro) {
    console.error('[carteirinha] falha ao gerar arquivos:', erro);
    erroGeracao = erro.message;
  }

  // 3. E-mail. Idem: falha aqui nao derruba a aprovacao.
  let email = { enviado: false, motivo: 'Arquivos não gerados.' };
  if (arquivos) {
    email = await enviarCarteirinhaAprovada({
      usuario,
      carteirinha: { ...emitida, dataValidade },
      caminhos: arquivos.caminhos,
    });
  }

  return res.json({
    mensagem: `Carteirinha de ${usuario.nome} aprovada.`,
    carteirinha: {
      id: emitida.id,
      status: emitida.status,
      qrCodeUuid: emitida.qrCodeUuid,
      urlValidacao: urlValidacao(emitida.qrCodeUuid),
      dataEmissao: emitida.dataEmissao,
      dataValidade: emitida.dataValidade,
      arquivoUrl: arquivos?.frenteUrl ?? null,
      arquivoVersoUrl: arquivos?.versoUrl ?? null,
      pdfUrl: arquivos?.pdfUrl ?? null,
    },
    // O painel mostra esses avisos para o admin saber se precisa reenviar.
    geracaoArquivos: erroGeracao ? { ok: false, erro: erroGeracao } : { ok: true },
    email,
  });
}

export async function rejeitarPagamento(req, res) {
  const pagamento = await buscarPagamentoPendente(req.params.id);
  const { usuario } = pagamento.carteirinha.perfil;
  const motivo = req.body?.motivo?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.pagamento.update({
      where: { id: pagamento.id },
      data: {
        status: 'rejeitado',
        confirmadoPorId: req.usuario.id,
        confirmadoEm: new Date(),
        comprovanteInfo: motivo ?? pagamento.comprovanteInfo,
      },
    });
    await tx.carteirinha.update({
      where: { id: pagamento.carteirinha.id },
      data: { status: 'rejeitada' },
    });
  });

  const email = await enviarPagamentoRejeitado({ usuario, motivo });

  return res.json({
    mensagem: `Pagamento de ${usuario.nome} rejeitado. O estudante pode reenviar o comprovante.`,
    email,
  });
}

export async function listarEstudantes(req, res) {
  const busca = String(req.query.busca ?? '').trim();
  const status = req.query.status;

  const filtro = filtroBuscaPerfil(busca);

  const perfis = await prisma.perfilEstudante.findMany({
    where: {
      ...(filtro ?? {}),
      ...(status ? { carteirinhas: { some: { status } } } : {}),
    },
    include: {
      usuario: { select: { id: true, nome: true, email: true, whatsapp: true, criadoEm: true } },
      carteirinhas: { orderBy: { criadoEm: 'desc' }, take: 1 },
    },
    orderBy: { criadoEm: 'desc' },
    take: 200,
  });

  return res.json({
    total: perfis.length,
    estudantes: perfis.map((perfil) => {
      const carteirinha = perfil.carteirinhas[0] ?? null;
      return {
        usuarioId: perfil.usuario.id,
        perfilId: perfil.id,
        nome: perfil.usuario.nome,
        email: perfil.usuario.email,
        whatsappFormatado: perfil.usuario.whatsapp
          ? formatarTelefoneExibicao(perfil.usuario.whatsapp)
          : null,
        cpfFormatado: formatarCpf(perfil.cpf),
        temComprovante: Boolean(perfil.comprovanteArquivo),
        matricula: perfil.matricula,
        curso: perfil.curso,
        // Valores crus tambem, para o formulario de correcao do admin.
        nivel: perfil.nivel,
        dataNascimento: perfil.dataNascimento.toISOString().slice(0, 10),
        nivelRotulo: ROTULO_NIVEL[perfil.nivel] ?? perfil.nivel,
        fotoUrl: perfil.fotoUrl,
        cadastradoEm: perfil.usuario.criadoEm,
        carteirinha: carteirinha
          ? {
              id: carteirinha.id,
              status: carteirinha.status,
              dataEmissao: carteirinha.dataEmissao,
              dataValidade: carteirinha.dataValidade,
              arquivoUrl: carteirinha.arquivoUrl,
              arquivoVersoUrl: carteirinha.arquivoVersoUrl,
              urlValidacao: carteirinha.qrCodeUuid ? urlValidacao(carteirinha.qrCodeUuid) : null,
            }
          : null,
      };
    }),
  });
}

/**
 * Correção de dados pelo DCE.
 *
 * O estudante não consegue mexer nos campos impressos depois da emissão, para
 * o documento em circulação não divergir do banco. Aqui o admin consegue — e
 * justamente por isso, quando a carteirinha já existe, ela é reemitida na hora
 * com o mesmo QR e reenviada por e-mail. Corrigir sem reemitir seria criar a
 * divergência que o bloqueio do estudante existe para evitar.
 */
export async function editarEstudante(req, res) {
  const { perfilId } = req.params;
  const { nome, cpf, dataNascimento, matricula, curso, nivel, whatsapp } = req.body;

  const perfil = await prisma.perfilEstudante.findUnique({
    where: { id: perfilId },
    include: {
      usuario: true,
      carteirinhas: { orderBy: { criadoEm: 'desc' }, take: 1 },
    },
  });

  if (!perfil) throw AppError.naoEncontrado('Estudante não encontrado.');

  const donoDoCpf = await prisma.perfilEstudante.findUnique({ where: { cpf } });
  if (donoDoCpf && donoDoCpf.id !== perfil.id) {
    throw AppError.conflito('Este CPF já está cadastrado em outra conta.');
  }

  const antes = {
    nome: perfil.usuario.nome,
    cpf: perfil.cpf,
    matricula: perfil.matricula,
    curso: perfil.curso,
    nivel: perfil.nivel,
    dataNascimento: perfil.dataNascimento.toISOString().slice(0, 10),
  };

  await prisma.$transaction([
    prisma.usuario.update({ where: { id: perfil.usuarioId }, data: { nome, whatsapp } }),
    prisma.perfilEstudante.update({
      where: { id: perfil.id },
      data: { cpf, dataNascimento, matricula, curso, nivel },
    }),
  ]);

  const depois = {
    nome,
    cpf,
    matricula,
    curso,
    nivel,
    dataNascimento: new Date(dataNascimento).toISOString().slice(0, 10),
  };

  const alterados = Object.keys(depois).filter((k) => String(antes[k]) !== String(depois[k]));

  // Rastro no log: quem mexeu, em quem, e o que mudou.
  console.log(
    `[admin] ${req.usuario.email} editou o perfil de ${perfil.usuario.email}` +
      (alterados.length ? ` — campos: ${alterados.join(', ')}` : ' — sem mudanças'),
  );

  const carteirinha = perfil.carteirinhas[0];
  const precisaReemitir = carteirinha?.status === 'aprovada' && alterados.length > 0;

  let reemissao = { reemitida: false };
  let email = { enviado: false, motivo: 'Carteirinha não estava emitida.' };

  if (precisaReemitir) {
    try {
      const { carteirinha: atualizada, arquivos, usuario } = await reemitirCarteirinha(carteirinha.id);
      reemissao = { reemitida: true, arquivoUrl: arquivos.frenteUrl, pdfUrl: arquivos.pdfUrl };

      email = await enviarCarteirinhaAprovada({
        usuario: { ...usuario, nome },
        carteirinha: atualizada,
        caminhos: arquivos.caminhos,
      });
    } catch (erro) {
      console.error('[admin] falha ao reemitir apos edicao:', erro);
      reemissao = { reemitida: false, erro: erro.message };
    }
  }

  const atualizado = await prisma.perfilEstudante.findUnique({
    where: { id: perfil.id },
    include: { usuario: true },
  });

  return res.json({
    mensagem: precisaReemitir
      ? `Dados de ${nome} corrigidos e carteirinha reemitida.`
      : `Dados de ${nome} atualizados.`,
    camposAlterados: alterados,
    estudante: {
      perfilId: atualizado.id,
      nome: atualizado.usuario.nome,
      email: atualizado.usuario.email,
      cpfFormatado: formatarCpf(atualizado.cpf),
      matricula: atualizado.matricula,
      curso: atualizado.curso,
      nivelRotulo: ROTULO_NIVEL[atualizado.nivel] ?? atualizado.nivel,
    },
    reemissao,
    email,
  });
}

/** Regera os arquivos sem mexer em dado nenhum. Usado quando o endereço público
 *  do sistema muda e os QR antigos passam a apontar para o lugar errado. */
export async function regerarCarteirinha(req, res) {
  try {
    const { arquivos, usuario } = await reemitirCarteirinha(req.params.carteirinhaId);
    return res.json({
      mensagem: `Carteirinha de ${usuario.nome} regerada.`,
      arquivoUrl: arquivos.frenteUrl,
      pdfUrl: arquivos.pdfUrl,
    });
  } catch (erro) {
    throw new AppError(erro.message, 409);
  }
}

export async function resumo(_req, res) {
  const [porStatus, pendentes, totalEstudantes] = await Promise.all([
    prisma.carteirinha.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.pagamento.count({ where: { status: 'pendente' } }),
    prisma.perfilEstudante.count(),
  ]);

  const contagem = Object.fromEntries(porStatus.map((l) => [l.status, l._count._all]));

  return res.json({
    totalEstudantes,
    pagamentosPendentes: pendentes,
    carteirinhas: {
      aguardando_pagamento: contagem.aguardando_pagamento ?? 0,
      pagamento_em_analise: contagem.pagamento_em_analise ?? 0,
      aprovada: contagem.aprovada ?? 0,
      rejeitada: contagem.rejeitada ?? 0,
    },
  });
}

import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { formatarCpf } from '../utils/validadores.js';
import { ROTULO_NIVEL } from '../validators/perfil.validator.js';
import { urlValidacao } from '../services/qrcode.service.js';
import { enviarCarteirinhaAprovada } from '../services/email.service.js';
import { urlParaCaminho } from '../config/storage.js';

export const DESCRICAO_STATUS = {
  aguardando_pagamento: {
    titulo: 'Aguardando pagamento',
    detalhe: 'Faça o PIX e envie o comprovante ao DCE pelo WhatsApp.',
  },
  pagamento_em_analise: {
    titulo: 'Pagamento em análise',
    detalhe: 'Recebemos seu aviso. O DCE está conferindo o comprovante.',
  },
  aprovada: {
    titulo: 'Carteirinha aprovada',
    detalhe: 'Documento emitido e enviado para o seu e-mail.',
  },
  rejeitada: {
    titulo: 'Pagamento não confirmado',
    detalhe: 'O DCE não conseguiu confirmar o pagamento. Reenvie o comprovante.',
  },
};

/** Busca a carteirinha mais recente do estudante logado, junto com o perfil. */
async function carteirinhaDoUsuario(usuarioId) {
  const perfil = await prisma.perfilEstudante.findUnique({
    where: { usuarioId },
    include: {
      usuario: { select: { id: true, nome: true, email: true, whatsapp: true } },
      carteirinhas: {
        orderBy: { criadoEm: 'desc' },
        take: 1,
        include: { pagamentos: { orderBy: { criadoEm: 'desc' }, take: 1 } },
      },
    },
  });
  return perfil;
}

export function serializarCarteirinha(carteirinha, perfil, usuario) {
  const aprovada = carteirinha.status === 'aprovada';
  return {
    id: carteirinha.id,
    status: carteirinha.status,
    ...DESCRICAO_STATUS[carteirinha.status],
    // Antes da aprovacao o QR simplesmente nao existe.
    qrCodeUuid: aprovada ? carteirinha.qrCodeUuid : null,
    urlValidacao: aprovada ? urlValidacao(carteirinha.qrCodeUuid) : null,
    arquivoUrl: aprovada ? carteirinha.arquivoUrl : null,
    arquivoVersoUrl: aprovada ? carteirinha.arquivoVersoUrl : null,
    dataEmissao: carteirinha.dataEmissao,
    dataValidade: carteirinha.dataValidade,
    podeReenviarEmail: aprovada && Boolean(carteirinha.arquivoUrl),
    estudante: {
      nome: usuario.nome,
      cpfFormatado: formatarCpf(perfil.cpf),
      matricula: perfil.matricula,
      curso: perfil.curso,
      nivel: perfil.nivel,
      nivelRotulo: ROTULO_NIVEL[perfil.nivel] ?? perfil.nivel,
      instituicao: env.dce.instituicao,
      fotoUrl: perfil.fotoUrl,
      dataNascimento: perfil.dataNascimento.toISOString().slice(0, 10),
    },
  };
}

export async function obterCarteirinha(req, res) {
  const perfil = await carteirinhaDoUsuario(req.usuario.id);

  if (!perfil) {
    return res.json({
      temPerfil: false,
      carteirinha: null,
      proximoPasso: 'Complete o seu perfil para solicitar a carteirinha.',
    });
  }

  const carteirinha = perfil.carteirinhas[0];
  if (!carteirinha) {
    return res.json({ temPerfil: true, carteirinha: null, proximoPasso: 'Perfil completo.' });
  }

  // As pendencias so bloqueiam a tela enquanto o aluno ainda nao entrou na fila.
  // Depois disso — em analise, aprovada ou rejeitada — ele sempre ve a
  // carteirinha, senao quem foi aprovado antes de existir a exigencia de
  // comprovante perderia acesso ao proprio documento.
  if (carteirinha.status === 'aguardando_pagamento') {
    const pendencia = !perfil.fotoUrl
      ? 'Envie a sua foto 3x4 para solicitar a carteirinha.'
      : !perfil.comprovanteArquivo
        ? 'Envie o comprovante de matrícula para solicitar a carteirinha.'
        : null;

    if (pendencia) {
      return res.json({ temPerfil: true, carteirinha: null, proximoPasso: pendencia });
    }
  }

  return res.json({
    temPerfil: true,
    carteirinha: serializarCarteirinha(carteirinha, perfil, perfil.usuario),
    pagamento: {
      chavePix: env.dce.chavePix,
      tipoChavePix: env.dce.tipoChavePix,
      beneficiario: env.dce.beneficiarioPix,
      valor: env.dce.valorCarteirinha,
      whatsapp: env.dce.whatsapp,
    },
  });
}

/**
 * O aluno avisa que ja mandou o comprovante pelo WhatsApp. Isso cria o registro
 * de pagamento pendente, que e o que faz o aluno aparecer na fila do admin.
 */
export async function informarPagamento(req, res) {
  const perfil = await carteirinhaDoUsuario(req.usuario.id);
  if (!perfil) throw new AppError('Complete o seu perfil primeiro.', 409);
  if (!perfil.fotoUrl) throw new AppError('Envie a sua foto antes de informar o pagamento.', 409);
  // Sem comprovante o DCE nao tem como atestar a condicao de estudante, que e
  // exatamente o que o verso da carteirinha afirma.
  if (!perfil.comprovanteArquivo) {
    throw new AppError('Envie o comprovante de matrícula antes de informar o pagamento.', 409, {
      motivo: 'sem_comprovante',
    });
  }

  const carteirinha = perfil.carteirinhas[0];
  if (!carteirinha) throw AppError.naoEncontrado('Carteirinha não encontrada.');

  if (carteirinha.status === 'aprovada') {
    throw AppError.conflito('Sua carteirinha já foi aprovada.');
  }
  if (carteirinha.status === 'pagamento_em_analise') {
    throw AppError.conflito('Seu comprovante já está na fila de conferência do DCE.');
  }

  const observacao = req.body?.observacao?.trim() || null;

  await prisma.$transaction(async (tx) => {
    await tx.pagamento.create({
      data: {
        carteirinhaId: carteirinha.id,
        comprovanteInfo: observacao,
        status: 'pendente',
      },
    });
    await tx.carteirinha.update({
      where: { id: carteirinha.id },
      data: { status: 'pagamento_em_analise' },
    });
  });

  const atualizado = await carteirinhaDoUsuario(req.usuario.id);

  return res.json({
    mensagem: 'Avisamos o DCE. Assim que o comprovante for conferido você recebe o resultado por e-mail.',
    carteirinha: serializarCarteirinha(atualizado.carteirinhas[0], atualizado, atualizado.usuario),
  });
}

export async function reenviarEmail(req, res) {
  const perfil = await carteirinhaDoUsuario(req.usuario.id);
  const carteirinha = perfil?.carteirinhas?.[0];

  if (!carteirinha || carteirinha.status !== 'aprovada') {
    throw AppError.conflito('Sua carteirinha ainda não foi aprovada.');
  }

  const caminhos = {
    frente: urlParaCaminho(carteirinha.arquivoUrl),
    verso: urlParaCaminho(carteirinha.arquivoVersoUrl),
    pdf: urlParaCaminho(carteirinha.arquivoUrl)?.replace(/-frente\.png$/, '.pdf'),
  };

  if (!caminhos.frente) {
    throw new AppError('Arquivo da carteirinha não encontrado. Fale com o DCE.', 500);
  }

  // Reenvia o arquivo ja gerado, sem regerar nada.
  const resultado = await enviarCarteirinhaAprovada({
    usuario: perfil.usuario,
    carteirinha,
    caminhos,
  });

  if (!resultado.enviado) {
    throw new AppError(`Não foi possível enviar o e-mail: ${resultado.motivo}`, 502);
  }

  return res.json({ mensagem: `Carteirinha reenviada para ${perfil.usuario.email}.` });
}

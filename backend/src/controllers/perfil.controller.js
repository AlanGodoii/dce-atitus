import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { formatarCpf } from '../utils/validadores.js';
import { processarFotoPerfil } from '../services/foto.service.js';
import { removerComprovante, salvarComprovante } from '../services/comprovante.service.js';
import { caminhoComprovante, removerArquivoSilencioso, urlParaCaminho } from '../config/storage.js';
import { ROTULO_DOCUMENTO } from '../validators/perfil.validator.js';

// Campos que saem impressos na carteirinha: uma vez emitida, mudar qualquer um
// deles faria o documento em circulacao divergir do banco.
const CAMPOS_IMPRESSOS = [
  'nome',
  'cpf',
  'dataNascimento',
  'matricula',
  'curso',
  'nivel',
  'documentoTipo',
  'documentoNumero',
  'documentoEmissor',
];

export function serializarPerfil(usuario) {
  const perfil = usuario.perfil;
  if (!perfil) return null;
  return {
    id: perfil.id,
    nome: usuario.nome,
    email: usuario.email,
    whatsapp: usuario.whatsapp,
    cpf: perfil.cpf,
    cpfFormatado: formatarCpf(perfil.cpf),
    dataNascimento: perfil.dataNascimento.toISOString().slice(0, 10),
    matricula: perfil.matricula,
    curso: perfil.curso,
    nivel: perfil.nivel,
    documentoTipo: perfil.documentoTipo,
    documentoNumero: perfil.documentoNumero,
    documentoEmissor: perfil.documentoEmissor,
    documentoRotulo: perfil.documentoTipo
      ? ROTULO_DOCUMENTO[perfil.documentoTipo] ?? perfil.documentoTipo
      : null,
    fotoUrl: perfil.fotoUrl,
    // O arquivo em si nunca vai na resposta — so a informacao de que existe.
    temComprovante: Boolean(perfil.comprovanteArquivo),
    comprovanteTipo: perfil.comprovanteTipo,
    comprovanteEm: perfil.comprovanteEm,
    criadoEm: perfil.criadoEm,
    atualizadoEm: perfil.atualizadoEm,
  };
}

export async function obterPerfil(req, res) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    include: { perfil: true },
  });

  const perfil = serializarPerfil(usuario);

  const temFoto = Boolean(perfil?.fotoUrl);
  const temComprovante = Boolean(perfil?.temComprovante);

  return res.json({
    perfil,
    completo: Boolean(perfil),
    temFoto,
    temComprovante,
    // O aluno so entra na fila do DCE com dados, foto E comprovante de matricula:
    // e o comprovante que da lastro ao "confirmamos a condicao de estudante".
    prontoParaPagamento: Boolean(perfil) && temFoto && temComprovante,
    pendencias: [
      !perfil && 'Preencha seus dados.',
      perfil && !temFoto && 'Envie a sua foto 3x4.',
      perfil && !temComprovante && 'Envie o comprovante de matrícula.',
    ].filter(Boolean),
  });
}

export async function salvarPerfil(req, res) {
  const {
    nome,
    cpf,
    dataNascimento,
    matricula,
    curso,
    nivel,
    documentoTipo,
    documentoNumero,
    documentoEmissor,
    whatsapp,
  } = req.body;
  const usuarioId = req.usuario.id;

  const existente = await prisma.perfilEstudante.findUnique({
    where: { usuarioId },
    include: {
      carteirinhas: { orderBy: { criadoEm: 'desc' }, take: 1 },
    },
  });

  // CPF pertence a outra conta?
  const donoDoCpf = await prisma.perfilEstudante.findUnique({ where: { cpf } });
  if (donoDoCpf && donoDoCpf.usuarioId !== usuarioId) {
    throw AppError.conflito('Este CPF já está cadastrado em outra conta.');
  }

  if (existente) {
    const carteirinha = existente.carteirinhas[0];
    if (carteirinha?.status === 'aprovada') {
      const mudou = CAMPOS_IMPRESSOS.filter((campo) => {
        const novo = {
          nome,
          cpf,
          dataNascimento,
          matricula,
          curso,
          nivel,
          documentoTipo,
          documentoNumero,
          documentoEmissor,
        }[campo];
        const atual = campo === 'nome' ? req.usuario.nome : existente[campo];
        if (campo === 'dataNascimento') {
          return new Date(novo).toISOString().slice(0, 10) !== atual.toISOString().slice(0, 10);
        }
        return String(novo) !== String(atual);
      });

      if (mudou.length > 0) {
        throw new AppError(
          'Sua carteirinha já foi emitida com estes dados. Para corrigir ' +
            `${mudou.join(', ')}, fale com o DCE pelo WhatsApp.`,
          409,
          { camposBloqueados: mudou },
        );
      }
    }
  }

  const perfil = await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: usuarioId },
      data: { nome, whatsapp },
    });

    const campos = {
      cpf,
      dataNascimento,
      matricula,
      curso,
      nivel,
      documentoTipo,
      documentoNumero,
      documentoEmissor,
    };

    const salvo = await tx.perfilEstudante.upsert({
      where: { usuarioId },
      create: { usuarioId, ...campos },
      update: campos,
    });

    // Primeira vez que o perfil fica completo: abre a carteirinha aguardando pagamento.
    const jaTemCarteirinha = await tx.carteirinha.findFirst({ where: { perfilId: salvo.id } });
    if (!jaTemCarteirinha) {
      await tx.carteirinha.create({
        data: { perfilId: salvo.id, status: 'aguardando_pagamento' },
      });
    }

    return salvo;
  });

  const atualizado = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { perfil: true },
  });

  return res.status(existente ? 200 : 201).json({
    mensagem: existente ? 'Perfil atualizado.' : 'Perfil criado com sucesso.',
    perfil: serializarPerfil(atualizado),
    prontoParaPagamento: Boolean(perfil && atualizado.perfil.fotoUrl),
  });
}

export async function enviarFoto(req, res) {
  const perfil = await prisma.perfilEstudante.findUnique({
    where: { usuarioId: req.usuario.id },
    include: { carteirinhas: { orderBy: { criadoEm: 'desc' }, take: 1 } },
  });

  if (!perfil) {
    throw new AppError('Preencha seus dados antes de enviar a foto.', 409);
  }

  if (perfil.carteirinhas[0]?.status === 'aprovada') {
    throw AppError.conflito(
      'Sua carteirinha já foi emitida com a foto atual. Para trocar, fale com o DCE.',
    );
  }

  const fotoAnterior = perfil.fotoUrl ? urlParaCaminho(perfil.fotoUrl) : null;
  const { url } = await processarFotoPerfil(req.file.buffer, perfil.id);

  await prisma.perfilEstudante.update({
    where: { id: perfil.id },
    data: { fotoUrl: url },
  });

  // So apaga a antiga depois que a nova esta gravada e referenciada.
  removerArquivoSilencioso(fotoAnterior);

  return res.json({ mensagem: 'Foto atualizada.', fotoUrl: url });
}

// --- comprovante de matrícula -----------------------------------------------

export async function enviarComprovante(req, res) {
  const perfil = await prisma.perfilEstudante.findUnique({
    where: { usuarioId: req.usuario.id },
    include: { carteirinhas: { orderBy: { criadoEm: 'desc' }, take: 1 } },
  });

  if (!perfil) {
    throw new AppError('Preencha seus dados antes de enviar o comprovante.', 409);
  }

  // Diferente da foto, o comprovante NAO e impresso na carteirinha — trocar
  // depois da emissao nao cria divergencia com o documento em circulacao. E o
  // DCE pode querer uma versao mais recente a cada semestre.
  const anterior = perfil.comprovanteArquivo;
  const { arquivo, tipo } = await salvarComprovante(req.file.buffer, perfil.id);

  await prisma.perfilEstudante.update({
    where: { id: perfil.id },
    data: { comprovanteArquivo: arquivo, comprovanteTipo: tipo, comprovanteEm: new Date() },
  });

  await removerComprovante(anterior);

  return res.json({
    mensagem: 'Comprovante de matrícula enviado. O DCE vai conferir junto com o pagamento.',
    temComprovante: true,
    comprovanteTipo: tipo,
  });
}

/**
 * Entrega o arquivo do comprovante. Nunca servido estaticamente: passa por aqui
 * justamente para checar quem esta pedindo.
 *
 * @param {string} perfilId  quando ausente, entrega o do proprio usuario logado
 */
export async function baixarComprovante(req, res) {
  const ehAdmin = req.usuario.role === 'admin';
  const perfilId = req.params.perfilId;

  if (perfilId && !ehAdmin) {
    throw AppError.proibido('Você só pode acessar o seu próprio comprovante.');
  }

  const perfil = perfilId
    ? await prisma.perfilEstudante.findUnique({ where: { id: perfilId } })
    : await prisma.perfilEstudante.findUnique({ where: { usuarioId: req.usuario.id } });

  if (!perfil?.comprovanteArquivo) {
    throw AppError.naoEncontrado('Nenhum comprovante de matrícula enviado.');
  }

  const caminho = caminhoComprovante(perfil.comprovanteArquivo);
  if (!caminho) throw AppError.naoEncontrado('Arquivo do comprovante não encontrado.');

  // `inline` deixa abrir na aba; o nossniff + o tipo fixo evitam que o navegador
  // trate o arquivo como algo executavel.
  res.setHeader('Content-Type', perfil.comprovanteTipo ?? 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename="comprovante-matricula-${perfil.matricula}"`);
  res.setHeader('Cache-Control', 'private, no-store');

  return res.sendFile(caminho, (erro) => {
    if (erro && !res.headersSent) {
      res.status(404).json({ erro: 'Arquivo do comprovante não encontrado.' });
    }
  });
}

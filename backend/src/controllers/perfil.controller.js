import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { formatarCpf } from '../utils/validadores.js';
import { processarFotoPerfil } from '../services/foto.service.js';
import { removerArquivoSilencioso, urlParaCaminho } from '../config/storage.js';

// Campos que saem impressos na carteirinha: uma vez emitida, mudar qualquer um
// deles faria o documento em circulacao divergir do banco.
const CAMPOS_IMPRESSOS = ['nome', 'cpf', 'dataNascimento', 'matricula', 'curso', 'nivel'];

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
    fotoUrl: perfil.fotoUrl,
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

  return res.json({
    perfil,
    completo: Boolean(perfil),
    temFoto: Boolean(perfil?.fotoUrl),
    // O aluno so avanca para o pagamento com todos os dados + foto.
    prontoParaPagamento: Boolean(perfil && perfil.fotoUrl),
  });
}

export async function salvarPerfil(req, res) {
  const { nome, cpf, dataNascimento, matricula, curso, nivel, whatsapp } = req.body;
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
        const novo = { nome, cpf, dataNascimento, matricula, curso, nivel }[campo];
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

    const salvo = await tx.perfilEstudante.upsert({
      where: { usuarioId },
      create: { usuarioId, cpf, dataNascimento, matricula, curso, nivel },
      update: { cpf, dataNascimento, matricula, curso, nivel },
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

import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { ROTULO_NIVEL } from '../validators/perfil.validator.js';
import { somenteDigitos } from '../utils/validadores.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 12345678900 -> ***.456.789-** (LGPD: o validador nao precisa do CPF inteiro) */
function mascararCpf(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return null;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/**
 * Rota publica lida pelo QR Code. Devolve o minimo necessario para alguem no
 * caixa de um cinema conferir que o documento e autentico e esta no prazo.
 */
export async function validarCarteirinha(req, res) {
  const { qrCodeUuid } = req.params;

  if (!UUID_V4.test(qrCodeUuid)) {
    throw new AppError('Código de validação inválido.', 400);
  }

  const carteirinha = await prisma.carteirinha.findUnique({
    where: { qrCodeUuid },
    include: {
      perfil: {
        include: { usuario: { select: { nome: true } } },
      },
    },
  });

  if (!carteirinha || carteirinha.status !== 'aprovada') {
    return res.status(404).json({
      valida: false,
      motivo: 'nao_encontrada',
      mensagem:
        'Carteirinha não encontrada. Este código não corresponde a nenhum documento emitido pelo DCE ATITUS.',
    });
  }

  const hoje = new Date();
  const expirada = carteirinha.dataValidade && carteirinha.dataValidade < hoje;

  const { perfil } = carteirinha;

  return res.json({
    valida: !expirada,
    motivo: expirada ? 'expirada' : null,
    mensagem: expirada
      ? `Documento autêntico, porém vencido em ${carteirinha.dataValidade.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}.`
      : 'Documento autêntico e dentro do prazo de validade.',
    estudante: {
      nome: perfil.usuario.nome,
      cpfMascarado: mascararCpf(perfil.cpf),
      matricula: perfil.matricula,
      curso: perfil.curso,
      nivel: ROTULO_NIVEL[perfil.nivel] ?? perfil.nivel,
      instituicao: env.dce.instituicao,
      fotoUrl: perfil.fotoUrl,
    },
    documento: {
      emissor: env.dce.nome,
      dataEmissao: carteirinha.dataEmissao,
      dataValidade: carteirinha.dataValidade,
    },
    verificadoEm: hoje.toISOString(),
  });
}

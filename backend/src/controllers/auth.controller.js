import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { gerarToken } from '../utils/jwt.js';
import {
  MOTIVOS,
  enviarVerificacao,
  verificarPorCodigo,
  verificarPorToken,
} from '../services/verificacao.service.js';

const CUSTO_BCRYPT = 12;

function publico(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    role: usuario.role,
    whatsapp: usuario.whatsapp ?? null,
    temSenha: Boolean(usuario.senhaHash),
    contaGoogle: Boolean(usuario.googleId),
    emailVerificado: Boolean(usuario.emailVerificadoEm),
    criadoEm: usuario.criadoEm,
  };
}

export async function register(req, res) {
  const { nome, email, senha, whatsapp } = req.body;

  const jaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (jaExiste) {
    throw AppError.conflito(
      jaExiste.senhaHash
        ? 'Este e-mail já está cadastrado. Faça login.'
        : 'Este e-mail já foi usado para entrar com o Google. Use o botão "Entrar com Google".',
    );
  }

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, CUSTO_BCRYPT),
      whatsapp,
      role: 'estudante',
    },
  });

  const verificacao = await enviarVerificacao(usuario);

  // A conta nasce criada porém não confirmada: o usuário entra e preenche o
  // perfil, mas só sai do lugar depois de provar que a caixa de e-mail é dele.
  return res.status(201).json({
    token: gerarToken(usuario),
    usuario: publico(usuario),
    verificacao: {
      enviado: verificacao.enviado,
      motivo: verificacao.motivo ?? null,
      ...(verificacao.dev ? { dev: verificacao.dev } : {}),
    },
  });
}

export async function login(req, res) {
  const { email, senha } = req.body;

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Mesma mensagem para e-mail inexistente e senha errada, para nao revelar
  // quais e-mails estao cadastrados.
  const generico = () => AppError.naoAutorizado('E-mail ou senha incorretos.');

  if (!usuario) {
    // Gasta o mesmo tempo de um hash real para nao dar pista pelo tempo de resposta.
    await bcrypt.compare(senha, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali');
    throw generico();
  }

  if (!usuario.senhaHash) {
    throw AppError.naoAutorizado(
      'Esta conta foi criada com o Google. Entre pelo botão "Entrar com Google".',
    );
  }

  const confere = await bcrypt.compare(senha, usuario.senhaHash);
  if (!confere) throw generico();

  return res.json({ token: gerarToken(usuario), usuario: publico(usuario) });
}

export async function me(req, res) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    include: {
      perfil: {
        select: { id: true, cpf: true, matricula: true, curso: true, fotoUrl: true },
      },
    },
  });

  if (!usuario) throw AppError.naoAutorizado();

  return res.json({
    usuario: publico(usuario),
    perfilCompleto: Boolean(usuario.perfil),
  });
}

// --- confirmação de e-mail --------------------------------------------------

export async function verificarEmail(req, res) {
  const { token, email, codigo } = req.body;

  const resultado = token
    ? await verificarPorToken(token)
    : await verificarPorCodigo(email, codigo);

  if (!resultado.ok) {
    throw new AppError(MOTIVOS[resultado.motivo] ?? MOTIVOS.invalido, 400, {
      motivo: resultado.motivo,
    });
  }

  // Devolve um token novo para quem confirmou pelo link já entrar logado.
  return res.json({
    mensagem: resultado.jaEstava ? 'Seu e-mail já estava confirmado.' : 'E-mail confirmado!',
    token: gerarToken(resultado.usuario),
    usuario: publico(resultado.usuario),
  });
}

export async function reenviarVerificacao(req, res) {
  const email = req.body.email;
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Resposta igual exista ou não a conta, para a rota não virar um oráculo de
  // quais e-mails estão cadastrados.
  const generica = {
    mensagem: `Se houver uma conta com ${email}, o e-mail de confirmação foi reenviado.`,
  };

  if (!usuario || usuario.emailVerificadoEm) return res.json(generica);

  const verificacao = await enviarVerificacao(usuario);
  return res.json({
    ...generica,
    enviado: verificacao.enviado,
    ...(verificacao.dev ? { dev: verificacao.dev } : {}),
  });
}

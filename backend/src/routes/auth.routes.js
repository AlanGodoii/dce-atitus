import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import passport from '../config/passport.js';
import { env } from '../config/env.js';
import {
  esqueciSenha,
  login,
  me,
  redefinirSenhaController,
  register,
  reenviarVerificacao,
  verificarEmail,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  esqueciSenhaSchema,
  loginSchema,
  redefinirSenhaSchema,
  reenviarVerificacaoSchema,
  registerSchema,
  verificarSchema,
} from '../validators/auth.validator.js';
import { gerarToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

const router = Router();

// Freio simples contra forca bruta de senha e criacao em massa de contas.
const limiteAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 20 : 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

// Tentar códigos de 6 dígitos na força bruta precisa ser caro.
const limiteVerificacao = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isProd ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas de confirmação. Aguarde alguns minutos.' },
});

// Reenvio é caro (gasta cota de SMTP) e é gatilho fácil de abuso.
const limiteReenvio = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.isProd ? 5 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Você pediu o e-mail de confirmação várias vezes. Tente de novo em 1 hora.' },
});

router.post('/register', limiteAuth, validate(registerSchema), register);
router.post('/login', limiteAuth, validate(loginSchema), login);
router.get('/me', requireAuth, me);

router.post('/verificar-email', limiteVerificacao, validate(verificarSchema), verificarEmail);

// Pedir redefinição gasta e-mail e é gatilho fácil de abuso; tentar adivinhar o
// código precisa ser caro. Por isso os dois passam por limites separados.
router.post('/esqueci-senha', limiteReenvio, validate(esqueciSenhaSchema), esqueciSenha);
router.post(
  '/redefinir-senha',
  limiteVerificacao,
  validate(redefinirSenhaSchema),
  redefinirSenhaController,
);
router.post(
  '/reenviar-verificacao',
  limiteReenvio,
  validate(reenviarVerificacaoSchema),
  reenviarVerificacao,
);

// --- Google OAuth -----------------------------------------------------------

router.get('/google', (req, res, next) => {
  if (!env.google.habilitado) {
    return next(
      new AppError(
        'Login com Google não está configurado neste ambiente (defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).',
        503,
      ),
    );
  }
  return passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!env.google.habilitado) {
    return res.redirect(`${env.frontendUrl}/login?erro=google_indisponivel`);
  }

  return passport.authenticate('google', { session: false }, (erro, usuario, info) => {
    if (erro) return next(erro);

    if (!usuario) {
      const motivo = encodeURIComponent(info?.message ?? 'Não foi possível entrar com o Google.');
      return res.redirect(`${env.frontendUrl}/login?erro=${motivo}`);
    }

    // A SPA le o token em /auth/callback, salva no storage e limpa a URL.
    const token = gerarToken(usuario);
    return res.redirect(`${env.frontendUrl}/auth/callback?token=${token}`);
  })(req, res, next);
});

export default router;

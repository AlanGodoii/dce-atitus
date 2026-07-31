import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import authRoutes from './auth.routes.js';
import perfilRoutes from './perfil.routes.js';
import carteirinhaRoutes from './carteirinha.routes.js';
import adminRoutes from './admin.routes.js';
import { validarCarteirinha } from '../controllers/validacao.controller.js';
import { env } from '../config/env.js';
import { emailHabilitado } from '../services/email.service.js';

const router = Router();

/** Indice da API. Quem abre a porta no navegador cai aqui em vez de num 404. */
router.get('/', (_req, res) => {
  res.json({
    servico: 'API da Carteirinha Estudantil Digital - DCE ATITUS',
    versao: '1.0.0',
    ambiente: env.nodeEnv,
    observacao: `Isto e a API. O site do estudante roda separado, em ${env.frontendUrl}`,
    rotas: {
      publicas: ['GET /health', 'GET /config-publica', 'GET /validar/:qrCodeUuid'],
      autenticacao: [
        'POST /auth/register',
        'POST /auth/login',
        'GET /auth/me',
        'GET /auth/google',
      ],
      estudante: [
        'GET /perfil',
        'POST /perfil',
        'POST /perfil/foto',
        'GET /carteirinha',
        'POST /carteirinha/informar-pagamento',
        'POST /carteirinha/reenviar-email',
      ],
      admin: [
        'GET /admin/resumo',
        'GET /admin/estudantes',
        'GET /admin/pagamentos-pendentes',
        'PATCH /admin/pagamentos/:id/aprovar',
        'PATCH /admin/pagamentos/:id/rejeitar',
      ],
    },
  });
});

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    servico: 'dce-atitus-api',
    ambiente: env.nodeEnv,
    loginGoogle: env.google.habilitado,
    email: emailHabilitado,
  });
});

/** Dados publicos do DCE usados na landing e na tela de pagamento. */
router.get('/config-publica', (_req, res) => {
  res.json({
    dce: {
      nome: env.dce.nome,
      instituicao: env.dce.instituicao,
      whatsapp: env.dce.whatsapp,
      email: env.dce.email,
    },
    pagamento: {
      chavePix: env.dce.chavePix,
      tipoChavePix: env.dce.tipoChavePix,
      beneficiario: env.dce.beneficiarioPix,
      valor: env.dce.valorCarteirinha,
    },
    loginGoogleHabilitado: env.google.habilitado,
  });
});

// Rota publica lida pelo QR. Limite alto o bastante para uso normal, baixo o
// bastante para nao servir de sonda automatizada.
const limiteValidacao = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { erro: 'Muitas consultas seguidas. Aguarde alguns minutos.' },
});

router.get('/validar/:qrCodeUuid', limiteValidacao, validarCarteirinha);

router.use('/auth', authRoutes);
router.use('/perfil', perfilRoutes);
router.use('/carteirinha', carteirinhaRoutes);
router.use('/admin', adminRoutes);

export default router;

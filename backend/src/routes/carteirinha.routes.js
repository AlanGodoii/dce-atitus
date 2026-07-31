import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  informarPagamento,
  obterCarteirinha,
  reenviarEmail,
} from '../controllers/carteirinha.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireEmailVerificado } from '../middlewares/email-verificado.middleware.js';

const router = Router();

router.use(requireAuth, requireEmailVerificado);

// Evita que o botao "reenviar" vire uma metralhadora de e-mails.
const limiteReenvio = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => req.usuario.id,
  message: { erro: 'Você já reenviou a carteirinha várias vezes. Tente de novo em 1 hora.' },
});

router.get('/', obterCarteirinha);
router.post('/informar-pagamento', informarPagamento);
router.post('/reenviar-email', limiteReenvio, reenviarEmail);

export default router;

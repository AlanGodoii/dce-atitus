import { Router } from 'express';
import {
  aprovarPagamento,
  editarEstudante,
  listarEstudantes,
  listarPagamentosPendentes,
  regerarCarteirinha,
  rejeitarPagamento,
  resumo,
} from '../controllers/admin.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { perfilSchema } from '../validators/perfil.validator.js';
import { baixarComprovante } from '../controllers/perfil.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/resumo', resumo);
router.get('/pagamentos-pendentes', listarPagamentosPendentes);
router.patch('/pagamentos/:id/aprovar', aprovarPagamento);
router.patch('/pagamentos/:id/rejeitar', rejeitarPagamento);
router.get('/estudantes', listarEstudantes);
router.get('/estudantes/:perfilId/comprovante', baixarComprovante);
router.patch('/estudantes/:perfilId', validate(perfilSchema), editarEstudante);
router.post('/carteirinhas/:carteirinhaId/regerar', regerarCarteirinha);

export default router;

import { Router } from 'express';
import {
  aprovarPagamento,
  listarEstudantes,
  listarPagamentosPendentes,
  rejeitarPagamento,
  resumo,
} from '../controllers/admin.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/resumo', resumo);
router.get('/pagamentos-pendentes', listarPagamentosPendentes);
router.patch('/pagamentos/:id/aprovar', aprovarPagamento);
router.patch('/pagamentos/:id/rejeitar', rejeitarPagamento);
router.get('/estudantes', listarEstudantes);

export default router;

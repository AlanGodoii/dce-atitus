import { Router } from 'express';
import { enviarFoto, obterPerfil, salvarPerfil } from '../controllers/perfil.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireEmailVerificado } from '../middlewares/email-verificado.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadFoto } from '../middlewares/upload.middleware.js';
import { perfilSchema } from '../validators/perfil.validator.js';

const router = Router();

// Nada da area do estudante existe para quem nao provou que o e-mail e seu:
// e por ele que a carteirinha sera entregue.
router.use(requireAuth, requireEmailVerificado);

router.get('/', obterPerfil);
router.post('/', validate(perfilSchema), salvarPerfil);
router.post('/foto', uploadFoto, enviarFoto);

export default router;

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function gerarToken(usuario) {
  // `ms` existe porque o `iat` padrao do JWT so tem precisao de SEGUNDOS, e a
  // invalidacao de sessao por troca de senha precisa distinguir eventos dentro
  // do mesmo segundo. Sem ele, um token emitido no mesmo segundo da redefinicao
  // sobrevive a ela — que e exatamente quem a redefinicao deveria expulsar.
  return jwt.sign({ role: usuario.role, ms: Date.now() }, env.jwt.secret, {
    subject: usuario.id,
    expiresIn: env.jwt.expiresIn,
  });
}

export function verificarToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function gerarToken(usuario) {
  return jwt.sign({ role: usuario.role }, env.jwt.secret, {
    subject: usuario.id,
    expiresIn: env.jwt.expiresIn,
  });
}

export function verificarToken(token) {
  return jwt.verify(token, env.jwt.secret);
}

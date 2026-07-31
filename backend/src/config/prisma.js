import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// Em dev o nodemon reinicia o processo com frequencia; guardar a instancia no
// globalThis evita abrir um pool novo de conexoes a cada reload.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProd ? ['error'] : ['warn', 'error'],
  });

if (!env.isProd) {
  globalForPrisma.prisma = prisma;
}

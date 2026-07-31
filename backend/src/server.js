import { criarApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { fecharNavegador } from './services/navegador.js';
import { statusEmail } from './services/email.service.js';

const app = criarApp();

const servidor = app.listen(env.port, () => {
  console.log(`\n  DCE ATITUS API`);
  console.log(`  ambiente : ${env.nodeEnv}`);
  console.log(`  api      : ${env.apiUrl}`);
  console.log(`  frontend : ${env.frontendUrl}`);
  console.log(`  google   : ${env.google.habilitado ? 'habilitado' : 'nao configurado'}`);
  console.log(`  email    : ${statusEmail}`);
  console.log(`  ouvindo na porta ${env.port}\n`);
});

async function encerrar(sinal) {
  console.log(`\n${sinal} recebido, encerrando...`);
  servidor.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), fecharNavegador()]);
    process.exit(0);
  });
}

process.on('SIGINT', () => encerrar('SIGINT'));
process.on('SIGTERM', () => encerrar('SIGTERM'));

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@dceatitus.com.br').toLowerCase();
  const nome = process.env.ADMIN_NOME ?? 'Administrador DCE';
  const senha = process.env.ADMIN_SENHA ?? 'trocar123';

  const admin = await prisma.usuario.upsert({
    where: { email },
    update: { role: 'admin', emailVerificadoEm: new Date() },
    create: {
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, 12),
      role: 'admin',
      // O admin é criado pela mão de quem administra o servidor, não por um
      // cadastro público — não há e-mail a confirmar.
      emailVerificadoEm: new Date(),
    },
  });

  console.log(`Admin pronto: ${admin.email} (role=${admin.role})`);
  console.log('Troque a senha do admin apos o primeiro login.');
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

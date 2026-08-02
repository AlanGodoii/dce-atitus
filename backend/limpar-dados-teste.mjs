/**
 * Remove as contas geradas pelos scripts de teste, com tudo que pendura nelas
 * (perfil, carteirinhas, pagamentos e arquivos em disco).
 *
 * Preserva: admin, as personas de demonstração e qualquer conta real. Rodar a
 * suíte de testes repovoa o banco com dezenas de contas fictícias, então vale
 * passar isto antes de mostrar o sistema para alguém.
 *
 *   npm run limpar:teste            # só lista o que seria apagado
 *   npm run limpar:teste -- --apagar
 */
import fs from 'node:fs';
import { prisma } from './src/config/prisma.js';
import { caminhoComprovante, urlParaCaminho } from './src/config/storage.js';

const APAGAR = process.argv.includes('--apagar');

// Deliberadamente estritos: exigem o timestamp no endereço, para nunca casar
// com o e-mail de uma pessoa de verdade.
const PADROES_TESTE = [
  /^(verif|link|reenvio|fluxo|perfil|outro|rejeita|naoverif|comp|bisb|senha|senha2|senha3|browser|redir|termos)\.\d{10,}@gmail\.com$/,
  /^teste\.alan\.\d{10,}@gmail\.com$/,
  /^(edicao|bisb\.edicao)\.\d{10,}@gmail\.com$/,
  /^\d{10,}\+.+@/,
  /^alan\.godoicc\+(aluno|rejeitado)\d+@gmail\.com$/,
];

const PRESERVAR_SEMPRE = [
  'ana.demo@gmail.com',
  'bruno.demo@gmail.com',
  'carla.demo@gmail.com',
  'diego.demo@gmail.com',
];

const usuarios = await prisma.usuario.findMany({
  select: {
    id: true,
    email: true,
    role: true,
    perfil: {
      select: {
        fotoUrl: true,
        comprovanteArquivo: true,
        carteirinhas: { select: { arquivoUrl: true, arquivoVersoUrl: true } },
      },
    },
  },
});

const alvos = usuarios.filter(
  (u) =>
    u.role !== 'admin' &&
    !PRESERVAR_SEMPRE.includes(u.email) &&
    PADROES_TESTE.some((p) => p.test(u.email)),
);

console.log(`\n${usuarios.length} contas no banco. ${alvos.length} são de teste.\n`);

if (alvos.length === 0) {
  console.log('Nada a limpar.\n');
  await prisma.$disconnect();
  process.exit(0);
}

// Junta os arquivos antes de apagar as linhas que apontam para eles.
const arquivos = [];
for (const u of alvos) {
  if (!u.perfil) continue;
  if (u.perfil.fotoUrl) arquivos.push(urlParaCaminho(u.perfil.fotoUrl));
  if (u.perfil.comprovanteArquivo) arquivos.push(caminhoComprovante(u.perfil.comprovanteArquivo));
  for (const c of u.perfil.carteirinhas) {
    if (c.arquivoUrl) {
      arquivos.push(urlParaCaminho(c.arquivoUrl));
      arquivos.push(urlParaCaminho(c.arquivoUrl).replace(/-frente\.png$/, '.pdf'));
    }
    if (c.arquivoVersoUrl) arquivos.push(urlParaCaminho(c.arquivoVersoUrl));
  }
}

if (!APAGAR) {
  console.log('Seriam apagadas (amostra):');
  for (const u of alvos.slice(0, 10)) console.log(`  ${u.email}`);
  if (alvos.length > 10) console.log(`  ... e mais ${alvos.length - 10}`);
  console.log(`\nE ${arquivos.filter(Boolean).length} arquivos em uploads/.`);
  console.log('\nRode com -- --apagar para confirmar.\n');
  await prisma.$disconnect();
  process.exit(0);
}

// onDelete: Cascade no schema derruba perfil, carteirinhas e pagamentos junto.
const { count } = await prisma.usuario.deleteMany({
  where: { id: { in: alvos.map((u) => u.id) } },
});

let removidos = 0;
for (const caminho of arquivos) {
  if (!caminho) continue;
  try {
    fs.rmSync(caminho, { force: true });
    removidos += 1;
  } catch {
    /* arquivo já não existia */
  }
}

console.log(`  ${count} contas removidas`);
console.log(`  ${removidos} arquivos removidos de uploads/`);
console.log(`  ${await prisma.usuario.count()} contas restantes\n`);

await prisma.$disconnect();

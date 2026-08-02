/**
 * Apaga TODOS os estudantes, com perfil, carteirinhas, pagamentos e arquivos.
 * Preserva apenas as contas de admin.
 *
 * Serve para zerar o ambiente e refazer o fluxo do começo — inclusive
 * reutilizando os mesmos CPFs, que são únicos no banco.
 *
 *   npm run limpar:estudantes            # só lista
 *   npm run limpar:estudantes -- --apagar
 */
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from './src/config/prisma.js';
import { CAMINHOS, caminhoComprovante, urlParaCaminho } from './src/config/storage.js';

/** Remove arquivos em disco que nenhum registro do banco referencia. */
async function varrerOrfaos() {
  const perfis = await prisma.perfilEstudante.findMany({
    select: { fotoUrl: true, comprovanteArquivo: true },
  });
  const carteirinhas = await prisma.carteirinha.findMany({
    select: { arquivoUrl: true, arquivoVersoUrl: true },
  });

  const nomeDe = (url) => (url ? path.basename(url) : null);
  const emUso = new Set(
    [
      ...perfis.map((p) => nomeDe(p.fotoUrl)),
      ...perfis.map((p) => p.comprovanteArquivo),
      ...carteirinhas.flatMap((c) => [
        nomeDe(c.arquivoUrl),
        nomeDe(c.arquivoVersoUrl),
        nomeDe(c.arquivoUrl)?.replace(/-frente\.png$/, '.pdf'),
      ]),
    ].filter(Boolean),
  );

  let removidos = 0;
  for (const pasta of [CAMINHOS.fotos, CAMINHOS.carteirinhas, CAMINHOS.comprovantes]) {
    if (!fs.existsSync(pasta)) continue;
    for (const arquivo of fs.readdirSync(pasta)) {
      if (emUso.has(arquivo)) continue;
      try {
        fs.rmSync(path.join(pasta, arquivo), { force: true });
        removidos += 1;
      } catch {
        /* ignora */
      }
    }
  }
  return removidos;
}

const APAGAR = process.argv.includes('--apagar');

const formatarCpf = (d) =>
  d?.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d;

const estudantes = await prisma.usuario.findMany({
  where: { role: { not: 'admin' } },
  include: {
    perfil: {
      include: {
        carteirinhas: { select: { arquivoUrl: true, arquivoVersoUrl: true, status: true } },
      },
    },
  },
  orderBy: { criadoEm: 'asc' },
});

if (estudantes.length === 0) {
  console.log('\nNenhum estudante no banco.');
  // Ainda assim vale varrer: se uma limpeza antiga apagou registros sem os
  // arquivos, é exatamente aqui que eles ficariam esquecidos para sempre.
  if (APAGAR) {
    const orfaos = await varrerOrfaos();
    console.log(orfaos > 0 ? `${orfaos} arquivo(s) órfão(s) varrido(s).\n` : 'Nada em disco sobrando.\n');
  } else {
    console.log('Rode com -- --apagar para varrer arquivos órfãos em disco.\n');
  }
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`\n${estudantes.length} estudante(s):\n`);
for (const u of estudantes) {
  const status = u.perfil?.carteirinhas?.[0]?.status ?? 'sem carteirinha';
  const cpf = u.perfil ? formatarCpf(u.perfil.cpf) : '(sem perfil)';
  console.log(`  ${cpf.padEnd(16)} ${u.nome.padEnd(32)} ${status}`);
  console.log(`  ${''.padEnd(16)} ${u.email}`);
}

// Junta os arquivos antes de apagar as linhas que apontam para eles.
const arquivos = [];
for (const u of estudantes) {
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

// Contas que NAO parecem ter vindo dos testes automatizados. Sao as que doem
// perder: cadastros reais feitos a mao para experimentar o sistema.
const PADRAO_TESTE = /^([a-z.]+\.\d{10,}|teste\.alan\.\d{10,})@gmail\.com$|^\d{10,}\+/;
const reais = estudantes.filter(
  (u) => !PADRAO_TESTE.test(u.email) && !u.email.endsWith('.demo@gmail.com'),
);

if (reais.length > 0) {
  console.log(`\n  ATENCAO: ${reais.length} destes NAO parecem cadastros de teste:\n`);
  for (const u of reais) console.log(`    ${u.email}`);
  console.log(
    '\n  Para apagar so o lixo dos testes e preservar estes, use:\n' +
      '    npm run limpar:teste -- --apagar',
  );
}

if (!APAGAR) {
  console.log(`\nE ${arquivos.filter(Boolean).length} arquivo(s) em disco.`);
  console.log('\nNada foi apagado. Rode com -- --apagar para confirmar.\n');
  await prisma.$disconnect();
  process.exit(0);
}

// onDelete: Cascade no schema derruba perfil, carteirinhas e pagamentos junto.
const { count } = await prisma.usuario.deleteMany({ where: { role: { not: 'admin' } } });

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

// Varredura de órfãos: arquivos em disco que nenhuma linha do banco referencia.
// Aparecem quando uma limpeza antiga apagou o registro sem apagar o arquivo.
const orfaos = await varrerOrfaos();

console.log(`\n  ${count} estudante(s) removido(s)`);
console.log(`  ${removidos} arquivo(s) removido(s)`);
if (orfaos > 0) console.log(`  ${orfaos} arquivo(s) órfão(s) varrido(s)`);
console.log(`  ${await prisma.usuario.count()} conta(s) restante(s) (só admin)`);
console.log('\n  Todos os CPFs estão livres para reuso.\n');

await prisma.$disconnect();

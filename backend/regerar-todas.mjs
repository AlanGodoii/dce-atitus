/**
 * Reprocessa os arquivos de TODAS as carteirinhas já aprovadas.
 *
 *   docker compose exec api npm run regerar:todas
 *
 * Serve para quando o layout ou a resolução mudam e os documentos já emitidos
 * ficam para trás — foi escrito quando a renderização passou de 300 para
 * 600 dpi e as 223 carteirinhas existentes continuavam na resolução antiga.
 *
 * O que NÃO muda: o QR Code e o código de uso são preservados. Quem já imprimiu
 * ou salvou a carteirinha continua com um documento válido, e a validação
 * pública segue respondendo o mesmo.
 *
 * O que NÃO acontece: nenhum e-mail é enviado. Avisar centenas de alunos de uma
 * "correção" que eles não pediram geraria confusão e estouraria a cota do
 * Brevo. Quem quiser a versão nova baixa pela área do estudante.
 *
 * Roda um de cada vez de propósito: cada renderização abre uma aba do Chromium,
 * e paralelizar num servidor de 2 núcleos troca tempo por risco de estourar
 * memória no meio do lote.
 */
import { prisma } from './src/config/prisma.js';
import { reemitirCarteirinha } from './src/services/carteirinha.service.js';
import { fecharNavegador } from './src/services/navegador.js';

const carteirinhas = await prisma.carteirinha.findMany({
  where: { status: 'aprovada' },
  select: { id: true, codigoUso: true, perfil: { select: { usuario: { select: { nome: true } } } } },
  orderBy: { dataEmissao: 'asc' },
});

console.log(`\n${carteirinhas.length} carteirinha(s) aprovada(s) para reprocessar.\n`);

let ok = 0;
const falhas = [];
const inicio = Date.now();

for (const [i, c] of carteirinhas.entries()) {
  const nome = c.perfil.usuario.nome;
  const posicao = `[${String(i + 1).padStart(3)}/${carteirinhas.length}]`;

  try {
    await reemitirCarteirinha(c.id);
    ok += 1;
    console.log(`${posicao} OK    ${nome} (${c.codigoUso ?? 'sem codigo'})`);
  } catch (erro) {
    falhas.push({ nome, id: c.id, motivo: erro.message });
    console.error(`${posicao} FALHA ${nome} — ${erro.message}`);
  }
}

const minutos = ((Date.now() - inicio) / 60000).toFixed(1);
console.log(`\n---------------------------------------------`);
console.log(`  ${ok} refeitas / ${falhas.length} falharam  (${minutos} min)`);
console.log(`---------------------------------------------`);

if (falhas.length > 0) {
  console.log('\nFalhas — dá para rodar de novo, o script é repetível:');
  for (const f of falhas) console.log(`  ${f.nome} (${f.id}): ${f.motivo}`);
}

await fecharNavegador();
await prisma.$disconnect();
process.exit(falhas.length > 0 ? 1 : 0);

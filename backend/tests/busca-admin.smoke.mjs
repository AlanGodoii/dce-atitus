const BASE = process.env.API_URL ?? 'http://localhost:3333';
let passou = 0;
let falhou = 0;

function checar(nome, cond, extra = '') {
  if (cond) {
    passou += 1;
    console.log(`  OK   ${nome}`);
  } else {
    falhou += 1;
    console.log(`  FALHA ${nome} ${extra}`);
  }
}

async function req(metodo, caminho, corpo, token) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}

const admin = await req('POST', '/auth/login', {
  email: 'admin@dceatitus.com.br',
  senha: 'trocar123',
});
const token = admin.dados.token;

console.log('\n== busca de estudantes ==');
let r = await req('GET', '/admin/estudantes', null, token);
const todos = r.dados.estudantes;
const total = r.dados.total;
checar('lista completa carrega', total > 0, `total=${total}`);

const alvo = todos.find((e) => e.nome && e.matricula && e.cpfFormatado);
const primeiroNome = alvo.nome.split(' ')[0];

r = await req('GET', `/admin/estudantes?busca=${encodeURIComponent(primeiroNome)}`, null, token);
checar('busca por nome encontra o alvo', r.dados.estudantes.some((e) => e.perfilId === alvo.perfilId));
// Este era o bug: `cpf contains ''` dentro do OR casava com todos.
checar(
  'busca por nome NAO devolve a lista inteira',
  r.dados.total < total,
  `busca "${primeiroNome}" devolveu ${r.dados.total} de ${total}`,
);

r = await req('GET', `/admin/estudantes?busca=${encodeURIComponent(alvo.matricula)}`, null, token);
checar('busca por matricula encontra o alvo', r.dados.estudantes.some((e) => e.perfilId === alvo.perfilId));

const cpfDigitos = alvo.cpfFormatado.replace(/\D/g, '');
r = await req('GET', `/admin/estudantes?busca=${encodeURIComponent(alvo.cpfFormatado)}`, null, token);
checar('busca por CPF formatado encontra o alvo', r.dados.estudantes.some((e) => e.perfilId === alvo.perfilId), alvo.cpfFormatado);

r = await req('GET', `/admin/estudantes?busca=${cpfDigitos}`, null, token);
checar('busca por CPF so digitos encontra o alvo', r.dados.estudantes.some((e) => e.perfilId === alvo.perfilId));

r = await req('GET', `/admin/estudantes?busca=${encodeURIComponent('zzzznaoexistezzzz')}`, null, token);
checar('termo inexistente devolve vazio', r.dados.total === 0, `total=${r.dados.total}`);

console.log('\n== busca na fila de pagamentos ==');
r = await req('GET', '/admin/pagamentos-pendentes', null, token);
const fila = r.dados.pagamentos;
checar('fila carrega', Array.isArray(fila));
checar('devolve totalNaFila', typeof r.dados.totalNaFila === 'number', JSON.stringify(r.dados.totalNaFila));
const naFila = r.dados.totalNaFila;

if (fila.length > 0) {
  const p = fila[0];
  const nome = p.estudante.nome.split(' ')[0];

  r = await req('GET', `/admin/pagamentos-pendentes?busca=${encodeURIComponent(nome)}`, null, token);
  checar('busca por nome encontra na fila', r.dados.pagamentos.some((x) => x.pagamentoId === p.pagamentoId));
  checar('totalNaFila permanece o total real', r.dados.totalNaFila === naFila, `${r.dados.totalNaFila} vs ${naFila}`);
  checar('total reflete o filtro', r.dados.total <= naFila);

  r = await req('GET', `/admin/pagamentos-pendentes?busca=${encodeURIComponent(p.estudante.cpfFormatado)}`, null, token);
  checar('busca por CPF encontra na fila', r.dados.pagamentos.some((x) => x.pagamentoId === p.pagamentoId));

  r = await req('GET', `/admin/pagamentos-pendentes?busca=${encodeURIComponent(p.estudante.matricula)}`, null, token);
  checar('busca por matricula encontra na fila', r.dados.pagamentos.some((x) => x.pagamentoId === p.pagamentoId));

  r = await req('GET', `/admin/pagamentos-pendentes?busca=${encodeURIComponent('zzzznaoexistezzzz')}`, null, token);
  checar('termo inexistente esvazia a fila', r.dados.total === 0);
} else {
  console.log('  (fila vazia — pulei os casos que dependem dela)');
}

console.log('\n== seguranca ==');
r = await req('GET', '/admin/pagamentos-pendentes?busca=teste');
checar('busca exige autenticacao', r.status === 401);

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

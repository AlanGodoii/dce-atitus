const BASE = 'http://localhost:3333';
let passou = 0;
let falhou = 0;

async function req(metodo, caminho, corpo, token) {
  const r = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    redirect: 'manual',
  });
  let dados = null;
  try {
    dados = await r.json();
  } catch {
    dados = { _raw: '(sem corpo json)', location: r.headers.get('location') };
  }
  return { status: r.status, dados };
}

function checar(nome, condicao, extra = '') {
  if (condicao) {
    passou += 1;
    console.log(`  OK   ${nome}`);
  } else {
    falhou += 1;
    console.log(`  FALHA ${nome} ${extra}`);
  }
}

const email = `teste.alan.${Date.now()}@gmail.com`;

console.log('\n== infra ==');
let r = await req('GET', '/health');
checar('GET /health responde 200', r.status === 200 && r.dados.ok, JSON.stringify(r.dados));

r = await req('GET', '/config-publica');
checar(
  'GET /config-publica traz PIX e WhatsApp do DCE',
  r.dados?.pagamento?.chavePix === '09178125000180' && r.dados?.dce?.whatsapp === '5554992368617',
  JSON.stringify(r.dados),
);

console.log('\n== validacao de cadastro ==');
r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Ana', email: 'nao-e-email', senha: '123' });
checar('rejeita email malformado / senha fraca / nome sem sobrenome', r.status === 422);
console.log('       ->', JSON.stringify(r.dados.detalhes));

r = await req('POST', '/auth/register', { aceiteTermos: true,
  nome: 'Ana Souza',
  email: 'ana@dominio-que-nao-existe-xyzq.com.br',
  senha: 'senha1234',
});
checar('rejeita dominio de email inexistente (MX)', r.status === 422, JSON.stringify(r.dados));

r = await req('POST', '/auth/register', { aceiteTermos: true,
  nome: 'Ana Souza',
  email: 'ana@hotmail.com',
  senha: 'senhasemnumero',
});
checar('exige letra + numero na senha', r.status === 422);

console.log('\n== cadastro e login ==');
r = await req('POST', '/auth/register', { aceiteTermos: true,
  nome: 'Aluno De Teste',
  email,
  senha: 'senha1234',
  whatsapp: '(54) 99236-8617',
});
checar('POST /auth/register cria conta (201) e devolve token', r.status === 201 && !!r.dados.token, JSON.stringify(r.dados));
checar('normaliza whatsapp para E.164', r.dados?.usuario?.whatsapp === '5554992368617', r.dados?.usuario?.whatsapp);
checar('nao vaza senha_hash na resposta', !JSON.stringify(r.dados).includes('senhaHash'));
const tokenAluno = r.dados.token;

r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Outro Nome', email, senha: 'senha1234' });
checar('bloqueia email duplicado (409)', r.status === 409, JSON.stringify(r.dados));

r = await req('POST', '/auth/login', { email, senha: 'senhaErrada1' });
checar('login com senha errada devolve 401 generico', r.status === 401 && /incorretos/i.test(r.dados.erro), JSON.stringify(r.dados));

r = await req('POST', '/auth/login', { email: `inexistente.${Date.now()}@gmail.com`, senha: 'senha1234' });
checar('login com email inexistente devolve a MESMA mensagem', r.status === 401 && /incorretos/i.test(r.dados.erro));

r = await req('POST', '/auth/login', { email: email.toUpperCase(), senha: 'senha1234' });
checar('login e case-insensitive no email', r.status === 200 && !!r.dados.token, JSON.stringify(r.dados));

console.log('\n== aceite dos termos ==');
const emailTermos = `termos.${Date.now()}@gmail.com`;
const semAceite = { nome: 'Tais Termos', email: emailTermos, senha: 'senha1234' };

r = await req('POST', '/auth/register', semAceite);
checar('cadastro SEM aceitar os termos e recusado (422)', r.status === 422, JSON.stringify(r.dados.detalhes));

r = await req('POST', '/auth/register', { ...semAceite, aceiteTermos: false });
checar('aceiteTermos=false tambem e recusado', r.status === 422);

r = await req('POST', '/auth/register', { ...semAceite, aceiteTermos: 'sim' });
checar('aceiteTermos precisa ser booleano', r.status === 422);

r = await req('POST', '/auth/register', { ...semAceite, aceiteTermos: true });
checar('com aceite, o cadastro passa (201)', r.status === 201, JSON.stringify(r.dados).slice(0, 120));

const cfgTermos = await req('GET', '/config-publica');
checar(
  'config-publica expoe a versao dos termos',
  Boolean(cfgTermos.dados?.termos?.versao),
  JSON.stringify(cfgTermos.dados?.termos),
);

console.log('\n== rotas protegidas ==');
r = await req('GET', '/auth/me');
checar('GET /auth/me sem token devolve 401', r.status === 401);

r = await req('GET', '/auth/me', null, 'token.invalido.aqui');
checar('GET /auth/me com token invalido devolve 401', r.status === 401);

r = await req('GET', '/auth/me', null, tokenAluno);
checar(
  'GET /auth/me com token valido devolve usuario + perfilCompleto=false',
  r.status === 200 && r.dados.usuario.email === email && r.dados.perfilCompleto === false,
  JSON.stringify(r.dados),
);
checar('role padrao do cadastro publico e estudante', r.dados?.usuario?.role === 'estudante');

console.log('\n== admin (seed) ==');
r = await req('POST', '/auth/login', { email: 'admin@dceatitus.com.br', senha: 'trocar123' });
checar('admin do seed consegue logar', r.status === 200, JSON.stringify(r.dados));
checar('admin tem role=admin', r.dados?.usuario?.role === 'admin', r.dados?.usuario?.role);

console.log('\n== google oauth ==');
r = await req('GET', '/auth/google');
checar('GET /auth/google devolve 503 explicando que falta configurar', r.status === 503, JSON.stringify(r.dados));

console.log('\n== 404 ==');
r = await req('GET', '/rota-que-nao-existe');
checar('rota inexistente devolve 404 json', r.status === 404);

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

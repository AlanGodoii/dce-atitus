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

const marca = Date.now();
const email = `senha.${marca}@gmail.com`;
const SENHA_ORIGINAL = 'senha1234';
const SENHA_NOVA = 'novaSenha987';

console.log('\n== preparação ==');
let r = await req('POST', '/auth/register', { aceiteTermos: true,
  nome: 'Sandra Senha',
  email,
  senha: SENHA_ORIGINAL,
});
checar('conta criada', r.status === 201, JSON.stringify(r.dados).slice(0, 120));
const tokenConfirmacao = r.dados.verificacao?.dev?.link?.split('token=')[1];
const codigoConfirmacao = r.dados.verificacao?.dev?.codigo;

// Sessão antiga, para provar depois que a troca de senha a derruba.
r = await req('POST', '/auth/verificar-email', { token: tokenConfirmacao });
const sessaoAntiga = r.dados.token;
checar('e-mail confirmado e sessao aberta', !!sessaoAntiga);

r = await req('GET', '/auth/me', null, sessaoAntiga);
checar('sessao antiga funciona antes da troca', r.status === 200);

console.log('\n== pedir redefinição ==');
r = await req('POST', '/auth/esqueci-senha', { email: `naoexiste.${marca}@gmail.com` });
checar('e-mail inexistente responde 200 (nao revela)', r.status === 200, JSON.stringify(r.dados));
checar('resposta generica nao confirma a conta', !('enviado' in r.dados), JSON.stringify(r.dados));

r = await req('POST', '/auth/esqueci-senha', { email });
checar('pedido aceito (200)', r.status === 200);
const linkSenha = r.dados?.dev?.link;
const codigoSenha = r.dados?.dev?.codigo;
checar('em dev devolve link e codigo', Boolean(linkSenha && codigoSenha), JSON.stringify(r.dados?.dev));
const tokenSenha = linkSenha?.split('token=')[1];

console.log('\n== os dois tipos de token nao se misturam ==');
// Token de CONFIRMACAO nao pode servir para redefinir senha.
r = await req('POST', '/auth/redefinir-senha', { token: tokenConfirmacao, senha: SENHA_NOVA });
checar('token de confirmacao NAO redefine senha', r.status === 400, JSON.stringify(r.dados));

// Token de SENHA nao pode servir para confirmar e-mail.
r = await req('POST', '/auth/verificar-email', { token: tokenSenha });
checar('token de senha NAO confirma e-mail', r.status === 400, JSON.stringify(r.dados));

// Codigo de confirmacao nao serve para senha.
r = await req('POST', '/auth/redefinir-senha', { email, codigo: codigoConfirmacao, senha: SENHA_NOVA });
checar('codigo de confirmacao NAO redefine senha', r.status === 400);

console.log('\n== validação ==');
r = await req('POST', '/auth/redefinir-senha', { token: tokenSenha, senha: '123' });
checar('recusa senha curta', r.status === 422, JSON.stringify(r.dados.detalhes));

r = await req('POST', '/auth/redefinir-senha', { token: tokenSenha, senha: 'somenteletras' });
checar('recusa senha sem numero', r.status === 422);

r = await req('POST', '/auth/redefinir-senha', { senha: SENHA_NOVA });
checar('sem token nem codigo devolve 422', r.status === 422);

r = await req('POST', '/auth/redefinir-senha', { token: 'a'.repeat(64), senha: SENHA_NOVA });
checar('token inexistente devolve 400', r.status === 400);

r = await req('POST', '/auth/redefinir-senha', { email, codigo: '000000', senha: SENHA_NOVA });
checar('codigo errado devolve 400', r.status === 400);

console.log('\n== redefinição ==');
r = await req('POST', '/auth/redefinir-senha', { token: tokenSenha, senha: SENHA_NOVA });
checar('redefine com token valido (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 150));
checar('devolve token novo, ja logado', !!r.dados.token);
const sessaoNova = r.dados.token;

r = await req('POST', '/auth/redefinir-senha', { token: tokenSenha, senha: 'outraSenha123' });
checar('mesmo link nao serve duas vezes', r.status === 400, JSON.stringify(r.dados));

console.log('\n== efeito nas sessões ==');
r = await req('GET', '/auth/me', null, sessaoAntiga);
checar('sessao ANTIGA foi derrubada (401)', r.status === 401, JSON.stringify(r.dados));
r = await req('GET', '/auth/me', null, sessaoNova);
checar('sessao nova continua valendo', r.status === 200);

console.log('\n== login com a senha nova ==');
r = await req('POST', '/auth/login', { email, senha: SENHA_ORIGINAL });
checar('senha ANTIGA nao funciona mais (401)', r.status === 401, JSON.stringify(r.dados));

r = await req('POST', '/auth/login', { email, senha: SENHA_NOVA });
checar('senha NOVA funciona', r.status === 200 && !!r.dados.token, JSON.stringify(r.dados).slice(0, 100));

console.log('\n== redefinir pelo código ==');
const email2 = `senha2.${marca}@gmail.com`;
r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Carlos Codigo', email: email2, senha: SENHA_ORIGINAL });
const t2 = r.dados.verificacao?.dev?.link?.split('token=')[1];
await req('POST', '/auth/verificar-email', { token: t2 });

r = await req('POST', '/auth/esqueci-senha', { email: email2 });
const cod2 = r.dados?.dev?.codigo;

r = await req('POST', '/auth/redefinir-senha', { email: email2, codigo: cod2, senha: SENHA_NOVA });
checar('redefine pelo codigo de 6 digitos', r.status === 200, JSON.stringify(r.dados).slice(0, 120));

r = await req('POST', '/auth/login', { email: email2, senha: SENHA_NOVA });
checar('login com a senha nova funciona', r.status === 200);

console.log('\n== conta nao confirmada tambem consegue ==');
const email3 = `senha3.${marca}@gmail.com`;
r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Nina NaoConfirmada', email: email3, senha: SENHA_ORIGINAL });
checar('conta nasce nao confirmada', r.dados?.usuario?.emailVerificado === false);

r = await req('POST', '/auth/esqueci-senha', { email: email3 });
const cod3 = r.dados?.dev?.codigo;
r = await req('POST', '/auth/redefinir-senha', { email: email3, codigo: cod3, senha: SENHA_NOVA });
checar('redefine mesmo sem ter confirmado antes', r.status === 200, JSON.stringify(r.dados).slice(0, 120));
// Completar o fluxo prova acesso a caixa, entao o e-mail passa a valer como confirmado.
checar('e o e-mail passa a contar como confirmado', r.dados?.usuario?.emailVerificado === true, JSON.stringify(r.dados?.usuario));

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

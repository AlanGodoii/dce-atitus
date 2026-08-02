import sharp from 'sharp';

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

function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i += 1) soma += base[i] * (base.length + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(n);
  const d2 = dv([...n, d1]);
  return [...n, d1, d2].join('');
}

console.log('\n== bloqueio de e-mail descartável ==');
for (const email of ['fulano@mailinator.com', 'x@yopmail.com', 'a@10minutemail.com', 'b@sub.mailinator.com']) {
  const r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Teste Descartavel', email, senha: 'senha1234' });
  checar(`recusa ${email}`, r.status === 422, JSON.stringify(r.dados.detalhes ?? r.dados));
}

console.log('\n== cadastro nasce NÃO confirmado ==');
const email = `verif.${Date.now()}@gmail.com`;
let r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Vera Verificada', email, senha: 'senha1234' });
checar('cadastro criado (201)', r.status === 201, JSON.stringify(r.dados).slice(0, 200));
checar('usuario.emailVerificado = false', r.dados?.usuario?.emailVerificado === false);
checar('resposta informa o envio da confirmação', r.dados?.verificacao !== undefined);
checar(
  'em dev devolve link e código para testar sem SMTP',
  Boolean(r.dados?.verificacao?.dev?.link && r.dados?.verificacao?.dev?.codigo),
  JSON.stringify(r.dados?.verificacao),
);

const token = r.dados.token;
const linkDev = r.dados.verificacao.dev.link;
const codigoDev = r.dados.verificacao.dev.codigo;
const tokenVerificacao = linkDev.split('token=')[1];

r = await req('GET', '/auth/me', null, token);
checar('/auth/me reflete emailVerificado=false', r.dados?.usuario?.emailVerificado === false);

console.log('\n== TODA a área do estudante bloqueada antes de confirmar ==');
const dadosPerfil = {
  nome: 'Vera Verificada Silva',
  cpf: gerarCpf(),
  dataNascimento: '2001-06-15',
  matricula: '2024777888',
  curso: 'Psicologia',
  nivel: 'graduacao',
  whatsapp: '54991112222',
};

r = await req('POST', '/perfil', dadosPerfil, token);
checar('criar perfil BLOQUEADO (403)', r.status === 403, JSON.stringify(r.dados));
checar('erro identifica o motivo', r.dados?.detalhes?.motivo === 'email_nao_verificado', JSON.stringify(r.dados?.detalhes));

r = await req('GET', '/perfil', null, token);
checar('ler perfil BLOQUEADO (403)', r.status === 403);

const foto = await sharp({
  create: { width: 700, height: 900, channels: 3, background: { r: 90, g: 110, b: 100 } },
}).jpeg().toBuffer();
const fd = new FormData();
fd.append('foto', new Blob([foto], { type: 'image/jpeg' }), 'foto.jpg');
let rf = await fetch(`${BASE}/perfil/foto`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: fd,
});
checar('enviar foto BLOQUEADO (403)', rf.status === 403);

r = await req('GET', '/carteirinha', null, token);
checar('ver carteirinha BLOQUEADO (403)', r.status === 403);

r = await req('POST', '/carteirinha/informar-pagamento', {}, token);
checar('informar-pagamento BLOQUEADO (403)', r.status === 403, JSON.stringify(r.dados));

r = await req('GET', '/auth/me', null, token);
checar('/auth/me continua acessível (para a SPA saber o estado)', r.status === 200);

console.log('\n== códigos e links inválidos ==');
r = await req('POST', '/auth/verificar-email', { email, codigo: '000000' });
checar('código errado é recusado', r.status === 400, JSON.stringify(r.dados));

r = await req('POST', '/auth/verificar-email', { token: 'a'.repeat(64) });
checar('token inexistente é recusado', r.status === 400);

r = await req('POST', '/auth/verificar-email', {});
checar('sem token nem código devolve 422', r.status === 422);

r = await req('POST', '/auth/verificar-email', { email: 'outro@gmail.com', codigo: codigoDev });
checar('código não vale para outro e-mail', r.status === 400);

console.log('\n== confirmação pelo código ==');
r = await req('POST', '/auth/verificar-email', { email, codigo: codigoDev });
checar('código correto confirma (200)', r.status === 200, JSON.stringify(r.dados));
checar('devolve token novo', Boolean(r.dados?.token));
checar('usuario.emailVerificado = true', r.dados?.usuario?.emailVerificado === true);

const tokenPos = r.dados.token;

r = await req('POST', '/auth/verificar-email', { email, codigo: codigoDev });
checar('mesmo código não serve duas vezes', r.status === 400, JSON.stringify(r.dados));

r = await req('POST', '/auth/verificar-email', { token: tokenVerificacao });
checar('link antigo do mesmo lote também já não vale', r.status === 400);

console.log('\n== fluxo liberado depois de confirmar ==');
r = await req('POST', '/perfil', dadosPerfil, tokenPos);
checar('criar perfil LIBERADO (201)', r.status === 201, JSON.stringify(r.dados).slice(0, 200));

const fd2 = new FormData();
fd2.append('foto', new Blob([foto], { type: 'image/jpeg' }), 'foto.jpg');
rf = await fetch(`${BASE}/perfil/foto`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tokenPos}` },
  body: fd2,
});
checar('enviar foto LIBERADO (200)', rf.status === 200);

// Comprovante de matrícula também é exigido antes de entrar na fila do DCE.
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF', 'latin1');
const fdComp = new FormData();
fdComp.append('comprovante', new Blob([pdf], { type: 'application/pdf' }), 'matricula.pdf');
const rc = await fetch(`${BASE}/perfil/comprovante`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tokenPos}` },
  body: fdComp,
});
checar('enviar comprovante LIBERADO (200)', rc.status === 200);

r = await req('POST', '/carteirinha/informar-pagamento', { observacao: 'PIX feito' }, tokenPos);
checar('informar-pagamento LIBERADO (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 200));
checar('status virou pagamento_em_analise', r.dados?.carteirinha?.status === 'pagamento_em_analise');

console.log('\n== confirmação pelo link ==');
const email2 = `link.${Date.now()}@gmail.com`;
r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Link Confirmado', email: email2, senha: 'senha1234' });
const token2 = r.dados.verificacao.dev.link.split('token=')[1];
r = await req('POST', '/auth/verificar-email', { token: token2 });
checar('link do e-mail confirma (200)', r.status === 200, JSON.stringify(r.dados));
checar('emailVerificado = true', r.dados?.usuario?.emailVerificado === true);

console.log('\n== reenvio ==');
const email3 = `reenvio.${Date.now()}@gmail.com`;
r = await req('POST', '/auth/register', { aceiteTermos: true, nome: 'Rita Reenvio', email: email3, senha: 'senha1234' });
const codigoAntigo = r.dados.verificacao.dev.codigo;

r = await req('POST', '/auth/reenviar-verificacao', { email: email3 });
checar('reenvio responde 200', r.status === 200, JSON.stringify(r.dados));
const codigoNovo = r.dados?.dev?.codigo;
checar('gera um código diferente', Boolean(codigoNovo) && codigoNovo !== codigoAntigo, `${codigoAntigo} -> ${codigoNovo}`);

r = await req('POST', '/auth/verificar-email', { email: email3, codigo: codigoAntigo });
checar('código antigo é invalidado pelo reenvio', r.status === 400, JSON.stringify(r.dados));

r = await req('POST', '/auth/verificar-email', { email: email3, codigo: codigoNovo });
checar('código novo funciona', r.status === 200);

r = await req('POST', '/auth/reenviar-verificacao', { email: `naoexiste.${Date.now()}@gmail.com` });
checar('reenvio para e-mail inexistente NÃO revela isso', r.status === 200, JSON.stringify(r.dados));

console.log('\n== admin do seed ==');
r = await req('POST', '/auth/login', { email: 'admin@dceatitus.com.br', senha: 'trocar123' });
checar('admin já nasce verificado', r.dados?.usuario?.emailVerificado === true, JSON.stringify(r.dados?.usuario));

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

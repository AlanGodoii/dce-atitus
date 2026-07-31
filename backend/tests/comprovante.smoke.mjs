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

async function enviarArquivo(caminho, token, buffer, nome, tipo, campo = 'comprovante') {
  const fd = new FormData();
  fd.append(campo, new Blob([buffer], { type: tipo }), nome);
  const r = await fetch(BASE + caminho, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}

function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = (b) => {
    let s = 0;
    for (let i = 0; i < b.length; i += 1) s += b[i] * (b.length + 1 - i);
    const x = (s * 10) % 11;
    return x === 10 ? 0 : x;
  };
  const d1 = dv(n);
  return [...n, d1, dv([...n, d1])].join('');
}

const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF', 'latin1');

async function criarAluno(nome, email) {
  let r = await req('POST', '/auth/register', { nome, email, senha: 'senha1234' });

  // Sem isto, uma falha de setup (rate limit, por exemplo) vira um token vazio
  // e o teste seguinte acusa "falha de seguranca" que nao existe.
  if (r.status !== 201) {
    throw new Error(`nao consegui criar ${email}: HTTP ${r.status} ${JSON.stringify(r.dados)}`);
  }

  const t = r.dados.verificacao?.dev?.link?.split('token=')[1];
  const v = await req('POST', '/auth/verificar-email', { token: t });
  const token = v.dados.token;

  if (!token) {
    throw new Error(`nao consegui confirmar ${email}: ${JSON.stringify(v.dados)}`);
  }

  await req('POST', '/perfil', {
    nome: `${nome} Sobrenome`,
    cpf: gerarCpf(),
    dataNascimento: '2002-03-14',
    matricula: `2026${Math.floor(Math.random() * 900000 + 100000)}`,
    curso: 'Ciência da Computação',
    nivel: 'graduacao',
    whatsapp: '54991110000',
  }, token);

  const foto = await sharp({
    create: { width: 700, height: 900, channels: 3, background: { r: 70, g: 100, b: 88 } },
  }).jpeg().toBuffer();
  await enviarArquivo('/perfil/foto', token, foto, 'foto.jpg', 'image/jpeg', 'foto');

  return token;
}

const marca = Date.now();
const token = await criarAluno('Comprovante Teste', `comp.${marca}@gmail.com`);

console.log('\n== perfil reporta a pendência ==');
let r = await req('GET', '/perfil', null, token);
checar('temComprovante = false', r.dados.temComprovante === false);
checar('prontoParaPagamento = false sem comprovante', r.dados.prontoParaPagamento === false);
checar('lista a pendência ao aluno', (r.dados.pendencias ?? []).some((p) => /comprovante/i.test(p)), JSON.stringify(r.dados.pendencias));

console.log('\n== fluxo bloqueado sem comprovante ==');
r = await req('POST', '/carteirinha/informar-pagamento', {}, token);
checar('informar-pagamento BLOQUEADO (409)', r.status === 409, JSON.stringify(r.dados));
checar('erro identifica o motivo', r.dados?.detalhes?.motivo === 'sem_comprovante', JSON.stringify(r.dados?.detalhes));

r = await req('GET', '/carteirinha', null, token);
checar('carteirinha orienta enviar o comprovante', /comprovante/i.test(r.dados?.proximoPasso ?? ''), r.dados?.proximoPasso);

console.log('\n== validação do arquivo ==');
r = await enviarArquivo('/perfil/comprovante', token, Buffer.from('isso e texto puro'), 'falso.pdf', 'application/pdf');
checar('rejeita arquivo que so finge ser PDF', r.status === 415, JSON.stringify(r.dados));

r = await enviarArquivo('/perfil/comprovante', token, PDF, 'doc.docx', 'application/msword');
checar('rejeita mimetype nao permitido', r.status === 415);

r = await enviarArquivo('/perfil/comprovante', token, Buffer.alloc(11 * 1024 * 1024, 1), 'grande.pdf', 'application/pdf');
checar('rejeita arquivo acima de 10 MB', r.status === 413, JSON.stringify(r.dados));

console.log('\n== envio válido ==');
r = await enviarArquivo('/perfil/comprovante', token, PDF, 'matricula.pdf', 'application/pdf');
checar('aceita PDF (200)', r.status === 200, JSON.stringify(r.dados));
checar('marca temComprovante', r.dados.temComprovante === true);

const imagem = await sharp({
  create: { width: 1200, height: 1600, channels: 3, background: { r: 240, g: 240, b: 235 } },
}).png().toBuffer();
r = await enviarArquivo('/perfil/comprovante', token, imagem, 'matricula.png', 'image/png');
checar('aceita imagem tambem', r.status === 200, JSON.stringify(r.dados));

r = await req('GET', '/perfil', null, token);
checar('prontoParaPagamento = true agora', r.dados.prontoParaPagamento === true);
checar('sem pendencias', (r.dados.pendencias ?? []).length === 0, JSON.stringify(r.dados.pendencias));

console.log('\n== privacidade do arquivo ==');
const semAuth = await fetch(`${BASE}/perfil/comprovante`);
checar('baixar sem token devolve 401', semAuth.status === 401);

const comAuth = await fetch(`${BASE}/perfil/comprovante`, { headers: { Authorization: `Bearer ${token}` } });
checar('dono consegue baixar o proprio', comAuth.status === 200);
checar('nao vem de cache compartilhado', (comAuth.headers.get('cache-control') ?? '').includes('private'), comAuth.headers.get('cache-control'));
checar('tem nosniff', comAuth.headers.get('x-content-type-options') === 'nosniff');

// Outro aluno não pode ver o comprovante alheio.
const tokenOutro = await criarAluno('Bisbilhoteiro Curioso', `bisb.${marca}@gmail.com`);
const admin = await req('POST', '/auth/login', { email: 'admin@dceatitus.com.br', senha: 'trocar123' });

r = await req('GET', '/perfil', null, token);
const meuPerfilId = r.dados.perfil.id;

const alheio = await fetch(`${BASE}/admin/estudantes/${meuPerfilId}/comprovante`, {
  headers: { Authorization: `Bearer ${tokenOutro}` },
});
checar('outro estudante NAO acessa comprovante alheio (403)', alheio.status === 403, `status ${alheio.status}`);

const doAdmin = await fetch(`${BASE}/admin/estudantes/${meuPerfilId}/comprovante`, {
  headers: { Authorization: `Bearer ${admin.dados.token}` },
});
checar('admin acessa o comprovante do aluno', doAdmin.status === 200, `status ${doAdmin.status}`);

console.log('\n== path traversal ==');
const escapando = await fetch(`${BASE}/admin/estudantes/..%2F..%2F.env/comprovante`, {
  headers: { Authorization: `Bearer ${admin.dados.token}` },
});
checar('recusa perfilId com ../ no caminho', escapando.status >= 400, `status ${escapando.status}`);

console.log('\n== fluxo liberado ==');
r = await req('POST', '/carteirinha/informar-pagamento', { observacao: 'PIX feito' }, token);
checar('informar-pagamento LIBERADO (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 150));

console.log('\n== quem ja tem carteirinha nao perde acesso ==');
// Carla foi aprovada antes de o comprovante existir. Ela precisa continuar
// vendo o documento dela, e nao uma tela pedindo comprovante.
const carla = await req('POST', '/auth/login', { email: 'carla.demo@gmail.com', senha: 'demo1234' });
if (carla.dados.token) {
  r = await req('GET', '/carteirinha', null, carla.dados.token);
  checar(
    'aluna aprovada antes da regra continua vendo a carteirinha',
    r.dados?.carteirinha?.status === 'aprovada',
    JSON.stringify({ status: r.dados?.carteirinha?.status, proximoPasso: r.dados?.proximoPasso }),
  );
} else {
  console.log('  (conta de demonstracao ausente — rode npm run seed:demo)');
}

console.log('\n== admin ve o estado ==');
r = await req('GET', '/admin/pagamentos-pendentes', null, admin.dados.token);
const meu = r.dados.pagamentos.find((p) => p.estudante.email === `comp.${marca}@gmail.com`);
checar('fila mostra que tem comprovante', meu?.estudante?.temComprovante === true, JSON.stringify(meu?.estudante?.temComprovante));
checar('fila traz o perfilId para montar o link', !!meu?.estudante?.perfilId);

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

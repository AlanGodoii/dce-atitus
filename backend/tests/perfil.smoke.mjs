import sharp from 'sharp';

const BASE = 'http://localhost:3333';
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
  let dados = null;
  try {
    dados = await r.json();
  } catch {
    dados = {};
  }
  return { status: r.status, dados };
}

async function enviarFoto(token, buffer, nome = 'foto.jpg', tipo = 'image/jpeg') {
  const fd = new FormData();
  fd.append('foto', new Blob([buffer], { type: tipo }), nome);
  const r = await fetch(`${BASE}/perfil/foto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return { status: r.status, dados: await r.json().catch(() => ({})) };
}

// CPFs validos gerados para teste
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

/** Cria a conta e confirma o e-mail usando o token que a API devolve em dev. */
async function registrarVerificado(dados) {
  const r = await req('POST', '/auth/register', { aceiteTermos: true, ...dados });
  if (r.status !== 201) return r;
  const tokenVerificacao = r.dados.verificacao?.dev?.link?.split('token=')[1];
  if (!tokenVerificacao) return r;
  const v = await req('POST', '/auth/verificar-email', { token: tokenVerificacao });
  return v.status === 200 ? { status: 201, dados: { ...r.dados, token: v.dados.token } } : r;
}

const email = `perfil.${Date.now()}@gmail.com`;
let r = await registrarVerificado({
  nome: 'Maria Testadora',
  email,
  senha: 'senha1234',
});
const token = r.dados.token;
checar('conta de teste criada e confirmada', !!token, JSON.stringify(r.dados));

console.log('\n== estado inicial ==');
r = await req('GET', '/perfil', null, token);
checar('GET /perfil sem perfil devolve completo=false', r.status === 200 && r.dados.completo === false, JSON.stringify(r.dados));

console.log('\n== validacao ==');
r = await req('POST', '/perfil', {}, token);
checar('POST /perfil vazio devolve 422', r.status === 422);

r = await req(
  'POST',
  '/perfil',
  {
    nome: 'Maria Testadora',
    cpf: '111.111.111-11',
    dataNascimento: '2002-11-10',
    matricula: '2023014567',
    curso: 'Arquitetura e Urbanismo',
    nivel: 'graduacao',
    whatsapp: '54992368617',
  },
  token,
);
checar('rejeita CPF com digito verificador invalido', r.status === 422, JSON.stringify(r.dados.detalhes));

r = await req(
  'POST',
  '/perfil',
  {
    nome: 'Maria Testadora',
    cpf: gerarCpf(),
    dataNascimento: '2024-01-01',
    matricula: '2023014567',
    curso: 'Arquitetura',
    nivel: 'graduacao',
    whatsapp: '54992368617',
  },
  token,
);
checar('rejeita data de nascimento de bebe (idade minima)', r.status === 422, JSON.stringify(r.dados.detalhes));

r = await req(
  'POST',
  '/perfil',
  {
    nome: 'Maria Testadora',
    cpf: gerarCpf(),
    dataNascimento: '2002-11-10',
    matricula: '2023014567',
    curso: 'Arquitetura',
    nivel: 'nivel_inexistente',
    whatsapp: '54992368617',
  },
  token,
);
checar('rejeita nivel de ensino invalido', r.status === 422);

console.log('\n== criacao do perfil ==');
const cpf = gerarCpf();
r = await req(
  'POST',
  '/perfil',
  {
    nome: 'maria testadora silva',
    cpf,
    dataNascimento: '2002-11-10',
    matricula: '2023014567',
    curso: 'Arquitetura e Urbanismo',
    nivel: 'graduacao',
    whatsapp: '(54) 99236-8617',
  },
  token,
);
checar('POST /perfil cria perfil (201)', r.status === 201, JSON.stringify(r.dados));
checar('CPF normalizado para 11 digitos', r.dados?.perfil?.cpf === cpf, r.dados?.perfil?.cpf);
checar('devolve cpfFormatado para exibicao', /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(r.dados?.perfil?.cpfFormatado ?? ''), r.dados?.perfil?.cpfFormatado);
checar('whatsapp normalizado', r.dados?.perfil?.whatsapp === '5554992368617', r.dados?.perfil?.whatsapp);
checar('prontoParaPagamento=false sem foto', r.dados?.prontoParaPagamento === false);

console.log('\n== carteirinha criada automaticamente ==');
r = await req('GET', '/perfil', null, token);
checar('perfil agora esta completo', r.dados.completo === true);

console.log('\n== CPF duplicado ==');
const email2 = `outro.${Date.now()}@gmail.com`;
const r2 = await registrarVerificado({ nome: 'Joao Outro', email: email2, senha: 'senha1234' });
const token2 = r2.dados.token;
r = await req(
  'POST',
  '/perfil',
  {
    nome: 'Joao Outro Sobrenome',
    cpf,
    dataNascimento: '2001-05-20',
    matricula: '2023099999',
    curso: 'Direito',
    nivel: 'graduacao',
    whatsapp: '54999998888',
  },
  token2,
);
checar('bloqueia CPF ja usado por outra conta (409)', r.status === 409, JSON.stringify(r.dados));

console.log('\n== upload de foto ==');
const naoImagem = Buffer.from('isso aqui nao e imagem nenhuma, e texto puro');
let f = await enviarFoto(token, naoImagem, 'fake.jpg', 'image/jpeg');
checar('rejeita arquivo que so finge ser jpg', f.status === 400, JSON.stringify(f.dados));

const pdf = Buffer.from('%PDF-1.4 fake');
f = await enviarFoto(token, pdf, 'doc.pdf', 'application/pdf');
checar('rejeita mimetype nao permitido (415)', f.status === 415, JSON.stringify(f.dados));

const pequena = await sharp({
  create: { width: 100, height: 100, channels: 3, background: { r: 20, g: 90, b: 60 } },
}).jpeg().toBuffer();
f = await enviarFoto(token, pequena, 'pequena.jpg');
checar('rejeita imagem menor que 200x260', f.status === 400, JSON.stringify(f.dados));

const boa = await sharp({
  create: { width: 900, height: 900, channels: 3, background: { r: 23, g: 96, b: 58 } },
}).jpeg().toBuffer();
f = await enviarFoto(token, boa, 'boa.jpg');
checar('aceita imagem valida e devolve url', f.status === 200 && !!f.dados.fotoUrl, JSON.stringify(f.dados));

const urlFoto = f.dados.fotoUrl;
if (urlFoto) {
  const img = await fetch(urlFoto);
  const buf = Buffer.from(await img.arrayBuffer());
  const meta = await sharp(buf).metadata();
  checar('foto servida por /uploads responde 200', img.status === 200);
  checar('foto recortada em 3x4 (600x800)', meta.width === 600 && meta.height === 800, `${meta.width}x${meta.height}`);
  checar('content-type correto', (img.headers.get('content-type') ?? '').includes('image/jpeg'), img.headers.get('content-type'));
}

r = await req('GET', '/perfil', null, token);
checar('temFoto=true depois do upload', r.dados.temFoto === true);
// Foto sozinha nao basta: o comprovante de matricula tambem e exigido.
checar(
  'ainda NAO esta pronto: falta o comprovante',
  r.dados.prontoParaPagamento === false,
  JSON.stringify(r.dados.pendencias),
);
checar('aponta a pendencia do comprovante', (r.dados.pendencias ?? []).some((p) => /comprovante/i.test(p)));

console.log('\n== comprovante de matricula ==');
const pdfMatricula = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  'latin1',
);
const fdComp = new FormData();
fdComp.append('comprovante', new Blob([pdfMatricula], { type: 'application/pdf' }), 'matricula.pdf');
const rComp = await fetch(`${BASE}/perfil/comprovante`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: fdComp,
});
checar('comprovante aceito', rComp.status === 200);

r = await req('GET', '/perfil', null, token);
checar('prontoParaPagamento=true com foto + comprovante', r.dados.prontoParaPagamento === true, JSON.stringify(r.dados.pendencias));

console.log('\n== seguranca ==');
r = await req('GET', '/perfil', null, null);
checar('GET /perfil sem token devolve 401', r.status === 401);

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

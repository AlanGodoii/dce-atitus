/**
 * Popula o banco com estudantes de demonstração em cada etapa do fluxo.
 * Roda contra a API de pé, então também serve de teste do caminho feliz.
 *
 *   npm run dev          (em outro terminal)
 *   npm run seed:demo
 */
import sharp from 'sharp';

const API = process.env.API_URL ?? 'http://localhost:3333';
const ADMIN = {
  email: process.env.ADMIN_EMAIL ?? 'admin@dceatitus.com.br',
  senha: process.env.ADMIN_SENHA ?? 'trocar123',
};
const SENHA_DEMO = 'demo1234';

const ALUNOS = [
  {
    nome: 'Ana Beatriz Ferreira',
    email: 'ana.demo@gmail.com',
    curso: 'Arquitetura e Urbanismo',
    nivel: 'graduacao',
    matricula: '2023014567',
    nascimento: '2002-11-10',
    whatsapp: '54991110001',
    cor: { r: 34, g: 84, b: 68 },
    ate: 'perfil', // completa o perfil e para em aguardando_pagamento
  },
  {
    nome: 'Bruno Henrique Lima',
    email: 'bruno.demo@gmail.com',
    curso: 'Direito',
    nivel: 'graduacao',
    matricula: '2024002233',
    nascimento: '2001-04-22',
    whatsapp: '54991110002',
    cor: { r: 52, g: 74, b: 96 },
    ate: 'informou', // avisa o pagamento e fica na fila do admin
  },
  {
    nome: 'Carla Souza Andrade',
    email: 'carla.demo@gmail.com',
    curso: 'Medicina',
    nivel: 'graduacao',
    matricula: '2022008899',
    nascimento: '2003-07-05',
    whatsapp: '54991110003',
    cor: { r: 96, g: 62, b: 52 },
    ate: 'aprovado', // carteirinha emitida
  },
  {
    nome: 'Diego Martins Rocha',
    email: 'diego.demo@gmail.com',
    curso: 'Engenharia de Software',
    nivel: 'pos_graduacao',
    matricula: '2025001010',
    nascimento: '1998-01-30',
    whatsapp: '54991110004',
    cor: { r: 44, g: 66, b: 58 },
    ate: 'informou',
  },
];

// CPFs válidos e estáveis entre execuções.
function cpfDeterministico(indice) {
  const base = String(10000000 + indice * 7919).padStart(9, '0').slice(0, 9).split('').map(Number);
  const dv = (arr) => {
    let soma = 0;
    for (let i = 0; i < arr.length; i += 1) soma += arr[i] * (arr.length + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(base);
  const d2 = dv([...base, d1]);
  return [...base, d1, d2].join('');
}

async function chamar(metodo, caminho, corpo, token) {
  const r = await fetch(API + caminho, {
    method: metodo,
    headers: {
      ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await r.json().catch(() => ({}));
  return { status: r.status, dados };
}

/** Avatar chapado com a inicial — só para a foto não ficar vazia na demo. */
async function fotoFake(nome, cor) {
  const inicial = nome.trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800">
    <rect width="600" height="800" fill="rgb(${cor.r},${cor.g},${cor.b})"/>
    <circle cx="300" cy="330" r="130" fill="rgba(255,255,255,.22)"/>
    <text x="300" y="380" text-anchor="middle" fill="#fff"
          font-family="Arial, sans-serif" font-size="150" font-weight="bold">${inicial}</text>
    <ellipse cx="300" cy="760" rx="215" ry="215" fill="rgba(255,255,255,.22)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
}

async function garantirAluno(aluno, indice) {
  let r = await chamar('POST', '/auth/register', {
    nome: aluno.nome,
    email: aluno.email,
    senha: SENHA_DEMO,
    whatsapp: aluno.whatsapp,
  });

  if (r.status === 409) {
    r = await chamar('POST', '/auth/login', { email: aluno.email, senha: SENHA_DEMO });
    if (r.status !== 200) {
      console.log(`  - ${aluno.nome}: já existe com outra senha, pulando.`);
      return;
    }
  } else if (r.status !== 201) {
    console.log(`  - ${aluno.nome}: falha no cadastro (${JSON.stringify(r.dados)})`);
    return;
  }

  let token = r.dados.token;

  // Fora de produção a API devolve o token de confirmação, então a demo confirma
  // o e-mail sozinha, sem depender de SMTP configurado.
  let tokenVerificacao = r.dados.verificacao?.dev?.link?.split('token=')[1];

  if (!tokenVerificacao) {
    // Conta que já existia: pede um reenvio só para obter um token novo.
    const reenvio = await chamar('POST', '/auth/reenviar-verificacao', { email: aluno.email });
    tokenVerificacao = reenvio.dados?.dev?.link?.split('token=')[1];
  }

  if (tokenVerificacao) {
    const v = await chamar('POST', '/auth/verificar-email', { token: tokenVerificacao });
    if (v.status === 200) token = v.dados.token;
  }

  const perfil = await chamar(
    'POST',
    '/perfil',
    {
      nome: aluno.nome,
      cpf: cpfDeterministico(indice),
      dataNascimento: aluno.nascimento,
      matricula: aluno.matricula,
      curso: aluno.curso,
      nivel: aluno.nivel,
      whatsapp: aluno.whatsapp,
    },
    token,
  );

  if (![200, 201].includes(perfil.status)) {
    console.log(`  - ${aluno.nome}: falha no perfil (${JSON.stringify(perfil.dados)})`);
    return;
  }

  const buffer = await fotoFake(aluno.nome, aluno.cor);
  const fd = new FormData();
  fd.append('foto', new Blob([buffer], { type: 'image/jpeg' }), 'foto.jpg');
  await fetch(`${API}/perfil/foto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  if (aluno.ate === 'perfil') {
    console.log(`  ✓ ${aluno.nome} — aguardando pagamento`);
    return;
  }

  await chamar(
    'POST',
    '/carteirinha/informar-pagamento',
    { observacao: 'Comprovante enviado no WhatsApp.' },
    token,
  );

  if (aluno.ate === 'informou') {
    console.log(`  ✓ ${aluno.nome} — na fila do admin`);
    return;
  }

  const admin = await chamar('POST', '/auth/login', ADMIN);
  const fila = await chamar('GET', '/admin/pagamentos-pendentes', null, admin.dados.token);
  const meu = fila.dados.pagamentos.find((p) => p.estudante.email === aluno.email);

  if (!meu) {
    // Provavelmente já foi aprovado numa execução anterior.
    const minha = await chamar('GET', '/carteirinha', null, token);
    const status = minha.dados?.carteirinha?.status;
    console.log(
      status === 'aprovada'
        ? `  ✓ ${aluno.nome} — carteirinha já estava emitida`
        : `  - ${aluno.nome}: não encontrado na fila (status: ${status ?? 'desconhecido'})`,
    );
    return;
  }

  const aprovacao = await chamar(
    'PATCH',
    `/admin/pagamentos/${meu.pagamentoId}/aprovar`,
    {},
    admin.dados.token,
  );

  if (aprovacao.status === 200) {
    console.log(`  ✓ ${aluno.nome} — carteirinha emitida (${aprovacao.dados.carteirinha.urlValidacao})`);
  } else {
    console.log(`  - ${aluno.nome}: falha na aprovação (${JSON.stringify(aprovacao.dados)})`);
  }
}

const saude = await fetch(`${API}/health`).catch(() => null);
if (!saude?.ok) {
  console.error(`A API não respondeu em ${API}. Suba o backend com "npm run dev" antes.`);
  process.exit(1);
}

console.log(`\nCriando estudantes de demonstração em ${API}\n`);
for (const [i, aluno] of ALUNOS.entries()) {
  await garantirAluno(aluno, i + 1);
}
console.log(`\nSenha de todos os alunos de demo: ${SENHA_DEMO}\n`);

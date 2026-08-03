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

const admin = await req('POST', '/auth/login', {
  email: 'admin@dceatitus.com.br',
  senha: 'trocar123',
});
const tk = admin.dados.token;

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

// Precisa passar no minimo de 200x260 exigido pelo upload de foto.
const FOTO = await sharp({
  create: { width: 700, height: 900, channels: 3, background: { r: 80, g: 110, b: 96 } },
})
  .jpeg()
  .toBuffer();

/**
 * Cria um aluno e leva ate a carteirinha emitida. O teste nao depende do
 * `seed:demo`: se o banco estiver zerado, ele monta o proprio cenario.
 */
async function criarAlunoAprovado() {
  const marca = Date.now();
  const email = `edicao.${marca}@gmail.com`;

  let r = await req('POST', '/auth/register', { aceiteTermos: true,
    nome: 'Elisa Edicao',
    email,
    senha: 'senha1234',
  });
  if (r.status !== 201) throw new Error(`cadastro falhou: ${JSON.stringify(r.dados)}`);

  const v = await req('POST', '/auth/verificar-email', {
    token: r.dados.verificacao.dev.link.split('token=')[1],
  });
  const token = v.dados.token;

  const dados = {
    nome: 'Elisa Edicao Silva',
    cpf: gerarCpf(),
    dataNascimento: '2003-07-05',
    matricula: `2026${String(marca).slice(-6)}`,
    curso: 'Medicina',
    nivel: 'graduacao',
    documentoTipo: 'rg',
    documentoNumero: '1234567890',
    documentoEmissor: 'SSP/RS',
    whatsapp: '54991110003',
  };
  await req('POST', '/perfil', dados, token);

  const fd = new FormData();
  fd.append('foto', new Blob([FOTO], { type: 'image/jpeg' }), 'foto.jpg');
  await fetch(`${BASE}/perfil/foto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF', 'latin1');
  const fdc = new FormData();
  fdc.append('comprovante', new Blob([pdf], { type: 'application/pdf' }), 'matricula.pdf');
  await fetch(`${BASE}/perfil/comprovante`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fdc,
  });

  await req('POST', '/carteirinha/informar-pagamento', {}, token);

  const fila = await req('GET', '/admin/pagamentos-pendentes', null, tk);
  const meu = fila.dados.pagamentos.find((p) => p.estudante.email === email);
  await req('PATCH', `/admin/pagamentos/${meu.pagamentoId}/aprovar`, {}, tk);

  const lista = await req('GET', `/admin/estudantes?busca=${encodeURIComponent(email)}`, null, tk);
  return { aluno: lista.dados.estudantes[0], dados };
}

console.log('\n== preparaÃ§Ã£o ==');
const { aluno, dados: base } = await criarAlunoAprovado();
checar('aluno de teste com carteirinha emitida', aluno?.carteirinha?.status === 'aprovada', aluno?.carteirinha?.status);

const uuidAntes = aluno.carteirinha?.urlValidacao?.split('/validar/')[1];
const perfilId = aluno.perfilId;

console.log('\n== permissÃ£o ==');
// Outro estudante qualquer, so para provar que a rota de admin o barra.
const bisbilhoteiro = await req('POST', '/auth/register', { aceiteTermos: true,
  nome: 'Bruno Bisbilhoteiro',
  email: `bisb.edicao.${Date.now()}@gmail.com`,
  senha: 'senha1234',
});
let r = await req(
  'PATCH',
  `/admin/estudantes/${perfilId}`,
  base,
  bisbilhoteiro.dados.token,
);
checar('estudante NAO edita ninguem (403)', r.status === 403, `status ${r.status}`);

r = await req('PATCH', `/admin/estudantes/${perfilId}`, base);
checar('sem token devolve 401', r.status === 401);

console.log('\n== validaÃ§Ã£o ==');
r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, cpf: '11111111111' }, tk);
checar('recusa CPF invalido', r.status === 422, JSON.stringify(r.dados.detalhes));

r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, nome: 'Solteiro' }, tk);
checar('exige nome e sobrenome', r.status === 422);

const outroTodos = await req('GET', '/admin/estudantes', null, tk);
const alheio = outroTodos.dados.estudantes.find((e) => e.perfilId !== perfilId && e.cpfFormatado);
if (alheio) {
  r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, cpf: alheio.cpfFormatado.replace(/\D/g, '') }, tk);
  checar('recusa CPF que ja e de outro aluno (409)', r.status === 409, JSON.stringify(r.dados));
}

r = await req('PATCH', '/admin/estudantes/00000000-0000-4000-8000-000000000000', base, tk);
checar('perfil inexistente devolve 404', r.status === 404);

console.log('\n== ediÃ§Ã£o sem mudanÃ§a real ==');
r = await req('PATCH', `/admin/estudantes/${perfilId}`, base, tk);
checar('aceita (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 120));
checar('nao lista campos alterados', (r.dados.camposAlterados ?? []).length === 0, JSON.stringify(r.dados.camposAlterados));
checar('NAO reemite a toa', r.dados.reemissao?.reemitida === false, JSON.stringify(r.dados.reemissao));

console.log('\n== correÃ§Ã£o de dado impresso ==');
const cursoNovo = `Medicina Veterinaria ${Date.now().toString().slice(-4)}`;
r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, curso: cursoNovo }, tk);
checar('edicao aceita (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 150));
checar('identifica o campo alterado', (r.dados.camposAlterados ?? []).includes('curso'), JSON.stringify(r.dados.camposAlterados));
checar('REEMITIU a carteirinha', r.dados.reemissao?.reemitida === true, JSON.stringify(r.dados.reemissao));
checar('gerou arquivo novo', !!r.dados.reemissao?.arquivoUrl);
checar('reportou o envio de e-mail', typeof r.dados.email?.enviado === 'boolean', JSON.stringify(r.dados.email));

console.log('\n== correcao do documento de identidade ==');
// O documento vai impresso na frente, entao corrigi-lo tem que reemitir igual
// ao curso. Sem este teste, o campo novo entraria no formulario mas poderia
// nunca chegar ao cartao de quem ja tem carteirinha emitida.
r = await req(
  'PATCH',
  `/admin/estudantes/${perfilId}`,
  { ...base, curso: cursoNovo, documentoNumero: '5566778899', documentoEmissor: 'SSP/SC' },
  tk,
);
checar('edicao aceita (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 150));
checar(
  'identifica documentoNumero como alterado',
  (r.dados.camposAlterados ?? []).includes('documentoNumero'),
  JSON.stringify(r.dados.camposAlterados),
);
checar(
  'identifica documentoEmissor como alterado',
  (r.dados.camposAlterados ?? []).includes('documentoEmissor'),
  JSON.stringify(r.dados.camposAlterados),
);
checar('REEMITIU por causa do documento', r.dados.reemissao?.reemitida === true, JSON.stringify(r.dados.reemissao));

r = await req(
  'PATCH',
  `/admin/estudantes/${perfilId}`,
  { ...base, curso: cursoNovo, documentoTipo: 'cnh', documentoNumero: '5566778899', documentoEmissor: '' },
  tk,
);
checar('troca de tipo aceita (200)', r.status === 200, JSON.stringify(r.dados.detalhes ?? r.dados).slice(0, 150));
checar(
  'CNH nao exige orgao expedidor',
  (r.dados.camposAlterados ?? []).includes('documentoTipo'),
  JSON.stringify(r.dados.camposAlterados),
);

console.log('\n== o QR continua o mesmo ==');
const depois = await req('GET', `/admin/estudantes?busca=${encodeURIComponent(aluno.email)}`, null, tk);
const alunoDepois = depois.dados.estudantes[0];
const uuidDepois = alunoDepois.carteirinha?.urlValidacao?.split('/validar/')[1];
checar('mesmo QR apos a reemissao', uuidAntes === uuidDepois, `${uuidAntes} -> ${uuidDepois}`);
checar('curso atualizado na listagem', alunoDepois.curso === cursoNovo, alunoDepois.curso);

const v = await req('GET', `/validar/${uuidDepois}`);
checar('validacao publica segue funcionando', v.dados?.valida === true);
checar('validacao mostra o curso corrigido', v.dados?.estudante?.curso === cursoNovo, v.dados?.estudante?.curso);

console.log('\n== regerar sem editar ==');
r = await req('POST', `/admin/carteirinhas/${alunoDepois.carteirinha.id}/regerar`, {}, tk);
checar('regerar funciona (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 120));

const naoAprovada = outroTodos.dados.estudantes.find(
  (e) => e.carteirinha && e.carteirinha.status !== 'aprovada',
);
if (naoAprovada) {
  r = await req('POST', `/admin/carteirinhas/${naoAprovada.carteirinha.id}/regerar`, {}, tk);
  checar('recusa regerar carteirinha nao aprovada (409)', r.status === 409, JSON.stringify(r.dados));
}

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

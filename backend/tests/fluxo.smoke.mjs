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

/**
 * Cria a conta e já confirma o e-mail. Fora de produção a API devolve o link de
 * confirmação na resposta do cadastro, então dá para fechar o ciclo sem SMTP.
 */
async function registrarVerificado(dados) {
  const r = await req('POST', '/auth/register', dados);
  if (r.status !== 201) return r;

  const tokenVerificacao = r.dados.verificacao?.dev?.link?.split('token=')[1];
  if (!tokenVerificacao) return r;

  const v = await req('POST', '/auth/verificar-email', { token: tokenVerificacao });
  return v.status === 200 ? { status: 201, dados: { ...r.dados, token: v.dados.token } } : r;
}

const PDF_MATRICULA = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF',
  'latin1',
);

/** Comprovante de matricula e obrigatorio antes de entrar na fila do DCE. */
async function enviarComprovante(token) {
  const fd = new FormData();
  fd.append('comprovante', new Blob([PDF_MATRICULA], { type: 'application/pdf' }), 'matricula.pdf');
  const r = await fetch(`${BASE}/perfil/comprovante`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  return r.status;
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

// ---------------------------------------------------------------------------
console.log('\n== 1. aluno cria conta e completa o perfil ==');
const email = `fluxo.${Date.now()}@gmail.com`;
let r = await registrarVerificado({ nome: 'Livia Maria Oliveira', email, senha: 'senha1234' });
const tokenAluno = r.dados.token;
checar('conta criada e e-mail confirmado', !!tokenAluno);

r = await req(
  'POST',
  '/perfil',
  {
    nome: 'Livia Maria de Oliveira',
    cpf: gerarCpf(),
    dataNascimento: '2002-11-10',
    matricula: '2023014567',
    curso: 'Arquitetura e Urbanismo',
    nivel: 'graduacao',
    whatsapp: '(54) 99236-8617',
  },
  tokenAluno,
);
checar('perfil criado', r.status === 201, JSON.stringify(r.dados));

const foto = await sharp({
  create: { width: 800, height: 1000, channels: 3, background: { r: 190, g: 200, b: 195 } },
}).jpeg().toBuffer();
const fd = new FormData();
fd.append('foto', new Blob([foto], { type: 'image/jpeg' }), 'foto.jpg');
let rf = await fetch(`${BASE}/perfil/foto`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${tokenAluno}` },
  body: fd,
});
checar('foto enviada', rf.status === 200);
checar('comprovante de matricula enviado', (await enviarComprovante(tokenAluno)) === 200);

console.log('\n== 2. carteirinha nasce aguardando pagamento, sem QR ==');
r = await req('GET', '/carteirinha', null, tokenAluno);
checar('status = aguardando_pagamento', r.dados?.carteirinha?.status === 'aguardando_pagamento', JSON.stringify(r.dados?.carteirinha?.status));
checar('QR ainda NAO exposto', r.dados?.carteirinha?.qrCodeUuid === null);
checar('arquivo ainda NAO existe', r.dados?.carteirinha?.arquivoUrl === null);
checar('nao pode reenviar email ainda', r.dados?.carteirinha?.podeReenviarEmail === false);
checar('traz dados do PIX', r.dados?.pagamento?.chavePix === '09178125000180', JSON.stringify(r.dados?.pagamento));

r = await req('POST', '/carteirinha/reenviar-email', {}, tokenAluno);
checar('reenviar-email bloqueado antes da aprovacao (409)', r.status === 409, JSON.stringify(r.dados));

console.log('\n== 3. aluno avisa que pagou ==');
r = await req('POST', '/carteirinha/informar-pagamento', { observacao: 'PIX feito as 14h, enviei no zap' }, tokenAluno);
checar('informar-pagamento aceito', r.status === 200, JSON.stringify(r.dados));
checar('status virou pagamento_em_analise', r.dados?.carteirinha?.status === 'pagamento_em_analise');

r = await req('POST', '/carteirinha/informar-pagamento', {}, tokenAluno);
checar('nao deixa avisar duas vezes (409)', r.status === 409);

console.log('\n== 4. admin ve a fila ==');
r = await req('POST', '/auth/login', { email: 'admin@dceatitus.com.br', senha: 'trocar123' });
const tokenAdmin = r.dados.token;
checar('admin logado', !!tokenAdmin);

r = await req('GET', '/admin/pagamentos-pendentes', null, tokenAluno);
checar('estudante NAO acessa area admin (403)', r.status === 403, JSON.stringify(r.dados));

r = await req('GET', '/admin/pagamentos-pendentes', null, tokenAdmin);
const pendente = r.dados.pagamentos.find((p) => p.estudante.email === email);
checar('aluno aparece na fila do admin', !!pendente, `total=${r.dados.total}`);
checar('fila traz a observacao do aluno', pendente?.observacaoEstudante?.includes('PIX feito'), pendente?.observacaoEstudante);
checar('fila traz whatsapp formatado', pendente?.estudante?.whatsappFormatado === '(54) 99236-8617', pendente?.estudante?.whatsappFormatado);

console.log('\n== 5. admin aprova (gera QR + carteirinha + email) ==');
const t0 = Date.now();
r = await req('PATCH', `/admin/pagamentos/${pendente.pagamentoId}/aprovar`, {}, tokenAdmin);
const duracao = ((Date.now() - t0) / 1000).toFixed(1);
checar('aprovacao respondeu 200', r.status === 200, JSON.stringify(r.dados).slice(0, 300));
checar('QR foi gerado', !!r.dados?.carteirinha?.qrCodeUuid, r.dados?.carteirinha?.qrCodeUuid);
checar('arquivos gerados sem erro', r.dados?.geracaoArquivos?.ok === true, JSON.stringify(r.dados?.geracaoArquivos));
checar('PNG frente gerado', !!r.dados?.carteirinha?.arquivoUrl);
checar('PNG verso gerado', !!r.dados?.carteirinha?.arquivoVersoUrl);
checar('PDF gerado', !!r.dados?.carteirinha?.pdfUrl);
checar('validade = 31/03 do ano seguinte', String(r.dados?.carteirinha?.dataValidade).startsWith('2027-03-31'), r.dados?.carteirinha?.dataValidade);
// Vale com ou sem SMTP configurado: o que importa e a API dizer a verdade sobre
// o envio, para o painel do admin poder avisar quando o e-mail nao sair.
checar(
  'resposta informa o resultado do envio de e-mail',
  typeof r.dados?.email?.enviado === 'boolean',
  JSON.stringify(r.dados?.email),
);
console.log(
  `       (e-mail: ${r.dados?.email?.enviado ? 'enviado' : `nao enviado - ${r.dados?.email?.motivo}`})`,
);
console.log(`       (geracao levou ${duracao}s)`);

const qrUuid = r.dados.carteirinha.qrCodeUuid;
const urlFrente = r.dados.carteirinha.arquivoUrl;
const urlPdf = r.dados.carteirinha.pdfUrl;

r = await req('PATCH', `/admin/pagamentos/${pendente.pagamentoId}/aprovar`, {}, tokenAdmin);
checar('nao deixa aprovar duas vezes (409)', r.status === 409, JSON.stringify(r.dados));

console.log('\n== 6. arquivos servidos e integros ==');
const imgFrente = await fetch(urlFrente);
const bufFrente = Buffer.from(await imgFrente.arrayBuffer());
const metaFrente = await sharp(bufFrente).metadata();
checar('PNG da frente acessivel', imgFrente.status === 200);
checar('PNG no tamanho de cartao 300dpi (1011x638)', metaFrente.width === 1011 && metaFrente.height === 638, `${metaFrente.width}x${metaFrente.height}`);

const pdf = await fetch(urlPdf);
const bufPdf = Buffer.from(await pdf.arrayBuffer());
checar('PDF acessivel', pdf.status === 200);
checar('PDF tem assinatura %PDF', bufPdf.subarray(0, 4).toString() === '%PDF', bufPdf.subarray(0, 8).toString());
checar('PDF nao esta vazio', bufPdf.length > 10000, `${bufPdf.length} bytes`);

console.log('\n== 7. aluno ve a carteirinha aprovada ==');
r = await req('GET', '/carteirinha', null, tokenAluno);
checar('status = aprovada', r.dados?.carteirinha?.status === 'aprovada');
checar('QR agora exposto', r.dados?.carteirinha?.qrCodeUuid === qrUuid);
checar('link de validacao presente', String(r.dados?.carteirinha?.urlValidacao).includes(qrUuid));
checar('pode reenviar email agora', r.dados?.carteirinha?.podeReenviarEmail === true);

console.log('\n== 8. validacao publica pelo QR (sem login) ==');
r = await req('GET', `/validar/${qrUuid}`);
checar('validacao responde 200 SEM token', r.status === 200, JSON.stringify(r.dados).slice(0, 200));
checar('marca como valida', r.dados?.valida === true);
checar('mostra nome do estudante', r.dados?.estudante?.nome === 'Livia Maria de Oliveira', r.dados?.estudante?.nome);
checar('CPF vem MASCARADO (LGPD)', /^\*\*\*\.\d{3}\.\d{3}-\*\*$/.test(r.dados?.estudante?.cpfMascarado ?? ''), r.dados?.estudante?.cpfMascarado);
checar('NAO vaza CPF completo', !JSON.stringify(r.dados).match(/\d{11}/));
checar('NAO vaza email do estudante', !JSON.stringify(r.dados).includes(email));
checar('traz curso e nivel', r.dados?.estudante?.curso === 'Arquitetura e Urbanismo' && r.dados?.estudante?.nivel === 'Graduação', JSON.stringify(r.dados?.estudante?.nivel));

r = await req('GET', '/validar/11111111-2222-4333-8444-555555555555');
checar('UUID inexistente devolve 404 valida=false', r.status === 404 && r.dados.valida === false);

r = await req('GET', '/validar/isso-nao-e-uuid');
checar('codigo malformado devolve 400', r.status === 400);

console.log('\n== 9. rejeicao ==');
const email2 = `rejeita.${Date.now()}@gmail.com`;
r = await registrarVerificado({ nome: 'Joao Rejeitado', email: email2, senha: 'senha1234' });
const token2 = r.dados.token;
await req('POST', '/perfil', {
  nome: 'Joao Pedro Rejeitado', cpf: gerarCpf(), dataNascimento: '2000-03-15',
  matricula: '2024001122', curso: 'Direito', nivel: 'graduacao', whatsapp: '54999887766',
}, token2);
const fd2 = new FormData();
fd2.append('foto', new Blob([foto], { type: 'image/jpeg' }), 'foto.jpg');
await fetch(`${BASE}/perfil/foto`, { method: 'POST', headers: { Authorization: `Bearer ${token2}` }, body: fd2 });
await enviarComprovante(token2);
await req('POST', '/carteirinha/informar-pagamento', {}, token2);

r = await req('GET', '/admin/pagamentos-pendentes', null, tokenAdmin);
const pend2 = r.dados.pagamentos.find((p) => p.estudante.email === email2);
r = await req('PATCH', `/admin/pagamentos/${pend2.pagamentoId}/rejeitar`, { motivo: 'Comprovante ilegivel' }, tokenAdmin);
checar('rejeicao respondeu 200', r.status === 200, JSON.stringify(r.dados));

r = await req('GET', '/carteirinha', null, token2);
checar('status virou rejeitada', r.dados?.carteirinha?.status === 'rejeitada');
checar('sem QR apos rejeicao', r.dados?.carteirinha?.qrCodeUuid === null);

r = await req('POST', '/carteirinha/informar-pagamento', { observacao: 'Reenviei o comprovante' }, token2);
checar('aluno rejeitado pode reenviar comprovante', r.status === 200 && r.dados?.carteirinha?.status === 'pagamento_em_analise', JSON.stringify(r.dados?.carteirinha?.status));

console.log('\n== 10. painel do admin ==');
r = await req('GET', '/admin/resumo', null, tokenAdmin);
checar('resumo traz contagens', typeof r.dados?.carteirinhas?.aprovada === 'number', JSON.stringify(r.dados));

r = await req('GET', `/admin/estudantes?busca=${encodeURIComponent('Livia')}`, null, tokenAdmin);
checar('busca de estudantes funciona', r.dados?.estudantes?.some((e) => e.email === email), `total=${r.dados?.total}`);

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

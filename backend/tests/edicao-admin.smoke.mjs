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

// Carla é a persona com carteirinha emitida — o caso que exige reemissão.
const lista = await req('GET', '/admin/estudantes?busca=Carla', null, tk);
const carla = lista.dados.estudantes.find((e) => e.email === 'carla.demo@gmail.com');

if (!carla) {
  console.log('\n  Carla nao encontrada. Rode: npm run seed:demo\n');
  process.exit(1);
}

checar('Carla tem carteirinha aprovada', carla.carteirinha?.status === 'aprovada', carla.carteirinha?.status);
const uuidAntes = carla.carteirinha?.urlValidacao?.split('/validar/')[1];
const perfilId = carla.perfilId;

const base = {
  nome: 'Carla Souza Andrade',
  cpf: carla.cpfFormatado.replace(/\D/g, ''),
  dataNascimento: '2003-07-05',
  matricula: carla.matricula,
  curso: carla.curso,
  nivel: 'graduacao',
  whatsapp: '54991110003',
};

console.log('\n== permissão ==');
const aluno = await req('POST', '/auth/login', { email: 'ana.demo@gmail.com', senha: 'demo1234' });
let r = await req('PATCH', `/admin/estudantes/${perfilId}`, base, aluno.dados.token);
checar('estudante NAO edita ninguem (403)', r.status === 403, `status ${r.status}`);

r = await req('PATCH', `/admin/estudantes/${perfilId}`, base);
checar('sem token devolve 401', r.status === 401);

console.log('\n== validação ==');
r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, cpf: '11111111111' }, tk);
checar('recusa CPF invalido', r.status === 422, JSON.stringify(r.dados.detalhes));

r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, nome: 'Solteiro' }, tk);
checar('exige nome e sobrenome', r.status === 422);

const outro = lista.dados.estudantes.find((e) => e.email !== 'carla.demo@gmail.com');
const outroTodos = await req('GET', '/admin/estudantes', null, tk);
const alheio = outroTodos.dados.estudantes.find((e) => e.perfilId !== perfilId && e.cpfFormatado);
if (alheio) {
  r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, cpf: alheio.cpfFormatado.replace(/\D/g, '') }, tk);
  checar('recusa CPF que ja e de outro aluno (409)', r.status === 409, JSON.stringify(r.dados));
}

r = await req('PATCH', '/admin/estudantes/00000000-0000-4000-8000-000000000000', base, tk);
checar('perfil inexistente devolve 404', r.status === 404);

console.log('\n== edição sem mudança real ==');
r = await req('PATCH', `/admin/estudantes/${perfilId}`, base, tk);
checar('aceita (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 120));
checar('nao lista campos alterados', (r.dados.camposAlterados ?? []).length === 0, JSON.stringify(r.dados.camposAlterados));
checar('NAO reemite a toa', r.dados.reemissao?.reemitida === false, JSON.stringify(r.dados.reemissao));

console.log('\n== correção de dado impresso ==');
const cursoNovo = `Medicina Veterinaria ${Date.now().toString().slice(-4)}`;
r = await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, curso: cursoNovo }, tk);
checar('edicao aceita (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 150));
checar('identifica o campo alterado', (r.dados.camposAlterados ?? []).includes('curso'), JSON.stringify(r.dados.camposAlterados));
checar('REEMITIU a carteirinha', r.dados.reemissao?.reemitida === true, JSON.stringify(r.dados.reemissao));
checar('gerou arquivo novo', !!r.dados.reemissao?.arquivoUrl);
checar('reportou o envio de e-mail', typeof r.dados.email?.enviado === 'boolean', JSON.stringify(r.dados.email));

console.log('\n== o QR continua o mesmo ==');
const depois = await req('GET', '/admin/estudantes?busca=Carla', null, tk);
const carlaDepois = depois.dados.estudantes.find((e) => e.email === 'carla.demo@gmail.com');
const uuidDepois = carlaDepois.carteirinha?.urlValidacao?.split('/validar/')[1];
checar('mesmo QR apos a reemissao', uuidAntes === uuidDepois, `${uuidAntes} -> ${uuidDepois}`);
checar('curso atualizado na listagem', carlaDepois.curso === cursoNovo, carlaDepois.curso);

const v = await req('GET', `/validar/${uuidDepois}`);
checar('validacao publica segue funcionando', v.dados?.valida === true);
checar('validacao mostra o curso corrigido', v.dados?.estudante?.curso === cursoNovo, v.dados?.estudante?.curso);

console.log('\n== regerar sem editar ==');
r = await req('POST', `/admin/carteirinhas/${carlaDepois.carteirinha.id}/regerar`, {}, tk);
checar('regerar funciona (200)', r.status === 200, JSON.stringify(r.dados).slice(0, 120));

const naoAprovada = outroTodos.dados.estudantes.find(
  (e) => e.carteirinha && e.carteirinha.status !== 'aprovada',
);
if (naoAprovada) {
  r = await req('POST', `/admin/carteirinhas/${naoAprovada.carteirinha.id}/regerar`, {}, tk);
  checar('recusa regerar carteirinha nao aprovada (409)', r.status === 409, JSON.stringify(r.dados));
}

// Devolve a Carla ao curso original, para a demonstracao ficar coerente.
await req('PATCH', `/admin/estudantes/${perfilId}`, { ...base, curso: 'Medicina' }, tk);
console.log('\n  (Carla devolvida para "Medicina")');

console.log(`\n---------------------------------------------`);
console.log(`  ${passou} passaram / ${falhou} falharam`);
console.log(`---------------------------------------------\n`);
process.exit(falhou > 0 ? 1 : 0);

import dotenv from 'dotenv';

dotenv.config();

const obrigatorias = ['DATABASE_URL', 'JWT_SECRET'];

const faltando = obrigatorias.filter((chave) => !process.env[chave]);
if (faltando.length > 0) {
  throw new Error(
    `Variáveis de ambiente obrigatórias não definidas: ${faltando.join(', ')}. ` +
      'Copie o arquivo .env.example para .env e preencha os valores.',
  );
}

const bool = (valor, padrao = false) => {
  if (valor === undefined) return padrao;
  return ['1', 'true', 'yes', 'sim'].includes(String(valor).toLowerCase());
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT ?? 3333),

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  // URL publica da API (usada em links de arquivos e no callback do Google).
  apiUrl: (process.env.API_URL ?? 'http://localhost:3333').replace(/\/$/, ''),
  // URL da SPA (usada em CORS e no redirect pos-login social).
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:5173').replace(/\/$/, ''),

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      `${(process.env.API_URL ?? 'http://localhost:3333').replace(/\/$/, '')}/auth/google/callback`,
    get habilitado() {
      return Boolean(this.clientId && this.clientSecret);
    },
  },

  // Checagem de MX do dominio no cadastro (evita e-mails de dominio inexistente).
  validarDominioEmail: bool(process.env.VALIDAR_DOMINIO_EMAIL, true),

  dce: {
    nome: process.env.DCE_NOME ?? 'DCE ATITUS',
    instituicao: process.env.DCE_INSTITUICAO ?? 'ATITUS Educacao',
    chavePix: process.env.DCE_CHAVE_PIX ?? '',
    tipoChavePix: process.env.DCE_TIPO_CHAVE_PIX ?? 'CNPJ',
    beneficiarioPix: process.env.DCE_BENEFICIARIO_PIX ?? 'Diretorio Central de Estudantes ATITUS',
    valorCarteirinha: Number(process.env.DCE_VALOR_CARTEIRINHA ?? 30),
    whatsapp: process.env.DCE_WHATSAPP ?? '',
    email: process.env.DCE_EMAIL ?? '',
    responsavelNome: process.env.DCE_RESPONSAVEL_NOME ?? '',
    responsavelCargo: process.env.DCE_RESPONSAVEL_CARGO ?? 'Presidente do DCE',
  },
};

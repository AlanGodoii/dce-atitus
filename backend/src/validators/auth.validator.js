import { z } from 'zod';
import { env } from '../config/env.js';
import { dominioAceitaEmail, normalizarEmail } from '../utils/email.js';
import { ehDominioDescartavel } from '../utils/dominios-descartaveis.js';
import { normalizarWhatsapp } from '../utils/validadores.js';

const emailBase = z
  .string({ required_error: 'Informe o e-mail.' })
  .trim()
  .min(1, 'Informe o e-mail.')
  .max(180, 'E-mail muito longo.')
  .email('Formato de e-mail inválido.')
  .transform(normalizarEmail);

// So faz a consulta DNS depois que o formato ja passou, e apenas no cadastro.
// Isto prova que o dominio recebe e-mail — nao que a caixa exista nem que seja
// do usuario. Quem garante isso e a confirmacao por e-mail (verificacao.service).
const emailComDominioReal = emailBase
  .refine((email) => !ehDominioDescartavel(email), {
    message: 'Não aceitamos e-mail temporário. Use um e-mail que você usa de verdade.',
  })
  .refine(async (email) => (env.validarDominioEmail ? dominioAceitaEmail(email) : true), {
    message: 'O domínio deste e-mail não existe ou não recebe mensagens.',
  });

const senha = z
  .string({ required_error: 'Informe a senha.' })
  .min(8, 'A senha deve ter no mínimo 8 caracteres.')
  .max(72, 'A senha deve ter no máximo 72 caracteres.')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), {
    message: 'A senha deve conter ao menos uma letra e um número.',
  });

const whatsappOpcional = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v ? normalizarWhatsapp(v) : null))
  .refine((v) => v === null || v.length >= 12, {
    message: 'WhatsApp inválido. Use DDD + número, ex: (54) 99999-9999.',
  });

// Aceite explicito: o padrao tem que ser "nao aceito", e o cadastro so passa se
// a pessoa marcar. Caixa pre-marcada nao vale como consentimento (LGPD art. 8).
const aceiteTermos = z
  .boolean({ required_error: 'É preciso aceitar os termos de uso.' })
  .refine((v) => v === true, {
    message: 'É preciso aceitar os termos de uso e a política de privacidade.',
  });

export const registerSchema = z.object({
  aceiteTermos,
  nome: z
    .string({ required_error: 'Informe seu nome completo.' })
    .trim()
    .min(3, 'Informe seu nome completo.')
    .max(150, 'Nome muito longo.')
    .refine((v) => v.includes(' '), { message: 'Informe nome e sobrenome.' }),
  email: emailComDominioReal,
  senha,
  whatsapp: whatsappOpcional,
});

export const loginSchema = z.object({
  email: emailBase,
  senha: z.string({ required_error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
});

export const verificarSchema = z
  .object({
    token: z.string().trim().length(64, 'Link de confirmação inválido.').optional(),
    email: emailBase.optional(),
    codigo: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ''))
      .refine((v) => v.length === 6, { message: 'O código tem 6 dígitos.' })
      .optional(),
  })
  .refine((d) => Boolean(d.token) || Boolean(d.email && d.codigo), {
    message: 'Informe o código de 6 dígitos junto com o seu e-mail.',
  });

export const reenviarVerificacaoSchema = z.object({ email: emailBase });

export const esqueciSenhaSchema = z.object({ email: emailBase });

export const redefinirSenhaSchema = z
  .object({
    token: z.string().trim().length(64, 'Link de redefinição inválido.').optional(),
    email: emailBase.optional(),
    codigo: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ''))
      .refine((v) => v.length === 6, { message: 'O código tem 6 dígitos.' })
      .optional(),
    senha,
  })
  .refine((d) => Boolean(d.token) || Boolean(d.email && d.codigo), {
    message: 'Informe o código de 6 dígitos junto com o seu e-mail.',
  });

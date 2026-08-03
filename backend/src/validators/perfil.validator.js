import { z } from 'zod';
import { cpfValido, normalizarWhatsapp, somenteDigitos } from '../utils/validadores.js';

const IDADE_MINIMA = 14;
const IDADE_MAXIMA = 100;

export const NIVEIS = ['graduacao', 'pos_graduacao', 'mestrado', 'doutorado', 'tecnico'];

export const ROTULO_NIVEL = {
  graduacao: 'Graduação',
  pos_graduacao: 'Pós-Graduação',
  mestrado: 'Mestrado',
  doutorado: 'Doutorado',
  tecnico: 'Técnico',
};

/// Documentos aceitos pelo Padrão Nacional da CIE (item 1.b). A ordem aqui é a
/// que aparece na norma, e é a que o formulário usa.
export const TIPOS_DOCUMENTO = ['rg', 'cnh', 'rne', 'passaporte'];

export const ROTULO_DOCUMENTO = {
  rg: 'RG',
  cnh: 'CNH',
  rne: 'RNE',
  passaporte: 'Passaporte',
};

export const perfilSchema = z.object({
  nome: z
    .string({ required_error: 'Informe seu nome completo.' })
    .trim()
    .min(3, 'Informe seu nome completo.')
    .max(150, 'Nome muito longo.')
    .refine((v) => v.includes(' '), { message: 'Informe nome e sobrenome, como no documento.' }),

  cpf: z
    .string({ required_error: 'Informe o CPF.' })
    .transform(somenteDigitos)
    .refine((v) => v.length === 11, { message: 'O CPF deve ter 11 dígitos.' })
    .refine(cpfValido, { message: 'CPF inválido. Confira os números.' }),

  dataNascimento: z
    .string({ required_error: 'Informe a data de nascimento.' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use o formato AAAA-MM-DD.')
    .refine(
      (v) => {
        const d = new Date(`${v}T00:00:00Z`);
        return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
      },
      { message: 'Data de nascimento inexistente.' },
    )
    .refine(
      (v) => {
        const nascimento = new Date(`${v}T00:00:00Z`);
        const hoje = new Date();
        const anos = (hoje - nascimento) / (365.25 * 24 * 3600 * 1000);
        return anos >= IDADE_MINIMA && anos <= IDADE_MAXIMA;
      },
      { message: `A idade deve estar entre ${IDADE_MINIMA} e ${IDADE_MAXIMA} anos.` },
    )
    .transform((v) => new Date(`${v}T00:00:00Z`)),

  matricula: z
    .string({ required_error: 'Informe a matrícula.' })
    .trim()
    .transform((v) => v.replace(/\s+/g, ''))
    .refine((v) => v.length >= 4 && v.length <= 30, {
      message: 'A matrícula deve ter entre 4 e 30 caracteres.',
    })
    .refine((v) => /^[A-Za-z0-9.\-/]+$/.test(v), {
      message: 'A matrícula aceita apenas letras, números, ponto, hífen e barra.',
    }),

  curso: z
    .string({ required_error: 'Informe o curso.' })
    .trim()
    .min(3, 'Informe o nome do curso.')
    .max(120, 'Nome do curso muito longo.'),

  nivel: z.enum(NIVEIS, { errorMap: () => ({ message: 'Nível de ensino inválido.' }) }),

  documentoTipo: z.enum(TIPOS_DOCUMENTO, {
    errorMap: () => ({ message: 'Escolha RG, CNH, RNE ou passaporte.' }),
  }),

  documentoNumero: z
    .string({ required_error: 'Informe o número do documento de identidade.' })
    .trim()
    .transform((v) => v.replace(/\s+/g, ' ').toUpperCase())
    .refine((v) => v.length >= 5 && v.length <= 30, {
      message: 'O documento deve ter entre 5 e 30 caracteres.',
    })
    .refine((v) => /^[A-Z0-9.\-/ ]+$/.test(v), {
      message: 'O documento aceita apenas letras, números, ponto, hífen e barra.',
    }),

  // Só o RG tem órgão expedidor; a obrigatoriedade condicional está no
  // superRefine abaixo, onde dá para olhar o tipo escolhido.
  documentoEmissor: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ' ').toUpperCase())
    .refine((v) => v === '' || (v.length >= 2 && v.length <= 20), {
      message: 'Órgão expedidor muito longo.',
    })
    .refine((v) => v === '' || /^[A-Z0-9.\-/ ]+$/.test(v), {
      message: 'Órgão expedidor inválido. Use o formato SSP/RS.',
    })
    .optional()
    .default(''),

  whatsapp: z
    .string({ required_error: 'Informe o WhatsApp.' })
    .trim()
    .transform((v) => normalizarWhatsapp(v))
    .refine((v) => v !== null, {
      message: 'WhatsApp inválido. Use DDD + número, ex: (54) 99999-9999.',
    }),
})
  .superRefine((dados, ctx) => {
    // O padrão nacional pede "as siglas do órgão expedidor do RG e respectiva
    // UF". CNH, RNE e passaporte não têm equivalente, então a exigência vale
    // só para RG — cobrar dos outros seria inventar campo que não existe.
    if (dados.documentoTipo === 'rg' && !dados.documentoEmissor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['documentoEmissor'],
        message: 'Informe o órgão expedidor do RG, ex: SSP/RS.',
      });
    }
  })
  .transform((dados) => ({
    ...dados,
    // Vazio vira nulo: no banco a ausência é NULL, não string em branco.
    documentoEmissor: dados.documentoEmissor || null,
  }));

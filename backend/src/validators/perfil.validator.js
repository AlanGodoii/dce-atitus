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

  whatsapp: z
    .string({ required_error: 'Informe o WhatsApp.' })
    .trim()
    .transform((v) => normalizarWhatsapp(v))
    .refine((v) => v !== null, {
      message: 'WhatsApp inválido. Use DDD + número, ex: (54) 99999-9999.',
    }),
});

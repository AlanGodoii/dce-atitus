export function somenteDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

/** Valida CPF pelos dois digitos verificadores (modulo 11). */
export function cpfValido(entrada) {
  const cpf = somenteDigitos(entrada);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digito = (tamanho) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

export function formatarCpf(cpf) {
  const d = somenteDigitos(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatarCnpj(cnpj) {
  const d = somenteDigitos(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** 5554992368617 -> (54) 99236-8617 */
export function formatarTelefoneExibicao(entrada) {
  let d = somenteDigitos(entrada);
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return entrada;
}

export function formatarDataBr(data) {
  const d = data instanceof Date ? data : new Date(data);
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(d);
}

/**
 * Normaliza telefone brasileiro para o formato E.164 sem o "+" (5554999999999),
 * que e o formato aceito pelos links wa.me.
 */
export function normalizarWhatsapp(entrada) {
  let d = somenteDigitos(entrada);
  if (!d) return null;
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.length < 12 || d.length > 13) return null;
  return d;
}

export function whatsappValido(entrada) {
  return normalizarWhatsapp(entrada) !== null;
}

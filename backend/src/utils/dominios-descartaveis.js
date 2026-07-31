/**
 * Domínios de e-mail temporário/descartável. Não é uma lista exaustiva — é
 * impossível manter uma — mas corta os serviços mais usados antes de gastar
 * um envio. A garantia de verdade continua sendo a confirmação por e-mail.
 */
const DESCARTAVEIS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'anonbox.net',
  'burnermail.io',
  'dispostable.com',
  'emailondeck.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'inboxbear.com',
  'mailcatch.com',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mailsac.com',
  'mintemail.com',
  'mohmal.com',
  'moakt.com',
  'mytemp.email',
  'sharklasers.com',
  'spam4.me',
  'temp-mail.org',
  'tempail.com',
  'tempinbox.com',
  'tempmail.com',
  'tempmail.net',
  'tempmailo.com',
  'temporary-mail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.de',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
]);

export function ehDominioDescartavel(email) {
  const dominio = String(email).split('@')[1]?.toLowerCase().trim();
  if (!dominio) return false;
  if (DESCARTAVEIS.has(dominio)) return true;
  // Pega subdomínios do tipo "algo.mailinator.com".
  return [...DESCARTAVEIS].some((d) => dominio.endsWith(`.${d}`));
}

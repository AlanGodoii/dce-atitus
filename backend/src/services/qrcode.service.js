import QRCode from 'qrcode';
import { env } from '../config/env.js';

/** URL publica que o QR aponta — abre a tela de validacao na SPA. */
export function urlValidacao(qrCodeUuid) {
  return `${env.frontendUrl}/validar/${qrCodeUuid}`;
}

/**
 * Data URI do QR para embutir direto no HTML da carteirinha.
 * Correcao de erro alta (H): o cartao pode ser impresso, dobrado ou lido em
 * tela pequena, e o nivel H tolera ~30% de dano.
 */
export async function gerarQrCodeDataUrl(qrCodeUuid, tamanho = 512) {
  return QRCode.toDataURL(urlValidacao(qrCodeUuid), {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: tamanho,
    color: { dark: '#0F3B31', light: '#FFFFFF' },
  });
}

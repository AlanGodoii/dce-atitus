/**
 * Erro de negocio com status HTTP. O handler global converte em resposta JSON;
 * qualquer outro erro vira 500 sem vazar detalhes internos.
 */
export class AppError extends Error {
  constructor(mensagem, status = 400, detalhes = undefined) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.detalhes = detalhes;
  }

  static naoAutorizado(mensagem = 'Não autenticado.') {
    return new AppError(mensagem, 401);
  }

  static proibido(mensagem = 'Você não tem permissão para acessar este recurso.') {
    return new AppError(mensagem, 403);
  }

  static naoEncontrado(mensagem = 'Recurso não encontrado.') {
    return new AppError(mensagem, 404);
  }

  static conflito(mensagem) {
    return new AppError(mensagem, 409);
  }
}

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'ERROR',
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg = 'Solicitud inválida', details?: unknown) => new AppError(400, msg, 'BAD_REQUEST', details);
export const unauthorized = (msg = 'Debes iniciar sesión') => new AppError(401, msg, 'UNAUTHORIZED');
export const forbidden = (msg = 'No tienes permiso para realizar esta acción') => new AppError(403, msg, 'FORBIDDEN');
export const notFound = (msg = 'Recurso no encontrado') => new AppError(404, msg, 'NOT_FOUND');
export const conflict = (msg = 'El recurso ya existe') => new AppError(409, msg, 'CONFLICT');
export const notConfigured = (msg: string) => new AppError(503, msg, 'NOT_CONFIGURED');

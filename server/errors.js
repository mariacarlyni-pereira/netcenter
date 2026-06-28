export class AppError extends Error {
  constructor(message, statusCode = 500, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function formatValidationErrors(errors) {
  return errors.map((error) => ({
    field: error.path || error.param || 'unknown',
    message: error.msg || 'Valor inválido.',
  }));
}

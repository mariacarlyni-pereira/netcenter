export function errorHandler(err, req, res, next) {
  console.error('API Error:', err);
  if (res.headersSent) {
    return next(err);
  }

  const status = err.statusCode || err.status || 500;
  const response = {
    success: false,
    message: err.message || 'Erro interno do servidor.',
  };

  if (err.details && err.details.length) {
    response.errors = err.details;
  }

  res.status(status).json(response);
}

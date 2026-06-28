import { getUserById } from '../models/users.model.js';
import { AppError } from '../errors.js';

export async function getProfile(req, res, next) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return next(new AppError('Usuário não encontrado.', 404));
    }
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (error) {
    next(error);
  }
}

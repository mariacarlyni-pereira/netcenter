import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { createUser, getUserByEmail } from '../models/users.model.js';
import { createJwtToken } from '../utils/jwt.util.js';
import { AppError, formatValidationErrors } from '../errors.js';

export const loginValidation = [
  body('email').isEmail().withMessage('Informe um e-mail válido.'),
  body('password').isString().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres.'),
];

export const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('O nome deve ter pelo menos 2 caracteres.'),
  body('email').isEmail().withMessage('Informe um e-mail válido.'),
  body('password').isString().isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres.'),
];

export async function login(req, res, next) {
  const { email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new AppError('Erro de validação.', 400, formatValidationErrors(errors.array())));
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return next(new AppError('Credenciais inválidas.', 401));
    }

    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) {
      return next(new AppError('Credenciais inválidas.', 401));
    }

    const token = createJwtToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  const { name, email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(new AppError('Erro de validação.', 400, formatValidationErrors(errors.array())));
  }

  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return next(new AppError('Email já cadastrado.', 409));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser({ name, email, password: hashedPassword });
    const token = createJwtToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

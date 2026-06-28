import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const fallbackSecret = 'dev-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || fallbackSecret;

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar o servidor.');
}

export function createJwtToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

export function verifyJwtToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

import dotenv from 'dotenv';
dotenv.config();

import { execSync } from 'child_process';
import { createApp } from './server/app.js';
import { initDatabase } from './server/db.js';

try {
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
} catch (err) {
  console.error('Falha ao aplicar migrations:', err.message);
  process.exit(1);
}

const app = createApp();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
  console.error('Erro: variável de ambiente JWT_SECRET não está definida.');
  process.exit(1);
}

await initDatabase();

app.listen(PORT, () => {
  console.log(`NetCenter server rodando em http://localhost:${PORT}`);
});

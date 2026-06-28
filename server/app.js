import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get(['/docs', '/docs/'], (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'docs.html'));
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/reports', express.static(path.join(__dirname, '..', 'reports')));
  app.get('/docs/openapi.yaml', (_req, res) => {
    const filePath = path.join(__dirname, '..', 'docs', 'openapi.yaml');
    if (fs.existsSync(filePath)) {
      res.type('yaml').sendFile(filePath);
      return;
    }
    res.status(404).json({ message: 'Arquivo de documentação não encontrado.' });
  });

  app.use('/api', routes);
  app.use(errorHandler);
  return app;
}

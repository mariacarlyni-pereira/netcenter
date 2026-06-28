import express from 'express';
import rateLimit from 'express-rate-limit';
import { runTool, runToolValidation } from '../controllers/tools.controller.js';

const router = express.Router();

const toolsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // limite de 30 requisições por IP por janela
  message: { success: false, message: 'Muitas requisições a partir deste IP. Tente novamente após 15 minutos.' }
});

router.post('/', toolsLimiter, runToolValidation, runTool);

export default router;

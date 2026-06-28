import express from 'express';
import { login, loginValidation, register, registerValidation } from '../controllers/auth.controller.js';

const router = express.Router();
router.post('/login', loginValidation, login);
router.post('/register', registerValidation, register);

export default router;

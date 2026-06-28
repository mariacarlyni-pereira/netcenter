import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./prisma/test.sqlite';

execSync('npx prisma migrate deploy', { stdio: 'inherit' });

const { createApp } = await import('../server/app.js');
const { initDatabase } = await import('../server/db.js');

let app;

test.before(async () => {
  await initDatabase();
  app = createApp();
});

test('POST /api/auth/register cria um usuário e retorna token', async () => {
  const uniqueEmail = `teste-${Date.now()}@example.com`;
  const response = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Usuário Teste',
      email: uniqueEmail,
      password: 'senha12345',
    });

  assert.equal(response.status, 201);
  assert.ok(response.body.token);
  assert.equal(response.body.user.email, uniqueEmail);
});

test('POST /api/auth/login rejeita credenciais inválidas com mensagem clara', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'naoexiste@example.com', password: 'senhaErrada' });

  assert.equal(response.status, 401);
  assert.match(response.body.message, /credenciais/i);
});

test('POST /api/run-tool valida entradas antes de processar a requisição', async () => {
  const token = jwt.sign({ id: 'test-user-id', email: 'test@example.com' }, process.env.JWT_SECRET);
  const response = await request(app)
    .post('/api/run-tool')
    .set('Authorization', `Bearer ${token}`)
    .send({ ferramenta: 'ping', alvo: 'alvo inválido!' });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.errors?.length);
});

test('POST /api/run-tool retorna uma resposta válida para ping mesmo sem comando nativo', async () => {
  const response = await request(app)
    .post('/api/run-tool')
    .send({ ferramenta: 'ping', alvo: '8.8.8.8' });

  assert.equal(response.status, 200);
  assert.ok(response.body.command);
  assert.ok(response.body.stdout || response.body.stderr || response.body.details);
});

test('GET /docs serve a página de documentação da API', async () => {
  const response = await request(app).get('/docs');

  assert.equal(response.status, 200);
  assert.match(response.text, /NetCenter API Docs|Swagger/i);
});

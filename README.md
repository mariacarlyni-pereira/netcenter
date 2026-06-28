# 🌐 NetCenter

**NetCenter** é uma aplicação web desenvolvida como projeto acadêmico para atuar como um hub centralizador de ferramentas de diagnóstico de redes. O objetivo principal do projeto é aplicar conceitos modernos de desenvolvimento full-stack, incluindo estruturação de APIs robustas em Express, persistência relacional com Prisma ORM e SQLite, autenticação JWT segura, e manipulação dinâmica de DOM no front-end.

---

## 🚀 Tecnologias Utilizadas

### Front-End:
* **HTML5 & Vanilla CSS:** Estruturação semântica e estilização customizada.
* **TailwindCSS (via CDN):** Framework utilitário para design ágil e responsivo.
* **JavaScript (Vanilla ES6+):** Lógica client-side utilizando ECMAScript Modules (ESM).
* **Lucide Icons:** Biblioteca de ícones vetoriais.

### Back-End:
* **Node.js & Express.js:** Servidor HTTP estruturado no padrão MVC.
* **Prisma ORM & SQLite:** Modelagem de banco de dados relacional e controle de migrations.
* **JSON Web Tokens (JWT) & bcryptjs:** Controle de autenticação e hashing de senhas.
* **PDFKit:** Geração em tempo de execução de relatórios de rede no formato PDF.

---

## 🎯 Requisitos Atendidos (Rubrica de Avaliação)

Este projeto foi estruturado para atender plenamente a todos os critérios acadêmicos exigidos:

### 1. Back-end com Express.js
* **Estrutura MVC:** Organizado em pastas dedicadas para Rotas, Controllers, Models e Middlewares.
* **Validação de Entradas:** Implementada nos controllers com rejeição imediata (`400 Bad Request`) para dados ausentes e sanitização via Regex contra injeções de shell scripts no servidor.
* **Tratamento Centralizado de Erros:** Middleware global de captura de erros com 4 parâmetros (`err, req, res, next`), garantindo respostas JSON limpas em todos os fluxos.

### 2. Integração Front-end ↔ Back-end
* **Comunicação assíncrona:** Realizada através da Fetch API com tratamento de promessas e erros (`try/catch`).
* **Manutenção da Autenticação:** Gravação e leitura do token JWT no `localStorage` do cliente e envio sob o cabeçalho `Authorization: Bearer <token>`.
* **Tratamento de Exceções:** Detecção de erros da API com exibição visual para o usuário e redirecionamento de segurança automático para login caso a autenticação expire (HTTP 401).

### 3. Banco de Dados e Persistência
* **Modelagem Relacional:** Três tabelas no schema (`User`, `Report` e `Ferramenta`) com relacionamento `1 ↔ N` entre usuários e relatórios.
* **Migrations Prisma:** Histórico de alterações e evolução estrutural do banco versionado em arquivos SQL dentro de `/prisma/migrations/`.
* **Automação no Startup:** Comando `prisma migrate deploy` embutido no arquivo principal do servidor, garantindo que o banco seja configurado no startup.

### 4. Autenticação e Controle de Acesso
* **Cadastro e Login:** Cadastro com verificação de e-mail duplicado e armazenamento de senhas utilizando hash **bcryptjs** de 10 rounds.
* **JWT:** Geração de tokens de 2 horas assinados por chave forte e validação através de middleware de controle de rotas autenticadas.
* **Proteção das Ferramentas:** Rota `/api/run-tool` completamente protegida, exigindo login para efetuar qualquer chamada aos binários do SO.

### 5. Configuração e Recursos do Sistema
* **Variáveis de Ambiente:** Uso do arquivo `.env` para expor segredos (`JWT_SECRET`), caminho do banco (`DATABASE_URL`) e porta do servidor (`PORT`). O arquivo `.env` está no `.gitignore`.
* **Configuração de Setup:** Fornecido `.env.example` com template das variáveis necessárias.
* **Portabilidade de SO:** O controller de ferramentas executa utilitários nativos usando `child_process.spawn`, adaptando a chamada e os parâmetros com base na identificação do sistema operacional (Windows vs Unix-like).

---

## 📂 Estrutura do Projeto

```
netcenter/
├── api/                    # Consumo da API no front-end
│   ├── index.js            # Chamada de ferramentas pública
│   └── auth.js             # Chamadas autenticadas (auth, run-tool, reports)
├── prisma/                 # Banco de dados e ORM
│   ├── schema.prisma       # Modelagem das entidades relativas ao banco
│   ├── seed.js             # Script de população do banco
│   └── migrations/         # Histórico de migrations SQL versionadas
├── server/                 # Backend Node/Express
│   ├── db.js               # Inicialização de diretórios e seeding das ferramentas
│   ├── controllers/        # Controladores responsáveis pelas requisições
│   ├── middlewares/        # Middlewares de Auth e Error handling
│   ├── models/             # Queries ao banco via Prisma Client
│   ├── routes/             # Definição dos endpoints REST
│   └── utils/              # Funções auxiliares (criação e validação JWT)
├── .env.example            # Modelo de exemplo de variáveis de ambiente
├── index.html              # Tela inicial com motor de busca
├── login.html              # Tela de Login
├── register.html           # Tela de Cadastro
├── tools.html              # Painel do terminal com Auth Guard
├── reports.html            # Tela de visualização de relatórios do usuário
├── main.js                 # JS da tela principal (DOM e autenticação)
├── server.js               # Servidor Express principal
└── package.json            # Scripts de inicialização, migrations e dependências
```

---

## 📚 Documentação da API

A API agora conta com uma documentação básica em OpenAPI disponível em [docs/openapi.yaml](docs/openapi.yaml).

Também foram incluídos artefatos de organização para desenvolvimento assistido por IA em [AGENTS.md](AGENTS.md) e na pasta [specs](specs).

## 🧪 Testes Automatizados

Execute os testes com:

```bash
npm test
```

## ⚙️ Como Executar o Projeto

Para rodar a aplicação localmente, siga os passos abaixo:

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as variáveis de ambiente:**
   Copie o arquivo `.env.example` e crie um arquivo `.env` na raiz do projeto:
   ```bash
   cp .env.example .env
   ```
   Ajuste as chaves conforme necessário (um `JWT_SECRET` forte é recomendado).

3. **Inicie o servidor (ele aplicará as migrations e o seed automaticamente):**
   ```bash
   npm start
   ```

5. **Acesse a aplicação:**
   Abrir `http://localhost:3000` no seu navegador.

---

## 🐳 Uso com Docker

1. Crie o arquivo `.env` a partir de `.env.example`:
   ```bash
   cp .env.example .env
   ```

2. Suba o contêiner com Docker Compose:
   ```bash
   docker compose up --build
   ```

3. Acesse a aplicação em `http://localhost:3000`.

> O container expõe a porta `3000` e carrega as variáveis de ambiente do arquivo `.env`.

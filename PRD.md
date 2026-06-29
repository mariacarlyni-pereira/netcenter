# 📄 Product Requirements Document (PRD) - NetCenter

## 1. Visão Geral do Produto
O **NetCenter** é uma aplicação web full-stack que atua como um hub centralizador de ferramentas para diagnóstico de redes. O produto visa facilitar a execução de comandos comuns de infraestrutura (como Ping, Traceroute, Meu IP, DNS Lookup, IP Geolocation, Port Scanner, SSL Checker, WHOIS, HTTP Header Checker e IP Reputation Checker) através de uma interface gráfica amigável, moderna e responsiva, substituindo a necessidade imediata do uso de terminais de linha de comando (CLI) para consultas rápidas.

---

## 2. Objetivos do Projeto

### Objetivo Funcional:
Prover uma interface segura onde o usuário possa se cadastrar, fazer login e executar simulações reais de ferramentas de rede contra alvos específicos (IP ou Domínio), obtendo resultados visuais detalhados emulando um terminal e gerando relatórios de auditoria em PDF.

### Objetivo Acadêmico:
Demonstrar domínio em tecnologias fundamentais de desenvolvimento web full-stack:
- **Front-End:** Componentização, Modularização (ESM), requisições assíncronas (Fetch API), tratamento e exibição de erros de rede/API, e manipulação dinâmica do DOM.
- **Back-End:** Arquitetura limpa MVC no Express, validação/sanitização de inputs, tratamento global de erros, e integração segura com o sistema operacional.
- **Persistência & Acesso:** Modelagem de banco de dados relacional com Prisma ORM e SQLite, controle de evolução estrutural via Migrations versionadas, e controle de acesso baseado em autenticação JWT com criptografia de senhas (bcryptjs).

---

## 3. Requisitos Funcionais (RF)

* **RF01 - Cadastro e Autenticação de Usuários:** O sistema deve permitir o cadastro de novos usuários (com hashing seguro da senha) e autenticação subsequente gerando tokens JWT válidos.
* **RF02 - Grade de Ferramentas:** A página inicial deve carregar dinamicamente as ferramentas disponíveis no banco de dados através de uma chamada à API e exibi-las em formato de cards interativos.
* **RF03 - Filtro e Busca de Alvo:** O usuário deve poder digitar um IP ou domínio de destino na tela principal antes de acionar os diagnósticos.
* **RF04 - Redirecionamento Parametrizado:** Ao clicar em um card ou no botão de busca principal, o sistema deve direcionar o usuário para o painel de execução (`tools.html`) passando a ferramenta e o alvo selecionados por meio de Query Strings.
* **RF05 - Proteção de Acesso (Auth Guard):** A tela do terminal de diagnósticos (`tools.html`), a listagem de relatórios e a execução em si das ferramentas de rede no back-end devem exigir autenticação. Usuários não logados devem ser redirecionados para a tela de login.
* **RF06 - Execução em Tempo Real:** O servidor Express deve receber a requisição de diagnóstico, validar os dados e executar as ferramentas no sistema operacional subjacente (ou API de geolocalização correspondente) retornando os dados em tempo real para exibição no terminal simulado.
* **RF07 - Geração de Relatórios PDF:** O usuário autenticado deve poder gerar um arquivo PDF estruturado contendo o resumo e os resultados dos diagnósticos realizados no alvo.
* **RF08 - Histórico de Relatórios:** O usuário deve ter acesso a um painel (`reports.html`) listando todos os relatórios gerados por ele, permitindo o download direto do arquivo PDF correspondente.

---

## 4. Requisitos Não Funcionais (RNF)

* **RNF01 - Estruturação de Dados e Banco:** Uso do banco relacional SQLite mediado pelo Prisma ORM. A criação e evolução de tabelas deve ser estritamente gerenciada por meio de Migrations geradas e versionadas no Git.
* **RNF02 - Automação do Banco de Dados:** O servidor Express deve rodar automaticamente o deploy das migrations pendentes no momento da inicialização do servidor.
* **RNF03 - Comunicação assíncrona:** A integração client-server deve ser feita utilizando a Fetch API nativa em módulos Javascript independentes com tratamento de exceções via blocos `try/catch`.
* **RNF04 - Manipulação Dinâmica do DOM:** Cards de ferramentas e linhas de output de terminal devem ser construídos dinamicamente no DOM via manipulação Javascript, sem templates HTML estáticos.
* **RNF05 - Segurança de Senhas:** Senhas no banco de dados devem ser criptografadas de forma segura com salt rounds via **bcryptjs**.
* **RNF06 - Segurança de Configurações:** Variáveis sensíveis como segredos de token, portas e conexões de banco de dados devem ser gerenciadas via variáveis de ambiente (`.env`) e omitidas do controle de versão.
* **RNF07 - Modularização (ESM):** Uso obrigatório do sistema de módulos do ES6 (`import` / `export`) tanto no front-end quanto no back-end.
* **RNF08 - Responsividade e Estilo:** A interface deve ser estilizada com TailwindCSS e CSS nativo, oferecendo visual responsivo adaptado para dispositivos móveis e desktops.
* **RNF09 - Portabilidade e Integração com SO:** Os comandos de rede disparados no back-end devem reconhecer a plataforma em execução (Windows vs Linux) e ajustar os parâmetros de comandos nativos para evitar erros de execução.

---

## 5. Fluxo de Dados e Segurança

1. **Autenticação:** O cliente envia as credenciais de login. O servidor valida a senha com o hash do banco e devolve um token JWT assinado pela chave secreta do `.env`.
2. **Autorização:** O cliente guarda o token em `localStorage`. Ao acessar o painel de ferramentas, o front-end verifica a presença do token. Ao disparar uma ferramenta, anexa o cabeçalho `Authorization: Bearer <token>`.
3. **Validação & Execução:** O Express recebe a requisição, o `authMiddleware` valida a assinatura do token, e o `tools.controller` sanitiza a string de alvo contra ataques de injeção antes de passar a string de forma segura ao subprocesso do sistema operacional.
4. **Resolução de Erros:** Qualquer exceção é encaminhada pelo Express ao handler em `error.middleware.js`, que responde com JSON semântico para que o front-end informe adequadamente o usuário na tela.
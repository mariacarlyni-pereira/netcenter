# 🌐 NetCenter - Network Diagnostic Hub

O **NetCenter** é uma aplicação web estática desenvolvida para atuar como um centralizador intuitivo de ferramentas de diagnóstico de rede. Inspirado na simplicidade dos motores de busca, o projeto permite que profissionais e estudantes de TI acessem utilitários essenciais de infraestrutura a partir de uma única interface moderna.

---

## 🚀 Funcionalidades

* **Busca Unificada:** Campo central para inserção de alvos (Endereços IP ou Domínios).
* **Painel de Ferramentas:** Acesso rápido em formato de cards para:
  * 👤 **Meu IP:** Consulta de IP público e dados de geolocalização.
  * ⚡ **Ping:** Teste de latência e disponibilidade via ICMP.
  * 🛤️ **Traceroute:** Mapeamento de saltos (hops) da rota de pacotes.
  * 🗄️ **NSLookup:** Consulta de registros de servidores DNS.
* **Terminal Emulado:** Exibição de resultados de varredura simulando uma interface de linha de comando (CLI) real.

## 🛠️ Tecnologias Utilizadas

O projeto foi construído com foco em performance e design responsivo, utilizando páginas estáticas e bibliotecas via CDN:

* **HTML5:** Estrutura semântica das páginas.
* **TailwindCSS:** Framework CSS utilitário para estilização rápida e criação do *Dark Mode* (`slate-900`/`slate-950`).
* **Lucide Icons:** Biblioteca de ícones vetoriais modernos.
* **GitHub Copilot / IA:** Utilizado para auxiliar na estruturação e definição dos requisitos do sistema (PRD).

## 📂 Estrutura do Projeto

```text
/
├── index.html        # Landing page e central de buscas
├── resultado.html    # Interface do terminal emulado mostrando os testes
├── PRD.md            # Product Requirements Document (Requisitos do Sistema)
└── README.md         # Documentação principal do repositório
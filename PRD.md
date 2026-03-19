# Product Requirements Document (PRD) - NetCenter

## 1. Visão Geral do Produto
O **NetCenter** é uma aplicação web desenvolvida para atuar como um hub centralizador de ferramentas de diagnóstico de redes. O objetivo principal é fornecer uma interface limpa, direta e amigável (estilo motor de busca) para que profissionais de TI, estudantes e administradores de rede possam acessar utilitários essenciais a partir de um único local.

## 2. Público-Alvo
* Estudantes da disciplina de Redes de Computadores.
* Administradores de Redes e Infraestrutura.
* Desenvolvedores e profissionais de TI que necessitam de diagnósticos rápidos de conectividade e DNS.

## 3. Escopo do Projeto
O escopo inicial desta entrega contempla a **interface do usuário (Frontend)** através de páginas estáticas, garantindo uma navegação responsiva e uma experiência de usuário (UX) focada em produtividade (Dark Mode).

### Ferramentas Integradas (Visão da Interface)
1. **Meu IP:** Exibição de dados de IP público e geolocalização.
2. **Teste de Ping:** Disparo de pacotes ICMP para teste de latência.
3. **Traceroute:** Mapeamento de rotas e saltos (hops) de rede.
4. **NSLookup:** Consulta de registros em servidores DNS.

## 4. Requisitos Funcionais (RF)
* **RF01 - Barra de Pesquisa Central:** O sistema deve possuir um input central onde o usuário possa inserir o alvo (Endereço IP ou Domínio).
* **RF02 - Cards de Ferramentas:** A página inicial deve apresentar as ferramentas disponíveis em formato de *cards* interativos.
* **RF03 - Navegação para Resultados:** Ao submeter o alvo ou clicar em um card, o usuário deve ser direcionado para uma tela de console/resultados da respectiva ferramenta.

## 5. Requisitos Não Funcionais (RNF)
* **RNF01 - Responsividade:** A aplicação deve se adaptar perfeitamente a dispositivos móveis, tablets e desktops.
* **RNF02 - Framework CSS:** O layout deve ser construído inteiramente utilizando **TailwindCSS** (via CDN para páginas estáticas).
* **RNF03 - Iconografia:** O sistema deve utilizar a biblioteca **Lucide Icons** para manter a padronização visual.
* **RNF04 - Tema Visual:** A interface deve seguir um padrão *Dark Mode* (tons de `slate-900` e `slate-950`) para reduzir a fadiga visual e alinhar-se a ambientes de desenvolvimento/NOC.

## 6. Pilha Tecnológica (Tech Stack)
* **Linguagem de Marcação:** HTML5
* **Estilização:** TailwindCSS
* **Ícones:** Lucide Icons (via CDN `unpkg`)
* **Hospedagem (Planejada):** GitHub Pages ou ambiente local (Live Server).

## 7. Estrutura de Arquivos
* `PRD.md` - Documento de requisitos do sistema.
* `index.html` - Página principal (Landing Page/Busca).
* `resultado.html` - Página estática simulando o retorno dos comandos de rede (Próximo passo de desenvolvimento).
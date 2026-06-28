import fsPromises from 'fs/promises';
import path from 'path';
import prisma from './prisma/client.js';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

const ferramentasSeed = [
  { id: 'meu-ip', nome: 'Meu IP', descricao: 'Consulta de IP público e dados de geolocalização.', icone: 'user' },
  { id: 'ping', nome: 'Teste de Ping', descricao: 'Mede a latência e disponibilidade de um host via pacotes ICMP.', icone: 'activity' },
  { id: 'traceroute', nome: 'Traceroute', descricao: 'Mapeia o caminho e os saltos de rede até o destino.', icone: 'route' },
  { id: 'dns-lookup', nome: 'DNS Lookup', descricao: 'Consulta registros DNS para domínios específicos.', icone: 'globe' },
  { id: 'ip-geolocation', nome: 'IP Geolocation', descricao: 'Determina a localização geográfica de um endereço IP.', icone: 'map-pin' },
  { id: 'port-scanner', nome: 'Port Scanner', descricao: 'Escaneia portas abertas em um host para segurança de rede.', icone: 'shield' },
  { id: 'ssl-checker', nome: 'SSL Checker', descricao: 'Verifica a validade e configuração de certificados SSL.', icone: 'lock' },
  { id: 'whois', nome: 'WHOIS', descricao: 'Consulta informações de registro de domínios e IPs.', icone: 'info' },
  { id: 'http-header-checker', nome: 'HTTP Header Checker', descricao: 'Analisa os cabeçalhos HTTP de um site para diagnóstico.', icone: 'server' },
  { id: 'ip-reputation-checker', nome: 'IP Reputation Checker', descricao: 'Avalia a reputação de um endereço IP com base em listas de bloqueio e relatórios de segurança.', icone: 'shield-x' },
];

/**
 * Inicializa recursos necessários para a aplicação:
 * - Garante que o diretório de relatórios PDF existe
 * - Popula a tabela de ferramentas com os dados padrão (upsert)
 *
 * A estrutura do banco de dados é gerenciada pelas migrations do Prisma
 * (prisma/migrations/) e aplicada via `prisma migrate deploy` antes do start.
 */
export async function initDatabase() {
  // Garante que o diretório de relatórios existe no filesystem
  await fsPromises.mkdir(REPORTS_DIR, { recursive: true });

  // Popula / atualiza as ferramentas padrão no banco
  for (const tool of ferramentasSeed) {
    await prisma.ferramenta.upsert({
      where: { id: tool.id },
      update: { nome: tool.nome, descricao: tool.descricao, icone: tool.icone },
      create: { id: tool.id, nome: tool.nome, descricao: tool.descricao, icone: tool.icone },
    });
  }
}

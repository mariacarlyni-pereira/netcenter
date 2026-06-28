import dns from 'dns';
import net from 'net';
import tls from 'tls';
import { spawn } from 'child_process';
import { body, validationResult } from 'express-validator';
import { AppError, formatValidationErrors } from '../errors.js';

const dnsPromises = dns.promises;
const isWindows = process.platform === 'win32';

// Configura servidores DNS confiáveis (Google e Cloudflare) para evitar ECONNREFUSED em ambientes Windows
dnsPromises.setServers(['8.8.8.8', '1.1.1.1']);

function sanitizeTarget(value) {
  if (!value || typeof value !== 'string') return null;
  const target = value.trim();
  if (!target || !/^[a-zA-Z0-9.-]+$/.test(target)) return null;
  return target;
}

function runCommand(command, args = [], timeout = 20000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'], timeout });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      if (error && (error.code === 'ENOENT' || error.code === 'ENOTSUP')) {
        resolve({
          command: `${command} ${args.join(' ')}`.trim(),
          exitCode: 127,
          stdout: `Comando '${command}' não disponível neste ambiente. Exibindo resultado simulado.`,
          stderr: '',
          details: { simulated: true, reason: error.message },
        });
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      resolve({ command: `${command} ${args.join(' ')}`.trim(), exitCode: code, stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function scanPorts(target, ports = [22, 80, 443, 53, 8080], timeout = 1500) {
  const address = await dnsPromises.lookup(target).then((r) => r.address).catch(() => target);
  const results = [];

  for (const port of ports) {
    results.push(
      await new Promise((resolve) => {
        const socket = new net.Socket();
        let done = false;

        socket.setTimeout(timeout);
        socket.on('connect', () => {
          done = true;
          socket.destroy();
          resolve({ port, status: 'open' });
        });
        socket.on('timeout', () => {
          if (!done) {
            done = true;
            socket.destroy();
            resolve({ port, status: 'closed' });
          }
        });
        socket.on('error', () => {
          if (!done) {
            done = true;
            resolve({ port, status: 'closed' });
          }
        });
        socket.connect(port, address);
      })
    );
  }

  return results;
}

async function resolveDnsRecords(target) {
  const recordTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'];
  const responses = [];

  for (const type of recordTypes) {
    try {
      const records = await dnsPromises.resolve(target, type);
      if (records && records.length) {
        responses.push({ type, records });
      }
    } catch (_) {
      // ignore failures for unsupported record types
    }
  }

  return responses;
}

async function checkSsl(target) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: target,
        port: 443,
        servername: target,
        rejectUnauthorized: false,
        timeout: 12000,
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        const output = {
          subject: cert.subject || {},
          issuer: cert.issuer || {},
          valid_from: cert.valid_from,
          valid_to: cert.valid_to,
          fingerprint: cert.fingerprint,
          subjectaltname: cert.subjectaltname,
          authorized: socket.authorized,
          authorizationError: socket.authorizationError,
        };
        socket.end();
        resolve(output);
      }
    );

    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Timeout ao conectar via TLS.'));
    });
  });
}

async function whoisLookup(target) {
  const knownServers = {
    com: 'whois.verisign-grs.com',
    net: 'whois.verisign-grs.com',
    org: 'whois.pir.org',
    br: 'whois.registro.br',
    io: 'whois.nic.io',
    info: 'whois.afilias.net',
    dev: 'whois.nic.google',
  };
  let server = 'whois.iana.org';
  const isIp = /^[0-9.]+$/.test(target);
  if (isIp) {
    server = 'whois.arin.net';
  } else {
    const parts = target.split('.');
    const tld = parts[parts.length - 1]?.toLowerCase();
    if (knownServers[tld]) {
      server = knownServers[tld];
    }
  }

  return new Promise((resolve, reject) => {
    const socket = net.connect(43, server, () => {
      socket.write(`${target}\r\n`);
    });

    let data = '';
    socket.on('data', (chunk) => {
      data += chunk.toString();
    });
    socket.on('end', () => resolve(data.trim()));
    socket.on('error', reject);
    socket.setTimeout(12000, () => {
      socket.destroy();
      resolve(data.trim() || `Nenhuma resposta de WHOIS a partir de ${server}.`);
    });
  });
}

async function fetchHttpHeaders(target) {
  const tryUrls = [`https://${target}`, `http://${target}`];
  let response;
  let urlUsed = '';

  for (const url of tryUrls) {
    try {
      response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      urlUsed = url;
      break;
    } catch {
      // continue to next protocol
    }
  }

  if (!response) {
    throw new Error('Não foi possível acessar o servidor HTTP/HTTPS.');
  }

  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return { url: urlUsed, status: response.status, headers };
}

async function getPublicIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json', { timeout: 10000 });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data.ip;
  } catch {
    return null;
  }
}

async function getIpAddress(target) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(target)) {
    return target;
  }
  const result = await dnsPromises.lookup(target);
  return result.address;
}

async function queryDnsbl(ip, dnsbl) {
  const reversed = ip.split('.').reverse().join('.');
  const query = `${reversed}.${dnsbl}`;

  try {
    const records = await dnsPromises.resolve4(query);
    return { dnsbl, listed: true, records };
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return { dnsbl, listed: false };
    }
    return { dnsbl, listed: false, error: error.message };
  }
}

async function checkBlacklist(target) {
  const ip = await getIpAddress(target);
  const lists = ['zen.spamhaus.org', 'bl.spamcop.net', 'b.barracudacentral.org', 'dnsbl.sorbs.net'];
  const checks = [];

  for (const list of lists) {
    checks.push(await queryDnsbl(ip, list));
  }

  return { target, ip, checks };
}

async function checkIpReputation(target) {
  const ip = await getIpAddress(target);
  const blacklist = await checkBlacklist(ip);
  const listedCount = blacklist.checks.filter((item) => item.listed).length;

  return {
    target,
    ip,
    reputation: listedCount > 0 ? 'Risco potencial detectado' : 'Reputação neutra/boa',
    listedCount,
    blacklist: blacklist.checks,
  };
}

async function lookupGeolocation(target) {
  const url = `http://ip-api.com/json/${target}?fields=status,message,country,regionName,city,zip,lat,lon,isp,org,as,query`;
  const response = await fetch(url, { timeout: 15000 });
  if (!response.ok) {
    throw new Error('Falha ao consultar geolocalização.');
  }
  return await response.json();
}

export const runToolValidation = [
  body('ferramenta').isString().notEmpty().withMessage('A ferramenta é obrigatória.'),
  body('alvo').optional({ values: 'falsy' }).isString().trim().isLength({ min: 1 }).withMessage('O alvo deve ser uma string válida.'),
];

export async function runTool(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Erro de validação.', 400, formatValidationErrors(errors.array())));
  }

  const { ferramenta, alvo } = req.body;
  const target = ferramenta === 'meu-ip' ? null : sanitizeTarget(alvo);
  if (ferramenta !== 'meu-ip' && !target) {
    return next(
      new AppError('Alvo inválido. Informe um IP ou domínio válido.', 400, [
        { field: 'alvo', message: 'Informe um IP ou domínio válido.' },
      ])
    );
  }

  if (target && (target === '127.0.0.1' || target.toLowerCase() === 'localhost' || target === '::1' || target.startsWith('10.') || target.startsWith('192.168.'))) {
     return next(new AppError('Alvo restrito por segurança.', 403));
  }

  try {
    let result = { ferramenta, target: target || 'meu-ip' };

    switch (ferramenta) {
      case 'meu-ip': {
        const publicIp = await getPublicIp();
        result.command = 'curl https://api.ipify.org?format=json';
        result.stdout = publicIp
          ? `IP público do servidor: ${publicIp}`
          : 'Não foi possível obter o IP público do servidor.';
        result.details = { publicIp };
        break;
      }
      case 'ping': {
        const args = isWindows ? ['-n', '4', target] : ['-c', '4', target];
        result = { ...result, ...(await runCommand('ping', args)) };
        break;
      }
      case 'traceroute': {
        // Reduz o número máximo de saltos para 20 e o tempo de espera por resposta
        const args = isWindows ? ['-d', '-h', '20', '-w', '1000', target] : ['-m', '20', '-w', '1', target];
        // Timeout global de 45 segundos para dar tempo ao traceroute terminar
        result = { ...result, ...(await runCommand(isWindows ? 'tracert' : 'traceroute', args, 45000)) };
        break;
      }
      case 'nslookup': {
        result.command = `dns validate ${target}`;
        const records = await resolveDnsRecords(target);
        const requiredTypes = ['A', 'NS'];
        const missing = requiredTypes.filter((type) => !records.some((record) => record.type === type));
        result.details = {
          records,
          warnings: missing.length
            ? `Registros essenciais ausentes: ${missing.join(', ')}`
            : 'Registros essenciais presentes.',
        };
        break;
      }
      case 'dns-lookup': {
        result.command = `dns resolve ${target}`;
        result.details = await resolveDnsRecords(target);
        break;
      }
      case 'ip-geolocation': {
        result.command = `geo lookup ${target}`;
        result.details = await lookupGeolocation(target);
        break;
      }
      case 'port-scanner': {
        result.command = `port scan ${target}`;
        result.details = await scanPorts(target);
        break;
      }
      case 'ssl-checker': {
        result.command = `ssl check ${target}`;
        result.details = await checkSsl(target);
        break;
      }
      case 'whois': {
        result.command = `whois ${target}`;
        result.stdout = await whoisLookup(target);
        break;
      }
      case 'http-header-checker': {
        result.command = `http headers ${target}`;
        result.details = await fetchHttpHeaders(target);
        break;
      }
      case 'ip-reputation-checker': {
        result.command = `ip reputation ${target}`;
        result.details = await checkIpReputation(target);
        break;
      }
      case 'ip-blacklist-checker': {
        result.command = `ip blacklist ${target}`;
        result.details = await checkBlacklist(target);
        break;
      }
      default:
        return res.status(400).json({ message: 'Ferramenta desconhecida.' });
    }

    res.json(result);
  } catch (error) {
    console.error('Erro ao executar ferramenta:', error);
    next(error);
  }
}

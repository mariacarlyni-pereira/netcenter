import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createReport, getReportsByUser } from '../models/reports.model.js';
import { executeToolInternal } from './tools.controller.js';

const REPORTS_DIR = path.join(process.cwd(), 'reports');
const LOGO_PATH = path.join(process.cwd(), 'public', 'assets', 'logo.png');

const COLORS = {
  primary: '#1e3a5f',
  accent: '#2563eb',
  dark: '#0f172a',
  text: '#334155',
  textLight: '#64748b',
  success: '#16a34a',
  danger: '#dc2626',
  border: '#cbd5e1',
  bgLight: '#f1f5f9',
  white: '#ffffff',
};

const TOOL_LABELS = {
  'meu-ip': 'Meu IP',
  'ping': 'Teste de Ping',
  'traceroute': 'Traceroute',
  'dns-lookup': 'DNS Lookup',
  'ip-geolocation': 'IP Geolocation',
  'port-scanner': 'Port Scanner',
  'ssl-checker': 'SSL Checker',
  'whois': 'WHOIS',
  'http-header-checker': 'HTTP Header Checker',
  'ip-reputation-checker': 'IP Reputation Checker',
};

// ──────────────────────────────────────────────
// Helpers de desenho
// ──────────────────────────────────────────────

function drawWatermark(doc) {
  doc.save();
  doc.fontSize(54);
  doc.fillColor(COLORS.border);
  doc.opacity(0.07);
  doc.translate(doc.page.width / 2, doc.page.height / 2);
  doc.rotate(-45, { origin: [0, 0] });
  doc.text('CONFIDENCIAL', -180, -20, { align: 'center' });
  doc.restore();
}

function drawHeader(doc, createdAt) {
  const hasLogo = fs.existsSync(LOGO_PATH);

  // Barra superior azul
  doc.rect(0, 0, doc.page.width, 4).fill(COLORS.accent);

  const headerY = 30;

  if (hasLogo) {
    doc.image(LOGO_PATH, 50, headerY, { height: 40 });
  }

  const titleX = hasLogo ? 100 : 50;
  doc.fontSize(22).fillColor(COLORS.primary).font('Helvetica-Bold');
  doc.text('NetCenter', titleX, headerY + 2);
  doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica');
  doc.text('Diagnóstico de Infraestrutura de Rede', titleX, headerY + 26);

  // Informações à direita
  const rightX = doc.page.width - 200;
  doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
  doc.text('Relatório gerado em:', rightX, headerY + 4, { width: 150, align: 'right' });
  doc.fontSize(9).fillColor(COLORS.text).font('Helvetica-Bold');
  doc.text(formatDate(createdAt), rightX, headerY + 16, { width: 150, align: 'right' });

  // Linha divisória do cabeçalho
  doc.moveTo(50, headerY + 50).lineTo(doc.page.width - 50, headerY + 50).lineWidth(0.5).strokeColor(COLORS.border).stroke();

  return headerY + 65;
}

function drawFooter(doc, pageNumber) {
  const y = doc.page.height - 40;
  doc.moveTo(50, y - 10).lineTo(doc.page.width - 50, y - 10).lineWidth(0.3).strokeColor(COLORS.border).stroke();
  doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica');
  doc.text('© NetCenter — Documento confidencial. Uso restrito à equipe autorizada.', 50, y, { width: doc.page.width - 100, align: 'left' });
  doc.text(`Página ${pageNumber}`, 50, y, { width: doc.page.width - 100, align: 'right' });
}

function sectionTitle(doc, title) {
  ensureSpace(doc, 40);
  const y = doc.y;
  doc.rect(50, y, 4, 18).fill(COLORS.accent);
  doc.fontSize(13).fillColor(COLORS.primary).font('Helvetica-Bold');
  doc.text(title, 62, y + 1);
  doc.moveDown(0.8);
}

function keyValue(doc, key, value, indent = 70) {
  ensureSpace(doc, 16);
  const y = doc.y;
  doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica-Bold');
  doc.text(key, indent, y, { continued: false });
  doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
  doc.text(String(value ?? 'N/A'), indent + 160, y, { width: doc.page.width - indent - 210 });
  doc.y = Math.max(doc.y, y + 14);
}

function ensureSpace(doc, needed) {
  if (doc.y + needed > doc.page.height - 60) {
    doc.addPage();
  }
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ──────────────────────────────────────────────
// Formatação por ferramenta
// ──────────────────────────────────────────────

function renderToolResult(doc, ferramenta, result) {
  sectionTitle(doc, `Resultado: ${TOOL_LABELS[ferramenta] || ferramenta}`);

  if (result.command) {
    ensureSpace(doc, 30);
    const cmdY = doc.y;
    doc.rect(70, cmdY, doc.page.width - 140, 22).fill('#f8fafc');
    doc.rect(70, cmdY, doc.page.width - 140, 22).lineWidth(0.3).strokeColor(COLORS.border).stroke();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Comando executado:', 78, cmdY + 3);
    doc.fontSize(9).fillColor(COLORS.dark).font('Courier');
    doc.text(result.command, 190, cmdY + 3, { width: doc.page.width - 250 });
    doc.y = cmdY + 28;
  }

  switch (ferramenta) {
    case 'meu-ip':
      renderMeuIp(doc, result);
      break;
    case 'ping':
    case 'traceroute':
      renderStdout(doc, result);
      break;
    case 'dns-lookup':
      renderDnsLookup(doc, result);
      break;
    case 'ip-geolocation':
      renderIpGeolocation(doc, result);
      break;
    case 'port-scanner':
      renderPortScanner(doc, result);
      break;
    case 'ssl-checker':
      renderSslChecker(doc, result);
      break;
    case 'whois':
      renderStdout(doc, result);
      break;
    case 'http-header-checker':
      renderHttpHeaders(doc, result);
      break;
    case 'ip-reputation-checker':
      renderIpReputation(doc, result);
      break;
    default:
      renderGeneric(doc, result);
  }

  doc.moveDown(0.5);
}

function renderMeuIp(doc, result) {
  if (result.details?.publicIp) {
    keyValue(doc, 'IP Público:', result.details.publicIp);
  }
  if (result.stdout) {
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
    doc.text(result.stdout, 70, doc.y, { width: doc.page.width - 140 });
  }
}

function renderStdout(doc, result) {
  const text = result.stdout || result.stderr || 'Nenhuma saída capturada.';
  const lines = text.split('\n');

  ensureSpace(doc, 30);
  doc.moveDown(0.3);

  for (const line of lines) {
    ensureSpace(doc, 12);
    doc.fontSize(8).fillColor(COLORS.text).font('Courier');
    doc.text(line, 70, doc.y, { width: doc.page.width - 140 });
  }

  if (result.exitCode !== undefined) {
    doc.moveDown(0.3);
    const color = result.exitCode === 0 ? COLORS.success : COLORS.danger;
    doc.fontSize(8).fillColor(color).font('Helvetica-Bold');
    doc.text(`Código de saída: ${result.exitCode}`, 70);
  }
}

function renderDnsLookup(doc, result) {
  const records = result.details;
  if (!Array.isArray(records) || records.length === 0) {
    doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Nenhum registro DNS encontrado.', 70);
    return;
  }

  drawTableHeader(doc, ['Tipo', 'Registros'], [80, doc.page.width - 200]);

  for (const item of records) {
    ensureSpace(doc, 16);
    const y = doc.y;
    const valStr = Array.isArray(item.records)
      ? item.records.map(r => typeof r === 'object' ? JSON.stringify(r) : String(r)).join(', ')
      : String(item.records);

    doc.fontSize(9).fillColor(COLORS.accent).font('Helvetica-Bold');
    doc.text(item.type, 80, y, { width: 60 });
    doc.fontSize(8).fillColor(COLORS.text).font('Courier');
    doc.text(valStr, 150, y, { width: doc.page.width - 220 });
    doc.y = Math.max(doc.y, y + 14);
    doc.moveTo(70, doc.y).lineTo(doc.page.width - 70, doc.y).lineWidth(0.2).strokeColor('#e2e8f0').stroke();
    doc.y += 2;
  }
}

function renderIpGeolocation(doc, result) {
  const d = result.details;
  if (!d || d.status !== 'success') {
    doc.fontSize(9).fillColor(COLORS.danger).font('Helvetica');
    doc.text(`Falha ao consultar geolocalização: ${d?.message || 'Erro'}`, 70);
    return;
  }

  keyValue(doc, 'IP de Consulta:', d.query);
  keyValue(doc, 'País:', d.country);
  keyValue(doc, 'Estado/Região:', d.regionName);
  keyValue(doc, 'Cidade:', d.city);
  keyValue(doc, 'CEP:', d.zip);
  keyValue(doc, 'Coordenadas:', `${d.lat}, ${d.lon}`);
  keyValue(doc, 'Provedor (ISP):', d.isp);
  keyValue(doc, 'Organização:', d.org);
  keyValue(doc, 'AS:', d.as);
}

function renderPortScanner(doc, result) {
  const ports = result.details;
  if (!Array.isArray(ports) || ports.length === 0) {
    doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Nenhuma porta escaneada.', 70);
    return;
  }

  const portMap = { 22: 'SSH', 80: 'HTTP', 443: 'HTTPS', 53: 'DNS', 8080: 'HTTP-Alt' };

  drawTableHeader(doc, ['Porta', 'Serviço', 'Status'], [80, 160, 280]);

  for (const item of ports) {
    ensureSpace(doc, 16);
    const y = doc.y;
    const service = portMap[item.port] || 'Desconhecido';
    const isOpen = item.status === 'open';

    doc.fontSize(9).fillColor(COLORS.text).font('Courier-Bold');
    doc.text(String(item.port), 80, y, { width: 60 });
    doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
    doc.text(service, 160, y, { width: 100 });

    doc.fontSize(8).fillColor(isOpen ? COLORS.success : COLORS.danger).font('Helvetica-Bold');
    doc.text(isOpen ? '● ABERTA' : '○ FECHADA', 280, y);

    doc.y = Math.max(doc.y, y + 14);
    doc.moveTo(70, doc.y).lineTo(doc.page.width - 70, doc.y).lineWidth(0.2).strokeColor('#e2e8f0').stroke();
    doc.y += 2;
  }
}

function renderSslChecker(doc, result) {
  const d = result.details;
  if (!d) {
    doc.fontSize(9).fillColor(COLORS.danger).font('Helvetica');
    doc.text('Não foi possível verificar o certificado SSL.', 70);
    return;
  }

  const isValid = d.authorized;
  const statusText = isValid ? 'VÁLIDO / CONFIÁVEL' : `INVÁLIDO: ${d.authorizationError || 'Não confiável'}`;
  const statusColor = isValid ? COLORS.success : COLORS.danger;

  ensureSpace(doc, 20);
  const badgeY = doc.y;
  doc.fontSize(10).fillColor(statusColor).font('Helvetica-Bold');
  doc.text(`[${statusText}]`, 70, badgeY);
  doc.moveDown(0.5);

  if (d.subject) {
    keyValue(doc, 'Domínio (CN):', d.subject.CN);
    keyValue(doc, 'Organização:', d.subject.O);
  }
  if (d.issuer) {
    keyValue(doc, 'Emissor:', `${d.issuer.O || 'N/A'} (${d.issuer.CN || 'N/A'})`);
  }
  keyValue(doc, 'Válido desde:', d.valid_from);
  keyValue(doc, 'Válido até:', d.valid_to);
  keyValue(doc, 'Fingerprint:', d.fingerprint);
  if (d.subjectaltname) {
    keyValue(doc, 'Nomes Alt (SAN):', d.subjectaltname);
  }
}

function renderHttpHeaders(doc, result) {
  const d = result.details;
  if (!d) {
    doc.fontSize(9).fillColor(COLORS.danger).font('Helvetica');
    doc.text('Não foi possível obter os cabeçalhos HTTP.', 70);
    return;
  }

  keyValue(doc, 'URL Acessada:', d.url);
  const statusColor = d.status >= 200 && d.status < 400 ? COLORS.success : COLORS.danger;
  ensureSpace(doc, 16);
  const y = doc.y;
  doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica-Bold');
  doc.text('Código Status:', 70, y);
  doc.fontSize(9).fillColor(statusColor).font('Helvetica-Bold');
  doc.text(String(d.status), 230, y);
  doc.y = y + 16;

  if (d.headers) {
    doc.moveDown(0.4);
    ensureSpace(doc, 20);
    doc.fontSize(10).fillColor(COLORS.primary).font('Helvetica-Bold');
    doc.text('Cabeçalhos Retornados:', 70);
    doc.moveDown(0.3);

    for (const [key, value] of Object.entries(d.headers)) {
      ensureSpace(doc, 14);
      const hy = doc.y;
      doc.fontSize(8).fillColor(COLORS.accent).font('Helvetica-Bold');
      doc.text(`${key}:`, 80, hy, { width: 160 });
      doc.fontSize(8).fillColor(COLORS.text).font('Courier');
      doc.text(value, 240, hy, { width: doc.page.width - 300 });
      doc.y = Math.max(doc.y, hy + 12);
    }
  }
}

function renderIpReputation(doc, result) {
  const d = result.details;
  if (!d) {
    doc.fontSize(9).fillColor(COLORS.danger).font('Helvetica');
    doc.text('Não foi possível verificar reputação.', 70);
    return;
  }

  keyValue(doc, 'Endereço IP:', d.ip);

  const isSafe = d.listedCount === 0;
  const statusText = isSafe ? 'REPUTAÇÃO BOA / LIMPO' : `RISCO DETECTADO (${d.listedCount} listas)`;
  const statusColor = isSafe ? COLORS.success : COLORS.danger;

  ensureSpace(doc, 20);
  const badgeY = doc.y;
  doc.fontSize(10).fillColor(statusColor).font('Helvetica-Bold');
  doc.text(`[${statusText}]`, 70, badgeY);
  doc.moveDown(0.6);

  if (Array.isArray(d.blacklist)) {
    drawTableHeader(doc, ['Lista (DNSBL)', 'Status'], [80, 300]);

    for (const item of d.blacklist) {
      ensureSpace(doc, 16);
      const y = doc.y;
      doc.fontSize(8).fillColor(COLORS.text).font('Courier');
      doc.text(item.dnsbl, 80, y, { width: 200 });

      const listed = item.listed;
      doc.fontSize(8).fillColor(listed ? COLORS.danger : COLORS.success).font('Helvetica-Bold');
      doc.text(listed ? '● LISTADO' : '○ LIMPO', 300, y);

      doc.y = Math.max(doc.y, y + 14);
      doc.moveTo(70, doc.y).lineTo(doc.page.width - 70, doc.y).lineWidth(0.2).strokeColor('#e2e8f0').stroke();
      doc.y += 2;
    }
  }
}

function renderGeneric(doc, result) {
  const text = result.stdout || result.stderr || JSON.stringify(result.details || {}, null, 2);
  doc.fontSize(8).fillColor(COLORS.text).font('Courier');
  doc.text(text, 70, doc.y, { width: doc.page.width - 140 });
}

function drawTableHeader(doc, cols, xPositions) {
  ensureSpace(doc, 22);
  const y = doc.y;
  doc.rect(70, y, doc.page.width - 140, 18).fill(COLORS.bgLight);
  doc.rect(70, y, doc.page.width - 140, 18).lineWidth(0.3).strokeColor(COLORS.border).stroke();

  for (let i = 0; i < cols.length; i++) {
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica-Bold');
    doc.text(cols[i], xPositions[i], y + 4);
  }
  doc.y = y + 22;
}

// ──────────────────────────────────────────────
// Controller principal
// ──────────────────────────────────────────────

export async function generateReport(req, res, next) {
  const { ferramenta, alvo } = req.body;

  if (!ferramenta || !alvo) {
    return res.status(400).json({ message: 'Ferramenta e alvo são obrigatórios.' });
  }

  try {
    // Executa a ferramenta de verdade e captura o resultado
    const toolResult = await executeToolInternal(ferramenta, alvo);

    const createdAtDate = new Date();
    const createdAt = createdAtDate.toISOString();
    const reportId = crypto.randomUUID();
    const pdfPath = path.join(REPORTS_DIR, `${reportId}.pdf`);
    const toolLabel = TOOL_LABELS[ferramenta] || ferramenta;

    // Conteúdo textual para salvar no banco de dados
    const contentLines = [
      `Relatório de Análise de Rede`,
      `Data: ${formatDate(createdAt)}`,
      `Usuário: ${req.user.name} <${req.user.email}>`,
      `Alvo: ${alvo}`,
      `Ferramenta utilizada: ${toolLabel}`,
      '',
      'Resultado da execução:',
      JSON.stringify(toolResult, null, 2),
    ];
    const content = contentLines.join('\n');

    // Criação do PDF profissional
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 90, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `Relatório NetCenter — ${toolLabel} — ${alvo}`,
        Author: `NetCenter (${req.user.name})`,
        Subject: 'Relatório de Análise de Rede',
        Creator: 'NetCenter PDF Generator',
      },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // ── Página 1: Capa ──────────────────────────
    const headerEnd = drawHeader(doc, createdAt);

    doc.y = headerEnd + 20;
    doc.fontSize(20).fillColor(COLORS.primary).font('Helvetica-Bold');
    doc.text('Relatório de Análise de Rede', 50, doc.y, { align: 'center', width: doc.page.width - 100 });
    doc.moveDown(1.2);

    // Caixa de resumo executivo
    ensureSpace(doc, 120);
    const boxY = doc.y;
    const boxH = 110;
    doc.rect(50, boxY, doc.page.width - 100, boxH).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.rect(50, boxY, doc.page.width - 100, 28).fill(COLORS.bgLight);
    doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold');
    doc.text('Resumo Executivo', 70, boxY + 7);

    let infoY = boxY + 36;
    const drawInfoRow = (label, value) => {
      doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica-Bold');
      doc.text(label, 70, infoY);
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
      doc.text(value, 230, infoY, { width: doc.page.width - 300 });
      infoY += 16;
    };

    drawInfoRow('Solicitante:', `${req.user.name} (${req.user.email})`);
    drawInfoRow('Alvo Analisado:', alvo);
    drawInfoRow('Ferramenta Utilizada:', toolLabel);
    drawInfoRow('Data de Execução:', formatDate(createdAt));

    doc.y = boxY + boxH + 15;

    // ── Resultado da ferramenta ──────────────────
    renderToolResult(doc, ferramenta, toolResult);

    // ── Aviso Legal ──────────────────────────────
    ensureSpace(doc, 80);
    doc.moveDown(1);
    doc.rect(50, doc.y, doc.page.width - 100, 0.5).fill(COLORS.border);
    doc.moveDown(0.5);
    doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica');
    doc.text(
      'AVISO LEGAL: Este relatório foi gerado automaticamente pela plataforma NetCenter e reflete o estado da rede no momento da execução. ' +
      'Os dados obtidos são informativos e não constituem auditoria formal de segurança. A distribuição deste documento é restrita à equipe autorizada. ' +
      'O uso indevido das informações contidas neste relatório é de responsabilidade do utilizador.',
      70, doc.y, { width: doc.page.width - 140, align: 'justify', lineGap: 2 }
    );

    // ── Marca d'água e rodapés em todas as páginas ─
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      drawWatermark(doc);
      drawFooter(doc, i + 1);
    }

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    await createReport({
      id: reportId,
      user_id: req.user.id,
      title: `Relatório: ${toolLabel} — ${alvo}`,
      ferramenta,
      alvo,
      content,
      pdf_path: `/reports/${reportId}.pdf`,
      created_at: createdAtDate,
    });

    res.status(201).json({
      id: reportId,
      title: `Relatório: ${toolLabel} — ${alvo}`,
      pdf_url: `/reports/${reportId}.pdf`,
      created_at: createdAtDate.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    next(error);
  }
}

export async function generateFullReport(req, res, next) {
  const { alvo } = req.body;

  if (!alvo) {
    return res.status(400).json({ message: 'O alvo é obrigatório para a análise completa.' });
  }

  try {
    const toolsToRun = [
      'ping', 'traceroute', 'dns-lookup', 'ip-geolocation', 
      'port-scanner', 'ssl-checker', 'whois', 'http-header-checker', 'ip-reputation-checker'
    ];

    // Executa as ferramentas em paralelo
    const promises = toolsToRun.map(ferramenta => executeToolInternal(ferramenta, alvo));
    const settled = await Promise.allSettled(promises);

    const results = {};
    const alerts = [];
    
    toolsToRun.forEach((ferramenta, index) => {
      if (settled[index].status === 'fulfilled') {
        const toolResult = settled[index].value;
        results[ferramenta] = toolResult;

        // Análise crítica
        if (ferramenta === 'port-scanner' && Array.isArray(toolResult.details)) {
          const openPorts = toolResult.details.filter(p => p.status === 'open');
          if (openPorts.length > 0) {
            alerts.push(`Portas abertas detectadas: ${openPorts.map(p => p.port).join(', ')}.`);
          }
        }
        if (ferramenta === 'ssl-checker' && toolResult.details) {
          if (!toolResult.details.authorized) {
            alerts.push(`[CRÍTICO] Certificado SSL inválido ou não confiável: ${toolResult.details.authorizationError}`);
          }
        }
        if (ferramenta === 'ip-reputation-checker' && toolResult.details) {
          if (toolResult.details.listedCount > 0) {
            alerts.push(`[CRÍTICO] IP listado em ${toolResult.details.listedCount} listas de reputação (DNSBL).`);
          }
        }
        if (ferramenta === 'http-header-checker' && toolResult.details) {
          if (toolResult.details.status >= 400) {
            alerts.push(`O servidor HTTP retornou código de erro ${toolResult.details.status}.`);
          }
        }
      } else {
        results[ferramenta] = { error: settled[index].reason.message || 'Falha na execução' };
        alerts.push(`Falha ao executar ferramenta ${TOOL_LABELS[ferramenta] || ferramenta}.`);
      }
    });

    const createdAtDate = new Date();
    const createdAt = createdAtDate.toISOString();
    const reportId = crypto.randomUUID();
    const pdfPath = path.join(REPORTS_DIR, `${reportId}.pdf`);

    // Criação do PDF
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 90, bottom: 60, left: 50, right: 50 },
      bufferPages: true,
      info: {
        Title: `Relatório Completo — ${alvo}`,
        Author: `NetCenter (${req.user.name})`,
        Subject: 'Relatório Completo de Análise de Rede',
        Creator: 'NetCenter PDF Generator',
      },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    // ── Página 1: Capa ──────────────────────────
    const headerEnd = drawHeader(doc, createdAt);

    doc.y = headerEnd + 20;
    doc.fontSize(20).fillColor(COLORS.primary).font('Helvetica-Bold');
    doc.text('Relatório de Análise Completa de Rede', 50, doc.y, { align: 'center', width: doc.page.width - 100 });
    doc.moveDown(1.2);

    ensureSpace(doc, 120);
    const boxY = doc.y;
    const boxH = 110;
    doc.rect(50, boxY, doc.page.width - 100, boxH).lineWidth(0.5).strokeColor(COLORS.border).stroke();
    doc.rect(50, boxY, doc.page.width - 100, 28).fill(COLORS.bgLight);
    doc.fontSize(11).fillColor(COLORS.primary).font('Helvetica-Bold');
    doc.text('Resumo Executivo', 70, boxY + 7);

    let infoY = boxY + 36;
    const drawInfoRow = (label, value) => {
      doc.fontSize(9).fillColor(COLORS.textLight).font('Helvetica-Bold');
      doc.text(label, 70, infoY);
      doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
      doc.text(value, 230, infoY, { width: doc.page.width - 300 });
      infoY += 16;
    };

    drawInfoRow('Solicitante:', `${req.user.name} (${req.user.email})`);
    drawInfoRow('Alvo Analisado:', alvo);
    drawInfoRow('Tipo de Análise:', 'Completa Automática (Todas as Ferramentas)');
    drawInfoRow('Data de Execução:', formatDate(createdAt));

    doc.y = boxY + boxH + 15;

    // ── Alertas Críticos ───────────────────────
    ensureSpace(doc, 40);
    const alertTitleY = doc.y;
    doc.rect(50, alertTitleY, 4, 18).fill(alerts.length > 0 ? COLORS.danger : COLORS.success);
    doc.fontSize(13).fillColor(COLORS.primary).font('Helvetica-Bold');
    doc.text('Análise Crítica e Alertas', 62, alertTitleY + 1);
    doc.moveDown(0.8);

    if (alerts.length === 0) {
      doc.fontSize(10).fillColor(COLORS.success).font('Helvetica-Bold');
      doc.text('Nenhum problema crítico ou alerta grave foi detectado durante a varredura.', 70, doc.y, { width: doc.page.width - 140 });
    } else {
      doc.fontSize(10).fillColor(COLORS.danger).font('Helvetica-Bold');
      doc.text('Atenção: Os seguintes pontos críticos foram identificados na infraestrutura do alvo:', 70, doc.y, { width: doc.page.width - 140 });
      doc.moveDown(0.5);
      
      for (const alert of alerts) {
        ensureSpace(doc, 14);
        doc.fontSize(9).fillColor(COLORS.dark).font('Helvetica-Bold');
        doc.text('•', 70, doc.y, { continued: false });
        doc.fontSize(9).fillColor(COLORS.text).font('Helvetica');
        doc.text(alert, 85, doc.y - 12, { width: doc.page.width - 150 });
        doc.y = doc.y + 2;
      }
    }
    
    doc.moveDown(2);

    // ── Resultados das Ferramentas ───────────────
    for (const ferramenta of toolsToRun) {
      const result = results[ferramenta];
      if (result.error) {
        sectionTitle(doc, `Resultado: ${TOOL_LABELS[ferramenta] || ferramenta}`);
        ensureSpace(doc, 20);
        doc.fontSize(9).fillColor(COLORS.danger).font('Helvetica');
        doc.text(`Erro durante a execução: ${result.error}`, 70);
        doc.moveDown();
      } else {
        renderToolResult(doc, ferramenta, result);
      }
    }

    // ── Parecer Técnico / Conclusão ───────────────
    doc.addPage();
    sectionTitle(doc, 'Parecer Técnico e Conclusão da Auditoria');
    ensureSpace(doc, 150);

    const hasAlerts = alerts.length > 0;
    doc.fontSize(10).fillColor(COLORS.text).font('Helvetica');
    
    let parecer = '';
    if (hasAlerts) {
      parecer = `Com base na auditoria automatizada realizada na infraestrutura alvo (${alvo}), concluímos que o ambiente apresenta RISCOS CRÍTICOS que exigem atenção imediata da equipe de segurança e redes.\n\n` +
                `Foram detectados ${alerts.length} ponto(s) de atenção de alto impacto durante a varredura global. Tais vulnerabilidades ou anomalias (detalhadas no início do documento) podem expor o ambiente a ameaças externas, interceptação de dados não-autorizada ou falhas sistêmicas de disponibilidade.\n\n` +
                `Recomendação Executiva: É imperativo que os serviços expostos sejam revisados com urgência. Sugere-se o fechamento e bloqueio de portas não essenciais via firewall perimetral, a regularização imediata da cadeia de certificados criptográficos e a investigação forense caso o endereço esteja listado em bases de ameaças globais (DNSBL). Recomenda-se a re-execução desta auditoria após a mitigação das falhas.`;
    } else {
      parecer = `Com base na auditoria automatizada realizada na infraestrutura alvo (${alvo}), concluímos que o ambiente apresenta uma postura de rede SÓLIDA e ESTÁVEL sob a perspectiva das ferramentas de diagnóstico perimetral empregadas.\n\n` +
                `Não foram identificadas anomalias críticas, portas administrativas ou perigosas expostas indevidamente, falhas de integridade na criptografia SSL/TLS, tampouco alertas de má reputação em bases globais (DNSBL). Os serviços visíveis aparentam estar configurados em conformidade com as diretrizes recomendadas de segurança de perímetro.\n\n` +
                `Recomendação Executiva: Embora os indicadores externos sejam amplamente positivos, ressalta-se que a resiliência cibernética exige avaliação contínua. Recomendamos a adoção de rotinas periódicas de diagnóstico através desta plataforma, além do acoplamento de varreduras internas autenticadas (Grey-box/White-box) para garantir a governança e conformidade a longo prazo.`;
    }

    doc.text(parecer, 70, doc.y, {
      width: doc.page.width - 140,
      align: 'justify',
      lineGap: 5
    });
    
    // Assinatura automatizada
    doc.moveDown(4);
    doc.fontSize(10).fillColor(COLORS.textLight).font('Helvetica-Bold');
    doc.text('____________________________________________________', 0, doc.y, { align: 'center', width: doc.page.width });
    doc.moveDown(0.5);
    doc.text('NetCenter Automated Analysis Engine', { align: 'center', width: doc.page.width });
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Relatório Gerado e Validado Eletronicamente', { align: 'center', width: doc.page.width });

    doc.moveDown(2);

    // ── Aviso Legal ──────────────────────────────
    ensureSpace(doc, 80);
    doc.moveDown(1);
    doc.rect(50, doc.y, doc.page.width - 100, 0.5).fill(COLORS.border);
    doc.moveDown(0.5);
    doc.fontSize(7).fillColor(COLORS.textLight).font('Helvetica');
    doc.text(
      'AVISO LEGAL: Este relatório foi gerado automaticamente pela plataforma NetCenter e reflete o estado da rede no momento da execução. ' +
      'Os dados obtidos são informativos e não constituem auditoria formal de segurança. A distribuição deste documento é restrita à equipe autorizada. ' +
      'O uso indevido das informações contidas neste relatório é de responsabilidade do utilizador.',
      70, doc.y, { width: doc.page.width - 140, align: 'justify', lineGap: 2 }
    );

    // ── Marca d'água e rodapés ─────────────────
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      drawWatermark(doc);
      drawFooter(doc, i + 1);
    }

    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    const contentLines = [
      `Relatório de Análise Completa de Rede`,
      `Data: ${formatDate(createdAt)}`,
      `Usuário: ${req.user.name} <${req.user.email}>`,
      `Alvo: ${alvo}`,
      '',
      `Alertas Críticos: ${alerts.length > 0 ? alerts.join(' | ') : 'Nenhum problema grave'}`,
      'Resultados foram armazenados no PDF em anexo.'
    ];

    await createReport({
      id: reportId,
      user_id: req.user.id,
      title: `Relatório Completo — ${alvo}`,
      ferramenta: 'analise-completa',
      alvo,
      content: contentLines.join('\n'),
      pdf_path: `/reports/${reportId}.pdf`,
      created_at: createdAtDate,
    });

    res.status(201).json({
      id: reportId,
      title: `Relatório Completo — ${alvo}`,
      pdf_url: `/reports/${reportId}.pdf`,
      created_at: createdAtDate.toISOString(),
    });
  } catch (error) {
    console.error('Erro ao gerar relatório completo:', error);
    next(error);
  }
}

export async function listReports(req, res, next) {
  try {
    const reports = await getReportsByUser(req.user.id);
    res.json(reports);
  } catch (error) {
    next(error);
  }
}

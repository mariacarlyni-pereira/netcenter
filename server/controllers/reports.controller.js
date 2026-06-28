import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createReport, getReportsByUser } from '../models/reports.model.js';
import { getAllFerramentas } from '../models/ferramentas.model.js';

const REPORTS_DIR = path.join(process.cwd(), 'reports');

function buildReportContent(user, ferramenta, alvo, ferramentas) {
  const createdAt = new Date().toISOString();
  const contentLines = [
    `Relatório de Análise de Rede - ${createdAt}`,
    `Usuário: ${user.name} <${user.email}>`,
    `Alvo: ${alvo}`,
    `Ferramenta de lançamento: ${ferramenta}`,
    '',
    'Resumo dos testes realizados:',
  ];

  for (const tool of ferramentas) {
    contentLines.push(`- ${tool.nome} (${tool.id}): ${tool.descricao}`);
  }

  contentLines.push('', 'Resultados simulados:');
  contentLines.push(`* Execução de testes de conectividade no alvo ${alvo}.`);
  contentLines.push(`* Coleta de informações de DNS e presença de certificados SSL.`);
  contentLines.push(`* Verificação de reputação de IP, portas abertas e resolução de DNS.`);
  contentLines.push(`* Análise de caminho de rede utilizando traceroute e ping.`);

  return { content: contentLines.join('\n'), createdAt };
}

export async function generateReport(req, res, next) {
  const { ferramenta, alvo } = req.body;

  if (!ferramenta || !alvo) {
    return res.status(400).json({ message: 'Ferramenta e alvo são obrigatórios.' });
  }

  try {
    const ferramentas = await getAllFerramentas();
    const { content, createdAt } = buildReportContent(req.user, ferramenta, alvo, ferramentas);
    const createdAtDate = new Date();
    const reportId = crypto.randomUUID();
    const pdfPath = path.join(REPORTS_DIR, `${reportId}.pdf`);

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    doc.fontSize(20).text('Relatório de Análise de Rede', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(content, { lineGap: 4 });
    doc.end();

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    await createReport({
      id: reportId,
      user_id: req.user.id,
      title: `Relatório completo de ${alvo}`,
      ferramenta,
      alvo,
      content,
      pdf_path: `/reports/${reportId}.pdf`,
      created_at: createdAtDate,
    });

    res.status(201).json({ id: reportId, title: `Relatório completo de ${alvo}`, pdf_url: `/reports/${reportId}.pdf`, created_at: createdAtDate.toISOString() });
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
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

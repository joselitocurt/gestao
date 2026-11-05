import { STATUS, apenasDigitos, formatBRL, formatCpf, formatData, formatEmissao } from '@/lib/fiscal';
import { carregarLogoPdf, desenharLogo } from '@/lib/logoPdf';

// Relatório das notas de um lote (A4 paisagem).
const M = 32;
const LARGURA = 842;
const COLUNAS = [
  { chave: 'nf', titulo: 'NF / SÉRIE', x: M, w: 62 },
  { chave: 'emissor', titulo: 'EMISSOR', x: M + 66, w: 108 },
  { chave: 'destinatario', titulo: 'DESTINATÁRIO', x: M + 178, w: 130 },
  { chave: 'uf', titulo: 'UF', x: M + 312, w: 22 },
  { chave: 'emissao', titulo: 'EMISSÃO', x: M + 338, w: 54 },
  { chave: 'valor', titulo: 'VALOR NOTA', x: M + 460, alinhar: 'right' },
  { chave: 'difal', titulo: 'DIFAL', x: M + 530, alinhar: 'right' },
  { chave: 'fcop', titulo: 'FCOP', x: M + 590, alinhar: 'right' },
  { chave: 'guia', titulo: 'GUIA', x: M + 660, alinhar: 'right' },
  { chave: 'status', titulo: 'STATUS', x: M + 668, w: 52 },
  { chave: 'pagamento', titulo: 'PAGAMENTO', x: M + 722, w: 56 },
];

// Chave de acesso: só os 44 dígitos, sem espaços.
const formatarChave = (chave) => apenasDigitos(chave) || '—';

const cortar = (doc, texto, largura) => {
  let t = String(texto ?? '');
  if (!largura || doc.getTextWidth(t) <= largura) return t;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > largura) t = t.slice(0, -1);
  return `${t}…`;
};

export async function baixarPdfLote({ notas, titulo, emissorDe, observacao, confirmacao }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const agora = new Date();

  const texto = (valor, x, y, { size = 8, negrito = false, cinza = false, alinhar = 'left' } = {}) => {
    doc.setFont('helvetica', negrito ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(cinza ? 110 : 20, cinza ? 116 : 27, cinza ? 128 : 45);
    doc.text(String(valor ?? ''), x, y, { align: alinhar });
  };
  const linha = (y) => {
    doc.setDrawColor(222, 226, 233);
    doc.setLineWidth(0.5);
    doc.line(M, y, LARGURA - M, y);
  };

  const cabecalhoTabela = (y) => {
    COLUNAS.forEach((c) => texto(c.titulo, c.x, y, { size: 7, negrito: true, cinza: true, alinhar: c.alinhar }));
    linha(y + 6);
    return y + 18;
  };

  const logo = await carregarLogoPdf();
  if (logo) desenharLogo(doc, logo, LARGURA - M - 130, 24, 130);
  texto('Gestão DIFAL', M, 40, { size: 9, negrito: true, cinza: true });
  texto(titulo, M, 62, { size: 16, negrito: true });
  if (confirmacao) {
    const quando = `${confirmacao.em.toLocaleDateString('pt-BR')} às ${confirmacao.em.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    texto(`Lote confirmado em ${quando}${confirmacao.responsavel ? ` por ${confirmacao.responsavel}` : ''}`, M, 108, { size: 8, negrito: true });
  }
  texto(
    `Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    LARGURA - M,
    logo ? 80 : 40,
    { size: 8, cinza: true, alinhar: 'right' },
  );

  const soma = notas.reduce(
    (acc, n) => {
      const difal = Number(n.valor_difal) || 0;
      const fcop = Number(n.valor_fcop) || 0;
      acc.valor += Number(n.valor_total) || 0;
      acc.difal += difal;
      acc.fcop += fcop;
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    },
    { valor: 0, difal: 0, fcop: 0 },
  );
  const totalGuias = soma.difal + soma.fcop;
  texto(
    `${notas.length} nota(s)  |  DIFAL ${formatBRL(soma.difal)}  |  FCOP ${formatBRL(soma.fcop)}  |  Total das guias ${formatBRL(totalGuias)}`,
    M,
    80,
    { size: 9 },
  );
  texto(
    `A emitir: ${soma.a_emitir || 0}   Emitidas: ${soma.emitido || 0}   Pagas: ${soma.pago || 0}${observacao ? `   ${observacao}` : ''}`,
    M,
    94,
    { size: 8, cinza: true },
  );

  let y = cabecalhoTabela(confirmacao ? 132 : 120);
  notas.forEach((n) => {
    if (y > 548) {
      doc.addPage();
      y = cabecalhoTabela(48);
    }
    const guia = (Number(n.valor_difal) || 0) + (Number(n.valor_fcop) || 0);
    const valores = {
      nf: `${n.numero || '—'} / ${n.serie || '—'}`,
      emissor: emissorDe(n),
      destinatario: n.destinatario_nome || '—',
      uf: n.destinatario_uf || '—',
      emissao: formatEmissao(n),
      valor: formatBRL(n.valor_total),
      difal: formatBRL(n.valor_difal),
      fcop: formatBRL(n.valor_fcop),
      guia: formatBRL(guia),
      status: STATUS[n.status]?.label || 'A emitir',
      pagamento: n.data_pagamento ? formatData(n.data_pagamento) : '—',
    };
    COLUNAS.forEach((c) => {
      doc.setFont('helvetica', c.chave === 'guia' ? 'bold' : 'normal');
      doc.setFontSize(8);
      texto(cortar(doc, valores[c.chave], c.w), c.x, y, { negrito: c.chave === 'guia', alinhar: c.alinhar });
    });
    // Segunda linha: chave de acesso e CPF do destinatário.
    const linhaChave = `Chave de acesso: ${formatarChave(n.chave_acesso)}`;
    texto(linhaChave, M, y + 11, { size: 7, cinza: true });
    if (n.destinatario_cpf) {
      doc.setFontSize(7);
      const x = Math.max(M + 312, M + doc.getTextWidth(linhaChave) + 18);
      texto(`CPF do destinatário: ${formatCpf(n.destinatario_cpf)}`, x, y + 11, { size: 7, cinza: true });
    }
    doc.setDrawColor(236, 239, 244);
    doc.setLineWidth(0.4);
    doc.line(M, y + 17, LARGURA - M, y + 17);
    y += 29;
  });

  linha(y - 10);
  texto('Total', M, y + 4, { negrito: true });
  texto(formatBRL(soma.valor), M + 460, y + 4, { negrito: true, alinhar: 'right' });
  texto(formatBRL(soma.difal), M + 530, y + 4, { negrito: true, alinhar: 'right' });
  texto(formatBRL(soma.fcop), M + 590, y + 4, { negrito: true, alinhar: 'right' });
  texto(formatBRL(totalGuias), M + 660, y + 4, { negrito: true, alinhar: 'right' });

  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i += 1) {
    doc.setPage(i);
    texto(`Página ${i} de ${paginas}`, LARGURA - M, 580, { size: 7, cinza: true, alinhar: 'right' });
  }

  const data = agora.toISOString().slice(0, 10);
  doc.save(`${confirmacao ? 'lote-confirmado' : 'lote'}-${data}-${notas.length}-notas.pdf`);
}

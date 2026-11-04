import { formatBRL } from '@/lib/fiscal';
import { carregarLogoPdf, desenharLogo } from '@/lib/logoPdf';

const MARGEM = 40;
const DIREITA = 555;
const COL = { notas: 340, difal: 415, fcop: 480, total: DIREITA };

const escrever = (doc, valor, x, y, { align = 'left', size = 9, negrito = false, cinza = false } = {}) => {
  doc.setFont('helvetica', negrito ? 'bold' : 'normal');
  doc.setFontSize(size);
  const tom = cinza ? 110 : 28;
  doc.setTextColor(tom, cinza ? tom : 43, cinza ? tom : 38);
  doc.text(String(valor ?? ''), x, y, { align });
};

const linha = (doc, y) => {
  doc.setDrawColor(224, 221, 214);
  doc.setLineWidth(0.5);
  doc.line(MARGEM, y, DIREITA, y);
};

const cortar = (texto, limite = 58) => {
  const t = String(texto ?? '');
  return t.length > limite ? `${t.slice(0, limite - 1)}…` : t;
};

const tabela = (doc, estado, { titulo, coluna, linhas, rodape }) => {
  let y = estado.y;
  if (y > 690) {
    doc.addPage();
    y = 60;
  }

  escrever(doc, titulo, MARGEM, y, { size: 11, negrito: true });
  y += 16;
  escrever(doc, coluna.toUpperCase(), MARGEM, y, { size: 8, negrito: true, cinza: true });
  escrever(doc, 'NOTAS', COL.notas, y, { align: 'right', size: 8, negrito: true, cinza: true });
  escrever(doc, 'DIFAL', COL.difal, y, { align: 'right', size: 8, negrito: true, cinza: true });
  escrever(doc, 'FCOP', COL.fcop, y, { align: 'right', size: 8, negrito: true, cinza: true });
  escrever(doc, 'TOTAL', COL.total, y, { align: 'right', size: 8, negrito: true, cinza: true });
  y += 6;
  linha(doc, y);
  y += 13;

  linhas.forEach((l) => {
    if (y > 790) {
      doc.addPage();
      y = 60;
    }
    escrever(doc, cortar(l.rotulo), MARGEM, y, { size: 9 });
    escrever(doc, l.notas, COL.notas, y, { align: 'right', size: 9 });
    escrever(doc, formatBRL(l.difal), COL.difal, y, { align: 'right', size: 9 });
    escrever(doc, formatBRL(l.fcop), COL.fcop, y, { align: 'right', size: 9 });
    escrever(doc, formatBRL(l.total), COL.total, y, { align: 'right', size: 9, negrito: true });
    y += 14;
  });

  linha(doc, y - 5);
  escrever(doc, rodape.rotulo, MARGEM, y + 9, { size: 9, negrito: true });
  escrever(doc, rodape.notas, COL.notas, y + 9, { align: 'right', size: 9, negrito: true });
  escrever(doc, formatBRL(rodape.difal), COL.difal, y + 9, { align: 'right', size: 9, negrito: true });
  escrever(doc, formatBRL(rodape.fcop), COL.fcop, y + 9, { align: 'right', size: 9, negrito: true });
  escrever(doc, formatBRL(rodape.total), COL.total, y + 9, { align: 'right', size: 9, negrito: true });
  estado.y = y + 40;
};

export const nomeArquivoConsolidado = (periodo) =>
  `consolidado-${String(periodo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;

export const baixarPdfConsolidado = async ({ periodo, totais, linhasUf, linhasCnpj }) => {
  // Carregado só na hora de exportar, para não pesar no carregamento das páginas.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const emAberto = totais.total - totais.pago;

  desenharLogo(doc, await carregarLogoPdf(), DIREITA - 120, 34, 120);
  escrever(doc, 'Consolidado DIFAL + FCOP', MARGEM, 58, { size: 17, negrito: true });
  escrever(doc, periodo, MARGEM, 76, { size: 10, cinza: true });
  escrever(doc, `Total das guias: ${formatBRL(totais.total)}`, MARGEM, 104, { size: 11, negrito: true });
  escrever(
    doc,
    `DIFAL ${formatBRL(totais.difal)}  ·  FCOP ${formatBRL(totais.fcop)}  ·  Pago ${formatBRL(totais.pago)}  ·  Em aberto ${formatBRL(emAberto)}`,
    MARGEM,
    120,
    { size: 9, cinza: true },
  );
  escrever(doc, `${totais.notas} notas · ${totais.cnpjs} CNPJs · ${totais.ufs} UFs de destino`, MARGEM, 134, {
    size: 9,
    cinza: true,
  });

  const estado = { y: 166 };
  tabela(doc, estado, {
    titulo: 'Por UF de destino',
    coluna: 'UF destino',
    linhas: linhasUf,
    rodape: { rotulo: 'Total', ...totais },
  });
  tabela(doc, estado, {
    titulo: 'Por CNPJ emissor',
    coluna: 'CNPJ',
    linhas: linhasCnpj,
    rodape: { rotulo: 'Total', ...totais },
  });

  doc.save(`${nomeArquivoConsolidado(periodo)}.pdf`);
};

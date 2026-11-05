import { STATUS, apenasDigitos } from '@/lib/fiscal';

// Planilha .xlsx com as notas selecionadas (biblioteca carregada só na hora de exportar).
const data = (valor) => {
  if (!valor) return null;
  const [a, m, d] = String(valor).slice(0, 10).split('-').map(Number);
  return a && m && d ? new Date(Date.UTC(a, m - 1, d)) : null;
};

const COLUNAS = [
  { header: 'NF', key: 'numero', width: 10 },
  { header: 'Série', key: 'serie', width: 7 },
  // Texto: senão o Excel mostra os 44 dígitos em notação científica.
  { header: 'Chave de acesso', key: 'chave', width: 48, style: { numFmt: '@' } },
  { header: 'CNPJ emissor', key: 'cnpj', width: 17, style: { numFmt: '@' } },
  { header: 'Emissor', key: 'emissor', width: 30 },
  { header: 'Destinatário', key: 'destinatario', width: 30 },
  { header: 'CPF destinatário', key: 'cpf', width: 15, style: { numFmt: '@' } },
  { header: 'UF destino', key: 'uf', width: 10 },
  { header: 'Data de emissão', key: 'emissao', width: 14, style: { numFmt: 'dd/mm/yyyy' } },
  { header: 'Valor da nota', key: 'valor', width: 15, style: { numFmt: '#,##0.00' } },
  { header: 'DIFAL', key: 'difal', width: 13, style: { numFmt: '#,##0.00' } },
  { header: 'FCOP', key: 'fcop', width: 13, style: { numFmt: '#,##0.00' } },
  { header: 'Total da guia', key: 'guia', width: 14, style: { numFmt: '#,##0.00' } },
  { header: 'Status', key: 'status', width: 11 },
  { header: 'Data do pagamento', key: 'pagamento', width: 17, style: { numFmt: 'dd/mm/yyyy' } },
];

export async function baixarExcelNotas({ notas, emissorDe, nomeArquivo }) {
  const { default: ExcelJS } = await import('exceljs');
  const livro = new ExcelJS.Workbook();
  livro.creator = 'Gestão DIFAL · Controlar.io';
  livro.created = new Date();
  const aba = livro.addWorksheet('Notas', { views: [{ state: 'frozen', ySplit: 1 }] });
  aba.columns = COLUNAS;

  notas.forEach((n) => {
    const difal = Number(n.valor_difal) || 0;
    const fcop = Number(n.valor_fcop) || 0;
    aba.addRow({
      numero: n.numero || '',
      serie: n.serie || '',
      chave: apenasDigitos(n.chave_acesso),
      cnpj: apenasDigitos(n.emitente_cnpj),
      emissor: emissorDe(n),
      destinatario: n.destinatario_nome || '',
      cpf: apenasDigitos(n.destinatario_cpf),
      uf: n.destinatario_uf || '',
      emissao: data(n.data_emissao),
      valor: Number(n.valor_total) || 0,
      difal,
      fcop,
      guia: difal + fcop,
      status: STATUS[n.status]?.label || 'A emitir',
      pagamento: data(n.data_pagamento),
    });
  });

  // Totais com fórmulas, para continuarem certos se a planilha for filtrada ou editada.
  const ultima = notas.length + 1;
  const total = aba.addRow({ numero: 'Total' });
  const somas = notas.reduce(
    (acc, n) => {
      acc.J += Number(n.valor_total) || 0;
      acc.K += Number(n.valor_difal) || 0;
      acc.L += Number(n.valor_fcop) || 0;
      acc.M += (Number(n.valor_difal) || 0) + (Number(n.valor_fcop) || 0);
      return acc;
    },
    { J: 0, K: 0, L: 0, M: 0 },
  );
  ['J', 'K', 'L', 'M'].forEach((col) => {
    // O resultado já calculado aparece mesmo em visualizadores que não recalculam fórmulas.
    total.getCell(col).value = { formula: `SUBTOTAL(9,${col}2:${col}${ultima})`, result: Math.round(somas[col] * 100) / 100 };
    total.getCell(col).numFmt = '#,##0.00';
  });
  total.font = { bold: true };
  total.border = { top: { style: 'thin', color: { argb: 'FF14213D' } } };

  const cabecalho = aba.getRow(1);
  cabecalho.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecalho.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14213D' } };
  cabecalho.alignment = { vertical: 'middle' };
  cabecalho.height = 20;
  aba.autoFilter = { from: 'A1', to: `O${ultima}` };

  const buffer = await livro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

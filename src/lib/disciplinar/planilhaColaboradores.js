import { SITUACOES, cpfValido, mascaraCpf, normalizar, somenteDigitos } from '@shared/disciplinar.js';
import { baixarBlob } from '@/lib/disciplinar/arquivos';

// Importação de colaboradores em lote: modelo .xlsx, leitura (.xlsx ou .csv) e validação.

export const COLUNAS = [
  { chave: 'matricula', titulo: 'Matrícula *', largura: 14, exemplo: '1001', ajuda: 'Obrigatória e única. Se já existir, o cadastro é atualizado.' },
  { chave: 'nome', titulo: 'Nome completo *', largura: 36, exemplo: 'Maria da Silva Santos', ajuda: 'Obrigatório.' },
  { chave: 'cpf', titulo: 'CPF', largura: 17, exemplo: '529.982.247-25', ajuda: 'Opcional. Com ou sem pontos; precisa ser um CPF válido e único.' },
  { chave: 'funcao', titulo: 'Função', largura: 26, exemplo: 'Auxiliar administrativo', ajuda: 'Opcional.' },
  { chave: 'departamento', titulo: 'Departamento', largura: 22, exemplo: 'Administrativo', ajuda: 'Opcional.' },
  { chave: 'admissao', titulo: 'Admissão', largura: 14, exemplo: '15/03/2024', ajuda: 'Opcional. Data no formato dd/mm/aaaa.' },
  { chave: 'status', titulo: 'Situação', largura: 14, exemplo: 'Ativo', ajuda: 'Ativo, Afastado ou Demitido. Em branco = Ativo.' },
];

// Cabeçalhos aceitos (sem acento e caixa), para planilhas que não vieram do modelo.
const APELIDOS = {
  matricula: ['matricula', 'matricula *', 'mat', 'registro'],
  nome: ['nome', 'nome completo', 'nome completo *', 'colaborador', 'funcionario'],
  cpf: ['cpf'],
  funcao: ['funcao', 'cargo'],
  departamento: ['departamento', 'depto', 'setor'],
  admissao: ['admissao', 'data de admissao', 'data admissao'],
  status: ['situacao', 'status'],
};
const chaveDoCabecalho = (texto) => {
  const t = normalizar(texto).replace(/\s+/g, ' ').trim();
  return Object.keys(APELIDOS).find((k) => APELIDOS[k].includes(t)) || null;
};

export async function baixarModelo() {
  const { default: ExcelJS } = await import('exceljs');
  const livro = new ExcelJS.Workbook();
  livro.creator = 'Gestão Disciplinar · Controlar.io';
  const aba = livro.addWorksheet('Colaboradores', { views: [{ state: 'frozen', ySplit: 1 }] });
  aba.columns = COLUNAS.map((c) => ({ header: c.titulo, key: c.chave, width: c.largura, style: { numFmt: '@' } }));
  aba.addRow(Object.fromEntries(COLUNAS.map((c) => [c.chave, c.exemplo])));
  const cab = aba.getRow(1);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14213D' } };
  cab.height = 20;
  cab.alignment = { vertical: 'middle' };
  COLUNAS.forEach((c, i) => {
    // Sem comentários nas células: alguns editores salvam comentários que a leitura não aceita.
    const celula = cab.getCell(i + 1);
    if (c.titulo.endsWith('*')) celula.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA67708' } };
  });
  // Lista suspensa da Situação nas linhas de preenchimento (uma regra para o intervalo todo).
  aba.dataValidations.add('G2:G5000', {
    type: 'list',
    allowBlank: true,
    formulae: ['"Ativo,Afastado,Demitido"'],
    showErrorMessage: true,
    errorTitle: 'Situação inválida',
    error: 'Use Ativo, Afastado ou Demitido.',
  });

  const instr = livro.addWorksheet('Instruções');
  instr.columns = [
    { header: 'Coluna', key: 'col', width: 20 },
    { header: 'Como preencher', key: 'ajuda', width: 70 },
  ];
  COLUNAS.forEach((c) => instr.addRow({ col: c.titulo, ajuda: c.ajuda }));
  instr.addRow({});
  instr.addRow({ col: 'Observações', ajuda: 'Preencha uma linha por colaborador na aba "Colaboradores". A linha de exemplo pode ser apagada ou substituída.' });
  instr.addRow({ col: '', ajuda: 'Colunas marcadas com * são obrigatórias. Antes de gravar, o sistema mostra uma prévia com os erros de cada linha.' });
  instr.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instr.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14213D' } };

  const buffer = await livro.xlsx.writeBuffer();
  baixarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    'modelo_importacao_colaboradores.xlsx',
  );
}

const pad = (n) => String(n).padStart(2, '0');

// Valor de célula do ExcelJS → texto (datas em AAAA-MM-DD).
function textoDaCelula(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  if (typeof v === 'object') {
    if ('result' in v) return textoDaCelula(v.result);
    if ('text' in v) return String(v.text);
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    return '';
  }
  return String(v).trim();
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd ou número de série do Excel. Devolve AAAA-MM-DD, '' ou null (inválida). */
export function lerData(texto) {
  const t = String(texto || '').trim();
  if (!t) return '';
  let a;
  let m;
  let d;
  let r = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (r) [, d, m, a] = r.map(Number);
  else if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t))) [, a, m, d] = r.map(Number);
  else if (/^\d{4,5}(\.\d+)?$/.test(t)) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86400000);
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  } else return null;
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${a}-${pad(m)}-${pad(d)}`;
}

function linhasCsv(texto) {
  const primeira = texto.split(/\r?\n/)[0] || '';
  const sep = (primeira.match(/;/g) || []).length >= (primeira.match(/,/g) || []).length ? ';' : ',';
  const linhas = [];
  let campo = '';
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i += 1;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

/** Lê a planilha e devolve as linhas brutas: [{ numero, matricula, nome, ... }]. */
export async function lerPlanilha(arquivo) {
  const nome = arquivo.name.toLowerCase();
  let matriz;
  if (nome.endsWith('.csv')) {
    matriz = linhasCsv((await arquivo.text()).replace(/^﻿/, ''));
  } else if (nome.endsWith('.xlsx')) {
    const { default: ExcelJS } = await import('exceljs');
    const livro = new ExcelJS.Workbook();
    await livro.xlsx.load(await arquivo.arrayBuffer());
    const aba = livro.getWorksheet('Colaboradores') || livro.worksheets[0];
    if (!aba) throw new Error('A planilha está vazia.');
    matriz = [];
    aba.eachRow({ includeEmpty: true }, (row, n) => {
      const valores = [];
      for (let c = 1; c <= Math.max(row.cellCount, 7); c += 1) valores.push(textoDaCelula(row.getCell(c).value));
      matriz[n - 1] = valores;
    });
  } else if (nome.endsWith('.xls')) {
    throw new Error('Arquivos .xls (Excel 97-2003) não são lidos. No Excel, use "Salvar como" > Pasta de Trabalho do Excel (.xlsx), ou baixe o modelo.');
  } else {
    throw new Error('Envie uma planilha .xlsx (ou .csv).');
  }

  const cabecalho = (matriz[0] || []).map(chaveDoCabecalho);
  if (!cabecalho.includes('matricula') || !cabecalho.includes('nome')) {
    throw new Error('Não encontrei as colunas "Matrícula" e "Nome completo" na primeira linha. Use o arquivo modelo.');
  }
  const saida = [];
  matriz.slice(1).forEach((valores, i) => {
    if (!valores || !valores.some((v) => String(v || '').trim())) return;
    const item = { numero: i + 2 };
    cabecalho.forEach((chave, c) => {
      if (chave) item[chave] = String(valores[c] ?? '').trim();
    });
    saida.push(item);
  });
  return saida;
}

/**
 * Valida as linhas contra o cadastro atual.
 * Cada resultado: { numero, dados, acao: 'novo' | 'atualizar' | 'erro', erros: [], existente }.
 */
export function validarLinhas(linhas, colaboradores) {
  const porMatricula = new Map(colaboradores.map((c) => [normalizar(c.matricula), c]));
  const vistosMat = new Map();
  const vistosCpf = new Map();
  return linhas.map((l) => {
    const erros = [];
    const matricula = String(l.matricula || '').trim();
    const nome = String(l.nome || '').trim();
    const cpfTexto = String(l.cpf || '').trim();
    const admissao = lerData(l.admissao);
    const situacaoTexto = String(l.status || '').trim();
    const status = situacaoTexto ? SITUACOES.find((s) => normalizar(s) === normalizar(situacaoTexto)) : 'Ativo';
    const existente = porMatricula.get(normalizar(matricula)) || null;

    if (!matricula) erros.push('matrícula vazia');
    if (!nome) erros.push('nome vazio');
    if (matricula && vistosMat.has(normalizar(matricula))) erros.push(`matrícula repetida na linha ${vistosMat.get(normalizar(matricula))}`);
    if (cpfTexto && !cpfValido(cpfTexto)) erros.push('CPF inválido');
    const cpf = cpfTexto ? somenteDigitos(cpfTexto) : '';
    if (cpf && cpfValido(cpfTexto)) {
      if (vistosCpf.has(cpf)) erros.push(`CPF repetido na linha ${vistosCpf.get(cpf)}`);
      const outro = colaboradores.find((c) => somenteDigitos(c.cpf) === cpf && c.id !== existente?.id);
      if (outro) erros.push(`CPF já cadastrado para ${outro.nome} (mat. ${outro.matricula})`);
    }
    if (admissao === null) erros.push('data de admissão inválida');
    if (!status) erros.push('situação deve ser Ativo, Afastado ou Demitido');
    if (matricula) vistosMat.set(normalizar(matricula), l.numero);
    if (cpf) vistosCpf.set(cpf, l.numero);

    const dados = {
      matricula,
      nome,
      cpf: cpf && cpfValido(cpfTexto) ? mascaraCpf(cpf) : '',
      funcao: String(l.funcao || '').trim(),
      departamento: String(l.departamento || '').trim(),
      admissao: admissao || null,
      status: status || 'Ativo',
    };
    return { numero: l.numero, dados, existente, erros, acao: erros.length ? 'erro' : existente ? 'atualizar' : 'novo' };
  });
}

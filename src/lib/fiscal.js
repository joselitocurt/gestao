export const STATUS = {
  a_emitir: { label: 'A emitir', tone: 'pendente' },
  emitido: { label: 'Emitida', tone: 'emitido' },
  pago: { label: 'Pago', tone: 'pago' },
};

export const STATUS_OPTIONS = Object.entries(STATUS).map(([value, v]) => ({
  value,
  label: v.label,
}));

export const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const formatBRL = (value) =>
  (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const apenasDigitos = (value) => String(value || '').replace(/\D/g, '');

export const formatCnpj = (value) =>
  apenasDigitos(value).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

export const formatCpf = (value) =>
  apenasDigitos(value).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');

export const formatData = (value) => {
  if (!value) return '—';
  const [ano, mes, dia] = String(value).slice(0, 10).split('-');
  if (!dia) return '—';
  return `${dia}/${mes}/${ano}`;
};

export const formatEmissao = (nota) => {
  if (nota?.data_emissao) return formatData(nota.data_emissao);
  if (nota?.ano && nota?.mes) return `${String(nota.mes).padStart(2, '0')}/${nota.ano}`;
  return '—';
};

export const totalGuia = (nota) => (Number(nota?.valor_difal) || 0) + (Number(nota?.valor_fcop) || 0);

export const nomeEmitente = (emitente) =>
  emitente?.apelido || emitente?.razao_social || formatCnpj(emitente?.cnpj) || 'Sem nome';

// Matriz primeiro, depois ordem alfabética (mesma ordenação usada em todas as telas).
export const ordenarEmitentes = (itens) =>
  [...itens].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'matriz' ? -1 : 1;
    return nomeEmitente(a).localeCompare(nomeEmitente(b));
  });

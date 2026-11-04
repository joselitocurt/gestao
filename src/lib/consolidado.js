// Cálculos do Consolidado. Os filtros são cruzados: cada gráfico usa todos os filtros
// menos o da própria dimensão, para mostrar o item escolhido em destaque entre os demais.
import { MESES, formatCnpj, nomeEmitente, totalGuia } from '@/lib/fiscal';

export const CORES = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const valores = (nota) => {
  const difal = Number(nota.valor_difal) || 0;
  const fcop = Number(nota.valor_fcop) || 0;
  return { difal, fcop, total: difal + fcop };
};

/** Aplica os filtros de CNPJ, ano, mês e UF, exceto o da dimensão em `ignorar`. */
export function filtrar(notas, { cnpj, ano, mes, uf }, ignorar) {
  return notas.filter(
    (n) =>
      (ignorar === 'cnpj' || !cnpj || n.emitente_cnpj === cnpj) &&
      (ignorar === 'ano' || !ano || Number(n.ano) === ano) &&
      (ignorar === 'mes' || !mes || Number(n.mes) === mes) &&
      (ignorar === 'uf' || !uf || n.destinatario_uf === uf),
  );
}

export function totais(notas) {
  const t = { notas: 0, difal: 0, fcop: 0, total: 0, pago: 0, emitido: 0, a_emitir: 0 };
  const cnpjs = new Set();
  const ufs = new Set();
  for (const n of notas) {
    const v = valores(n);
    t.notas += 1;
    t.difal += v.difal;
    t.fcop += v.fcop;
    t.total += v.total;
    t[n.status === 'pago' || n.status === 'emitido' ? n.status : 'a_emitir'] += v.total;
    cnpjs.add(n.emitente_cnpj);
    ufs.add(n.destinatario_uf);
  }
  return { ...t, cnpjs: cnpjs.size, ufs: ufs.size };
}

/** Linha do tempo mensal. Com ano escolhido, mostra os 12 meses; sem ano, todos os meses com notas. */
export function serieMensal(notas, ano) {
  const mapa = new Map();
  if (ano) {
    MES_CURTO.forEach((rotulo, i) => mapa.set(`${ano}-${i + 1}`, { mes: i + 1, ano, rotulo, difal: 0, fcop: 0, total: 0, notas: 0 }));
  }
  for (const n of notas) {
    const a = Number(n.ano);
    const m = Number(n.mes);
    if (!a || !m) continue;
    const chave = `${a}-${m}`;
    if (!mapa.has(chave)) {
      mapa.set(chave, { mes: m, ano: a, rotulo: `${MES_CURTO[m - 1]}/${String(a).slice(2)}`, difal: 0, fcop: 0, total: 0, notas: 0 });
    }
    const item = mapa.get(chave);
    const v = valores(n);
    item.difal += v.difal;
    item.fcop += v.fcop;
    item.total += v.total;
    item.notas += 1;
  }
  return [...mapa.values()].sort((x, y) => x.ano - y.ano || x.mes - y.mes);
}

/** Ranking agrupado por um campo da nota, do maior total para o menor. */
export function ranking(notas, campo, rotular = (c) => c) {
  const mapa = new Map();
  for (const n of notas) {
    const chave = n[campo] || '—';
    const item = mapa.get(chave) || { chave, notas: 0, difal: 0, fcop: 0, total: 0, pago: 0 };
    const v = valores(n);
    item.notas += 1;
    item.difal += v.difal;
    item.fcop += v.fcop;
    item.total += v.total;
    if (n.status === 'pago') item.pago += v.total;
    mapa.set(chave, item);
  }
  return [...mapa.values()]
    .map((item) => ({ ...item, ...rotular(item.chave) }))
    .sort((a, b) => b.total - a.total || b.notas - a.notas);
}

export const rotuladorCnpj = (emitentes) => (cnpj) => {
  const e = emitentes.find((x) => x.cnpj === cnpj);
  return {
    rotulo: e ? nomeEmitente(e) : formatCnpj(cnpj) || 'Sem emissor',
    detalhe: e ? `${e.tipo === 'matriz' ? 'Matriz' : 'Filial'} em ${e.uf}` : 'Fora do cadastro',
  };
};

/** Dados do gráfico empilhado UF × CNPJ e as séries (uma por CNPJ). */
export function matrizUfCnpj(notas, linhasCnpj) {
  const series = linhasCnpj.map((l, i) => ({ key: l.chave, label: l.rotulo, color: CORES[i % CORES.length] }));
  const porUf = new Map();
  for (const n of notas) {
    const uf = n.destinatario_uf || '—';
    const ponto = porUf.get(uf) || { uf, _total: 0 };
    const v = totalGuia(n);
    ponto[n.emitente_cnpj] = (ponto[n.emitente_cnpj] || 0) + v;
    ponto._total += v;
    porUf.set(uf, ponto);
  }
  const grafico = [...porUf.values()].sort((a, b) => b._total - a._total);
  return { series, grafico };
}

/** Texto do período e dos filtros, usado no subtítulo e nos arquivos exportados. */
export function descreverFiltros({ ano, mes, cnpj, uf }, emitentes) {
  const periodo = mes ? `${MESES[mes - 1]}${ano ? ` de ${ano}` : ', todos os anos'}` : ano ? `Ano de ${ano}` : 'Todos os períodos';
  const partes = [periodo];
  if (cnpj) partes.push(rotuladorCnpj(emitentes)(cnpj).rotulo);
  if (uf) partes.push(`UF ${uf}`);
  return partes.join(', ');
}

/**
 * Acompanhamento por ano: quantidade e valor por status (pago, emitida, a emitir).
 * `metrica` define o valor somado: 'guia' (DIFAL + FCOP) ou 'nota' (valor total da nota).
 */
export function porAno(notas, metrica = 'guia') {
  const vazio = () => ({ notas: 0, valor: 0 });
  const mapa = new Map();
  for (const n of notas) {
    const ano = Number(n.ano) || Number(String(n.data_emissao || '').slice(0, 4)) || 0;
    if (!ano) continue;
    const linha = mapa.get(ano) || { ano, pago: vazio(), emitido: vazio(), a_emitir: vazio(), total: vazio() };
    const status = n.status === 'pago' || n.status === 'emitido' ? n.status : 'a_emitir';
    const valor = metrica === 'nota' ? Number(n.valor_total) || 0 : valores(n).total;
    linha[status].notas += 1;
    linha[status].valor += valor;
    linha.total.notas += 1;
    linha.total.valor += valor;
    mapa.set(ano, linha);
  }
  return [...mapa.values()].sort((a, b) => b.ano - a.ano);
}

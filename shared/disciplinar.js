// Módulo II — Gestão Disciplinar: regras da progressão disciplinar (site e servidor).
//
// Cada colaborador tem um fluxo por motivo. Um ciclo começa na primeira punição do motivo
// e dura 12 meses; dentro do ciclo, a próxima punição sugere o nível seguinte. Depois que o
// ciclo termina, a próxima punição daquele motivo recomeça em "Advertência verbal".

export const NIVEIS = [
  null,
  { n: 1, nome: 'Advertência verbal', curto: 'Verbal' },
  { n: 2, nome: 'Advertência escrita 1', curto: 'Escrita 1' },
  { n: 3, nome: 'Advertência escrita 2', curto: 'Escrita 2' },
  { n: 4, nome: 'Advertência escrita 3', curto: 'Escrita 3' },
  { n: 5, nome: 'Suspensão', curto: 'Suspensão' },
  { n: 6, nome: 'Demissão', curto: 'Demissão' },
];

export const SITUACOES = ['Ativo', 'Afastado', 'Demitido'];

export const MOTIVOS_PADRAO = [
  'Atraso',
  'Falta injustificada',
  'Insubordinação',
  'Uso de celular',
  'Não uso de EPI',
  'Conduta inadequada',
  'Descumprimento de procedimento',
];

const hoje = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
export const dataHoje = hoje;

/** Último dia do ciclo de 12 meses iniciado em `inicio` (AAAA-MM-DD). */
export function fimDoCiclo(inicio) {
  const [a, m, d] = inicio.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1 + 12, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export const ordenarPunicoes = (lista) =>
  lista
    .slice()
    .sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.created_date || '').localeCompare(b.created_date || ''));

/** Ciclos de um colaborador em um motivo: [{ inicio, fim, punicoes }]. */
export function ciclos(punicoes, colaboradorId, motivoId, excluirId) {
  const lista = ordenarPunicoes(
    punicoes.filter((p) => p.colaborador_id === colaboradorId && p.motivo_id === motivoId && p.id !== excluirId),
  );
  const saida = [];
  let atual = null;
  for (const p of lista) {
    if (!atual || p.data > atual.fim) {
      atual = { inicio: p.data, fim: fimDoCiclo(p.data), punicoes: [] };
      saida.push(atual);
    }
    atual.punicoes.push(p);
  }
  return saida;
}

/** Situação do fluxo numa data: nível atual (0 = nenhum) e o ciclo aberto. */
export function fluxoEm(punicoes, colaboradorId, motivoId, referencia = hoje(), excluirId) {
  const cs = ciclos(punicoes, colaboradorId, motivoId, excluirId);
  const ciclo = cs.find((c) => c.inicio <= referencia && referencia <= c.fim) || null;
  if (!ciclo) return { nivel: 0, ciclo: null, ciclos: cs };
  const nivel = Math.max(0, ...ciclo.punicoes.filter((p) => p.data <= referencia).map((p) => Number(p.nivel) || 0));
  return { nivel, ciclo, ciclos: cs };
}

export const cicloDa = (punicoes, p) =>
  ciclos(punicoes, p.colaborador_id, p.motivo_id).find((c) => c.punicoes.some((x) => x.id === p.id)) || null;

/** Fluxos de um colaborador (um por motivo), do nível mais alto para o mais baixo. */
export function fluxosDo(punicoes, colaboradorId, nomeMotivo = (id) => id) {
  const ids = [...new Set(punicoes.filter((p) => p.colaborador_id === colaboradorId).map((p) => p.motivo_id))];
  return ids
    .map((motivoId) => ({ motivoId, ...fluxoEm(punicoes, colaboradorId, motivoId) }))
    .sort((a, b) => b.nivel - a.nivel || String(nomeMotivo(a.motivoId)).localeCompare(String(nomeMotivo(b.motivoId))));
}

/** Próximo nível sugerido (1 a 6) para colaborador + motivo na data. */
export const nivelSugerido = (punicoes, colaboradorId, motivoId, data) =>
  Math.min(6, fluxoEm(punicoes, colaboradorId, motivoId, data).nivel + 1);

/** Próxima referência do ano: AD-AAAA-NNN. */
export function sugerirReferencia(punicoes, data) {
  const ano = (data || hoje()).slice(0, 4);
  let maior = 0;
  for (const p of punicoes) {
    const m = /^AD-(\d{4})-(\d+)$/.exec(p.referencia || '');
    if (m && m[1] === ano) maior = Math.max(maior, Number(m[2]));
  }
  return `AD-${ano}-${String(maior + 1).padStart(3, '0')}`;
}

export const somenteDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function cpfValido(v) {
  const c = somenteDigitos(v);
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i += 1) s += Number(c[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i += 1) s += Number(c[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(c[10]);
}

export function mascaraCpf(v) {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

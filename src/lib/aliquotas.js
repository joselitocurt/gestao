import { api } from '@/api/client';
import { calcularDifal } from '@shared/difal.js';

// Cadastro de alíquotas (27 UFs), carregado uma vez e reaproveitado entre as páginas.
let cache = null;

export async function carregarAliquotas({ recarregar = false } = {}) {
  if (cache && !recarregar) return cache;
  const itens = await api.entities.Aliquota.list({ sort: 'uf' });
  cache = Object.fromEntries(itens.map((a) => [a.uf, a]));
  return cache;
}

export const limparCacheAliquotas = () => {
  cache = null;
};

/** Cálculo da nota com as alíquotas atuais (para a memória de cálculo e prévias na tela). */
export function calcularNota(nota, aliquotas, ufEmitente) {
  return calcularDifal({
    valor: nota.valor_total,
    ufOrigem: nota.emitente_uf || ufEmitente || null,
    ufDestino: nota.destinatario_uf,
    aliquota: aliquotas?.[nota.destinatario_uf],
    importada: Boolean(nota.importada),
    semFcp: Boolean(nota.sem_fcp),
  });
}

export const formatPct = (n) =>
  n === null || n === undefined ? '—' : `${Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;

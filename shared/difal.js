// Cálculo do DIFAL "por fora" (base única) para venda interestadual a consumidor final
// não contribuinte. Usado no servidor (valores calculados de cada nota) e no site
// (memória de cálculo). Mesma regra da calculadora "DIFAL ICMS + FCP".
//
//   DIFAL = valor da operação × (alíquota interna do destino − alíquota interestadual)
//   FCP   = valor da operação × alíquota do FCP do destino
//   Total = DIFAL + FCP              (cada valor arredondado em 2 casas)

// Alíquotas gerais por UF (em %), usadas como padrão do cadastro de Alíquotas.
export const ALIQUOTAS_PADRAO = [
  { uf: 'AC', nome: 'Acre', regiao: 'Norte', interna: 19, fcp: 0 },
  { uf: 'AM', nome: 'Amazonas', regiao: 'Norte', interna: 20, fcp: 2 },
  { uf: 'AP', nome: 'Amapá', regiao: 'Norte', interna: 18, fcp: 0 },
  { uf: 'PA', nome: 'Pará', regiao: 'Norte', interna: 19, fcp: 0 },
  { uf: 'RO', nome: 'Rondônia', regiao: 'Norte', interna: 19.5, fcp: 2 },
  { uf: 'RR', nome: 'Roraima', regiao: 'Norte', interna: 20, fcp: 2 },
  { uf: 'TO', nome: 'Tocantins', regiao: 'Norte', interna: 20, fcp: 2 },
  { uf: 'AL', nome: 'Alagoas', regiao: 'Nordeste', interna: 20.5, fcp: 2 },
  { uf: 'BA', nome: 'Bahia', regiao: 'Nordeste', interna: 20.5, fcp: 2 },
  { uf: 'CE', nome: 'Ceará', regiao: 'Nordeste', interna: 20, fcp: 2 },
  { uf: 'MA', nome: 'Maranhão', regiao: 'Nordeste', interna: 23, fcp: 2 },
  { uf: 'PB', nome: 'Paraíba', regiao: 'Nordeste', interna: 20, fcp: 2 },
  { uf: 'PE', nome: 'Pernambuco', regiao: 'Nordeste', interna: 20.5, fcp: 2 },
  { uf: 'PI', nome: 'Piauí', regiao: 'Nordeste', interna: 22.5, fcp: 2 },
  { uf: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste', interna: 20, fcp: 2 },
  { uf: 'SE', nome: 'Sergipe', regiao: 'Nordeste', interna: 19, fcp: 2 },
  { uf: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste', interna: 20, fcp: 2 },
  { uf: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste', interna: 19, fcp: 2 },
  { uf: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste', interna: 17, fcp: 2 },
  { uf: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste', interna: 17, fcp: 2 },
  { uf: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste', interna: 17, fcp: 2 },
  { uf: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste', interna: 18, fcp: 2 },
  { uf: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste', interna: 20, fcp: 2 },
  { uf: 'SP', nome: 'São Paulo', regiao: 'Sudeste', interna: 18, fcp: 2 },
  { uf: 'PR', nome: 'Paraná', regiao: 'Sul', interna: 19.5, fcp: 2 },
  { uf: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul', interna: 17, fcp: 2 },
  { uf: 'SC', nome: 'Santa Catarina', regiao: 'Sul', interna: 17, fcp: 0 },
];

export const REGIOES = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

// Sul e Sudeste, exceto o Espírito Santo.
export const SUL_SUDESTE_EXCETO_ES = ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS'];

export const INTERESTADUAL = { reduzida: 7, geral: 12, importada: 4 };

/** Alíquota interestadual (%) de origem → destino; null quando é operação interna. */
export function aliquotaInterestadual(origem, destino, importada = false) {
  if (!origem || !destino || origem === destino) return null;
  if (importada) return INTERESTADUAL.importada;
  const sulSudeste = (uf) => SUL_SUDESTE_EXCETO_ES.includes(uf);
  return sulSudeste(origem) && !sulSudeste(destino) ? INTERESTADUAL.reduzida : INTERESTADUAL.geral;
}

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const pct = (n) => Number(n) || 0;

/**
 * Calcula DIFAL e FCP de uma operação.
 * @param {object} p
 * @param {number} p.valor        valor da operação (base de cálculo) — valor total da nota
 * @param {string} p.ufOrigem     UF do emissor
 * @param {string} p.ufDestino    UF do destinatário
 * @param {object} p.aliquota     linha do cadastro da UF de destino ({ interna, fcp })
 * @param {boolean} [p.importada] mercadoria importada (interestadual de 4%)
 * @param {boolean} [p.semFcp]    produto não sujeito a FCP no destino
 */
export function calcularDifal({ valor, ufOrigem, ufDestino, aliquota, importada = false, semFcp = false }) {
  const base = r2(Number(valor) || 0);
  const vazio = { calculado: false, base, interestadual: null, interna: null, aliqFcp: null, diferenca: 0, difal: 0, fcp: 0, total: 0 };
  if (!ufOrigem || !ufDestino) return { ...vazio, motivo: 'UF de origem ou de destino não informada.' };
  if (ufOrigem === ufDestino) return { ...vazio, motivo: 'Operação interna (mesma UF): não há DIFAL.' };
  if (!aliquota) return { ...vazio, motivo: `Sem alíquota cadastrada para ${ufDestino}.` };

  const interestadual = aliquotaInterestadual(ufOrigem, ufDestino, importada);
  const interna = pct(aliquota.interna);
  const aliqFcp = semFcp ? 0 : pct(aliquota.fcp);
  const diferenca = Math.max(0, Math.round((interna - interestadual) * 10000) / 10000);
  const difal = r2((base * diferenca) / 100);
  const fcp = r2((base * aliqFcp) / 100);
  return {
    calculado: true,
    motivo: diferenca > 0 ? null : 'A alíquota interna não é maior que a interestadual: não há DIFAL.',
    base,
    interestadual,
    interna,
    aliqFcp,
    diferenca,
    difal,
    fcp,
    total: r2(difal + fcp),
  };
}

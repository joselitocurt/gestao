// Cálculo automático do DIFAL por fora em cada nota fiscal (ver shared/difal.js).
import { db } from './db.js';
import { calcularDifal } from '../shared/difal.js';

const aliquotaDe = (uf) => (uf ? db.prepare('SELECT interna, fcp FROM aliquota WHERE uf = ?').get(uf) : null);

const ufDoEmitente = (cnpj) =>
  cnpj ? db.prepare('SELECT uf FROM emitente WHERE cnpj = ? LIMIT 1').get(cnpj)?.uf || null : null;

/** Campos calculados de uma nota (dados completos da nota, já no formato do banco). */
export function camposCalculados(nota) {
  const ufOrigem = nota.emitente_uf || ufDoEmitente(nota.emitente_cnpj);
  const r = calcularDifal({
    valor: nota.valor_total,
    ufOrigem,
    ufDestino: nota.destinatario_uf,
    aliquota: aliquotaDe(nota.destinatario_uf),
    importada: Boolean(nota.importada),
    semFcp: Boolean(nota.sem_fcp),
  });
  return {
    difal_calculado: r.difal,
    fcop_calculado: r.fcp,
    aliq_interestadual: r.interestadual,
    aliq_interna: r.interna,
    aliq_fcp: r.aliqFcp,
  };
}

// Campos da nota que mudam o resultado do cálculo.
export const CAMPOS_DO_CALCULO = ['valor_total', 'emitente_uf', 'emitente_cnpj', 'destinatario_uf', 'importada', 'sem_fcp'];

/**
 * Recalcula as notas ainda "A emitir" (as emitidas mantêm o cálculo da época da emissão).
 * Sem `ufs`, recalcula todas; com `semCalculo`, só as que nunca foram calculadas.
 */
export function recalcularNotas({ ufs = null, semCalculo = false } = {}) {
  const condicoes = [];
  const params = [];
  if (semCalculo) condicoes.push('difal_calculado IS NULL');
  else condicoes.push("status = 'a_emitir'");
  if (ufs?.length) {
    condicoes.push(`destinatario_uf IN (${ufs.map(() => '?').join(', ')})`);
    params.push(...ufs);
  }
  const notas = db.prepare(`SELECT * FROM nota_fiscal WHERE ${condicoes.join(' AND ')}`).all(...params);
  if (!notas.length) return 0;
  db.transaction(() => {
    for (const nota of notas) {
      const c = camposCalculados(nota);
      db.prepare(
        `UPDATE nota_fiscal SET difal_calculado = @difal_calculado, fcop_calculado = @fcop_calculado,
           aliq_interestadual = @aliq_interestadual, aliq_interna = @aliq_interna, aliq_fcp = @aliq_fcp WHERE id = @id`,
      ).run({ ...c, id: nota.id });
    }
  })();
  return notas.length;
}

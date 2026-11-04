// Traduz o filtro usado pelo frontend (mesmo formato do SDK do Base44:
// igualdade, $regex, $in, $gte/$lte, $or...) para SQL parametrizado.

import { ErroValidacao } from './entidades.js';

const escaparLike = (texto) => String(texto).replace(/[\\%_]/g, (c) => `\\${c}`);

const valorSql = (valor) => {
  if (typeof valor === 'boolean') return valor ? 1 : 0;
  if (valor === null || ['string', 'number'].includes(typeof valor)) return valor;
  throw new ErroValidacao('Valor de filtro inválido');
};

export function montarWhere(filtro, camposValidos) {
  const params = [];

  const condicao = (campo, valor) => {
    if (!camposValidos.has(campo)) throw new ErroValidacao(`Campo de filtro desconhecido: ${campo}`);
    const col = `"${campo}"`;

    if (valor === null) return `${col} IS NULL`;
    if (typeof valor !== 'object' || Array.isArray(valor)) {
      if (Array.isArray(valor)) throw new ErroValidacao('Use $in para listas');
      params.push(valorSql(valor));
      return `${col} = ?`;
    }

    const partes = [];
    for (const [op, v] of Object.entries(valor)) {
      switch (op) {
        case '$eq':
          if (v === null) partes.push(`${col} IS NULL`);
          else {
            params.push(valorSql(v));
            partes.push(`${col} = ?`);
          }
          break;
        case '$ne':
          if (v === null) partes.push(`${col} IS NOT NULL`);
          else {
            params.push(valorSql(v));
            partes.push(`(${col} IS NULL OR ${col} <> ?)`);
          }
          break;
        case '$gt':
        case '$gte':
        case '$lt':
        case '$lte': {
          const sinal = { $gt: '>', $gte: '>=', $lt: '<', $lte: '<=' }[op];
          params.push(valorSql(v));
          partes.push(`${col} ${sinal} ?`);
          break;
        }
        case '$in':
        case '$nin': {
          if (!Array.isArray(v)) throw new ErroValidacao(`${op} precisa de uma lista`);
          if (!v.length) {
            partes.push(op === '$in' ? '0' : '1');
            break;
          }
          v.forEach((item) => params.push(valorSql(item)));
          partes.push(`${col} ${op === '$in' ? 'IN' : 'NOT IN'} (${v.map(() => '?').join(', ')})`);
          break;
        }
        case '$regex':
          // No app o $regex é usado como "contém" (busca pelo número da nota).
          params.push(`%${escaparLike(v)}%`);
          partes.push(`${col} LIKE ? ESCAPE '\\'`);
          break;
        default:
          throw new ErroValidacao(`Operador não suportado: ${op}`);
      }
    }
    return partes.length ? partes.join(' AND ') : '1';
  };

  const grupo = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new ErroValidacao('Filtro inválido');
    const partes = [];
    for (const [chave, valor] of Object.entries(obj)) {
      if (chave === '$or' || chave === '$and') {
        if (!Array.isArray(valor)) throw new ErroValidacao(`${chave} precisa de uma lista`);
        if (!valor.length) continue;
        const sub = valor.map((item) => `(${grupo(item)})`);
        partes.push(`(${sub.join(chave === '$or' ? ' OR ' : ' AND ')})`);
      } else {
        partes.push(condicao(chave, valor));
      }
    }
    return partes.length ? partes.join(' AND ') : '1';
  };

  const sql = grupo(filtro || {});
  return { sql, params };
}

export function montarOrdem(sort, camposValidos) {
  if (!sort) return 'ORDER BY created_date DESC';
  const desc = sort.startsWith('-');
  const campo = desc ? sort.slice(1) : sort;
  if (!camposValidos.has(campo)) throw new ErroValidacao(`Campo de ordenação desconhecido: ${campo}`);
  return `ORDER BY "${campo}" ${desc ? 'DESC' : 'ASC'}, id ASC`;
}

// Monta a consulta de notas a partir dos filtros (mesmas regras da página de Apuração).
// O período considera a data de emissão ou, na falta dela, os campos mês/ano da nota.
export function filtroPeriodo({ cnpj, mes, ano, uf }) {
  const base = {};
  if (cnpj) base.emitente_cnpj = cnpj;
  if (uf) base.destinatario_uf = uf;

  const porAnoMes = {};
  if (mes) porAnoMes.mes = mes;
  if (ano) porAnoMes.ano = ano;

  const mm = mes ? String(mes).padStart(2, '0') : null;
  let porData = null;
  if (ano && mm) {
    const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
    porData = { $gte: `${ano}-${mm}-01`, $lte: `${ano}-${mm}-${ultimoDia}` };
  } else if (ano) {
    porData = { $gte: `${ano}-01-01`, $lte: `${ano}-12-31` };
  }
  if (porData || mes) {
    base.$or = [...(porData ? [{ data_emissao: porData }] : []), ...(mes || ano ? [porAnoMes] : [])];
  }
  return base;
}

export function filtroLista(filtros) {
  const filtro = filtroPeriodo(filtros);
  const termo = (filtros.busca || '').trim();
  if (termo) filtro.numero = { $regex: termo };
  if (filtros.status) filtro.status = filtros.status;
  return filtro;
}

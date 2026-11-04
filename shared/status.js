// Status automático da nota fiscal, usado no site e no servidor:
// - com data de pagamento → "pago";
// - com valor de DIFAL ou FCOP → "emitido" (guia emitida);
// - sem nada disso → "a_emitir".
export function statusAutomatico({ valor_difal, valor_fcop, data_pagamento } = {}) {
  if (data_pagamento) return 'pago';
  if ((Number(valor_difal) || 0) > 0 || (Number(valor_fcop) || 0) > 0) return 'emitido';
  return 'a_emitir';
}

// Campos que, quando alterados, recalculam o status.
export const CAMPOS_DO_STATUS = ['valor_difal', 'valor_fcop', 'data_pagamento'];

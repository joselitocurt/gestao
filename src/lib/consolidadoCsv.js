import { nomeArquivoConsolidado } from '@/lib/consolidadoPdf';

const numero = (valor) => (Number(valor) || 0).toFixed(2).replace('.', ',');

const celula = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

export const baixarCsvConsolidado = ({ periodo, totais, linhasUf, linhasCnpj, series, grafico, anual }) => {
  const linhas = [];
  const add = (...celulas) => linhas.push(celulas.map(celula).join(';'));

  add('Consolidado DIFAL + FCOP', periodo);
  add();
  add('Resumo', 'Notas', 'DIFAL', 'FCOP', 'Total', 'Pago', 'Em aberto');
  add(
    periodo,
    totais.notas,
    numero(totais.difal),
    numero(totais.fcop),
    numero(totais.total),
    numero(totais.pago),
    numero(totais.total - totais.pago),
  );
  add();

  if (anual?.length) {
    add('Acompanhamento por ano (valor das guias)', '', '', '', '', '', '', '', '');
    add('Ano', 'Emitidas (qtd)', 'Emitidas (valor)', 'A emitir (qtd)', 'A emitir (valor)', 'Pagas (qtd)', 'Pagas (valor)', 'Total (qtd)', 'Total (valor)');
    anual.forEach((l) =>
      add(l.ano, l.emitido.notas, numero(l.emitido.valor), l.a_emitir.notas, numero(l.a_emitir.valor), l.pago.notas, numero(l.pago.valor), l.total.notas, numero(l.total.valor)),
    );
    add();
  }

  add('Por UF de destino', '', '', '', '');
  add('UF destino', 'Notas', 'DIFAL', 'FCOP', 'Total');
  linhasUf.forEach((l) => add(l.rotulo, l.notas, numero(l.difal), numero(l.fcop), numero(l.total)));
  add('Total', totais.notas, numero(totais.difal), numero(totais.fcop), numero(totais.total));
  add();

  add('Por CNPJ emissor', '', '', '', '');
  add('CNPJ', 'Notas', 'DIFAL', 'FCOP', 'Total');
  linhasCnpj.forEach((l) => add(l.rotulo, l.notas, numero(l.difal), numero(l.fcop), numero(l.total)));
  add('Total', totais.notas, numero(totais.difal), numero(totais.fcop), numero(totais.total));
  add();

  if (series?.length && grafico?.length) {
    add('Valor da guia por UF destino e CNPJ', '', '');
    add('UF destino', ...series.map((s) => s.label), 'Total');
    grafico.forEach((ponto) => {
      const valores = series.map((s) => Number(ponto[s.key]) || 0);
      add(
        ponto.uf,
        ...valores.map(numero),
        numero(valores.reduce((a, v) => a + v, 0)),
      );
    });
  }

  const blob = new Blob([`﻿${linhas.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomeArquivoConsolidado(periodo)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

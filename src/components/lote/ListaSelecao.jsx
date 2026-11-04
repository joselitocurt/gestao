import React from 'react';
import { FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import StatusBadge from '@/components/notas/StatusBadge';
import { formatBRL, formatData, formatEmissao, totalGuia } from '@/lib/fiscal';
import { cn } from '@/lib/utils';

// Classes escritas por extenso para o Tailwind encontrá-las.
const COLUNAS = 'grid-cols-[36px_110px_minmax(0,1fr)_86px_100px_90px_80px_96px_104px_86px]';
const COLUNAS_LG = 'lg:grid-cols-[36px_110px_minmax(0,1fr)_86px_100px_90px_80px_96px_104px_86px]';

const Vazio = ({ filtrado }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
      <FileText className="h-5 w-5" />
    </span>
    <p className="mt-4 font-display text-lg">{filtrado ? 'Nenhuma nota com esses filtros' : 'Nenhuma nota cadastrada'}</p>
    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
      {filtrado ? 'Volte algum filtro para "Todos" para ver mais notas.' : 'Importe os XMLs ou cadastre notas para montar um lote.'}
    </p>
  </div>
);

/** Lista de notas com caixa de seleção em cada linha (clicar na linha também marca). */
export default function ListaSelecao({ notas, carregando, selecionadas, onAlternar, onAlternarPagina, emissorDe, filtrado }) {
  const marcadasNaPagina = notas.filter((n) => selecionadas.has(n.id)).length;
  const todasMarcadas = notas.length > 0 && marcadasNaPagina === notas.length;
  const estadoCabecalho = todasMarcadas ? true : marcadasNaPagina ? 'indeterminate' : false;

  return (
    <div className="painel mt-3 overflow-hidden">
      {carregando ? (
        <div className="divide-y divide-border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
              <div className="h-3 flex-1 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      ) : !notas.length ? (
        <Vazio filtrado={filtrado} />
      ) : (
        <>
          <div
            className={`hidden ${COLUNAS} items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground lg:grid`}
          >
            <Checkbox
              checked={estadoCabecalho}
              onCheckedChange={() => onAlternarPagina(!todasMarcadas)}
              aria-label={todasMarcadas ? 'Desmarcar as notas listadas' : 'Marcar todas as notas listadas'}
            />
            <span>NF</span>
            <span>Destinatário</span>
            <span>Emissão</span>
            <span className="text-right">Valor da nota</span>
            <span className="text-right">DIFAL</span>
            <span className="text-right">FCOP</span>
            <span className="text-right">Guia</span>
            <span>Status</span>
            <span>Pago em</span>
          </div>

          {/* Celular: cabeçalho só com "marcar todas" */}
          <label className="flex items-center gap-3 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-semibold text-muted-foreground lg:hidden">
            <Checkbox checked={estadoCabecalho} onCheckedChange={() => onAlternarPagina(!todasMarcadas)} />
            Marcar todas as notas listadas
          </label>

          <ul className="divide-y divide-border">
            {notas.map((n) => {
              const marcada = selecionadas.has(n.id);
              return (
                <li key={n.id}>
                  <label
                    className={cn(
                      'grid cursor-pointer grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-accent/40 lg:gap-3',
                      COLUNAS_LG,
                      marcada && 'bg-accent/60 hover:bg-accent/70',
                    )}
                  >
                    <Checkbox checked={marcada} onCheckedChange={() => onAlternar(n)} aria-label={`Selecionar NF ${n.numero}`} />

                    <div className="min-w-0">
                      <p className="numeros font-semibold leading-tight">NF {n.numero || '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">{emissorDe(n)}</p>
                    </div>

                    <div className="col-start-2 min-w-0 lg:col-start-auto">
                      <p className="truncate font-medium leading-tight">{n.destinatario_nome || '—'}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <span className="mr-1.5 rounded bg-muted px-1 py-px font-bold text-foreground/80">{n.destinatario_uf}</span>
                        {n.destinatario_municipio || ''}
                      </p>
                    </div>

                    <p className="numeros hidden text-[13px] text-muted-foreground lg:block">{formatEmissao(n)}</p>
                    <p className="numeros hidden text-right text-[13px] text-muted-foreground lg:block">{formatBRL(n.valor_total)}</p>
                    <p className="numeros hidden text-right lg:block">{n.valor_difal ? formatBRL(n.valor_difal) : '—'}</p>
                    <p className="numeros hidden text-right lg:block">{n.valor_fcop ? formatBRL(n.valor_fcop) : '—'}</p>
                    <p className="numeros col-start-3 row-start-1 text-right font-semibold lg:col-start-auto lg:row-start-auto">
                      {formatBRL(totalGuia(n))}
                    </p>
                    <div className="col-start-3 row-start-2 justify-self-end lg:col-start-auto lg:row-start-auto lg:justify-self-start">
                      <StatusBadge status={n.status} />
                    </div>
                    <p className="numeros hidden text-[13px] text-muted-foreground lg:block">
                      {n.data_pagamento ? formatData(n.data_pagamento) : '—'}
                    </p>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

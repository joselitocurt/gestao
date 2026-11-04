import React from 'react';
import { X } from 'lucide-react';
import { formatBRL } from '@/lib/fiscal';
import { cn } from '@/lib/utils';

const STATUS = [
  { chave: 'emitido', rotulo: 'Emitidas', cor: 'bg-status-emitido', texto: 'text-status-emitido' },
  { chave: 'a_emitir', rotulo: 'A emitir', cor: 'bg-status-pendente', texto: 'text-status-pendente' },
  { chave: 'pago', rotulo: 'Pagas', cor: 'bg-status-pago', texto: 'text-status-pago' },
];

const METRICAS = [
  { chave: 'guia', rotulo: 'Valor das guias' },
  { chave: 'nota', rotulo: 'Valor das notas' },
];

const qtd = (n) => `${n.toLocaleString('pt-BR')} ${n === 1 ? 'nota' : 'notas'}`;

const Celula = ({ item, forte }) => (
  <div className="numeros text-right">
    <p className={cn('text-sm', forte ? 'font-bold' : 'font-semibold')}>{formatBRL(item.valor)}</p>
    <p className="text-xs text-muted-foreground">{qtd(item.notas)}</p>
  </div>
);

/** Quantidade e valor por status em cada ano. Clicar num ano filtra a página. */
export default function AcompanhamentoAnual({ linhas, metrica, onMetrica, anoAtivo, onAno }) {
  const somar = (chave) =>
    linhas.reduce(
      (acc, l) => ({ notas: acc.notas + l[chave].notas, valor: acc.valor + l[chave].valor }),
      { notas: 0, valor: 0 },
    );
  const geral = { pago: somar('pago'), emitido: somar('emitido'), a_emitir: somar('a_emitir'), total: somar('total') };

  return (
    <section className="painel" aria-label="Acompanhamento por ano">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
        <div>
          <h2 className="font-display text-lg">Acompanhamento por ano</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Quantidade e valor das notas emitidas, a emitir e pagas em cada ano. Clique num ano para filtrar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {anoAtivo ? (
            <button
              type="button"
              onClick={() => onAno(0)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
              Todos os anos
            </button>
          ) : null}
          <div className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Valor exibido">
            {METRICAS.map((m) => (
              <button
                key={m.chave}
                type="button"
                aria-pressed={metrica === m.chave}
                onClick={() => onMetrica(m.chave)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-semibold transition-colors',
                  metrica === m.chave ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!linhas.length ? (
        <p className="px-6 py-10 text-center text-sm text-muted-foreground">Nenhuma nota para os filtros escolhidos.</p>
      ) : (
        <>
          {/* Cabeçalho (desktop) */}
          <div className="hidden grid-cols-[88px_repeat(4,minmax(0,1fr))_minmax(150px,1.2fr)] gap-4 border-b border-border bg-muted/50 px-6 py-2.5 text-xs font-semibold text-muted-foreground md:grid">
            <span>Ano</span>
            {STATUS.map((s) => (
              <span key={s.chave} className="flex items-center justify-end gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', s.cor)} />
                {s.rotulo}
              </span>
            ))}
            <span className="text-right">Total</span>
            <span>Situação</span>
          </div>

          <ul className="divide-y divide-border">
            {linhas.map((l) => {
              const selecionado = anoAtivo === l.ano;
              const pct = (v) => (l.total.valor > 0 ? (v / l.total.valor) * 100 : 0);
              const pctPago = Math.round(pct(l.pago.valor));
              return (
                <li key={l.ano}>
                  <button
                    type="button"
                    aria-pressed={selecionado}
                    onClick={() => onAno(selecionado ? 0 : l.ano)}
                    className={cn(
                      'relative grid w-full grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-left transition-colors hover:bg-accent/50 focus-visible:ring-inset focus-visible:ring-offset-0 sm:px-6 md:grid-cols-[88px_repeat(4,minmax(0,1fr))_minmax(150px,1.2fr)] md:items-center',
                      selecionado && 'bg-accent',
                      anoAtivo && !selecionado && 'opacity-55 hover:opacity-100',
                    )}
                  >
                    {selecionado ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" /> : null}
                    <span className="col-span-2 font-display text-xl md:col-span-1">{l.ano}</span>

                    {STATUS.map((s) => (
                      <div key={s.chave} className="md:contents">
                        <span className={cn('mb-0.5 flex items-center gap-1.5 text-xs font-semibold md:hidden', s.texto)}>
                          <span className={cn('h-2 w-2 rounded-full', s.cor)} />
                          {s.rotulo}
                        </span>
                        <div className="md:text-right [&>div]:text-left md:[&>div]:text-right">
                          <Celula item={l[s.chave]} />
                        </div>
                      </div>
                    ))}

                    <div>
                      <span className="mb-0.5 block text-xs font-semibold text-muted-foreground md:hidden">Total</span>
                      <div className="[&>div]:text-left md:[&>div]:text-right">
                        <Celula item={l.total} forte />
                      </div>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-muted">
                        {['pago', 'emitido', 'a_emitir'].map((chave) =>
                          l[chave].valor > 0 ? (
                            <span
                              key={chave}
                              className={cn('h-full origin-left animate-crescer', STATUS.find((s) => s.chave === chave).cor)}
                              style={{ width: `${pct(l[chave].valor)}%` }}
                            />
                          ) : null,
                        )}
                      </div>
                      <p className="numeros mt-1.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-status-pago">{pctPago}% pago</span>, {formatBRL(l.total.valor - l.pago.valor)} em aberto
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {linhas.length > 1 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-b-xl border-t border-border bg-muted/50 px-5 py-3.5 sm:px-6 md:grid-cols-[88px_repeat(4,minmax(0,1fr))_minmax(150px,1.2fr)] md:items-center">
              <span className="col-span-2 text-sm font-semibold md:col-span-1">Todos</span>
              {[...STATUS.map((s) => s.chave), 'total'].map((chave) => (
                <div key={chave} className="[&>div]:text-left md:[&>div]:text-right">
                  <span className="mb-0.5 block text-xs font-semibold text-muted-foreground md:hidden">
                    {STATUS.find((s) => s.chave === chave)?.rotulo || 'Total'}
                  </span>
                  <Celula item={geral[chave]} forte={chave === 'total'} />
                </div>
              ))}
              <p className="numeros col-span-2 text-xs text-muted-foreground md:col-span-1">
                <span className="font-semibold text-status-pago">
                  {geral.total.valor > 0 ? Math.round((geral.pago.valor / geral.total.valor) * 100) : 0}% pago
                </span>{' '}
                no período
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

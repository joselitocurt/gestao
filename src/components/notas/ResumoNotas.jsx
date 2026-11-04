import React from 'react';
import { X } from 'lucide-react';
import { STATUS, formatBRL } from '@/lib/fiscal';
import { cn } from '@/lib/utils';

const ORDEM = ['pago', 'emitido', 'a_emitir'];

const COR = {
  pago: 'bg-status-pago',
  emitido: 'bg-status-emitido',
  a_emitir: 'bg-status-pendente',
};

const resumir = (resumo) => {
  const porStatus = Object.fromEntries(ORDEM.map((s) => [s, { notas: 0, valor: 0 }]));
  let difal = 0;
  let fcop = 0;
  for (const r of resumo || []) {
    const d = Number(r.sum_valor_difal) || 0;
    const f = Number(r.sum_valor_fcop) || 0;
    difal += d;
    fcop += f;
    const alvo = porStatus[r.status] || porStatus.a_emitir;
    alvo.notas += r.count || 0;
    alvo.valor += d + f;
  }
  const notas = ORDEM.reduce((acc, s) => acc + porStatus[s].notas, 0);
  return { porStatus, difal, fcop, total: difal + fcop, notas };
};

/**
 * Situação das guias do período. Cada segmento da barra (e da legenda)
 * filtra a lista de notas pelo status; clicar de novo remove o filtro.
 */
export default function ResumoNotas({ resumo, statusAtivo, onStatus }) {
  const t = resumir(resumo);
  // Sem valores lançados, a barra mostra a proporção de notas.
  const base = t.total > 0 ? 'valor' : 'notas';
  const denominador = base === 'valor' ? t.total : t.notas;
  const pctPago = t.total > 0 ? Math.round((t.porStatus.pago.valor / t.total) * 100) : 0;

  return (
    <section className="painel mt-4 p-5 sm:p-6" aria-label="Situação das guias do período">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total das guias</p>
          <p className="numeros mt-1 font-display text-[34px] leading-none sm:text-[40px]">{formatBRL(t.total)}</p>
          <p className="numeros mt-2 text-sm text-muted-foreground">
            DIFAL <span className="font-semibold text-foreground">{formatBRL(t.difal)}</span>
            <span className="mx-2 text-border">/</span>
            FCOP <span className="font-semibold text-foreground">{formatBRL(t.fcop)}</span>
          </p>
        </div>

        <div className="sm:text-right">
          <p className="numeros text-sm">
            <span className="font-display text-2xl">{t.notas}</span>{' '}
            <span className="text-muted-foreground">{t.notas === 1 ? 'nota no período' : 'notas no período'}</span>
          </p>
          {t.total > 0 ? (
            <p className="numeros mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-status-pago">{pctPago}%</span> do valor já pago
            </p>
          ) : null}
        </div>
      </div>

      {/* Barra empilhada */}
      <div className="mt-5 flex h-3 w-full gap-[3px] overflow-hidden rounded-full bg-muted" role="presentation">
        {denominador > 0
          ? ORDEM.map((status) => {
              const parte = t.porStatus[status][base];
              if (!parte) return null;
              const ativo = !statusAtivo || statusAtivo === status;
              return (
                <button
                  key={status}
                  type="button"
                  tabIndex={-1}
                  onClick={() => onStatus(statusAtivo === status ? '' : status)}
                  title={`Filtrar: ${STATUS[status].label}`}
                  style={{ width: `${(parte / denominador) * 100}%` }}
                  className={cn(
                    'h-full origin-left animate-crescer transition-opacity first:rounded-l-full last:rounded-r-full',
                    COR[status],
                    ativo ? 'opacity-100' : 'opacity-25 hover:opacity-50',
                  )}
                />
              );
            })
          : null}
      </div>

      {/* Legenda = filtros */}
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {ORDEM.map((status) => {
          const item = t.porStatus[status];
          const ativo = statusAtivo === status;
          return (
            <button
              key={status}
              type="button"
              aria-pressed={ativo}
              onClick={() => onStatus(ativo ? '' : status)}
              className={cn(
                'group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                ativo
                  ? 'border-primary bg-accent'
                  : 'border-border hover:border-foreground/20 hover:bg-muted/60',
                statusAtivo && !ativo && 'opacity-60',
              )}
            >
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', COR[status])} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{STATUS[status].label}</span>
                <span className="numeros block text-xs text-muted-foreground">
                  {item.notas} {item.notas === 1 ? 'nota' : 'notas'}
                </span>
              </span>
              <span className="numeros text-sm font-semibold">{formatBRL(item.valor)}</span>
              {ativo ? <X className="h-3.5 w-3.5 text-muted-foreground" aria-label="Remover filtro" /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

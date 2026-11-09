import React from 'react';
import { Calculator, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatBRL } from '@/lib/fiscal';
import { formatPct } from '@/lib/aliquotas';
import { cn } from '@/lib/utils';

/**
 * Memória de cálculo do DIFAL por fora de uma nota, com os parâmetros da nota
 * (mercadoria importada, sem FCP) e o botão para usar os valores calculados.
 */
export default function CalculoDifal({ calculo, origem, destino, importada, semFcp, onParametro, onAplicar, aplicado, desabilitado }) {
  const c = calculo;
  return (
    <section className="rounded-xl border border-border bg-muted/30" aria-label="Cálculo automático do DIFAL">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Calculator className="h-4 w-4 text-primary dark:text-dourado" />
          Cálculo automático
          <span className="font-normal text-muted-foreground">· por fora</span>
        </p>
        <span className="numeros text-xs font-semibold text-muted-foreground">
          {origem || '—'} → {destino || '—'}
        </span>
      </div>

      <div className="space-y-2 px-4 py-3 text-[13px]">
        {c?.calculado ? (
          <>
            <div className="numeros flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Interestadual <b className="text-foreground">{formatPct(c.interestadual)}</b></span>
              <span>Interna <b className="text-foreground">{formatPct(c.interna)}</b></span>
              <span>Diferença <b className="text-foreground">{formatPct(c.diferenca)}</b></span>
              <span>FCP <b className="text-foreground">{formatPct(c.aliqFcp)}</b></span>
            </div>
            <dl className="numeros space-y-1">
              <div className="flex justify-between gap-3">
                <dt>
                  DIFAL <span className="text-xs text-muted-foreground">{formatBRL(c.base)} × {formatPct(c.diferenca)}</span>
                </dt>
                <dd className="font-semibold">{formatBRL(c.difal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>
                  FCOP <span className="text-xs text-muted-foreground">{formatBRL(c.base)} × {formatPct(c.aliqFcp)}</span>
                </dt>
                <dd className="font-semibold">{formatBRL(c.fcp)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                <dt className="font-semibold">Total da guia</dt>
                <dd className="font-display text-base">{formatBRL(c.total)}</dd>
              </div>
            </dl>
            {c.motivo ? <p className="text-xs text-status-pendente">{c.motivo}</p> : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{c?.motivo || 'Sem dados para calcular.'}</p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={importada} onCheckedChange={(v) => onParametro('importada', Boolean(v))} disabled={desabilitado} />
            Mercadoria importada (4%)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={semFcp} onCheckedChange={(v) => onParametro('sem_fcp', Boolean(v))} disabled={desabilitado} />
            Produto sem FCP no destino
          </label>
        </div>
      </div>

      {c?.calculado && c.total > 0 && !desabilitado ? (
        <div className="border-t border-border px-4 py-2.5">
          <Button
            type="button"
            size="sm"
            variant={aplicado ? 'outline' : 'default'}
            onClick={onAplicar}
            disabled={aplicado}
            className={cn('w-full rounded-lg')}
          >
            {aplicado ? <Check className="h-4 w-4" /> : <Calculator className="h-4 w-4" />}
            {aplicado ? 'Valores calculados aplicados' : 'Usar valores calculados'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

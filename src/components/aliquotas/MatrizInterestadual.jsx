import React from 'react';
import { ALIQUOTAS_PADRAO, aliquotaInterestadual } from '@shared/difal.js';
import { cn } from '@/lib/utils';

const UFS = ALIQUOTAS_PADRAO.map((a) => a.uf);

const COR = {
  7: 'bg-status-emitido/15 text-status-emitido',
  12: 'bg-dourado/15 text-[hsl(var(--dourado))]',
};

// Matriz origem (linha) × destino (coluna) da alíquota interestadual.
export default function MatrizInterestadual({ destaque }) {
  return (
    <div className="overflow-x-auto">
      <table className="numeros border-separate border-spacing-[2px] text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card" />
            {UFS.map((d) => (
              <th key={d} className={cn('min-w-[28px] px-0.5 py-1 font-semibold text-muted-foreground', destaque === d && 'text-foreground')}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {UFS.map((o) => (
            <tr key={o}>
              <th className="sticky left-0 bg-card pr-1.5 text-right font-semibold text-muted-foreground">{o}</th>
              {UFS.map((d) => {
                const a = aliquotaInterestadual(o, d);
                return (
                  <td
                    key={d}
                    title={a ? `${o} → ${d}: ${a}%` : `${o}: operação interna`}
                    className={cn('rounded px-0.5 py-1 text-center font-medium', a ? COR[a] : 'bg-muted text-muted-foreground/60')}
                  >
                    {a || '—'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

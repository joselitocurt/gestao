import React from 'react';
import { formatBRL } from '@/lib/fiscal';
import { cn } from '@/lib/utils';

// Valor da guia na lista: o calculado (ainda não emitido) aparece em itálico, mais claro.
export default function ValorGuia({ valor, calculado, forte = false, vazio = '—', className }) {
  if (!valor) return <span className={cn('text-muted-foreground/60', className)}>{vazio}</span>;
  return (
    <span
      className={cn(
        calculado ? 'italic text-muted-foreground' : forte && 'font-semibold',
        calculado && forte && 'font-medium',
        className,
      )}
      title={calculado ? 'Calculado pelas alíquotas (guia ainda não emitida)' : undefined}
    >
      {formatBRL(valor)}
    </span>
  );
}

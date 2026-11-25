import React from 'react';
import { cn } from '@/lib/utils';

// Crédito discreto no rodapé do login e da página inicial.
export default function Creditos({ className }) {
  return (
    <p className={cn('text-center text-[11px] tracking-wide text-muted-foreground/70', className)}>
      Desenvolvido por Joselito Oliveira
    </p>
  );
}

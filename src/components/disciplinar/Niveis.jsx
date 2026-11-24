import React from 'react';
import { NIVEIS } from '@shared/disciplinar.js';
import { cn } from '@/lib/utils';

// Escala da marca: do cinza-azulado claro (Verbal) ao azul-marinho Controlar.io (Demissão).
// As cores ficam em src/index.css (--nivel-1 … --nivel-6), com variação para o tema escuro.
export const COR_NIVEL = [null, 1, 2, 3, 4, 5, 6].map((n) => (n ? `var(--nivel-${n})` : null));
const TEXTO_NIVEL = [null, 1, 2, 3, 4, 5, 6].map((n) => (n ? `var(--nivel-${n}-texto)` : null));

export function NivelPill({ nivel, className }) {
  const n = Number(nivel) || 0;
  if (!n) {
    return (
      <span className={cn('inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground', className)}>
        Nenhum
      </span>
    );
  }
  return (
    <span
      className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}
      style={{ background: COR_NIVEL[n], color: TEXTO_NIVEL[n] }}
    >
      {NIVEIS[n].curto}
    </span>
  );
}

const TOM_SITUACAO = {
  Ativo: 'bg-status-pago/10 text-status-pago',
  Afastado: 'bg-status-pendente/10 text-status-pendente',
  Demitido: 'bg-destructive/10 text-destructive',
};

export function SituacaoPill({ status }) {
  const s = status || 'Ativo';
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', TOM_SITUACAO[s])}>{s}</span>;
}

/** Trilha dos 6 níveis, preenchida até o nível atual. */
export function Trilha({ nivel }) {
  return (
    <div className="mt-2">
      <div className="grid grid-cols-6 gap-1">
        {NIVEIS.slice(1).map((n) => (
          <div
            key={n.n}
            className="h-2 rounded-full"
            style={{ background: n.n <= nivel ? COR_NIVEL[n.n] : 'hsl(var(--muted))' }}
          />
        ))}
      </div>
      <div className="mt-1 grid grid-cols-6 gap-1 text-[10px] text-muted-foreground">
        {NIVEIS.slice(1).map((n) => (
          <span key={n.n} className="truncate">
            {n.curto}
          </span>
        ))}
      </div>
    </div>
  );
}

export const Avatar = ({ nome, className }) => (
  <span
    className={cn(
      'grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent font-display text-lg text-accent-foreground',
      className,
    )}
  >
    {(nome || '?').trim().charAt(0).toUpperCase()}
  </span>
);

export const Carregando = () => (
  <div className="flex justify-center py-20">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
  </div>
);

export const Vazio = ({ children }) => <div className="px-6 py-10 text-center text-sm text-muted-foreground">{children}</div>;

export const Textarea = ({ className, ...props }) => (
  <textarea
    className={cn(
      'min-h-[88px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
      className,
    )}
    {...props}
  />
);

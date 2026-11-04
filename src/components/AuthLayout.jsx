import React from 'react';

// Ilustração do painel: a barra de situação das guias, a mesma linguagem da apuração.
const BarraGuias = () => (
  <div className="w-full max-w-sm" aria-hidden="true">
    <div className="flex h-3 gap-[3px] overflow-hidden rounded-full">
      <span className="h-full origin-left animate-crescer rounded-l-full bg-status-pago" style={{ width: '58%' }} />
      <span className="h-full origin-left animate-crescer bg-status-emitido" style={{ width: '24%', animationDelay: '120ms' }} />
      <span className="h-full origin-left animate-crescer rounded-r-full bg-status-pendente" style={{ width: '18%', animationDelay: '240ms' }} />
    </div>
    <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
      {[
        ['Pago', 'bg-status-pago'],
        ['Emitida', 'bg-status-emitido'],
        ['A emitir', 'bg-status-pendente'],
      ].map(([rotulo, cor]) => (
        <span key={rotulo} className="flex items-center gap-2 text-sidebar-foreground">
          <span className={`h-2 w-2 rounded-full ${cor}`} />
          {rotulo}
        </span>
      ))}
    </div>
  </div>
);

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-sidebar-active text-base font-extrabold text-sidebar">
            D
          </span>
          <span className="text-lg font-bold text-white">Guia DIFAL</span>
        </div>

        <div>
          <p className="max-w-md font-display text-[34px] leading-[1.15] text-white">
            DIFAL e FCOP de todas as filiais, apurados por UF de destino.
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-sidebar-foreground">
            Importe os XMLs, lance as guias e acompanhe o que já foi pago em cada estado.
          </p>
          <div className="mt-10">
            <BarraGuias />
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/60">Acesso restrito a usuários cadastrados.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="font-display text-[28px] leading-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
          {footer && <p className="mt-8 text-sm text-muted-foreground">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

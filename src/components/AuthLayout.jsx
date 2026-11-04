import React from 'react';

// Tela de acesso: logomarca e formulário, sem textos de apresentação.
export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Painel da marca (desktop): só a logomarca, versão negativa */}
      <aside className="hidden items-center justify-center bg-sidebar p-12 lg:flex">
        <img
          src="/marca/controlar-vertical-negativo.svg"
          alt="Controlar.io, gestão tributária e de processos"
          className="h-auto w-full max-w-[360px]"
          width="328"
          height="224"
        />
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Celular: a logomarca fica acima do formulário */}
          <img
            src="/marca/controlar-horizontal.svg"
            alt="Controlar.io, gestão tributária e de processos"
            className="mx-auto mb-10 h-auto w-[260px] lg:hidden dark:hidden"
            width="516"
            height="116"
          />
          <img
            src="/marca/controlar-horizontal-negativo.svg"
            alt="Controlar.io, gestão tributária e de processos"
            className="mx-auto mb-10 hidden h-auto w-[260px] dark:block lg:dark:hidden"
            width="516"
            height="116"
          />
          <div className="mb-6">
            {Icon ? (
              <span className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            ) : null}
            <h1 className="font-display text-[26px] leading-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {children}
          {footer && <p className="mt-8 text-sm text-muted-foreground">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

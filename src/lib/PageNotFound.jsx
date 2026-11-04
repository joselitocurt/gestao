import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function PageNotFound() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <p className="font-display text-7xl text-muted-foreground/40">404</p>
        <h1 className="mt-4 font-display text-2xl tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          O endereço <span className="font-medium text-foreground">{pathname}</span> não existe neste sistema.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Home className="h-4 w-4" />
          Ir para o início
        </Link>
      </div>
    </div>
  );
}

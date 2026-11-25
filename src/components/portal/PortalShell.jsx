import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MenuConta from '@/components/portal/MenuConta';
import Creditos from '@/components/Creditos';

// Moldura da página inicial (escolha de módulos) e da administração.
export default function PortalShell() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-sidebar">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-8">
          <Link to="/" aria-label="Controlar.io: página inicial" className="flex items-center gap-4">
            <img src="/marca/controlar-sem-assinatura-negativo.svg" alt="Controlar.io" className="h-7 w-auto" width="492" height="92" />
            <span className="hidden items-center gap-2 text-xs font-semibold text-sidebar-foreground sm:flex">
              <span className="h-px w-4 bg-sidebar-active" aria-hidden="true" />
              Gestão de Processos
            </span>
          </Link>
          <MenuConta />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
        {pathname !== '/' ? (
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Módulos
          </Link>
        ) : null}
        <Outlet />
      </main>
      {pathname === '/' ? (
        <footer className="pb-6 pt-2">
          <Creditos />
        </footer>
      ) : null}
    </div>
  );
}

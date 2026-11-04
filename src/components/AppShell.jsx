import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  FilePlus2,
  LayoutList,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  UploadCloud,
  Users,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAcesso } from '@/lib/AcessoContext';
import { useAuth } from '@/lib/AuthContext';
import { rotuloPerfil } from '@/lib/permissoes';
import { useTema } from '@/lib/tema';
import { cn } from '@/lib/utils';
import IconeTributario from '@/components/IconeTributario';

const GRUPOS = [
  {
    titulo: 'Apuração',
    itens: [
      { to: '/', label: 'Notas do período', icon: LayoutList, chave: 'apuracao', end: true },
      { to: '/consulta', label: 'Consultar nota', icon: Search, chave: 'consulta' },
      { to: '/consolidado', label: 'Consolidado', icon: BarChart3, chave: 'consolidado' },
    ],
  },
  {
    titulo: 'Entrada de notas',
    itens: [
      { to: '/importar', label: 'Importar XML', icon: UploadCloud, chave: 'importar_xml' },
      { to: '/notas/nova', label: 'Cadastrar nota', icon: FilePlus2, chave: 'cadastrar_nota' },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { to: '/cnpjs', label: 'CNPJs emissores', icon: Building2, chave: 'cnpjs' },
      { to: '/usuarios', label: 'Usuários', icon: Users, chave: 'usuarios' },
    ],
  },
];

const Marca = () => (
  <Link to="/" className="flex items-center gap-3 px-2">
    <span className="grid h-9 w-9 place-items-center rounded-lg bg-sidebar-active text-sidebar">
      <IconeTributario className="h-5 w-5" />
    </span>
    <span className="leading-tight">
      <span className="block text-[15px] font-bold text-white">Gestão DIFAL</span>
      <span className="block text-xs text-sidebar-foreground">ICMS e FCOP por UF</span>
    </span>
  </Link>
);

function Navegacao({ onNavegar }) {
  const { temAcesso } = useAcesso();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6" aria-label="Menu principal">
      {GRUPOS.map((grupo) => {
        const itens = grupo.itens.filter((item) => temAcesso(item.chave));
        if (!itens.length) return null;
        return (
          <div key={grupo.titulo}>
            <p className="px-3 pb-2 text-xs font-semibold text-sidebar-foreground/60">{grupo.titulo}</p>
            <ul className="space-y-0.5">
              {itens.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavegar}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-muted text-white'
                          : 'text-sidebar-foreground hover:bg-sidebar-muted/60 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-active transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <Icon className={cn('h-[18px] w-[18px]', isActive && 'text-sidebar-active')} />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Rodape() {
  const { registro, emailAtual } = useAcesso();
  const { logout } = useAuth();
  const { tema, alternar } = useTema();
  const nome = registro?.nome || emailAtual || '';
  const iniciais = nome
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div className="border-t border-white/5 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-muted text-xs font-bold text-white">
          {iniciais || '?'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{nome}</p>
          <p className="truncate text-xs text-sidebar-foreground">
            {registro ? `Perfil ${rotuloPerfil(registro.perfil)}` : emailAtual}
          </p>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={alternar}
          className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-muted hover:text-white"
        >
          {tema === 'escuro' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}
        </button>
        <button
          type="button"
          onClick={() => logout('/login')}
          className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-muted hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}

export default function AppShell() {
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMenuAberto(false), [pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Menu lateral fixo (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar lg:flex">
        <div className="px-3 pt-5">
          <Marca />
        </div>
        <Navegacao />
        <Rodape />
      </aside>

      {/* Barra superior e gaveta (celular e tablet) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-sidebar px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="grid h-9 w-9 place-items-center rounded-lg text-white hover:bg-sidebar-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Marca />
      </header>

      <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
        <SheetContent side="left" className="flex w-72 flex-col border-none bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="px-3 pt-5">
            <Marca />
          </div>
          <Navegacao onNavegar={() => setMenuAberto(false)} />
          <Rodape />
        </SheetContent>
      </Sheet>

      <main className="mx-auto max-w-[1180px] px-4 pb-20 pt-6 sm:px-8 sm:pt-10">
        <Outlet />
      </main>
    </div>
  );
}

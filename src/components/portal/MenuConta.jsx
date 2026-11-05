import React from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAcesso } from '@/lib/AcessoContext';
import { useAuth } from '@/lib/AuthContext';
import { rotuloPerfil } from '@/lib/permissoes';
import { useTema } from '@/lib/tema';

export const iniciaisDe = (nome = '') =>
  nome
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

// Usuário, tema e saída na barra superior da página inicial.
export default function MenuConta() {
  const { registro, emailAtual } = useAcesso();
  const { logout } = useAuth();
  const { tema, alternar } = useTema();
  const nome = registro?.nome || emailAtual || '';

  const botao =
    'grid h-9 w-9 place-items-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-muted hover:text-white';

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <div className="mr-1 hidden items-center gap-3 sm:flex">
        <div className="text-right">
          <p className="max-w-[220px] truncate text-sm font-semibold text-white">{nome}</p>
          <p className="text-xs text-sidebar-foreground">{registro ? `Perfil ${rotuloPerfil(registro.perfil)}` : emailAtual}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-sidebar-muted text-xs font-bold text-white">
          {iniciaisDe(nome) || '?'}
        </span>
      </div>
      <button type="button" onClick={alternar} className={botao} aria-label={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'} title={tema === 'escuro' ? 'Tema claro' : 'Tema escuro'}>
        {tema === 'escuro' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
      </button>
      <button type="button" onClick={() => logout('/login')} className={botao} aria-label="Sair" title="Sair">
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

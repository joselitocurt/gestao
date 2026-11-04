import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAcesso } from '@/lib/AcessoContext';
import { useAuth } from '@/lib/AuthContext';
import { PAGINAS } from '@/lib/permissoes';

const TEXTOS = {
  sem_cadastro: {
    titulo: 'Acesso não liberado',
    descricao: 'Seu e-mail ainda não foi cadastrado neste sistema. Solicite o cadastro a um usuário Master.',
  },
  inativo: {
    titulo: 'Usuário inativo',
    descricao: 'Seu acesso está desativado. Fale com um usuário Master para reativá-lo.',
  },
  sem_permissao: {
    titulo: 'Sem permissão para esta página',
    descricao: 'Seu perfil não tem acesso a esta página. Você pode continuar nas páginas liberadas abaixo.',
  },
};

export default function TelaAcessoNegado({ tipo = 'sem_permissao' }) {
  const { permissoes } = useAcesso();
  const { logout } = useAuth();
  const texto = TEXTOS[tipo] || TEXTOS.sem_permissao;
  const liberadas = PAGINAS.filter((p) => permissoes.includes(p.chave));

  return (
    <div className="mx-auto mt-10 max-w-lg painel px-6 py-12 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <ShieldAlert className="h-5 w-5" />
      </span>
      <p className="mt-4 font-display text-2xl">{texto.titulo}</p>
      <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted-foreground">{texto.descricao}</p>

      {tipo === 'sem_permissao' && liberadas.length > 0 && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {liberadas.map((pagina) => (
            <Link
              key={pagina.chave}
              to={pagina.rota}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              {pagina.label}
            </Link>
          ))}
        </div>
      )}

      <Button variant="outline" className="mt-6" onClick={() => logout('/login')}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </Button>
    </div>
  );
}

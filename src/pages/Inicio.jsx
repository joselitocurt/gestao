import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAcesso } from '@/lib/AcessoContext';
import { MODULOS, paginasDoModulo } from '@/lib/modulos';
import { cn } from '@/lib/utils';

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

function CartaoModulo({ modulo, liberado }) {
  const Icone = modulo.icone;
  return (
    <div className={cn('painel flex flex-col items-center p-6 text-center', !liberado && 'opacity-60')}>
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-sidebar text-sidebar-active shadow-sm">
        <Icone className="h-8 w-8" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 font-display text-lg">{modulo.nome}</h2>
      {liberado ? (
        <Button asChild className="mt-5 w-full rounded-lg">
          <Link to={modulo.rota}>
            Abrir <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <Button disabled variant="outline" className="mt-5 w-full rounded-lg">
          <Lock className="h-4 w-4" /> Sem acesso
        </Button>
      )}
    </div>
  );
}

export default function Inicio() {
  const { registro, emailAtual, temAcesso, perfil } = useAcesso();
  const primeiroNome = (registro?.nome || emailAtual || '').split(/[\s@]/)[0];
  const liberado = (m) => paginasDoModulo(m.id).some((p) => temAcesso(p.chave));

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">
        {saudacao()}
        {primeiroNome ? `, ${primeiroNome}` : ''}
      </p>
      <h1 className="mt-1 font-display text-[32px] leading-tight">Escolha um módulo</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {MODULOS.map((m) => (
          <CartaoModulo key={m.id} modulo={m} liberado={liberado(m)} />
        ))}
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-muted">
            <Plus className="h-7 w-7" />
          </span>
          <p className="mt-4 text-sm font-semibold">Em breve</p>
        </div>
      </div>

      {perfil === 'master' ? (
        <section className="mt-12">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administração</h2>
          <Link
            to="/usuarios"
            className="painel group mt-3 flex items-center gap-4 p-4 transition-colors hover:border-primary/40 sm:max-w-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
              <Users className="h-5 w-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">Usuários e permissões</span>
              <span className="block text-xs text-muted-foreground">Quem acessa o sistema e o que pode abrir</span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        </section>
      ) : null}
    </div>
  );
}

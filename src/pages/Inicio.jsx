import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Plus, Users } from 'lucide-react';
import { api } from '@/api/client';
import { useAcesso } from '@/lib/AcessoContext';
import { MODULOS, paginasDoModulo } from '@/lib/modulos';
import { cn } from '@/lib/utils';

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
};

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');

// Situação das notas do Módulo I, mostrada no próprio cartão.
function ResumoDifal() {
  const [contagem, setContagem] = useState(null);
  useEffect(() => {
    api.entities.NotaFiscal.aggregate({ groupBy: 'status' })
      .then(({ rows }) => setContagem(Object.fromEntries(rows.map((r) => [r.status || 'a_emitir', r.count]))))
      .catch(() => setContagem(null));
  }, []);
  if (!contagem) return null;
  const itens = [
    { rotulo: 'A emitir', valor: contagem.a_emitir, cor: 'bg-status-pendente' },
    { rotulo: 'Emitidas', valor: contagem.emitido, cor: 'bg-status-emitido' },
    { rotulo: 'Pagas', valor: contagem.pago, cor: 'bg-status-pago' },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 border-t border-border pt-4">
      {itens.map((i) => (
        <div key={i.rotulo}>
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 rounded-full', i.cor)} aria-hidden="true" />
            {i.rotulo}
          </dt>
          <dd className="numeros mt-0.5 text-lg font-semibold">{fmt(i.valor)}</dd>
        </div>
      ))}
    </dl>
  );
}

const RESUMOS = { difal: ResumoDifal };

function CartaoModulo({ modulo, liberado }) {
  const Icone = modulo.icone;
  const Resumo = RESUMOS[modulo.id];
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-sidebar text-sidebar-active shadow-sm">
          <Icone className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground">
          MÓDULO {modulo.numero}
        </span>
      </div>
      <div className="mt-5 flex-1">
        <h2 className="font-display text-xl">{modulo.nome}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{modulo.descricao}</p>
      </div>
      {liberado && Resumo ? (
        <div className="mt-5">
          <Resumo />
        </div>
      ) : null}
      <span
        className={cn(
          'mt-5 inline-flex items-center gap-1.5 text-sm font-semibold',
          liberado ? 'text-primary dark:text-dourado' : 'text-muted-foreground',
        )}
      >
        {liberado ? (
          <>
            Abrir módulo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" /> Sem acesso
          </>
        )}
      </span>
    </>
  );

  const classe = 'painel group flex min-h-[300px] flex-col p-6 transition-all';
  if (!liberado) return <div className={cn(classe, 'opacity-60')}>{conteudo}</div>;
  return (
    <Link
      to={modulo.rota}
      className={cn(classe, 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {conteudo}
    </Link>
  );
}

export default function Inicio() {
  const { registro, emailAtual, temAcesso } = useAcesso();
  const primeiroNome = (registro?.nome || emailAtual || '').split(/[\s@]/)[0];
  const liberado = (m) => paginasDoModulo(m.id).some((p) => temAcesso(p.chave));

  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">
        {saudacao()}
        {primeiroNome ? `, ${primeiroNome}` : ''}
      </p>
      <h1 className="mt-1 font-display text-[32px] leading-tight">Escolha um módulo</h1>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map((m) => (
          <CartaoModulo key={m.id} modulo={m} liberado={liberado(m)} />
        ))}
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-muted">
            <Plus className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold">Próximos módulos</p>
          <p className="mt-1 max-w-[220px] text-xs leading-relaxed">Novos módulos do sistema aparecerão aqui.</p>
        </div>
      </div>

      {temAcesso('usuarios') ? (
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

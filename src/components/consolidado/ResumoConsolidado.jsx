import React from 'react';
import { formatBRL } from '@/lib/fiscal';

const PARTES = [
  { chave: 'pago', rotulo: 'Pago', cor: 'bg-status-pago' },
  { chave: 'emitido', rotulo: 'Emitida', cor: 'bg-status-emitido' },
  { chave: 'a_emitir', rotulo: 'A emitir', cor: 'bg-status-pendente' },
];

const Numero = ({ label, valor, detalhe }) => (
  <div className="min-w-0">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="numeros mt-1 truncate font-display text-[22px] leading-none sm:text-2xl">{valor}</p>
    {detalhe ? <p className="numeros mt-1.5 text-xs text-muted-foreground">{detalhe}</p> : null}
  </div>
);

export default function ResumoConsolidado({ totais, descricao }) {
  const pct = (v) => (totais.total > 0 ? (v / totais.total) * 100 : 0);

  return (
    <section className="painel grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-label="Resumo das guias">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">Total das guias</p>
        <p className="numeros mt-1 font-display text-[34px] leading-none sm:text-[40px]">{formatBRL(totais.total)}</p>
        <p className="mt-2 truncate text-xs text-muted-foreground">{descricao}</p>

        <div className="mt-5 flex h-2.5 gap-[3px] overflow-hidden rounded-full bg-muted">
          {PARTES.map((p) =>
            totais[p.chave] > 0 ? (
              <span
                key={p.chave}
                className={`h-full origin-left animate-crescer first:rounded-l-full last:rounded-r-full ${p.cor}`}
                style={{ width: `${pct(totais[p.chave])}%` }}
              />
            ) : null,
          )}
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {PARTES.map((p) => (
            <li key={p.chave} className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 shrink-0 rounded-full ${p.cor}`} />
                {p.rotulo}
              </span>
              <span className="numeros mt-0.5 block truncate text-sm font-semibold">{formatBRL(totais[p.chave])}</span>
              <span className="numeros block text-xs text-muted-foreground">{Math.round(pct(totais[p.chave]))}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 content-center gap-x-6 gap-y-5 border-t border-border pt-5 sm:grid-cols-4 lg:grid-cols-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
        <Numero label="DIFAL" valor={formatBRL(totais.difal)} detalhe={`${Math.round(pct(totais.difal))}% do total`} />
        <Numero label="FCOP" valor={formatBRL(totais.fcop)} detalhe={`${Math.round(pct(totais.fcop))}% do total`} />
        <Numero label="Notas" valor={totais.notas.toLocaleString('pt-BR')} detalhe={totais.notas ? `Média ${formatBRL(totais.total / totais.notas)}` : null} />
        <Numero
          label="Abrangência"
          valor={`${totais.ufs} ${totais.ufs === 1 ? 'UF' : 'UFs'}`}
          detalhe={`${totais.cnpjs} ${totais.cnpjs === 1 ? 'CNPJ emissor' : 'CNPJs emissores'}`}
        />
      </div>
    </section>
  );
}

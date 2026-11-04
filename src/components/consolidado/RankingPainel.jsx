import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { formatBRL } from '@/lib/fiscal';
import { cn } from '@/lib/utils';

const LIMITE = 8;

/**
 * Ranking clicável (por UF ou por CNPJ). Cada linha mostra o total, a divisão DIFAL/FCOP
 * e a participação; clicar filtra a página por aquele item.
 */
export default function RankingPainel({ titulo, descricao, linhas, ativo, onSelecionar, rotuloVazio }) {
  const [expandido, setExpandido] = useState(false);
  const total = linhas.reduce((acc, l) => acc + l.total, 0);
  const maior = Math.max(...linhas.map((l) => l.total), 0);
  // O item filtrado sempre aparece, mesmo fora do limite.
  const visiveis = expandido
    ? linhas
    : linhas.filter((l, i) => i < LIMITE || l.chave === ativo);

  return (
    <section className="painel flex flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-lg">{titulo}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
        </div>
        {ativo ? (
          <button
            type="button"
            onClick={() => onSelecionar('')}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </button>
        ) : null}
      </header>

      {!linhas.length ? (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">{rotuloVazio}</p>
      ) : (
        <ul className="flex-1 divide-y divide-border">
          {visiveis.map((l) => {
            const selecionado = ativo === l.chave;
            const apagado = ativo && !selecionado;
            const pct = total ? (l.total / total) * 100 : 0;
            const larguraDifal = maior ? (l.difal / maior) * 100 : 0;
            const larguraFcop = maior ? (l.fcop / maior) * 100 : 0;
            return (
              <li key={l.chave}>
                <button
                  type="button"
                  aria-pressed={selecionado}
                  onClick={() => onSelecionar(selecionado ? '' : l.chave)}
                  className={cn(
                    'relative w-full px-5 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:ring-inset focus-visible:ring-offset-0',
                    selecionado && 'bg-accent',
                    apagado && 'opacity-50 hover:opacity-100',
                  )}
                >
                  {selecionado ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-primary" /> : null}
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="text-sm font-semibold">{l.rotulo}</span>
                      {l.detalhe ? <span className="ml-2 text-xs text-muted-foreground">{l.detalhe}</span> : null}
                    </span>
                    <span className="numeros shrink-0 text-sm font-semibold">{formatBRL(l.total)}</span>
                  </div>
                  <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className="h-full origin-left animate-crescer bg-chart-1" style={{ width: `${larguraDifal}%` }} />
                    <span className="h-full origin-left animate-crescer bg-chart-2" style={{ width: `${larguraFcop}%` }} />
                  </div>
                  <div className="numeros mt-1.5 flex justify-between gap-3 text-xs text-muted-foreground">
                    <span>
                      {l.notas} {l.notas === 1 ? 'nota' : 'notas'}
                      <span className="mx-1.5 text-border">|</span>
                      DIFAL {formatBRL(l.difal)}
                      <span className="mx-1.5 text-border">|</span>
                      FCOP {formatBRL(l.fcop)}
                    </span>
                    <span className="font-semibold text-foreground/70">{pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {linhas.length > LIMITE ? (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="flex items-center justify-center gap-1.5 border-t border-border px-5 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expandido && 'rotate-180')} />
          {expandido ? 'Mostrar menos' : `Mostrar todos (${linhas.length})`}
        </button>
      ) : null}
    </section>
  );
}

import React, { useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { cn } from '@/lib/utils';

/** Campo de busca com sugestões (nome, matrícula ou CPF) para escolher um colaborador ativo. */
export default function BuscaColaborador({ valor, onEscolher }) {
  const { colaborador, buscarColaboradores } = useDisciplinar();
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const entrada = useRef(null);
  const atual = colaborador(valor);

  if (atual) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-accent px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{atual.nome}</p>
          <p className="truncate text-xs text-muted-foreground">
            Mat. {atual.matricula}
            {atual.funcao ? ` · ${atual.funcao}` : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onEscolher('');
            setTimeout(() => entrada.current?.focus(), 0);
          }}
        >
          Trocar
        </Button>
      </div>
    );
  }

  const itens = buscarColaboradores(termo, { incluirDemitidos: false }).slice(0, 8);
  const escolher = (i) => {
    const c = itens[i];
    if (!c) return;
    onEscolher(c.id);
    setTermo('');
    setAberto(false);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={entrada}
        id="busca-colaborador"
        value={termo}
        placeholder="Digite nome, matrícula ou CPF"
        autoComplete="off"
        className="pl-9"
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={(e) => {
          setTermo(e.target.value);
          setAtivo(0);
          setAberto(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setAtivo((a) => Math.min(a + 1, itens.length - 1));
          else if (e.key === 'ArrowUp') setAtivo((a) => Math.max(a - 1, 0));
          else if (e.key === 'Enter') escolher(ativo);
          else if (e.key === 'Escape') setAberto(false);
          else return;
          e.preventDefault();
        }}
      />
      {aberto ? (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg">
          {itens.length ? (
            itens.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    escolher(i);
                  }}
                  className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm', i === ativo && 'bg-accent')}
                >
                  <span className="truncate">{c.nome}</span>
                  <span className="numeros shrink-0 text-xs text-muted-foreground">Mat. {c.matricula}</span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum colaborador ativo encontrado. Use “Novo”.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}

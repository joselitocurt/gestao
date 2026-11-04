import React from 'react';

// Cabeçalho padrão das páginas: título, descrição curta, contexto opcional e ações à direita.
export default function PageHeader({ titulo, descricao, contexto, acoes }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {contexto ? <div className="mb-2">{contexto}</div> : null}
        <h1 className="font-display text-[26px] leading-tight sm:text-[30px]">{titulo}</h1>
        {descricao ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{descricao}</p>
        ) : null}
      </div>
      {acoes ? <div className="flex shrink-0 items-center gap-2">{acoes}</div> : null}
    </div>
  );
}

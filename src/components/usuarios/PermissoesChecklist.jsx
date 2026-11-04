import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { PAGINAS } from '@/lib/permissoes';

export default function PermissoesChecklist({ permissoes, onChange, desabilitado }) {
  const alternar = (chave) => {
    if (desabilitado) return;
    onChange(permissoes.includes(chave) ? permissoes.filter((p) => p !== chave) : [...permissoes, chave]);
  };

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {PAGINAS.map((pagina) => {
        const marcado = desabilitado || permissoes.includes(pagina.chave);
        return (
          <label
            key={pagina.chave}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-[13px] transition-colors',
              marcado && 'bg-accent/40',
              desabilitado && 'cursor-not-allowed opacity-60',
            )}
          >
            <Checkbox checked={marcado} disabled={desabilitado} onCheckedChange={() => alternar(pagina.chave)} />
            {pagina.label}
          </label>
        );
      })}
    </div>
  );
}

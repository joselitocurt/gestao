import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { MODULOS, paginasDoModulo } from '@/lib/modulos';

// Páginas que o usuário pode abrir, agrupadas por módulo.
export default function PermissoesChecklist({ permissoes, onChange }) {
  const alternar = (chave) =>
    onChange(permissoes.includes(chave) ? permissoes.filter((p) => p !== chave) : [...permissoes, chave]);

  return (
    <div className="space-y-3">
      {MODULOS.map((modulo) => {
        const paginas = paginasDoModulo(modulo.id);
        const chaves = paginas.map((p) => p.chave);
        const marcadas = chaves.filter((c) => permissoes.includes(c)).length;
        const todas = marcadas === chaves.length;
        const Icone = modulo.icone;
        const alternarModulo = () =>
          onChange(todas ? permissoes.filter((p) => !chaves.includes(p)) : [...new Set([...permissoes, ...chaves])]);

        return (
          <fieldset key={modulo.id} className="rounded-xl border border-border">
            <legend className="sr-only">Módulo {modulo.numero}: {modulo.nome}</legend>
            <div className="flex items-center gap-3 border-b border-border px-3 py-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-sidebar text-sidebar-active">
                <Icone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Módulo {modulo.numero}</p>
                <p className="text-sm font-semibold">{modulo.nome}</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={todas ? true : marcadas ? 'indeterminate' : false}
                  onCheckedChange={alternarModulo}
                  aria-label={`Todas as páginas de ${modulo.nome}`}
                />
                Todas ({marcadas}/{chaves.length})
              </label>
            </div>
            <div className="grid gap-1.5 p-2.5 sm:grid-cols-2">
              {paginas.map((pagina) => {
                const marcado = permissoes.includes(pagina.chave);
                return (
                  <label
                    key={pagina.chave}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-[13px] transition-colors',
                      marcado && 'border-primary/30 bg-accent/50',
                    )}
                  >
                    <Checkbox checked={marcado} onCheckedChange={() => alternar(pagina.chave)} />
                    {pagina.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

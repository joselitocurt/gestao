import React from 'react';
import { Paperclip, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const acao =
  'grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors focus-visible:ring-2';

export default function AcoesNota({ nota, onEdit, onDelete, podeEditar = true, className }) {
  const disparar = (funcao) => (evento) => {
    evento.stopPropagation();
    funcao(nota);
  };

  return (
    <div className={cn('flex items-center justify-end gap-0.5', className)}>
      {nota.comprovante_uri ? (
        <Paperclip className="mr-1 h-3.5 w-3.5 text-muted-foreground" aria-label="Comprovante anexado" />
      ) : null}
      {podeEditar ? (
        <>
          <button
            type="button"
            title="Editar nota"
            aria-label={`Editar nota ${nota.numero || ''}`}
            onClick={disparar(onEdit)}
            className={cn(acao, 'hover:bg-accent hover:text-accent-foreground')}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Apagar nota"
            aria-label={`Apagar nota ${nota.numero || ''}`}
            onClick={disparar(onDelete)}
            className={cn(acao, 'hover:bg-destructive/10 hover:text-destructive')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      ) : null}
    </div>
  );
}

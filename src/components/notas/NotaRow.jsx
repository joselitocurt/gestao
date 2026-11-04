import React from 'react';
import StatusBadge from '@/components/notas/StatusBadge';
import AcoesNota from '@/components/notas/AcoesNota';
import { formatBRL, formatCpf, formatData, formatEmissao, totalGuia } from '@/lib/fiscal';

export const COLUNAS = 'grid-cols-[64px_minmax(0,1fr)_82px_96px_86px_76px_94px_112px_82px_72px]';

const Vazio = () => <span className="text-muted-foreground/60">—</span>;

export default function NotaRow({ nota, onSelect, onEdit, onDelete, onStatus, podeEditar }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(nota)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(nota);
        }
      }}
      className={`group grid ${COLUNAS} cursor-pointer items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-0 focus-visible:ring-offset-0`}
    >
      <div className="min-w-0">
        <p className="numeros font-semibold leading-tight">{nota.numero || '—'}</p>
        <p className="numeros text-xs text-muted-foreground">Série {nota.serie || '—'}</p>
      </div>

      <div className="min-w-0">
        <p className="truncate font-medium leading-tight">{nota.destinatario_nome || '—'}</p>
        <p className="numeros truncate text-xs text-muted-foreground">
          <span className="mr-1.5 rounded bg-muted px-1 py-px font-bold text-foreground/80">{nota.destinatario_uf}</span>
          {nota.destinatario_municipio ? `${nota.destinatario_municipio} ` : ''}
          <span className="mx-1 text-border">|</span>
          {formatCpf(nota.destinatario_cpf) || '—'}
        </p>
      </div>

      <p className="numeros text-[13px] text-muted-foreground">{formatEmissao(nota)}</p>
      <p className="numeros text-right text-[13px] text-muted-foreground">{formatBRL(nota.valor_total)}</p>
      <p className="numeros text-right">{nota.valor_difal ? formatBRL(nota.valor_difal) : <Vazio />}</p>
      <p className="numeros text-right">{nota.valor_fcop ? formatBRL(nota.valor_fcop) : <Vazio />}</p>
      <p className="numeros text-right font-semibold">{formatBRL(totalGuia(nota))}</p>

      <div>
        <StatusBadge status={nota.status} onChange={podeEditar ? (s) => onStatus(nota, s) : undefined} />
      </div>

      <div className="numeros text-[13px] text-muted-foreground">
        {nota.data_pagamento ? formatData(nota.data_pagamento) : <Vazio />}
      </div>

      <AcoesNota
        nota={nota}
        onEdit={onEdit}
        onDelete={onDelete}
        podeEditar={podeEditar}
        className="opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      />
    </div>
  );
}

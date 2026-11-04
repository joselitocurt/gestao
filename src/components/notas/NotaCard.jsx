import React from 'react';
import StatusBadge from '@/components/notas/StatusBadge';
import AcoesNota from '@/components/notas/AcoesNota';
import { formatBRL, formatCpf, formatData, formatEmissao, totalGuia } from '@/lib/fiscal';

const Valor = ({ label, children, forte }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`numeros mt-0.5 ${forte ? 'font-semibold' : ''}`}>{children}</p>
  </div>
);

export default function NotaCard({ nota, onSelect, onEdit, onDelete, onStatus, podeEditar }) {
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
      className="w-full cursor-pointer px-4 py-4 text-left transition-colors hover:bg-accent/40 active:bg-accent/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="numeros text-sm font-semibold">
            NF {nota.numero || '—'}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">Série {nota.serie || '—'}</span>
          </p>
          <p className="mt-0.5 truncate text-sm">{nota.destinatario_nome || '—'}</p>
        </div>
        <StatusBadge status={nota.status} onChange={podeEditar ? (s) => onStatus(nota, s) : undefined} />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-[13px]">
        <Valor label="DIFAL">{nota.valor_difal ? formatBRL(nota.valor_difal) : '—'}</Valor>
        <Valor label="FCOP">{nota.valor_fcop ? formatBRL(nota.valor_fcop) : '—'}</Valor>
        <Valor label="Total" forte>
          {formatBRL(totalGuia(nota))}
        </Valor>
        <Valor label="Pago em">{nota.data_pagamento ? formatData(nota.data_pagamento) : '—'}</Valor>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="numeros truncate">
          {formatEmissao(nota)} <span className="mx-1 text-border">|</span> {formatCpf(nota.destinatario_cpf)}{' '}
          <span className="mx-1 text-border">|</span> <span className="font-semibold">{nota.destinatario_uf}</span>
        </span>
        <AcoesNota nota={nota} onEdit={onEdit} onDelete={onDelete} podeEditar={podeEditar} className="shrink-0" />
      </div>
    </div>
  );
}

import React from 'react';
import StatusBadge from '@/components/notas/StatusBadge';
import ComprovanteBotao from '@/components/consulta/ComprovanteBotao';
import { formatBRL, formatCpf, formatData, formatEmissao, totalGuia } from '@/lib/fiscal';

const Valor = ({ label, valor }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="numeros mt-1 text-[13px]">{valor}</p>
  </div>
);

export default function NotaConsultaCard({ nota }) {
  const total = totalGuia(nota);
  const pago = nota.status === 'pago' ? total : 0;

  return (
    <div className="painel p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="numeros text-sm font-medium">
            NF {nota.numero || '—'}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">série {nota.serie || '—'}</span>
          </p>
          <p className="mt-0.5 truncate text-[13px]">{nota.destinatario_nome || '—'}</p>
          <p className="numeros text-xs text-muted-foreground">
            {formatCpf(nota.destinatario_cpf) || 'sem CPF'}
            <span className="mx-1.5 text-border">|</span>
            {nota.destinatario_municipio ? `${nota.destinatario_municipio}/` : ''}
            {nota.destinatario_uf || '—'}
            <span className="mx-1.5 text-border">|</span>
            emitida em {formatEmissao(nota)}
          </p>
        </div>
        <StatusBadge status={nota.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Valor label="Valor da nota" valor={formatBRL(nota.valor_total)} />
        <Valor label="DIFAL" valor={formatBRL(nota.valor_difal)} />
        <Valor label="FCOP" valor={formatBRL(nota.valor_fcop)} />
        <Valor label="Total da guia" valor={formatBRL(total)} />
        <Valor label="Valor pago" valor={formatBRL(pago)} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
        <p className="text-[12px] text-muted-foreground">
          Pagamento:{' '}
          <span className="numeros text-foreground">
            {nota.data_pagamento ? formatData(nota.data_pagamento) : '—'}
          </span>
        </p>
        <ComprovanteBotao uri={nota.comprovante_uri} nome={nota.comprovante_nome} />
      </div>
    </div>
  );
}

import React from 'react';
import { AlertTriangle, CheckCircle2, Copy, Building2 } from 'lucide-react';

const Contador = ({ label, valor, tone }) => (
  <div className="painel px-4 py-3">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <p className={`numeros mt-1.5 font-display text-2xl leading-none ${tone || ''}`}>{valor}</p>
  </div>
);

export default function ResultadoImportacao({ resultado }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Contador label="Importadas" valor={resultado.importadas} tone="text-status-pago" />
        <Contador label="Ignoradas" valor={resultado.ignoradas.length} tone="text-status-pendente" />
        <Contador label="Já existentes" valor={resultado.duplicadas} />
        <Contador label="CNPJs novos" valor={resultado.cnpjsCriados.length} />
      </div>

      {resultado.importadas > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-status-pago/25 bg-status-pago/5 px-4 py-3 text-[13px] text-status-pago">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {resultado.importadas} nota(s) entraram na apuração com status “A emitir”. Preencha os valores das guias na
            lista.
          </p>
        </div>
      ) : null}

      {resultado.cnpjsCriados.length ? (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            CNPJs cadastrados automaticamente como filial: {resultado.cnpjsCriados.map((c) => c.cnpj).join(', ')}.
            Ajuste matriz/filial em CNPJs.
          </p>
        </div>
      ) : null}

      {resultado.duplicadas > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[13px] text-muted-foreground">
          <Copy className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{resultado.duplicadas} nota(s) já estavam no sistema e não foram duplicadas.</p>
        </div>
      ) : null}

      {resultado.ignoradas.length ? (
        <div className="overflow-hidden painel">
          <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            Notas fora do critério
          </div>
          <ul className="max-h-64 divide-y divide-border/60 overflow-y-auto">
            {resultado.ignoradas.map((item, i) => (
              <li key={`${item.arquivo}-${i}`} className="px-4 py-2.5 text-[13px]">
                <p className="numeros truncate">{item.numero ? `NF ${item.numero}` : item.arquivo}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{item.motivo}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

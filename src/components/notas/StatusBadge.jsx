import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATUS, STATUS_OPTIONS } from '@/lib/fiscal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TONE = {
  pendente: 'bg-status-pendente/10 text-status-pendente ring-status-pendente/30',
  emitido: 'bg-status-emitido/10 text-status-emitido ring-status-emitido/30',
  pago: 'bg-status-pago/10 text-status-pago ring-status-pago/30',
};

const DOT = {
  pendente: 'bg-status-pendente',
  emitido: 'bg-status-emitido',
  pago: 'bg-status-pago',
};

const classeBadge = (tone) =>
  cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', TONE[tone]);

/** Status da nota. Com `onChange`, vira um menu para trocar o status ali mesmo. */
export default function StatusBadge({ status, onChange }) {
  const info = STATUS[status] || STATUS.a_emitir;

  if (!onChange) {
    return (
      <span className={classeBadge(info.tone)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', DOT[info.tone])} />
        {info.label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Status: ${info.label}. Alterar status`}
          className={cn(classeBadge(info.tone), 'transition-shadow hover:ring-2')}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', DOT[info.tone])} />
          {info.label}
          <ChevronDown className="h-3 w-3 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Alterar status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUS_OPTIONS.map((opcao) => {
          const tone = STATUS[opcao.value].tone;
          return (
            <DropdownMenuItem
              key={opcao.value}
              onSelect={() => opcao.value !== status && onChange(opcao.value)}
              className="cursor-pointer"
            >
              <span className={cn('h-2 w-2 rounded-full', DOT[tone])} />
              <span className="flex-1">{opcao.label}</span>
              {opcao.value === status ? <Check className="h-4 w-4 text-primary" /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

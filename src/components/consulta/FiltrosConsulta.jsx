import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCnpj, nomeEmitente } from '@/lib/fiscal';

const Campo = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {label}
    </span>
    {children}
  </label>
);

export default function FiltrosConsulta({ emitentes, cnpj, onCnpj, busca, onBusca, onBuscar }) {
  return (
    <div className="painel p-4 sm:p-5">
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
        <Campo label="CNPJ emissor">
          <Select value={cnpj || 'todos'} onValueChange={(v) => onCnpj(v === 'todos' ? '' : v)}>
            <SelectTrigger className="h-10 rounded-lg border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os CNPJs</SelectItem>
              {emitentes.map((e) => (
                <SelectItem key={e.id} value={e.cnpj}>
                  {nomeEmitente(e)} · {formatCnpj(e.cnpj)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Número da nota">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => onBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onBuscar();
              }}
              placeholder="Buscar NF"
              inputMode="numeric"
              className="numeros h-10 rounded-lg border-border bg-background pl-9 text-sm"
            />
          </div>
        </Campo>

        <Button type="button" onClick={onBuscar} className="h-10 rounded-lg px-4 text-sm">
          <Search className="h-4 w-4" />
          Consultar
        </Button>
      </div>
    </div>
  );
}

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MESES, UFS, formatCnpj, nomeEmitente } from '@/lib/fiscal';

const Campo = ({ label, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {label}
    </span>
    {children}
  </label>
);

export default function FiltrosNotas({
  emitentes,
  cnpj,
  onCnpj,
  mes,
  onMes,
  ano,
  onAno,
  busca,
  onBusca,
  uf,
  onUf,
  onBuscar,
}) {
  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual + 1, anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3];

  return (
    <div className="painel p-4 sm:p-5">
      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)_92px_104px_minmax(0,1.1fr)_auto]">
        <Campo label="CNPJ emissor" className="col-span-2 sm:col-span-4 lg:col-span-1">
          <Select value={cnpj || undefined} onValueChange={onCnpj} disabled={!emitentes.length}>
            <SelectTrigger className="h-10 rounded-lg border-border bg-background text-sm">
              <SelectValue placeholder="Selecione o CNPJ" />
            </SelectTrigger>
            <SelectContent>
              {emitentes.map((e) => (
                <SelectItem key={e.id} value={e.cnpj}>
                  {nomeEmitente(e)} · {formatCnpj(e.cnpj)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Mês" className="col-span-2 sm:col-span-1">
          <Select value={mes ? String(mes) : 'todos'} onValueChange={(v) => onMes(v === 'todos' ? 0 : Number(v))}>
            <SelectTrigger className="h-10 rounded-lg border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {MESES.map((nome, i) => (
                <SelectItem key={nome} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Ano">
          <Select value={ano ? String(ano) : 'todos'} onValueChange={(v) => onAno(v === 'todos' ? 0 : Number(v))}>
            <SelectTrigger className="numeros h-10 rounded-lg border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="UF destino">
          <Select value={uf || 'todas'} onValueChange={(v) => onUf(v === 'todas' ? '' : v)}>
            <SelectTrigger className="numeros h-10 rounded-lg border-border bg-background text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {UFS.map((sigla) => (
                <SelectItem key={sigla} value={sigla}>
                  {sigla}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Número da nota" className="col-span-2 sm:col-span-1">
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

        <Button type="button" onClick={onBuscar} className="col-span-2 h-10 rounded-lg px-4 text-sm sm:col-span-4 lg:col-span-1">
          <Search className="h-4 w-4" />
          Buscar
        </Button>
      </div>
    </div>
  );
}

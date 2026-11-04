import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MESES, UFS, formatCnpj } from '@/lib/fiscal';

const Campo = ({ label, children, className = '' }) => (
  <label className={`block min-w-0 ${className}`}>
    <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
    {children}
  </label>
);

const gatilho = 'h-10 rounded-lg border-border bg-background text-sm';

const Chip = ({ children, onRemover }) => (
  <button
    type="button"
    onClick={onRemover}
    className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/70"
  >
    {children}
    <X className="h-3 w-3" aria-label="Remover filtro" />
  </button>
);

export default function FiltrosConsolidado({ filtros, onFiltro, onLimpar, anos, opcoesCnpj, rotuloCnpj }) {
  const { cnpj, ano, mes, uf } = filtros;
  const ativos = [
    cnpj && { chave: 'cnpj', texto: rotuloCnpj(cnpj) },
    ano && { chave: 'ano', texto: String(ano) },
    mes && { chave: 'mes', texto: MESES[mes - 1] },
    uf && { chave: 'uf', texto: `UF ${uf}` },
  ].filter(Boolean);

  return (
    <div className="painel p-4 sm:p-5">
      <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
        <Campo label="CNPJ emissor" className="col-span-2 lg:col-span-1">
          <Select value={cnpj || 'todos'} onValueChange={(v) => onFiltro('cnpj', v === 'todos' ? '' : v)}>
            <SelectTrigger className={gatilho}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os CNPJs</SelectItem>
              {opcoesCnpj.map((o) => (
                <SelectItem key={o.cnpj} value={o.cnpj}>
                  {o.rotulo} ({formatCnpj(o.cnpj)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Ano">
          <Select value={ano ? String(ano) : 'todos'} onValueChange={(v) => onFiltro('ano', v === 'todos' ? 0 : Number(v))}>
            <SelectTrigger className={`numeros ${gatilho}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os anos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="Mês">
          <Select value={mes ? String(mes) : 'todos'} onValueChange={(v) => onFiltro('mes', v === 'todos' ? 0 : Number(v))}>
            <SelectTrigger className={gatilho}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os meses</SelectItem>
              {MESES.map((nome, i) => (
                <SelectItem key={nome} value={String(i + 1)}>
                  {nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        <Campo label="UF de destino" className="col-span-2 lg:col-span-1">
          <Select value={uf || 'todas'} onValueChange={(v) => onFiltro('uf', v === 'todas' ? '' : v)}>
            <SelectTrigger className={`numeros ${gatilho}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as UFs</SelectItem>
              {UFS.map((sigla) => (
                <SelectItem key={sigla} value={sigla}>
                  {sigla}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        {ativos.length ? (
          <>
            <span className="mr-1 text-xs text-muted-foreground">Filtrando por</span>
            {ativos.map((a) => (
              <Chip key={a.chave} onRemover={() => onFiltro(a.chave, a.chave === 'ano' || a.chave === 'mes' ? 0 : '')}>
                {a.texto}
              </Chip>
            ))}
            <button
              type="button"
              onClick={onLimpar}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Ver tudo
            </button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            Mostrando o total de todos os CNPJs, anos, meses e UFs. Clique num mês, UF ou CNPJ nos gráficos para filtrar.
          </span>
        )}
      </div>
    </div>
  );
}

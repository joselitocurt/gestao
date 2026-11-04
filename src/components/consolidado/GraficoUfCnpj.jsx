import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatBRL } from '@/lib/fiscal';

const eixo = (valor) => {
  const n = Number(valor) || 0;
  if (n >= 1000) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return String(Math.round(n));
};

const Caixa = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((acc, p) => acc + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground">UF destino {label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="numeros ml-auto pl-3 font-medium text-foreground">{formatBRL(p.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-2 border-t border-border pt-1.5 text-xs">
        <span className="text-muted-foreground">Total</span>
        <span className="numeros ml-auto font-medium">{formatBRL(total)}</span>
      </div>
    </div>
  );
};

export default function GraficoUfCnpj({ dados, series, ufAtiva, onUf }) {
  const [ocultas, setOcultas] = useState(() => new Set());
  const alternar = (chave) =>
    setOcultas((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });

  if (!dados.length) {
    return (
      <div className="flex h-56 items-center justify-center text-[13px] text-muted-foreground">
        Nenhuma nota no período selecionado.
      </div>
    );
  }

  return (
    <div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="uf"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={54}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={eixo}
            />
            <Tooltip content={<Caixa />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.45 }} />
            {series
              .filter((s) => !ocultas.has(s.key))
              .map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="guias"
                  fill={s.color}
                  maxBarSize={52}
                  cursor={onUf ? 'pointer' : undefined}
                  onClick={(d) => onUf?.(d?.payload?.uf === ufAtiva ? '' : d?.payload?.uf)}
                >
                  {dados.map((p) => (
                    <Cell key={p.uf} fillOpacity={!ufAtiva || p.uf === ufAtiva ? 1 : 0.22} />
                  ))}
                </Bar>
              ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
        {series.map((s) => {
          const visivel = !ocultas.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={visivel}
              onClick={() => alternar(s.key)}
              title={visivel ? 'Ocultar no gráfico' : 'Mostrar no gráfico'}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                visivel ? 'border-border text-foreground hover:bg-muted' : 'border-dashed border-border text-muted-foreground/60'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: visivel ? s.color : 'transparent', boxShadow: `inset 0 0 0 1.5px ${s.color}` }}
              />
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

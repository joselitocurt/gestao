import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MESES, formatBRL } from '@/lib/fiscal';

const eixo = (valor) => {
  const n = Number(valor) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}mi`;
  if (n >= 1000) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return String(Math.round(n));
};

const Caixa = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2.5 shadow-lg">
      <p className="text-sm font-semibold">
        {MESES[p.mes - 1]} de {p.ano}
      </p>
      <dl className="numeros mt-1.5 space-y-1 text-xs">
        <div className="flex gap-6">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-sm bg-chart-1" /> DIFAL
          </dt>
          <dd className="ml-auto font-semibold">{formatBRL(p.difal)}</dd>
        </div>
        <div className="flex gap-6">
          <dt className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-sm bg-chart-2" /> FCOP
          </dt>
          <dd className="ml-auto font-semibold">{formatBRL(p.fcop)}</dd>
        </div>
        <div className="flex gap-6 border-t border-border pt-1">
          <dt className="text-muted-foreground">Total ({p.notas} {p.notas === 1 ? 'nota' : 'notas'})</dt>
          <dd className="ml-auto font-semibold">{formatBRL(p.total)}</dd>
        </div>
      </dl>
      <p className="mt-1.5 text-xs text-primary">Clique para filtrar este mês</p>
    </div>
  );
};

/** Linha do tempo mensal (DIFAL + FCOP empilhados). Clicar numa barra filtra pelo mês. */
export default function GraficoMensal({ dados, mesAtivo, anoAtivo, onMes }) {
  const ativo = (p) => !mesAtivo || (p.mes === mesAtivo && (!anoAtivo || p.ano === anoAtivo));
  const clicar = (ponto) => {
    if (!ponto) return;
    onMes(ponto.mes === mesAtivo ? 0 : ponto.mes, ponto.ano);
  };

  if (!dados.some((d) => d.notas > 0)) {
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">Sem notas para os filtros escolhidos.</div>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={eixo}
          />
          <Tooltip content={<Caixa />} cursor={{ fill: 'hsl(var(--accent))', opacity: 0.6 }} />
          <Bar dataKey="difal" name="DIFAL" stackId="m" fill="hsl(var(--chart-1))" cursor="pointer" onClick={(d) => clicar(d?.payload)}>
            {dados.map((p) => (
              <Cell key={`d-${p.ano}-${p.mes}`} fillOpacity={ativo(p) ? 1 : 0.22} />
            ))}
          </Bar>
          <Bar
            dataKey="fcop"
            name="FCOP"
            stackId="m"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
            cursor="pointer"
            onClick={(d) => clicar(d?.payload)}
          >
            {dados.map((p) => (
              <Cell key={`f-${p.ano}-${p.mes}`} fillOpacity={ativo(p) ? 1 : 0.22} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarRange, Gavel, UserX, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import PageHeader from '@/components/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COR_NIVEL, Carregando, NivelPill, Vazio } from '@/components/disciplinar/Niveis';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { NIVEIS } from '@shared/disciplinar.js';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CORES = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

const Indicador = ({ icone: Icone, rotulo, valor, detalhe }) => (
  <div className="painel p-4 sm:p-5">
    <div className="flex items-start justify-between gap-2">
      <p className="text-[13px] leading-snug text-muted-foreground sm:text-sm">{rotulo}</p>
      <span className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground sm:grid">
        <Icone className="h-4 w-4" />
      </span>
    </div>
    <p className="numeros mt-2 font-display text-[28px] leading-none sm:text-[32px]">{valor}</p>
    <p className="mt-1.5 text-xs text-muted-foreground">{detalhe}</p>
  </div>
);

const Filtro = ({ rotulo, valor, onChange, opcoes, largura = 'w-36' }) => (
  <div className={largura}>
    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{rotulo}</p>
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger className="h-10 rounded-lg">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((o) => (
          <SelectItem key={o.valor} value={o.valor}>
            {o.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default function Painel() {
  const d = useDisciplinar();
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [mes, setMes] = useState('todos');
  const [dep, setDep] = useState('todos');

  const calc = useMemo(() => {
    const deps = [...new Set(d.colaboradores.map((c) => c.departamento).filter(Boolean))].sort();
    const anos = [...new Set([String(new Date().getFullYear()), ...d.punicoes.map((p) => String(p.data || '').slice(0, 4)).filter(Boolean)])]
      .sort()
      .reverse();
    const noDep = (p) => dep === 'todos' || d.colaborador(p.colaborador_id)?.departamento === dep;
    const doAno = d.punicoes.filter((p) => noDep(p) && String(p.data || '').slice(0, 4) === ano);
    const periodo = doAno.filter((p) => mes === 'todos' || String(p.data).slice(5, 7) === mes);
    const ativos = d.colaboradores.filter((c) => c.status !== 'Demitido' && (dep === 'todos' || c.departamento === dep));
    const abertos = [];
    for (const c of ativos) for (const f of d.fluxos(c.id)) if (f.nivel > 0) abertos.push({ c, ...f });
    const dist = [0, 0, 0, 0, 0, 0, 0];
    periodo.forEach((p) => {
      dist[Number(p.nivel)] += 1;
    });
    const atencao = abertos.filter((f) => f.nivel >= 4).sort((a, b) => b.nivel - a.nivel || a.ciclo.fim.localeCompare(b.ciclo.fim));
    const recentes = d.punicoes
      .filter(noDep)
      .slice()
      .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.created_date).localeCompare(String(a.created_date)))
      .slice(0, 8);

    // Gráfico: punições por mês nos 5 motivos mais recorrentes do ano (+ Outros).
    const contagem = {};
    doAno.forEach((p) => {
      contagem[p.motivo_id] = (contagem[p.motivo_id] || 0) + 1;
    });
    const top = Object.keys(contagem)
      .sort((a, b) => contagem[b] - contagem[a] || d.nomeMotivo(a).localeCompare(d.nomeMotivo(b)))
      .slice(0, 5);
    const series = top.map((id, i) => ({ chave: id, nome: d.nomeMotivo(id), cor: CORES[i] }));
    const temOutros = doAno.some((p) => !top.includes(p.motivo_id));
    if (temOutros) series.push({ chave: 'outros', nome: 'Outros', cor: 'hsl(var(--muted-foreground) / 0.45)' });
    const grafico = MESES.map((rotulo, i) => {
      const linha = { rotulo };
      const doMes = doAno.filter((p) => Number(String(p.data).slice(5, 7)) === i + 1);
      top.forEach((id) => {
        linha[id] = doMes.filter((p) => p.motivo_id === id).length;
      });
      if (temOutros) linha.outros = doMes.filter((p) => !top.includes(p.motivo_id)).length;
      return linha;
    });

    return {
      deps,
      anos,
      periodo,
      emAcompanhamento: new Set(abertos.map((f) => f.c.id)).size,
      dist,
      diasSuspensao: periodo.filter((p) => Number(p.nivel) === 5).reduce((s, p) => s + (Number(p.dias_suspensao) || 0), 0),
      atencao,
      recentes,
      series,
      grafico,
      vazioAno: !doAno.length,
    };
  }, [d, ano, mes, dep]);

  if (d.carregando) return <Carregando />;
  const maxDist = Math.max(1, ...calc.dist);
  const rotuloPeriodo = `${mes === 'todos' ? '' : `${MESES_LONGOS[Number(mes) - 1]} de `}${ano}`;

  return (
    <div>
      <PageHeader titulo="Painel disciplinar" descricao="Visão geral do quadro disciplinar: punições do período, níveis e colaboradores em atenção." />

      <div className="painel mt-6 flex flex-wrap items-end gap-3 p-4">
        <Filtro rotulo="Ano" valor={ano} onChange={setAno} opcoes={calc.anos.map((a) => ({ valor: a, rotulo: a }))} largura="w-28" />
        <Filtro
          rotulo="Mês"
          valor={mes}
          onChange={setMes}
          opcoes={[{ valor: 'todos', rotulo: 'Todos os meses' }, ...MESES_LONGOS.map((m, i) => ({ valor: String(i + 1).padStart(2, '0'), rotulo: m }))]}
          largura="w-44"
        />
        <Filtro
          rotulo="Departamento"
          valor={dep}
          onChange={setDep}
          opcoes={[{ valor: 'todos', rotulo: 'Todos' }, ...calc.deps.map((x) => ({ valor: x, rotulo: x }))]}
          largura="w-56"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Indicador icone={CalendarRange} rotulo="Punições no período" valor={calc.periodo.length} detalhe={rotuloPeriodo} />
        <Indicador icone={Users} rotulo="Em acompanhamento" valor={calc.emAcompanhamento} detalhe="com ao menos um ciclo aberto hoje" />
        <Indicador icone={Gavel} rotulo="Suspensões no período" valor={calc.dist[5]} detalhe={`${calc.diasSuspensao} dia(s) no total`} />
        <Indicador icone={UserX} rotulo="Demissões no período" valor={calc.dist[6]} detalhe="por progressão disciplinar" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="painel p-5">
          <h2 className="font-display text-lg">Punições por mês em {ano}</h2>
          <p className="text-xs text-muted-foreground">Pelos motivos mais recorrentes do ano</p>
          {calc.vazioAno ? (
            <Vazio>Sem punições neste ano.</Vazio>
          ) : (
            <>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calc.grafico} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="24%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="rotulo" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.6 }}
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                      formatter={(v, nome) => [v, nome]}
                    />
                    {calc.series.map((s, i) => (
                      <Bar
                        key={s.chave}
                        dataKey={s.chave}
                        name={s.nome}
                        stackId="m"
                        fill={s.cor}
                        radius={i === calc.series.length - 1 ? [4, 4, 0, 0] : 0}
                        maxBarSize={30}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {calc.series.map((s) => (
                  <span key={s.chave} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.cor }} />
                    {s.nome}
                  </span>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="painel p-5">
          <h2 className="font-display text-lg">Distribuição por nível</h2>
          <p className="text-xs text-muted-foreground">{rotuloPeriodo}</p>
          <div className="mt-4 space-y-3">
            {NIVEIS.slice(1).map((n) => (
              <div key={n.n} className="grid grid-cols-[84px_minmax(0,1fr)_32px] items-center gap-3 text-sm" title={n.nome}>
                <span className="truncate">{n.curto}</span>
                <div className="h-3.5 overflow-hidden rounded bg-muted">
                  <div className="h-full rounded-r" style={{ width: `${(calc.dist[n.n] / maxDist) * 100}%`, background: COR_NIVEL[n.n] }} />
                </div>
                <span className="numeros text-right font-semibold">{calc.dist[n.n]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="painel overflow-hidden">
          <h2 className="px-5 pt-5 font-display text-lg">Registros recentes</h2>
          {calc.recentes.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-border bg-muted/50 text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2 font-semibold">Data</th>
                    <th className="px-3 py-2 font-semibold">Referência</th>
                    <th className="px-3 py-2 font-semibold">Colaborador</th>
                    <th className="px-3 py-2 font-semibold">Motivo</th>
                    <th className="px-5 py-2 font-semibold">Nível</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.recentes.map((p) => (
                    <tr key={p.id} className="border-b border-border/60 last:border-0">
                      <td className="numeros whitespace-nowrap px-5 py-2.5">{fmt(p.data)}</td>
                      <td className="numeros whitespace-nowrap px-3 py-2.5 text-muted-foreground">{p.referencia}</td>
                      <td className="px-3 py-2.5">
                        <Link to={`/disciplinar/consulta?c=${p.colaborador_id}`} className="font-medium hover:text-primary hover:underline">
                          {d.colaborador(p.colaborador_id)?.nome || '—'}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{d.nomeMotivo(p.motivo_id)}</td>
                      <td className="px-5 py-2.5">
                        <NivelPill nivel={p.nivel} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Vazio>Nenhuma punição registrada ainda.</Vazio>
          )}
        </section>

        <section className="painel p-5">
          <h2 className="flex items-center gap-2 font-display text-lg">
            <AlertTriangle className="h-4 w-4 text-status-pendente" /> Em atenção
          </h2>
          <p className="text-xs text-muted-foreground">Colaboradores em Escrita 3 ou acima no ciclo atual</p>
          <div className="mt-3 space-y-2">
            {calc.atencao.length ? (
              calc.atencao.map((f) => (
                <Link
                  key={`${f.c.id}-${f.motivoId}`}
                  to={`/disciplinar/consulta?c=${f.c.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{f.c.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.nomeMotivo(f.motivoId)} · ciclo até {fmt(f.ciclo.fim)}
                    </span>
                  </span>
                  <NivelPill nivel={f.nivel} />
                </Link>
              ))
            ) : (
              <Vazio>Nenhum colaborador em nível crítico.</Vazio>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

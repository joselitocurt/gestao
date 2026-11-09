import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, RotateCcw, X } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import MatrizInterestadual from '@/components/aliquotas/MatrizInterestadual';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAcesso } from '@/lib/AcessoContext';
import { carregarAliquotas, formatPct } from '@/lib/aliquotas';
import { ALIQUOTAS_PADRAO, INTERESTADUAL, REGIOES } from '@shared/difal.js';
import { cn } from '@/lib/utils';

const PADRAO = Object.fromEntries(ALIQUOTAS_PADRAO.map((a) => [a.uf, a]));
const lerNumero = (texto) => {
  const n = Number(String(texto).trim().replace('%', '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};
const paraCampo = (n) => String(n ?? '').replace('.', ',');

function LinhaAliquota({ aliq, podeEditar, onSalvar }) {
  const [editando, setEditando] = useState(false);
  const [interna, setInterna] = useState('');
  const [fcp, setFcp] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const padrao = PADRAO[aliq.uf];
  const alterada = padrao && (padrao.interna !== aliq.interna || padrao.fcp !== aliq.fcp);

  const abrir = () => {
    setInterna(paraCampo(aliq.interna));
    setFcp(paraCampo(aliq.fcp));
    setErro('');
    setEditando(true);
  };

  const salvar = async (valores) => {
    const i = lerNumero(valores.interna);
    const f = lerNumero(valores.fcp);
    if (!(i >= 0 && i < 100) || !(f >= 0 && f < 100)) {
      setErro('Use valores entre 0 e 99,99 (ex.: 20,5).');
      return;
    }
    setSalvando(true);
    try {
      await onSalvar(aliq, { interna: i, fcp: f });
      setEditando(false);
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const teclas = (e) => {
    if (e.key === 'Enter') salvar({ interna, fcp });
    if (e.key === 'Escape') setEditando(false);
  };

  return (
    <tr className="border-t border-border/60">
      <td className="py-2.5 pl-4 pr-3 sm:pl-5">
        <span className="numeros rounded bg-muted px-1.5 py-0.5 text-xs font-bold">{aliq.uf}</span>
      </td>
      <td className="py-2.5 pr-3 text-sm">
        {aliq.nome}
        {alterada ? (
          <span className="ml-2 rounded bg-dourado/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--dourado))]">
            alterada
          </span>
        ) : null}
        {erro ? <p className="mt-1 text-xs text-destructive">{erro}</p> : null}
      </td>
      {editando ? (
        <>
          <td className="py-1.5 pr-3 text-right">
            <Input
              autoFocus
              value={interna}
              onChange={(e) => setInterna(e.target.value)}
              onKeyDown={teclas}
              inputMode="decimal"
              aria-label={`Alíquota interna de ${aliq.uf}`}
              className="numeros ml-auto h-8 w-20 rounded-md text-right"
            />
          </td>
          <td className="py-1.5 pr-3 text-right">
            <Input
              value={fcp}
              onChange={(e) => setFcp(e.target.value)}
              onKeyDown={teclas}
              inputMode="decimal"
              aria-label={`FCP de ${aliq.uf}`}
              className="numeros ml-auto h-8 w-20 rounded-md text-right"
            />
          </td>
          <td className="py-1.5 pr-4 text-right sm:pr-5">
            <div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => salvar({ interna, fcp })} disabled={salvando} aria-label="Salvar">
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-status-pago" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditando(false)} disabled={salvando} aria-label="Cancelar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="numeros py-2.5 pr-3 text-right text-sm font-semibold">{formatPct(aliq.interna)}</td>
          <td className="numeros py-2.5 pr-3 text-right text-sm">{aliq.fcp ? formatPct(aliq.fcp) : <span className="text-muted-foreground">—</span>}</td>
          <td className="py-1.5 pr-4 text-right sm:pr-5">
            {podeEditar ? (
              <div className="flex justify-end gap-1">
                {alterada ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground"
                    onClick={() => salvar({ interna: padrao.interna, fcp: padrao.fcp })}
                    title={`Voltar ao padrão (${formatPct(padrao.interna)} e FCP ${formatPct(padrao.fcp)})`}
                    aria-label={`Voltar ${aliq.uf} ao padrão`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={abrir} aria-label={`Editar ${aliq.uf}`}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </td>
        </>
      )}
    </tr>
  );
}

export default function Aliquotas() {
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [aliquotas, setAliquotas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setAliquotas(Object.values(await carregarAliquotas({ recarregar: true })));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = async (aliq, valores) => {
    const salva = await api.entities.Aliquota.update(aliq.id, valores);
    setAliquotas((atuais) => atuais.map((a) => (a.id === salva.id ? salva : a)));
    await carregarAliquotas({ recarregar: true });
    toast({
      title: `${aliq.uf}: interna ${formatPct(salva.interna)} · FCP ${formatPct(salva.fcp)}`,
      description: `As notas "A emitir" com destino ${aliq.uf} foram recalculadas.`,
    });
  };

  const porRegiao = REGIOES.map((r) => ({ regiao: r, itens: aliquotas.filter((a) => a.regiao === r) })).filter((g) => g.itens.length);

  return (
    <div>
      <PageHeader
        titulo="Alíquotas"
        descricao="Parâmetros do cálculo do DIFAL por fora: alíquota interna e FCP de cada UF de destino e a regra das alíquotas interestaduais."
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="painel overflow-hidden lg:row-span-2">
          <div className="border-b border-border px-4 py-3.5 sm:px-5">
            <h2 className="font-display text-lg">Interna e FCP por UF de destino</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Alíquotas gerais de cada estado. Ao alterar uma UF, as notas ainda "A emitir" com esse destino são recalculadas; as
              já emitidas mantêm o cálculo da emissão.
            </p>
          </div>
          {carregando ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="py-2 pl-4 pr-3 text-left font-semibold sm:pl-5">UF</th>
                  <th className="py-2 pr-3 text-left font-semibold">Estado</th>
                  <th className="py-2 pr-3 text-right font-semibold">Interna</th>
                  <th className="py-2 pr-3 text-right font-semibold">FCP</th>
                  <th className="w-[88px] py-2 pr-4 sm:pr-5" />
                </tr>
              </thead>
              {porRegiao.map((g) => (
                <tbody key={g.regiao}>
                  <tr>
                    <td colSpan={5} className="bg-muted/50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground sm:px-5">
                      {g.regiao}
                    </td>
                  </tr>
                  {g.itens.map((a) => (
                    <LinhaAliquota key={a.id} aliq={a} podeEditar={podeEditar} onSalvar={salvar} />
                  ))}
                </tbody>
              ))}
            </table>
          )}
        </section>

        <section className="painel p-5">
          <h2 className="font-display text-lg">Memória de cálculo</h2>
          <p className="mt-1 text-xs text-muted-foreground">Cálculo por fora (base única), venda interestadual a consumidor final.</p>
          <dl className="mt-4 space-y-2.5 text-sm">
            {[
              ['Base de cálculo', 'Valor total da nota'],
              ['DIFAL', 'Base × (alíquota interna do destino − alíquota interestadual)'],
              ['FCOP', 'Base × alíquota do FCP do destino'],
              ['Total da guia', 'DIFAL + FCOP'],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 rounded-lg bg-muted/50 px-3 py-2">
                <dt className="font-semibold">{k}</dt>
                <dd className="text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Valores arredondados em 2 casas. Mesma UF de origem e destino não gera DIFAL. Produtos com alíquota específica,
            redução de base ou isenção seguem o regulamento de cada estado; na maioria deles o FCP vale só para os produtos
            listados em lei. Na nota, é possível marcar "mercadoria importada" (4%) ou "sem FCP".
          </p>
        </section>

        <section className="painel p-5">
          <h2 className="font-display text-lg">Alíquotas interestaduais</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex gap-3">
              <span className="numeros w-10 shrink-0 rounded bg-status-emitido/15 py-0.5 text-center font-semibold text-status-emitido">
                {INTERESTADUAL.reduzida}%
              </span>
              Saídas do Sul e do Sudeste (exceto ES) para Norte, Nordeste, Centro-Oeste e Espírito Santo.
            </li>
            <li className="flex gap-3">
              <span className="numeros w-10 shrink-0 rounded bg-dourado/15 py-0.5 text-center font-semibold text-[hsl(var(--dourado))]">
                {INTERESTADUAL.geral}%
              </span>
              Todas as demais operações entre estados.
            </li>
            <li className="flex gap-3">
              <span className="numeros w-10 shrink-0 rounded bg-muted py-0.5 text-center font-semibold">{INTERESTADUAL.importada}%</span>
              Mercadoria importada ou com conteúdo de importação acima de 40% (Resolução do Senado 13/2012).
            </li>
          </ul>
          <p className="mb-2 mt-5 text-xs text-muted-foreground">Linha = UF de origem · coluna = UF de destino</p>
          <MatrizInterestadual />
        </section>
      </div>
    </div>
  );
}

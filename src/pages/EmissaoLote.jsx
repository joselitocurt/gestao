import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, CreditCard, Layers, Loader2, ReceiptText, X } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import FiltrosNotas from '@/components/notas/FiltrosNotas';
import ListaSelecao from '@/components/lote/ListaSelecao';
import LoteEdicao from '@/components/lote/LoteEdicao';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { STATUS, formatBRL, nomeEmitente, ordenarEmitentes, totalGuia } from '@/lib/fiscal';
import { filtroLista, filtroPeriodo } from '@/lib/filtroNotas';
import { cn } from '@/lib/utils';

const POR_PAGINA = 100;
const LIMITE_SELECAO = 2000;

const OPCOES_STATUS = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'a_emitir', rotulo: 'A emitir', cor: 'bg-status-pendente' },
  { valor: 'emitido', rotulo: 'Emitida', cor: 'bg-status-emitido' },
  { valor: 'pago', rotulo: 'Pago', cor: 'bg-status-pago' },
];

export default function EmissaoLote() {
  const { toast } = useToast();
  const [emitentes, setEmitentes] = useState([]);
  // Mesmos filtros da Apuração, todos começando em "Todos".
  const [cnpj, setCnpj] = useState('');
  const [mes, setMes] = useState(0);
  const [ano, setAno] = useState(0);
  const [uf, setUf] = useState('');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');

  const [notas, setNotas] = useState([]);
  const [contagem, setContagem] = useState({});
  const [cursor, setCursor] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [selecionandoTudo, setSelecionandoTudo] = useState(false);

  // Seleção guardada por id, com a nota inteira, para valer entre filtros diferentes.
  const [selecionadas, setSelecionadas] = useState(() => new Map());
  const [lote, setLote] = useState(null); // { aba } quando a subpágina está aberta

  useEffect(() => {
    api.entities.Emitente.list().then((itens) => setEmitentes(ordenarEmitentes(itens)));
  }, []);

  const filtros = useMemo(() => ({ cnpj, mes, ano, uf, busca, status }), [cnpj, mes, ano, uf, busca, status]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [lista, agregado] = await Promise.all([
        api.entities.NotaFiscal.filter(filtroLista(filtros), { sort: '-data_emissao', limit: POR_PAGINA }),
        api.entities.NotaFiscal.aggregate({ query: filtroPeriodo(filtros), groupBy: 'status' }),
      ]);
      setNotas(lista.items || []);
      setCursor(lista.has_more ? lista.next_cursor : null);
      setContagem(Object.fromEntries((agregado.rows || []).map((r) => [r.status, r.count])));
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  useEffect(() => {
    if (lote) return undefined;
    const timer = setTimeout(carregar, busca.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [carregar, lote, busca]);

  const carregarMais = async () => {
    setCarregandoMais(true);
    try {
      const pagina = await api.entities.NotaFiscal.filter(filtroLista(filtros), { sort: '-data_emissao', limit: POR_PAGINA, cursor });
      setNotas((atuais) => [...atuais, ...(pagina.items || [])]);
      setCursor(pagina.has_more ? pagina.next_cursor : null);
    } finally {
      setCarregandoMais(false);
    }
  };

  const emissorDe = useCallback(
    (n) => nomeEmitente(emitentes.find((e) => e.cnpj === n.emitente_cnpj) || { cnpj: n.emitente_cnpj }),
    [emitentes],
  );

  // ---------------------------------------------------------------- seleção

  const alternar = (nota) =>
    setSelecionadas((atual) => {
      const nova = new Map(atual);
      if (nova.has(nota.id)) nova.delete(nota.id);
      else nova.set(nota.id, nota);
      return nova;
    });

  const alternarPagina = (marcar) =>
    setSelecionadas((atual) => {
      const nova = new Map(atual);
      notas.forEach((n) => (marcar ? nova.set(n.id, n) : nova.delete(n.id)));
      return nova;
    });

  const totalFiltro = busca.trim()
    ? null
    : Object.entries(contagem)
        .filter(([s]) => !status || s === status)
        .reduce((acc, [, n]) => acc + n, 0);

  // Marca todas as notas do filtro (carregando as páginas que faltam).
  const selecionarTodasDoFiltro = async () => {
    setSelecionandoTudo(true);
    try {
      const todas = [...notas];
      let proximo = cursor;
      while (proximo && todas.length < LIMITE_SELECAO) {
        const pagina = await api.entities.NotaFiscal.filter(filtroLista(filtros), { sort: '-data_emissao', limit: 500, cursor: proximo });
        todas.push(...(pagina.items || []));
        proximo = pagina.has_more ? pagina.next_cursor : null;
      }
      setSelecionadas((atual) => {
        const nova = new Map(atual);
        todas.slice(0, LIMITE_SELECAO).forEach((n) => nova.set(n.id, n));
        return nova;
      });
      if (proximo) {
        toast({ title: `Seleção limitada a ${LIMITE_SELECAO.toLocaleString('pt-BR')} notas por lote` });
      }
    } finally {
      setSelecionandoTudo(false);
    }
  };

  const listaSelecionada = [...selecionadas.values()];
  const resumoSelecao = listaSelecionada.reduce(
    (acc, n) => {
      acc.guia += totalGuia(n);
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    },
    { guia: 0 },
  );

  // ---------------------------------------------------------------- subpágina

  if (lote) {
    return (
      <LoteEdicao
        key={lote.chave}
        notas={listaSelecionada}
        abaInicial={lote.aba}
        emissorDe={emissorDe}
        onVoltar={() => setLote(null)}
        onRemover={(id) =>
          setSelecionadas((atual) => {
            const nova = new Map(atual);
            nova.delete(id);
            return nova;
          })
        }
        onSalvo={(salvas) =>
          setSelecionadas((atual) => {
            const nova = new Map(atual);
            salvas.forEach((n) => nova.has(n.id) && nova.set(n.id, n));
            return nova;
          })
        }
      />
    );
  }

  const filtrado = Boolean(cnpj || mes || ano || uf || busca.trim() || status);
  const faltamNoFiltro = totalFiltro !== null && totalFiltro > notas.length;

  return (
    <div className={cn(selecionadas.size && 'pb-24')}>
      <PageHeader
        titulo="Emissão em lote"
        descricao="Selecione as notas para lançar DIFAL e FCOP de várias de uma vez, ou para dar baixa nos pagamentos com o comprovante."
      />

      <div className="mt-6">
        <FiltrosNotas
          emitentes={emitentes}
          cnpj={cnpj}
          onCnpj={setCnpj}
          mes={mes}
          onMes={setMes}
          ano={ano}
          onAno={setAno}
          busca={busca}
          onBusca={setBusca}
          uf={uf}
          onUf={setUf}
          onBuscar={carregar}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-lg bg-muted p-1" role="group" aria-label="Filtrar por status">
          {OPCOES_STATUS.map((o) => {
            const qtd = o.valor ? contagem[o.valor] || 0 : Object.values(contagem).reduce((a, n) => a + n, 0);
            return (
              <button
                key={o.rotulo}
                type="button"
                aria-pressed={status === o.valor}
                onClick={() => setStatus(o.valor)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                  status === o.valor ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {o.cor ? <span className={cn('h-2 w-2 rounded-full', o.cor)} /> : null}
                {o.rotulo}
                <span className="numeros text-xs font-medium text-muted-foreground">{qtd.toLocaleString('pt-BR')}</span>
              </button>
            );
          })}
        </div>

        <p className="numeros text-sm text-muted-foreground">
          {!carregando && notas.length
            ? totalFiltro !== null && notas.length < totalFiltro
              ? `mostrando ${notas.length.toLocaleString('pt-BR')} de ${totalFiltro.toLocaleString('pt-BR')}`
              : `${notas.length.toLocaleString('pt-BR')} ${notas.length === 1 ? 'nota' : 'notas'}`
            : null}
        </p>
      </div>

      {faltamNoFiltro && !carregando ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm text-accent-foreground">
          <Layers className="h-4 w-4" />
          O filtro encontrou {totalFiltro.toLocaleString('pt-BR')} notas.
          <button
            type="button"
            onClick={selecionarTodasDoFiltro}
            disabled={selecionandoTudo}
            className="font-semibold underline-offset-2 hover:underline disabled:opacity-60"
          >
            {selecionandoTudo ? 'Selecionando…' : `Selecionar todas as ${Math.min(totalFiltro, LIMITE_SELECAO).toLocaleString('pt-BR')}`}
          </button>
        </div>
      ) : null}

      <ListaSelecao
        notas={notas}
        carregando={carregando}
        selecionadas={selecionadas}
        onAlternar={alternar}
        onAlternarPagina={alternarPagina}
        emissorDe={emissorDe}
        filtrado={filtrado}
      />

      {cursor && !carregando ? (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={carregarMais} disabled={carregandoMais} className="rounded-lg">
            {carregandoMais ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
            Carregar mais notas
          </Button>
        </div>
      ) : null}

      {/* Barra de ações da seleção */}
      {selecionadas.size ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 shadow-[0_-8px_24px_-12px_hsl(var(--foreground)/0.25)] backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 sm:px-8">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {selecionadas.size.toLocaleString('pt-BR')} {selecionadas.size === 1 ? 'nota selecionada' : 'notas selecionadas'}
              </p>
              <p className="numeros truncate text-xs text-muted-foreground">
                Guias {formatBRL(resumoSelecao.guia)}
                {['a_emitir', 'emitido', 'pago']
                  .filter((s) => resumoSelecao[s])
                  .map((s) => ` | ${STATUS[s].label}: ${resumoSelecao[s]}`)
                  .join('')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelecionadas(new Map())}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Limpar seleção
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setLote({ aba: 'pagar', chave: Date.now() })}>
                <CreditCard className="h-4 w-4" />
                Baixar pagamentos
              </Button>
              <Button onClick={() => setLote({ aba: 'emitir', chave: Date.now() })}>
                <ReceiptText className="h-4 w-4" />
                Emitir lote
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

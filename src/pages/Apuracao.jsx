import React, { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import FiltrosNotas from '@/components/notas/FiltrosNotas';
import ResumoNotas from '@/components/notas/ResumoNotas';
import TabelaNotas from '@/components/notas/TabelaNotas';
import NotaDetalheSheet from '@/components/notas/NotaDetalheSheet';
import EditarNotaDialog from '@/components/notas/EditarNotaDialog';
import ExcluirNotaDialog from '@/components/notas/ExcluirNotaDialog';
import { useToast } from '@/components/ui/use-toast';
import { useAcesso } from '@/lib/AcessoContext';
import { MESES, STATUS, nomeEmitente, ordenarEmitentes } from '@/lib/fiscal';

const POR_PAGINA = 100;

export default function Apuracao() {
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [emitentes, setEmitentes] = useState([]);
  const [cnpj, setCnpj] = useState('');
  // Todos os filtros começam em "Todos": a lista abre com todas as notas.
  const [mes, setMes] = useState(0);
  const [ano, setAno] = useState(0);
  const [busca, setBusca] = useState('');
  const [uf, setUf] = useState('');
  const [status, setStatus] = useState('');
  const [notas, setNotas] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [filtroAtual, setFiltroAtual] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [apagando, setApagando] = useState(null);

  useEffect(() => {
    api.entities.Emitente.list().then((itens) => {
      const ordenados = ordenarEmitentes(itens);
      setEmitentes(ordenados);
    });
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    // Período calculado sobre a data de emissão da nota
    const base = {};
    if (cnpj) base.emitente_cnpj = cnpj;
    if (uf) base.destinatario_uf = uf;

    const porAnoMes = {};
    if (mes) porAnoMes.mes = mes;
    if (ano) porAnoMes.ano = ano;

    const mm = mes ? String(mes).padStart(2, '0') : null;
    let porData = null;
    if (ano && mm) {
      const ultimoDia = String(new Date(ano, mes, 0).getDate()).padStart(2, '0');
      porData = { $gte: `${ano}-${mm}-01`, $lte: `${ano}-${mm}-${ultimoDia}` };
    } else if (ano) {
      porData = { $gte: `${ano}-01-01`, $lte: `${ano}-12-31` };
    }

    if (porData || mes) {
      base.$or = [...(porData ? [{ data_emissao: porData }] : []), ...(mes || ano ? [porAnoMes] : [])];
    }
    const termo = busca.trim();
    const filtroLista = { ...base };
    if (termo) filtroLista.numero = { $regex: termo };
    if (status) filtroLista.status = status;
    try {
      const [lista, agregado] = await Promise.all([
        api.entities.NotaFiscal.filter(filtroLista, { sort: '-data_emissao', limit: POR_PAGINA }),
        api.entities.NotaFiscal.aggregate({ query: base, groupBy: 'status', sum: ['valor_difal', 'valor_fcop', 'difal_calculado', 'fcop_calculado'] }),
      ]);
      setNotas(lista.items || []);
      setCursor(lista.has_more ? lista.next_cursor : null);
      setFiltroAtual(filtroLista);
      setResumo(agregado?.rows || []);
    } finally {
      setCarregando(false);
    }
  }, [cnpj, ano, mes, busca, uf, status]);

  useEffect(() => {
    const timer = setTimeout(carregar, busca.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [carregar]);

  // Próxima página da lista (mais recentes primeiro).
  const carregarMais = async () => {
    if (!cursor || !filtroAtual) return;
    setCarregandoMais(true);
    try {
      const pagina = await api.entities.NotaFiscal.filter(filtroAtual, { sort: '-data_emissao', limit: POR_PAGINA, cursor });
      setNotas((atuais) => [...atuais, ...(pagina.items || [])]);
      setCursor(pagina.has_more ? pagina.next_cursor : null);
    } finally {
      setCarregandoMais(false);
    }
  };

  // Troca rápida de status direto na linha da nota.
  const trocarStatus = async (nota, novo) => {
    const dados = { status: novo };
    if (novo === 'pago' && !nota.data_pagamento) dados.data_pagamento = new Date().toISOString().slice(0, 10);
    // Fora de "Pago" a nota deixa de ter data de pagamento (senão o status automático voltaria para Pago).
    if (novo !== 'pago' && nota.data_pagamento) dados.data_pagamento = null;
    setNotas((atuais) => atuais.map((n) => (n.id === nota.id ? { ...n, ...dados } : n)));
    try {
      await api.entities.NotaFiscal.update(nota.id, dados);
      toast({ title: `NF ${nota.numero}: ${STATUS[novo].label}` });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Status não alterado', description: e.message });
    }
    carregar();
  };

  const emitenteAtual = emitentes.find((e) => e.cnpj === cnpj);
  // Total da lista (para "mostrando X de Y"); com busca por número não há total pronto.
  const totalLista = busca.trim()
    ? null
    : resumo.filter((r) => !status || r.status === status).reduce((acc, r) => acc + (r.count || 0), 0);
  const periodo = mes
    ? `${MESES[mes - 1]}${ano ? ` de ${ano}` : ', todos os anos'}`
    : ano
      ? `Todos os meses de ${ano}`
      : 'Todos os períodos';

  return (
    <div>
      <PageHeader
        titulo="Apuração DIFAL e FCOP"
        descricao="Notas a consumidor final (pessoa física) com destino fora da UF do emissor."
        contexto={
          !cnpj ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Todos os CNPJs
            </span>
          ) : emitenteAtual ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {nomeEmitente(emitenteAtual)} — {emitenteAtual.tipo === 'matriz' ? 'matriz' : 'filial'} em{' '}
              {emitenteAtual.uf}
            </span>
          ) : null
        }
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

      <ResumoNotas resumo={resumo} statusAtivo={status} onStatus={setStatus} />

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg">
          Notas emitidas
          {status ? <span className="ml-2 text-sm font-medium text-muted-foreground">({STATUS[status].label})</span> : null}
        </h2>
        <p className="numeros text-sm text-muted-foreground">
          {periodo}
          {!carregando && totalLista !== null && notas.length ? (
            <span className="ml-2">
              {notas.length < totalLista
                ? `mostrando ${notas.length.toLocaleString('pt-BR')} de ${totalLista.toLocaleString('pt-BR')}`
                : `${totalLista.toLocaleString('pt-BR')} ${totalLista === 1 ? 'nota' : 'notas'}`}
            </span>
          ) : null}
        </p>
      </div>

      <TabelaNotas
        notas={notas}
        loading={carregando}
        filtrado={Boolean(status || busca.trim() || cnpj || mes || ano || uf)}
        podeEditar={podeEditar}
        emitenteDe={cnpj ? null : (c) => emitentes.find((e) => e.cnpj === c)}
        onSelect={setSelecionada}
        onEdit={setEditando}
        onDelete={setApagando}
        onStatus={trocarStatus}
      />

      {cursor && !carregando ? (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={carregarMais} disabled={carregandoMais} className="rounded-lg">
            {carregandoMais ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
            Carregar mais notas
          </Button>
        </div>
      ) : null}

      <NotaDetalheSheet
        nota={selecionada}
        ufEmitente={emitentes.find((e) => e.cnpj === selecionada?.emitente_cnpj)?.uf}
        somenteLeitura={!podeEditar}
        onClose={() => setSelecionada(null)}
        onSaved={() => {
          setSelecionada(null);
          carregar();
        }}
      />

      <EditarNotaDialog
        nota={editando}
        onClose={() => setEditando(null)}
        onSaved={() => {
          setEditando(null);
          carregar();
        }}
      />

      <ExcluirNotaDialog
        nota={apagando}
        onClose={() => setApagando(null)}
        onDeleted={() => {
          setApagando(null);
          carregar();
        }}
      />
    </div>
  );
}

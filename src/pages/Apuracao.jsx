import React, { useCallback, useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
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

const hoje = new Date();

export default function Apuracao() {
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [emitentes, setEmitentes] = useState([]);
  const [cnpj, setCnpj] = useState('');
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [busca, setBusca] = useState('');
  const [uf, setUf] = useState('');
  const [status, setStatus] = useState('');
  const [notas, setNotas] = useState([]);
  const [resumo, setResumo] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState(null);
  const [editando, setEditando] = useState(null);
  const [apagando, setApagando] = useState(null);

  useEffect(() => {
    api.entities.Emitente.list().then((itens) => {
      const ordenados = ordenarEmitentes(itens);
      setEmitentes(ordenados);
      setCnpj((atual) => atual || ordenados[0]?.cnpj || '');
      if (!ordenados.length) setCarregando(false);
    });
  }, []);

  const carregar = useCallback(async () => {
    if (!cnpj) {
      setNotas([]);
      setResumo([]);
      return;
    }
    setCarregando(true);
    // Período calculado sobre a data de emissão da nota
    const base = { emitente_cnpj: cnpj };
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
        api.entities.NotaFiscal.filter(filtroLista, { sort: 'numero', limit: 500 }),
        api.entities.NotaFiscal.aggregate({ query: base, groupBy: 'status', sum: ['valor_difal', 'valor_fcop'] }),
      ]);
      setNotas(
        [...(lista.items || [])].sort((a, b) =>
          String(a.numero).localeCompare(String(b.numero), 'pt-BR', { numeric: true }),
        ),
      );
      setResumo(agregado?.rows || []);
    } finally {
      setCarregando(false);
    }
  }, [cnpj, ano, mes, busca, uf, status]);

  useEffect(() => {
    const timer = setTimeout(carregar, busca.trim() ? 350 : 0);
    return () => clearTimeout(timer);
  }, [carregar]);

  // Troca rápida de status direto na linha da nota.
  const trocarStatus = async (nota, novo) => {
    const dados = { status: novo };
    if (novo === 'pago' && !nota.data_pagamento) dados.data_pagamento = new Date().toISOString().slice(0, 10);
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
          emitenteAtual ? (
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
        <p className="text-sm text-muted-foreground">{periodo}</p>
      </div>

      <TabelaNotas
        notas={notas}
        loading={carregando}
        filtrado={Boolean(status || busca.trim())}
        podeEditar={podeEditar}
        onSelect={setSelecionada}
        onEdit={setEditando}
        onDelete={setApagando}
        onStatus={trocarStatus}
      />

      <NotaDetalheSheet
        nota={selecionada}
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

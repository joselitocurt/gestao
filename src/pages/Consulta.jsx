import PageHeader from '@/components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { api } from '@/api/client';
import FiltrosConsulta from '@/components/consulta/FiltrosConsulta';
import NotaConsultaCard from '@/components/consulta/NotaConsultaCard';
import { ordenarEmitentes } from '@/lib/fiscal';

export default function Consulta() {
  const [emitentes, setEmitentes] = useState([]);
  const [cnpj, setCnpj] = useState('');
  const [busca, setBusca] = useState('');
  const [nota, setNota] = useState(null);
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api.entities.Emitente.list().then((itens) => {
      const ordenados = ordenarEmitentes(itens);
      setEmitentes(ordenados);
      setCnpj((atual) => atual || ordenados[0]?.cnpj || '');
    });
  }, []);

  const consultar = useCallback(async () => {
    const termo = busca.trim();
    if (!cnpj || !termo) {
      setNota(null);
      setBuscou(false);
      return;
    }
    setCarregando(true);
    try {
      const pagina = await api.entities.NotaFiscal.filter(
        { emitente_cnpj: cnpj, numero: { $regex: termo } },
        { sort: '-data_emissao', limit: 20 },
      );
      const encontradas = pagina.items || [];
      const exata = encontradas.find((n) => String(n.numero) === termo);
      setNota(exata || encontradas[0] || null);
      setBuscou(true);
    } finally {
      setCarregando(false);
    }
  }, [cnpj, busca]);

  const limpar = () => {
    setNota(null);
    setBuscou(false);
  };

  const emitenteAtual = emitentes.find((e) => e.cnpj === cnpj);

  return (
    <div>
      <PageHeader
        titulo="Consultar nota"
        descricao="Encontre uma nota pelo CNPJ emissor e pelo número para conferir valores, pagamento e comprovante."
      />

      <div className="mt-6">
        <FiltrosConsulta
          emitentes={emitentes}
          cnpj={cnpj}
          onCnpj={(valor) => {
            setCnpj(valor);
            limpar();
          }}
          busca={busca}
          onBusca={(valor) => {
            setBusca(valor);
            limpar();
          }}
          onBuscar={consultar}
        />
      </div>

      {carregando ? (
        <div className="mt-5 h-32 animate-pulse rounded-xl border border-border bg-muted/50" />
      ) : !buscou ? null : nota ? (
        <div className="mt-5">
          <NotaConsultaCard nota={nota} />
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center painel px-6 py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileSearch className="h-5 w-5" />
          </span>
          <p className="mt-4 font-display text-lg">Nota não disponível em sistema</p>
          <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Confira o CNPJ emissor e o número da nota pesquisados.
          </p>
        </div>
      )}
    </div>
  );
}

import PageHeader from '@/components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { FileSearch } from 'lucide-react';
import { api } from '@/api/client';
import FiltrosConsulta from '@/components/consulta/FiltrosConsulta';
import NotaConsultaCard from '@/components/consulta/NotaConsultaCard';
import { nomeEmitente, ordenarEmitentes } from '@/lib/fiscal';

export default function Consulta() {
  const [emitentes, setEmitentes] = useState([]);
  const [cnpj, setCnpj] = useState('');
  const [busca, setBusca] = useState('');
  const [notas, setNotas] = useState([]);
  const [exata, setExata] = useState(true);
  const [buscou, setBuscou] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api.entities.Emitente.list().then((itens) => {
      const ordenados = ordenarEmitentes(itens);
      setEmitentes(ordenados);
    });
  }, []);

  const consultar = useCallback(async () => {
    const termo = busca.trim();
    if (!termo) {
      setNotas([]);
      setBuscou(false);
      return;
    }
    setCarregando(true);
    try {
      // Com "Todos os CNPJs", procura o número em todos os emissores.
      const filtro = { numero: { $regex: termo } };
      if (cnpj) filtro.emitente_cnpj = cnpj;
      const pagina = await api.entities.NotaFiscal.filter(filtro, { sort: '-data_emissao', limit: 50 });
      const encontradas = pagina.items || [];
      const exatas = encontradas.filter((n) => String(n.numero) === termo);
      // Número exato (pode existir em mais de um CNPJ); sem exato, as notas que contêm o número.
      setNotas(exatas.length ? exatas : encontradas.slice(0, 20));
      setExata(exatas.length > 0 || !encontradas.length);
      setBuscou(true);
    } finally {
      setCarregando(false);
    }
  }, [cnpj, busca]);

  const limpar = () => {
    setNotas([]);
    setBuscou(false);
  };


  return (
    <div>
      <PageHeader
        titulo="Consultar nota"
        descricao="Encontre uma nota pelo número, em todos os CNPJs ou num CNPJ emissor, para conferir valores, pagamento e comprovante."
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
      ) : !buscou ? null : notas.length ? (
        <div className="mt-5 space-y-3">
          {!exata ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma nota com o número exato {busca.trim()}. Notas que contêm esse número:
            </p>
          ) : notas.length > 1 ? (
            <p className="text-sm text-muted-foreground">
              {notas.length} notas com o número {busca.trim()} em CNPJs diferentes.
            </p>
          ) : null}
          {notas.map((n) => (
            <NotaConsultaCard
              key={n.id}
              nota={n}
              emissor={cnpj ? null : nomeEmitente(emitentes.find((e) => e.cnpj === n.emitente_cnpj) || { cnpj: n.emitente_cnpj })}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center painel px-6 py-16 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileSearch className="h-5 w-5" />
          </span>
          <p className="mt-4 font-display text-lg">Nota não disponível em sistema</p>
          <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            Confira o número da nota e o CNPJ emissor pesquisados.
          </p>
        </div>
      )}
    </div>
  );
}

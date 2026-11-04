import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import FiltrosConsolidado from '@/components/consolidado/FiltrosConsolidado';
import ResumoConsolidado from '@/components/consolidado/ResumoConsolidado';
import GraficoMensal from '@/components/consolidado/GraficoMensal';
import GraficoUfCnpj from '@/components/consolidado/GraficoUfCnpj';
import RankingPainel from '@/components/consolidado/RankingPainel';
import AcompanhamentoAnual from '@/components/consolidado/AcompanhamentoAnual';
import AcoesExportacao from '@/components/consolidado/AcoesExportacao';
import { baixarPdfConsolidado } from '@/lib/consolidadoPdf';
import { baixarCsvConsolidado } from '@/lib/consolidadoCsv';
import {
  descreverFiltros,
  filtrar,
  matrizUfCnpj,
  porAno,
  ranking,
  rotuladorCnpj,
  serieMensal,
  totais as calcularTotais,
} from '@/lib/consolidado';

const anoAtual = new Date().getFullYear();
const SEM_FILTROS = { cnpj: '', ano: 0, mes: 0, uf: '' };

// Todas as notas. Os filtros são aplicados no navegador para que os gráficos
// possam se filtrar entre si (e comparar os anos) sem novas consultas.
const carregarNotas = async () => {
  const todas = [];
  let cursor;
  for (let i = 0; i < 200; i += 1) {
    const pagina = await api.entities.NotaFiscal.filter({}, { limit: 1000, cursor });
    todas.push(...(pagina.items || []));
    if (!pagina.has_more || !pagina.next_cursor) break;
    cursor = pagina.next_cursor;
  }
  return todas;
};

const Painel = ({ titulo, descricao, acoes, children }) => (
  <section className="painel p-5 sm:p-6">
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-display text-lg">{titulo}</h2>
        {descricao ? <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p> : null}
      </div>
      {acoes}
    </header>
    {children}
  </section>
);

export default function Consolidado() {
  const [filtros, setFiltros] = useState(SEM_FILTROS);
  const [notas, setNotas] = useState([]);
  const [emitentes, setEmitentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [metricaAnual, setMetricaAnual] = useState('guia');

  useEffect(() => {
    api.entities.Emitente.list().then(setEmitentes).catch(() => setEmitentes([]));
  }, []);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    carregarNotas()
      .then((itens) => ativo && setNotas(itens))
      .catch((e) => ativo && setErro(e.message || 'Não foi possível carregar as notas.'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const alterarFiltro = useCallback((campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor })), []);

  // Clicar num mês da linha do tempo; sem ano escolhido, fixa também o ano daquele mês.
  const escolherMes = useCallback(
    (mes, ano) => setFiltros((f) => ({ ...f, mes, ano: mes && !f.ano ? ano : f.ano })),
    [],
  );

  const rotularCnpj = useMemo(() => rotuladorCnpj(emitentes), [emitentes]);

  const dados = useMemo(() => {
    const filtradas = filtrar(notas, filtros);
    const linhasUf = ranking(filtrar(notas, filtros, 'uf'), 'destinatario_uf', (uf) => ({ rotulo: uf }));
    const linhasCnpj = ranking(filtrar(notas, filtros, 'cnpj'), 'emitente_cnpj', rotularCnpj);
    const mensal = serieMensal(filtrar(notas, filtros, 'mes'), filtros.ano);
    const totais = calcularTotais(filtradas);

    // Para o gráfico UF × CNPJ e para a exportação, só o que está dentro de todos os filtros.
    const cnpjsFiltrados = ranking(filtradas, 'emitente_cnpj', rotularCnpj);
    const ufsFiltradas = ranking(filtradas, 'destinatario_uf', (uf) => ({ rotulo: uf }));
    const { series, grafico } = matrizUfCnpj(filtradas, cnpjsFiltrados);

    // Na tela, o gráfico mostra todas as UFs (a filtrada em destaque).
    const semUf = filtrar(notas, filtros, 'uf');
    const tela = matrizUfCnpj(semUf, ranking(semUf, 'emitente_cnpj', rotularCnpj));

    const anual = porAno(filtrar(notas, filtros, 'ano'), metricaAnual);

    return { filtradas, linhasUf, linhasCnpj, mensal, totais, series, grafico, cnpjsFiltrados, ufsFiltradas, tela, anual };
  }, [notas, filtros, rotularCnpj, metricaAnual]);

  // Opções de CNPJ: cadastrados e os que aparecem nas notas.
  const opcoesCnpj = useMemo(() => {
    const cnpjs = new Set([...emitentes.map((e) => e.cnpj), ...notas.map((n) => n.emitente_cnpj).filter(Boolean)]);
    return [...cnpjs].map((cnpj) => ({ cnpj, rotulo: rotularCnpj(cnpj).rotulo })).sort((a, b) => a.rotulo.localeCompare(b.rotulo));
  }, [emitentes, notas, rotularCnpj]);

  const anos = useMemo(() => {
    const doBanco = notas.map((n) => Number(n.ano)).filter(Boolean);
    const lista = new Set([anoAtual, anoAtual - 1, anoAtual - 2, anoAtual - 3, ...doBanco, filtros.ano].filter(Boolean));
    return [...lista].sort((a, b) => b - a);
  }, [notas, filtros.ano]);

  const descricao = descreverFiltros(filtros, emitentes);

  const paraExportar = () => ({
    periodo: descricao,
    totais: { ...dados.totais, pago: dados.totais.pago },
    linhasUf: dados.ufsFiltradas,
    linhasCnpj: dados.cnpjsFiltrados.map((l) => ({ ...l, rotulo: `${l.rotulo} — ${l.detalhe}` })),
    series: dados.series,
    grafico: dados.grafico,
    anual: porAno(filtrar(notas, filtros, 'ano'), 'guia'),
  });

  const podeExportar = !carregando && dados.filtradas.length > 0;
  const semNotas = !carregando && !notas.length;

  return (
    <div>
      <PageHeader
        titulo="Consolidado"
        descricao="DIFAL e FCOP de todas as notas, com filtros por CNPJ, ano, mês e UF de destino."
        acoes={
          podeExportar ? (
            <AcoesExportacao
              onPdf={() => baixarPdfConsolidado(paraExportar())}
              onExcel={() => baixarCsvConsolidado(paraExportar())}
            />
          ) : null
        }
      />

      <div className="mt-6">
        <FiltrosConsolidado
          filtros={filtros}
          onFiltro={alterarFiltro}
          onLimpar={() => setFiltros(SEM_FILTROS)}
          anos={anos}
          opcoesCnpj={opcoesCnpj}
          rotuloCnpj={(c) => rotularCnpj(c).rotulo}
        />
      </div>

      {erro ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</p>
      ) : null}

      {carregando ? (
        <div className="mt-4 space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-80 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : semNotas ? (
        <div className="painel mt-4 px-6 py-16 text-center">
          <p className="font-display text-lg">Nenhuma nota cadastrada</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Importe os XMLs ou cadastre notas para montar o consolidado.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <ResumoConsolidado totais={dados.totais} descricao={descricao} />

          <AcompanhamentoAnual
            linhas={dados.anual}
            metrica={metricaAnual}
            onMetrica={setMetricaAnual}
            anoAtivo={filtros.ano}
            onAno={(ano) => alterarFiltro('ano', ano)}
          />

          <Painel
            titulo="Evolução mensal"
            descricao={
              filtros.ano
                ? `Guias de cada mês de ${filtros.ano}. Clique num mês para filtrar.`
                : 'Guias de cada mês com notas. Clique num mês para filtrar.'
            }
            acoes={
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-chart-1" /> DIFAL
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-chart-2" /> FCOP
                </span>
              </div>
            }
          >
            <GraficoMensal dados={dados.mensal} mesAtivo={filtros.mes} anoAtivo={filtros.ano} onMes={escolherMes} />
          </Painel>

          <div className="grid gap-4 lg:grid-cols-2">
            <RankingPainel
              titulo="Por UF de destino"
              descricao="Clique numa UF para filtrar."
              linhas={dados.linhasUf}
              ativo={filtros.uf}
              onSelecionar={(uf) => alterarFiltro('uf', uf)}
              rotuloVazio="Nenhuma UF com notas para os filtros escolhidos."
            />
            <RankingPainel
              titulo="Por CNPJ emissor"
              descricao="Clique num CNPJ para filtrar."
              linhas={dados.linhasCnpj}
              ativo={filtros.cnpj}
              onSelecionar={(cnpj) => alterarFiltro('cnpj', cnpj)}
              rotuloVazio="Nenhum CNPJ com notas para os filtros escolhidos."
            />
          </div>

          <Painel
            titulo="Guias por UF de destino e CNPJ"
            descricao="Valor da guia de cada CNPJ, empilhado por UF. Clique numa barra para filtrar a UF; use a legenda para ocultar CNPJs."
          >
            <GraficoUfCnpj
              dados={dados.tela.grafico}
              series={dados.tela.series}
              ufAtiva={filtros.uf}
              onUf={(uf) => alterarFiltro('uf', uf)}
            />
          </Painel>
        </div>
      )}
    </div>
  );
}

import PageHeader from '@/components/PageHeader';
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Loader2, UploadCloud } from 'lucide-react';
import { api } from '@/api/client';
import { classificarNfe, parseNfeXml } from '@/lib/nfeXml';
import ResultadoImportacao from '@/components/importar/ResultadoImportacao';

const chaveDedup = (n) => n.chave_acesso || `${n.emitente_cnpj}:${n.serie}:${n.numero}`;

// Tamanho das partes enviadas ao servidor. A conferência de duplicadas vai no endereço da
// consulta (100 chaves de 44 dígitos ≈ 6 KB, bem abaixo do limite do servidor web), e a
// gravação vai em lotes para não estourar o tempo de uma requisição.
const CHAVES_POR_CONSULTA = 100;
const NOTAS_POR_GRAVACAO = 250;

const emPartes = (lista, tamanho) => {
  const partes = [];
  for (let i = 0; i < lista.length; i += tamanho) partes.push(lista.slice(i, i + tamanho));
  return partes;
};

const FASES = {
  lendo: 'Lendo os arquivos',
  conferindo: 'Conferindo notas já cadastradas',
  gravando: 'Gravando as notas',
};

const paraRegistro = (n) => ({
  numero: n.numero,
  serie: n.serie,
  chave_acesso: n.chave_acesso,
  emitente_cnpj: n.emitente_cnpj,
  emitente_nome: n.emitente_nome,
  emitente_uf: n.emitente_uf,
  destinatario_nome: n.destinatario_nome,
  destinatario_cpf: n.destinatario_cpf,
  destinatario_uf: n.destinatario_uf,
  destinatario_municipio: n.destinatario_municipio,
  data_emissao: n.data_emissao,
  ano: n.ano,
  mes: n.mes,
  valor_total: n.valor_total,
  valor_difal: 0,
  valor_fcop: 0,
  status: 'a_emitir',
});

export default function ImportarXml() {
  const inputRef = useRef(null);
  const [importando, setImportando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [progresso, setProgresso] = useState(null); // { fase, feito, total }
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const importar = async (arquivos) => {
    const lista = Array.from(arquivos || []);
    if (!lista.length || importando) return;
    setImportando(true);
    setErro('');
    setResultado(null);

    const validas = [];
    const ignoradas = [];
    const cnpjsCriados = [];
    let gravadas = 0;
    let duplicadas = 0;

    try {
      // 1. Leitura dos XMLs no próprio navegador (nada é enviado ainda).
      setProgresso({ fase: 'lendo', feito: 0, total: lista.length });
      for (let i = 0; i < lista.length; i += 1) {
        const arquivo = lista[i];
        try {
          const nota = parseNfeXml(await arquivo.text());
          const { valida, motivo } = classificarNfe(nota);
          if (!valida) {
            ignoradas.push({ arquivo: arquivo.name, numero: nota.numero, motivo });
          } else {
            const [a, m] = (nota.data_emissao || '').split('-');
            validas.push({ ...nota, ano: Number(a) || null, mes: Number(m) || null });
          }
        } catch (e) {
          ignoradas.push({ arquivo: arquivo.name, motivo: e.message || 'Arquivo inválido' });
        }
        if (i % 25 === 0 || i === lista.length - 1) setProgresso({ fase: 'lendo', feito: i + 1, total: lista.length });
      }

      // 2. Conferência das notas já cadastradas, em partes.
      const chaves = [...new Set(validas.map((n) => n.chave_acesso).filter(Boolean))];
      const jaExistem = new Set();
      const partesChaves = emPartes(chaves, CHAVES_POR_CONSULTA);
      setProgresso({ fase: 'conferindo', feito: 0, total: chaves.length });
      for (let i = 0; i < partesChaves.length; i += 1) {
        const pagina = await api.entities.NotaFiscal.filter(
          { chave_acesso: { $in: partesChaves[i] } },
          { limit: 1000 },
        );
        (pagina.items || []).forEach((n) => jaExistem.add(n.chave_acesso));
        setProgresso({ fase: 'conferindo', feito: Math.min((i + 1) * CHAVES_POR_CONSULTA, chaves.length), total: chaves.length });
      }

      const vistas = new Set();
      const novas = validas.filter((n) => {
        const chave = chaveDedup(n);
        if (jaExistem.has(chave) || vistas.has(chave)) return false;
        vistas.add(chave);
        return true;
      });
      duplicadas = validas.length - novas.length;

      // 3. CNPJs ainda não cadastrados entram como filial.
      const conhecidos = new Set((await api.entities.Emitente.list()).map((e) => e.cnpj));
      for (const n of novas) {
        if (!conhecidos.has(n.emitente_cnpj)) {
          conhecidos.add(n.emitente_cnpj);
          cnpjsCriados.push({
            cnpj: n.emitente_cnpj,
            razao_social: n.emitente_nome,
            apelido: n.emitente_nome,
            uf: n.emitente_uf,
            tipo: 'filial',
          });
        }
      }
      if (cnpjsCriados.length) await api.entities.Emitente.bulkCreate(cnpjsCriados);

      // 4. Gravação em lotes. Se um lote falhar, os anteriores já ficam salvos e
      //    importar de novo os mesmos arquivos não duplica nada.
      setProgresso({ fase: 'gravando', feito: 0, total: novas.length });
      for (const lote of emPartes(novas, NOTAS_POR_GRAVACAO)) {
        await api.entities.NotaFiscal.bulkCreate(lote.map(paraRegistro));
        gravadas += lote.length;
        setProgresso({ fase: 'gravando', feito: gravadas, total: novas.length });
      }
    } catch (e) {
      setErro(
        gravadas
          ? `A importação parou depois de ${gravadas.toLocaleString('pt-BR')} nota(s) gravada(s): ${e.message || 'erro de conexão'}. Envie os mesmos arquivos de novo para continuar; as notas já gravadas não serão duplicadas.`
          : `Não foi possível importar os arquivos: ${e.message || 'erro de conexão'}. Tente novamente.`,
      );
    } finally {
      if (validas.length || ignoradas.length) {
        setResultado({ importadas: gravadas, ignoradas, duplicadas, cnpjsCriados, total: lista.length });
      }
      setProgresso(null);
      setImportando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const pct = progresso?.total ? Math.round((progresso.feito / progresso.total) * 100) : 0;

  return (
    <div>
      <PageHeader
        titulo="Importar XML das notas"
        descricao="Envie os XMLs de NF-e de uma vez, quantos forem. Entram apenas notas a consumidor final (CPF) com UF de destino diferente da UF do emissor; as demais aparecem com o motivo."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!importando) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          importar(e.dataTransfer.files);
        }}
        onClick={() => !importando && inputRef.current?.click()}
        aria-busy={importando}
        className={`mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors ${
          importando
            ? 'cursor-progress border-primary/40 bg-card'
            : arrastando
              ? 'cursor-pointer border-primary bg-primary/5'
              : 'cursor-pointer border-border bg-card hover:bg-muted/40'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {importando ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        </span>

        {progresso ? (
          <div className="mt-4 w-full max-w-md" role="status" aria-live="polite">
            <p className="font-display text-lg">{FASES[progresso.fase]}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <p className="numeros mt-2 text-sm text-muted-foreground">
              {progresso.feito.toLocaleString('pt-BR')} de {progresso.total.toLocaleString('pt-BR')}
              {progresso.fase === 'lendo' ? ' arquivos' : ' notas'} ({pct}%)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mantenha esta página aberta até terminar.</p>
          </div>
        ) : (
          <>
            <p className="mt-4 font-display text-lg">Arraste os XMLs ou clique para selecionar</p>
            <p className="mt-1 text-sm text-muted-foreground">Sem limite de quantidade: lotes grandes são enviados em partes</p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,text/xml,application/xml"
          className="hidden"
          onChange={(e) => importar(e.target.files)}
        />
      </div>

      {erro ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </p>
      ) : null}

      {resultado ? <ResultadoImportacao resultado={resultado} /> : null}

      <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
        Ir para a apuração
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

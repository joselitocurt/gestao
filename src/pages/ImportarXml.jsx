import PageHeader from '@/components/PageHeader';
import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, UploadCloud } from 'lucide-react';
import { api } from '@/api/client';
import { classificarNfe, parseNfeXml } from '@/lib/nfeXml';
import ResultadoImportacao from '@/components/importar/ResultadoImportacao';

const chaveDedup = (n) => n.chave_acesso || `${n.emitente_cnpj}:${n.serie}:${n.numero}`;

export default function ImportarXml() {
  const inputRef = useRef(null);
  const [importando, setImportando] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const importar = async (arquivos) => {
    const lista = Array.from(arquivos || []);
    if (!lista.length) return;
    setImportando(true);
    setErro('');
    setResultado(null);

    try {
      const emitentes = await api.entities.Emitente.list();
      const conhecidos = new Set(emitentes.map((e) => e.cnpj));
      const validas = [];
      const ignoradas = [];

      for (const arquivo of lista) {
        try {
          const nota = parseNfeXml(await arquivo.text());
          const { valida, motivo } = classificarNfe(nota);
          if (!valida) {
            ignoradas.push({ arquivo: arquivo.name, numero: nota.numero, motivo });
            continue;
          }
          const [a, m] = (nota.data_emissao || '').split('-');
          validas.push({ ...nota, ano: Number(a) || null, mes: Number(m) || null });
        } catch (e) {
          ignoradas.push({ arquivo: arquivo.name, motivo: e.message || 'Arquivo inválido' });
        }
      }

      const chaves = [...new Set(validas.map((n) => n.chave_acesso).filter(Boolean))];
      const existentes = chaves.length
        ? (await api.entities.NotaFiscal.filter({ chave_acesso: { $in: chaves } }, { limit: 1000 })).items
        : [];
      const jaExistem = new Set(existentes.map((n) => n.chave_acesso));

      const vistas = new Set();
      const novas = validas.filter((n) => {
        const chave = chaveDedup(n);
        if (jaExistem.has(chave) || vistas.has(chave)) return false;
        vistas.add(chave);
        return true;
      });

      const cnpjsCriados = [];
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

      if (novas.length) {
        await api.entities.NotaFiscal.bulkCreate(
          novas.map((n) => ({
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
          })),
        );
      }

      setResultado({
        importadas: novas.length,
        ignoradas,
        duplicadas: validas.length - novas.length,
        cnpjsCriados,
      });
    } catch {
      setErro('Não foi possível importar os arquivos. Tente novamente.');
    } finally {
      setImportando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <PageHeader
        titulo="Importar XML das notas"
        descricao="Envie vários XMLs de NF-e de uma vez. Entram apenas notas a consumidor final (CPF) com UF de destino diferente da UF do emissor; as demais aparecem com o motivo."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          importar(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center transition-colors ${
          arrastando ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/40'
        }`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {importando ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        </span>
        <p className="mt-4 font-display text-lg">
          {importando ? 'Lendo os arquivos…' : 'Arraste os XMLs ou clique para selecionar'}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">Pode selecionar várias notas de uma vez</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".xml,text/xml,application/xml"
          className="hidden"
          onChange={(e) => importar(e.target.files)}
        />
      </div>

      {erro ? <p className="mt-4 text-[13px] text-destructive">{erro}</p> : null}

      {resultado ? <ResultadoImportacao resultado={resultado} /> : null}

      <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
        Ir para a apuração
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

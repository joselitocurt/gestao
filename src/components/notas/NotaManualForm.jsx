import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UFS, apenasDigitos, formatCnpj, nomeEmitente, ordenarEmitentes } from '@/lib/fiscal';
import { classificarNfe } from '@/lib/nfeXml';
import { statusAutomatico } from '@shared/status.js';
import CampoFormulario from '@/components/notas/CampoFormulario';

const hoje = () => new Date().toISOString().slice(0, 10);

const formularioVazio = () => ({
  emitente_cnpj: '',
  numero: '',
  serie: '1',
  chave_acesso: '',
  destinatario_nome: '',
  destinatario_cpf: '',
  destinatario_uf: '',
  destinatario_municipio: '',
  data_emissao: hoje(),
  valor_total: '',
  valor_difal: '',
  valor_fcop: '',
});

const formularioDeNota = (nota) => ({
  emitente_cnpj: nota.emitente_cnpj || '',
  numero: nota.numero || '',
  serie: nota.serie || '',
  chave_acesso: nota.chave_acesso || '',
  destinatario_nome: nota.destinatario_nome || '',
  destinatario_cpf: nota.destinatario_cpf || '',
  destinatario_uf: nota.destinatario_uf || '',
  destinatario_municipio: nota.destinatario_municipio || '',
  data_emissao: nota.data_emissao ? String(nota.data_emissao).slice(0, 10) : hoje(),
  valor_total: nota.valor_total ?? '',
  valor_difal: nota.valor_difal ?? '',
  valor_fcop: nota.valor_fcop ?? '',
});

const entrada = 'h-10 rounded-lg border-border bg-background text-sm';

export default function NotaManualForm({ nota, onSaved, onCancel }) {
  const editando = !!nota;
  const [emitentes, setEmitentes] = useState([]);
  const [form, setForm] = useState(() => (nota ? formularioDeNota(nota) : formularioVazio()));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salva, setSalva] = useState(null);

  useEffect(() => {
    api.entities.Emitente.list().then((itens) => setEmitentes(ordenarEmitentes(itens)));
  }, []);

  useEffect(() => {
    if (!emitentes.length) return;
    setForm((atual) => (atual.emitente_cnpj ? atual : { ...atual, emitente_cnpj: emitentes[0].cnpj }));
  }, [emitentes]);

  const alterar = (campo) => (valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const montarDados = (emitente, cpf) => {
    const dados = {
      numero: form.numero.trim(),
      serie: form.serie.trim(),
      emitente_cnpj: emitente.cnpj,
      emitente_nome: emitente.razao_social || emitente.apelido || '',
      emitente_uf: emitente.uf,
      destinatario_nome: form.destinatario_nome.trim(),
      destinatario_cpf: cpf,
      destinatario_uf: form.destinatario_uf,
      destinatario_municipio: form.destinatario_municipio.trim(),
      data_emissao: form.data_emissao,
      ano: Number(form.data_emissao.slice(0, 4)) || null,
      mes: Number(form.data_emissao.slice(5, 7)) || null,
      valor_total: Number(form.valor_total) || 0,
      valor_difal: Number(form.valor_difal) || 0,
      valor_fcop: Number(form.valor_fcop) || 0,
    };
    const chave = apenasDigitos(form.chave_acesso);
    if (chave) dados.chave_acesso = chave;
    return dados;
  };

  const salvar = async (e) => {
    e.preventDefault();
    const emitente = emitentes.find((item) => item.cnpj === form.emitente_cnpj);
    const cpf = apenasDigitos(form.destinatario_cpf);

    if (!emitente) return setErro('Selecione o CNPJ emissor.');
    if (!form.numero.trim()) return setErro('Informe o número da nota fiscal.');
    if (!form.destinatario_nome.trim()) return setErro('Informe o nome do destinatário.');
    if (cpf.length !== 11) return setErro('Informe um CPF válido do destinatário (11 dígitos).');
    if (!form.destinatario_uf) return setErro('Selecione a UF de destino.');
    if (!form.data_emissao) return setErro('Informe a data de emissão.');

    const dados = montarDados(emitente, cpf);

    const { valida, motivo } = classificarNfe(dados);
    if (!valida) return setErro(`Esta nota não entra na apuração: ${motivo}.`);

    setErro('');
    setSalvando(true);

    try {
      if (editando) {
        // Sem status no envio: o servidor recalcula pelos valores e pela data de pagamento.
        await api.entities.NotaFiscal.update(nota.id, dados);
        onSaved?.();
        return;
      }

      await api.entities.NotaFiscal.create({ ...dados, status: statusAutomatico(dados) });
      setSalva({ numero: dados.numero });
      setForm({ ...formularioVazio(), emitente_cnpj: dados.emitente_cnpj });
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar a nota.');
    } finally {
      setSalvando(false);
    }
  };

  if (salva) {
    return (
      <div className="mt-6 rounded-xl border border-status-pago/30 bg-status-pago/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-status-pago" />
        <p className="mt-3 font-display text-xl">Nota {salva.numero} cadastrada</p>
        <p className="mt-1 text-[13px] text-muted-foreground">Ela já aparece na apuração do mês de emissão.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="outline" className="rounded-lg" onClick={() => setSalva(null)}>
            Cadastrar outra nota
          </Button>
          <Link
            to="/difal"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ir para a apuração
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="mt-6 space-y-5">
      <section className="painel p-4 sm:p-5">
        <h2 className="font-display text-lg">Emissor e nota</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CampoFormulario label="CNPJ emissor" className="lg:col-span-2">
            <Select
              value={form.emitente_cnpj || undefined}
              onValueChange={alterar('emitente_cnpj')}
              disabled={!emitentes.length}
            >
              <SelectTrigger className={entrada}>
                <SelectValue placeholder="Selecione o CNPJ" />
              </SelectTrigger>
              <SelectContent>
                {emitentes.map((e) => (
                  <SelectItem key={e.id} value={e.cnpj}>
                    {nomeEmitente(e)} · {formatCnpj(e.cnpj)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFormulario>

          <CampoFormulario label="Número da nota">
            <Input
              value={form.numero}
              onChange={(e) => alterar('numero')(e.target.value)}
              inputMode="numeric"
              placeholder="Ex.: 107241"
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>

          <CampoFormulario label="Série">
            <Input
              value={form.serie}
              onChange={(e) => alterar('serie')(e.target.value)}
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>

          <CampoFormulario label="Data de emissão">
            <Input
              type="date"
              value={form.data_emissao}
              onChange={(e) => alterar('data_emissao')(e.target.value)}
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>

          <CampoFormulario label="Chave de acesso (opcional)" className="sm:col-span-2 lg:col-span-3">
            <Input
              value={form.chave_acesso}
              onChange={(e) => alterar('chave_acesso')(e.target.value)}
              inputMode="numeric"
              placeholder="44 dígitos"
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>
        </div>
      </section>

      <section className="painel p-4 sm:p-5">
        <h2 className="font-display text-lg">Destinatário</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <CampoFormulario label="Nome" className="sm:col-span-2">
            <Input
              value={form.destinatario_nome}
              onChange={(e) => alterar('destinatario_nome')(e.target.value)}
              placeholder="Nome do consumidor final"
              className={entrada}
            />
          </CampoFormulario>

          <CampoFormulario label="CPF">
            <Input
              value={form.destinatario_cpf}
              onChange={(e) => alterar('destinatario_cpf')(e.target.value)}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>

          <CampoFormulario label="UF de destino">
            <Select value={form.destinatario_uf || undefined} onValueChange={alterar('destinatario_uf')}>
              <SelectTrigger className={`numeros ${entrada}`}>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((sigla) => (
                  <SelectItem key={sigla} value={sigla}>
                    {sigla}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CampoFormulario>

          <CampoFormulario label="Município" className="sm:col-span-2">
            <Input
              value={form.destinatario_municipio}
              onChange={(e) => alterar('destinatario_municipio')(e.target.value)}
              placeholder="Cidade do destinatário"
              className={entrada}
            />
          </CampoFormulario>
        </div>
      </section>

      <section className="painel p-4 sm:p-5">
        <h2 className="font-display text-lg">Valores</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <CampoFormulario label="Valor da nota">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_total}
              onChange={(e) => alterar('valor_total')(e.target.value)}
              placeholder="0,00"
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>

          <CampoFormulario label="Guia DIFAL">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_difal}
              onChange={(e) => alterar('valor_difal')(e.target.value)}
              placeholder="0,00"
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>

          <CampoFormulario label="Guia FCOP">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.valor_fcop}
              onChange={(e) => alterar('valor_fcop')(e.target.value)}
              placeholder="0,00"
              className={`numeros ${entrada}`}
            />
          </CampoFormulario>
        </div>
      </section>

      {erro ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] text-muted-foreground">
          Status automático: com DIFAL ou FCOP a nota fica <span className="font-medium text-status-emitido">Emitida</span>
          {editando ? '; se já tiver data de pagamento, continua ' : '; sem valores, fica '}
          <span className={editando ? 'font-medium text-status-pago' : 'font-medium text-status-pendente'}>
            {editando ? 'Pago' : 'A emitir'}
          </span>
          .
        </p>
        <div className="flex items-center gap-2">
          {editando ? (
            <Button type="button" variant="outline" className="rounded-lg" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" disabled={salvando || !emitentes.length} className="rounded-lg px-5">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editando ? 'Salvar alterações' : 'Salvar nota'}
          </Button>
        </div>
      </div>
    </form>
  );
}

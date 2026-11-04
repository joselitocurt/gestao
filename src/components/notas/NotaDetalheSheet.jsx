import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Paperclip, Upload } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import StatusBadge from '@/components/notas/StatusBadge';
import { CAMPOS_DO_STATUS, statusAutomatico } from '@shared/status.js';
import { STATUS_OPTIONS, formatBRL, formatCpf, formatEmissao } from '@/lib/fiscal';

const INICIAL = {
  valor_difal: '',
  valor_fcop: '',
  status: 'a_emitir',
  data_pagamento: '',
  comprovante_uri: '',
  comprovante_nome: '',
};

const numero = (v) => Number(v) || 0;

export default function NotaDetalheSheet({ nota, onClose, onSaved, somenteLeitura = false }) {
  const [form, setForm] = useState(INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!nota) return;
    setErro('');
    setForm({
      valor_difal: nota.valor_difal ? String(nota.valor_difal) : '',
      valor_fcop: nota.valor_fcop ? String(nota.valor_fcop) : '',
      status: nota.status || 'a_emitir',
      data_pagamento: nota.data_pagamento ? String(nota.data_pagamento).slice(0, 10) : '',
      comprovante_uri: nota.comprovante_uri || '',
      comprovante_nome: nota.comprovante_nome || '',
    });
  }, [nota]);

  // Valores e data de pagamento definem o status: DIFAL/FCOP lançado → Emitida; data de pagamento → Pago.
  const alterar = (campo, valor) =>
    setForm((atual) => {
      const novo = { ...atual, [campo]: valor };
      if (CAMPOS_DO_STATUS.includes(campo)) novo.status = statusAutomatico(novo);
      return novo;
    });

  const alterarStatus = (valor) => {
    const hoje = new Date().toISOString().slice(0, 10);
    setForm((atual) => ({
      ...atual,
      status: valor,
      data_pagamento: valor === 'pago' && !atual.data_pagamento ? hoje : atual.data_pagamento,
    }));
  };

  const enviarComprovante = async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setEnviando(true);
    setErro('');
    try {
      const { file_uri } = await api.files.upload(arquivo);
      setForm((atual) => ({ ...atual, comprovante_uri: file_uri, comprovante_nome: arquivo.name }));
    } catch (e) {
      setErro(e.message || 'Não foi possível enviar o comprovante.');
    } finally {
      setEnviando(false);
      evento.target.value = '';
    }
  };

  const abrirComprovante = async () => {
    // Abre a aba antes da chamada para não ser barrada pelo bloqueador de pop-ups.
    const aba = window.open('', '_blank');
    try {
      const { signed_url } = await api.files.signedUrl(form.comprovante_uri);
      if (aba) aba.location.href = signed_url;
      else window.open(signed_url, '_blank', 'noopener');
    } catch (e) {
      aba?.close();
      setErro(e.message || 'Não foi possível abrir o comprovante.');
    }
  };

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    try {
      await api.entities.NotaFiscal.update(nota.id, {
        valor_difal: numero(form.valor_difal),
        valor_fcop: numero(form.valor_fcop),
        status: form.status,
        data_pagamento: form.data_pagamento || null,
        comprovante_uri: form.comprovante_uri || '',
        comprovante_nome: form.comprovante_nome || '',
      });
      onSaved?.();
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const total = numero(form.valor_difal) + numero(form.valor_fcop);

  return (
    <Sheet open={!!nota} onOpenChange={(aberto) => !aberto && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto border-border p-0 sm:max-w-lg">
        {nota ? (
          <>
            <SheetHeader className="space-y-2 border-b border-border px-5 py-5 text-left sm:px-6">
              <div className="flex items-center justify-between gap-3 pr-8">
                <SheetTitle className="font-display text-2xl">
                  NF {nota.numero || '—'}
                  <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">
                    Série {nota.serie || '—'}
                  </span>
                </SheetTitle>
                <StatusBadge status={nota.status} />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="rounded-md bg-muted px-2 py-1 text-xs font-bold">{nota.emitente_uf || '—'}</span>
                <span className="h-px w-6 bg-border" aria-hidden="true" />
                <span className="rounded-md bg-accent px-2 py-1 text-xs font-bold text-accent-foreground">
                  {nota.destinatario_uf || '—'}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {nota.destinatario_municipio || 'Município não informado'}
                </span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Destinatário</dt>
                  <dd className="truncate font-medium">{nota.destinatario_nome || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">CPF</dt>
                  <dd className="numeros font-medium">{formatCpf(nota.destinatario_cpf) || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Emissão</dt>
                  <dd className="numeros font-medium">{formatEmissao(nota)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Valor da nota</dt>
                  <dd className="numeros font-medium">{formatBRL(nota.valor_total)}</dd>
                </div>
              </dl>
              {nota.chave_acesso ? (
                <p className="numeros break-all text-xs leading-relaxed text-muted-foreground/70">
                  {nota.chave_acesso}
                </p>
              ) : null}
            </SheetHeader>

            <fieldset disabled={somenteLeitura} className="flex-1 space-y-5 px-5 py-5 disabled:opacity-90 sm:px-6">
              {somenteLeitura ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Seu perfil permite apenas visualizar esta nota.
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="valor_difal" className="text-xs text-muted-foreground">
                    Guia DIFAL
                  </Label>
                  <Input
                    id="valor_difal"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={form.valor_difal}
                    onChange={(e) => alterar('valor_difal', e.target.value)}
                    placeholder="0,00"
                    className="numeros h-10 rounded-lg border-border bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="valor_fcop" className="text-xs text-muted-foreground">
                    Guia FCOP
                  </Label>
                  <Input
                    id="valor_fcop"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={form.valor_fcop}
                    onChange={(e) => alterar('valor_fcop', e.target.value)}
                    placeholder="0,00"
                    className="numeros h-10 rounded-lg border-border bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={alterarStatus}>
                    <SelectTrigger className="h-10 rounded-lg border-border bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="data_pagamento"
                    className="text-xs text-muted-foreground"
                  >
                    Data do pagamento
                  </Label>
                  <Input
                    id="data_pagamento"
                    type="date"
                    value={form.data_pagamento}
                    onChange={(e) => alterar('data_pagamento', e.target.value)}
                    className="numeros h-10 rounded-lg border-border bg-background"
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs leading-relaxed text-muted-foreground">
                O status muda sozinho: ao lançar DIFAL ou FCOP fica <span className="font-semibold text-status-emitido">Emitida</span>;
                ao informar a data do pagamento fica <span className="font-semibold text-status-pago">Pago</span>.
              </p>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Comprovante de pagamento
                </Label>
                <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3">
                  {form.comprovante_uri ? (
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 text-[13px]">
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{form.comprovante_nome || 'Comprovante anexado'}</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        {/* Link (não botão) para continuar funcionando no modo somente leitura */}
                        <a
                          href="#comprovante"
                          role="button"
                          onClick={(e) => {
                            e.preventDefault();
                            abrirComprovante();
                          }}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-primary hover:bg-accent"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir
                        </a>
                        {somenteLeitura ? null : (
                        <label className="cursor-pointer rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground">
                          {enviando ? 'Enviando…' : 'Trocar'}
                          <input type="file" className="hidden" onChange={enviarComprovante} disabled={enviando} />
                        </label>
                        )}
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted-foreground">
                      {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {enviando ? 'Enviando…' : somenteLeitura ? 'Sem comprovante anexado' : 'Anexar PDF ou imagem'}
                      <input
                        type="file"
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={enviarComprovante}
                        disabled={enviando}
                      />
                    </label>
                  )}
                </div>
              </div>

              {erro ? <p className="text-[13px] text-destructive">{erro}</p> : null}
            </fieldset>

            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <p className="text-xs text-muted-foreground">Total da guia</p>
                <p className="numeros font-display text-xl leading-tight">{formatBRL(total)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={onClose} className="rounded-lg">
                  {somenteLeitura ? 'Fechar' : 'Cancelar'}
                </Button>
                {somenteLeitura ? null : (
                  <Button onClick={salvar} disabled={salvando || enviando} className="rounded-lg px-5">
                    {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

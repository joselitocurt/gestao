import React, { useMemo, useRef, useState } from 'react';
import { ArrowLeft, CalendarCheck, CheckCircle2, FileDown, Loader2, Paperclip, Upload, X } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import StatusBadge from '@/components/notas/StatusBadge';
import { formatBRL, formatEmissao } from '@/lib/fiscal';
import { baixarPdfLote } from '@/lib/lotePdf';
import { cn } from '@/lib/utils';
import { statusAutomatico } from '@shared/status.js';

const POR_ENVIO = 200;
const hoje = () => new Date().toISOString().slice(0, 10);
const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0;

const valoresIniciais = (notas) =>
  Object.fromEntries(
    notas.map((n) => [
      n.id,
      {
        valor_difal: n.valor_difal ? String(n.valor_difal) : '',
        valor_fcop: n.valor_fcop ? String(n.valor_fcop) : '',
        data_pagamento: n.data_pagamento ? String(n.data_pagamento).slice(0, 10) : '',
        comprovante_uri: n.comprovante_uri || '',
        comprovante_nome: n.comprovante_nome || '',
      },
    ]),
  );

const ABAS = [
  { chave: 'emitir', rotulo: 'Emitir guias', descricao: 'Lance DIFAL e FCOP de cada nota. Com valor, a nota fica Emitida.' },
  {
    chave: 'pagar',
    rotulo: 'Baixar pagamentos',
    descricao: 'Informe a data do pagamento e o comprovante. Com data, a nota fica Paga.',
  },
];

const entrada = 'numeros h-9 rounded-lg border-border bg-background text-right text-sm';

/**
 * Subpágina do lote: só as notas selecionadas, com os campos de emissão (DIFAL/FCOP)
 * ou de baixa (data do pagamento e comprovante), confirmação e relatório em PDF.
 */
export default function LoteEdicao({ notas, abaInicial = 'emitir', emissorDe, onVoltar, onRemover, onSalvo }) {
  const { toast } = useToast();
  const [aba, setAba] = useState(abaInicial);
  const [valores, setValores] = useState(() => valoresIniciais(notas));
  const [originais, setOriginais] = useState(() => valoresIniciais(notas));
  const [dataTodas, setDataTodas] = useState(hoje());
  const [enviandoArquivo, setEnviandoArquivo] = useState(null); // id da nota ou 'todas'
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sairSemSalvar, setSairSemSalvar] = useState(false);
  const [erro, setErro] = useState('');
  const arquivoTodas = useRef(null);

  // Notas removidas do lote saem também do formulário.
  const lista = notas.filter((n) => valores[n.id]);

  const alterar = (id, campo, valor) => setValores((v) => ({ ...v, [id]: { ...v[id], [campo]: valor } }));

  const previa = (n) => {
    const v = valores[n.id];
    return { ...n, valor_difal: num(v.valor_difal), valor_fcop: num(v.valor_fcop), data_pagamento: v.data_pagamento || null };
  };

  const alteradas = useMemo(
    () =>
      lista.filter((n) => {
        const a = valores[n.id];
        const o = originais[n.id];
        return (
          num(a.valor_difal) !== num(o.valor_difal) ||
          num(a.valor_fcop) !== num(o.valor_fcop) ||
          a.data_pagamento !== o.data_pagamento ||
          a.comprovante_uri !== o.comprovante_uri
        );
      }),
    [lista, valores, originais],
  );

  const totais = lista.reduce(
    (acc, n) => {
      const v = valores[n.id];
      acc.difal += num(v.valor_difal);
      acc.fcop += num(v.valor_fcop);
      acc.nota += Number(n.valor_total) || 0;
      if (v.data_pagamento) acc.pagas += 1;
      if (v.data_pagamento && !num(v.valor_difal) && !num(v.valor_fcop)) acc.pagasSemValor += 1;
      if (!num(v.valor_difal) && !num(v.valor_fcop)) acc.semValor += 1;
      if (v.comprovante_uri) acc.comComprovante += 1;
      return acc;
    },
    { difal: 0, fcop: 0, nota: 0, pagas: 0, pagasSemValor: 0, semValor: 0, comComprovante: 0 },
  );

  // ---------------------------------------------------------------- comprovantes

  const enviarArquivo = async (arquivo, alvo) => {
    if (!arquivo) return;
    setEnviandoArquivo(alvo);
    setErro('');
    try {
      const { file_uri } = await api.files.upload(arquivo);
      setValores((v) => {
        if (alvo !== 'todas') return { ...v, [alvo]: { ...v[alvo], comprovante_uri: file_uri, comprovante_nome: arquivo.name } };
        return Object.fromEntries(
          Object.entries(v).map(([id, item]) => [id, { ...item, comprovante_uri: file_uri, comprovante_nome: arquivo.name }]),
        );
      });
    } catch (e) {
      setErro(e.message || 'Não foi possível enviar o comprovante.');
    } finally {
      setEnviandoArquivo(null);
    }
  };

  const aplicarDataTodas = () =>
    setValores((v) => Object.fromEntries(Object.entries(v).map(([id, item]) => [id, { ...item, data_pagamento: dataTodas }])));

  // ---------------------------------------------------------------- gravação

  const confirmar = async () => {
    setSalvando(true);
    setErro('');
    try {
      const envio = (aba === 'emitir' ? lista : alteradas).map((n) => {
        const v = valores[n.id];
        // Envia os campos das duas abas, para não perder o que foi alterado na outra.
        return {
          id: n.id,
          valor_difal: num(v.valor_difal),
          valor_fcop: num(v.valor_fcop),
          data_pagamento: v.data_pagamento || null,
          comprovante_uri: v.comprovante_uri || '',
          comprovante_nome: v.comprovante_nome || '',
        };
      });
      const salvas = [];
      for (let i = 0; i < envio.length; i += POR_ENVIO) {
        salvas.push(...(await api.entities.NotaFiscal.updateMany(envio.slice(i, i + POR_ENVIO))));
      }
      onSalvo(salvas);
      const atualizados = valoresIniciais(salvas);
      setOriginais((o) => ({ ...o, ...atualizados }));
      setValores((v) => ({ ...v, ...atualizados }));
      toast({
        title: aba === 'emitir' ? `${salvas.length} guia(s) emitida(s)` : `${salvas.length} pagamento(s) baixado(s)`,
        description: 'O status das notas foi atualizado.',
      });
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar o lote. Nada foi alterado; tente novamente.');
    } finally {
      setSalvando(false);
      setConfirmando(false);
    }
  };

  const exportarPdf = () =>
    baixarPdfLote({
      notas: lista.map((n) => ({ ...previa(n), status: statusAutomatico(previa(n)) })),
      titulo: aba === 'emitir' ? 'Lote de emissão de guias DIFAL/FCOP' : 'Lote de baixa de pagamentos DIFAL/FCOP',
      emissorDe,
      observacao: alteradas.length ? `(${alteradas.length} alteração(ões) ainda não confirmada(s))` : '',
    });

  const voltar = () => (alteradas.length ? setSairSemSalvar(true) : onVoltar());

  const abaAtual = ABAS.find((a) => a.chave === aba);
  const qtdConfirmar = aba === 'emitir' ? lista.length : alteradas.length;

  return (
    <div>
      <button
        type="button"
        onClick={voltar}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar à seleção
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] leading-tight sm:text-[30px]">Lote com {lista.length} nota(s)</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{abaAtual.descricao}</p>
        </div>
        <Button variant="outline" onClick={exportarPdf} disabled={!lista.length}>
          <FileDown className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      <div className="mt-5 inline-flex rounded-lg bg-muted p-1" role="tablist">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            onClick={() => setAba(a.chave)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors',
              aba === a.chave ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'pagar' ? (
        <div className="painel mt-4 flex flex-wrap items-end gap-x-6 gap-y-3 p-4">
          <div>
            <label htmlFor="data-todas" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Data do pagamento para todas
            </label>
            <div className="flex gap-2">
              <Input
                id="data-todas"
                type="date"
                value={dataTodas}
                onChange={(e) => setDataTodas(e.target.value)}
                className="numeros h-9 w-44 rounded-lg"
              />
              <Button variant="secondary" onClick={aplicarDataTodas} disabled={!dataTodas}>
                <CalendarCheck className="h-4 w-4" />
                Aplicar a todas
              </Button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Comprovante único para todas</p>
            <Button variant="secondary" onClick={() => arquivoTodas.current?.click()} disabled={enviandoArquivo === 'todas'}>
              {enviandoArquivo === 'todas' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Anexar a todas
            </Button>
            <input
              ref={arquivoTodas}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                enviarArquivo(e.target.files?.[0], 'todas');
                e.target.value = '';
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground lg:ml-auto">
            {totais.pagas} de {lista.length} com data, {totais.comComprovante} com comprovante
          </p>
        </div>
      ) : null}

      <div className="painel mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <th className="px-4 py-2.5">NF</th>
              <th className="px-3 py-2.5">Destinatário</th>
              <th className="px-3 py-2.5 text-right">Valor da nota</th>
              {aba === 'emitir' ? (
                <>
                  <th className="w-32 px-3 py-2.5 text-right">DIFAL</th>
                  <th className="w-32 px-3 py-2.5 text-right">FCOP</th>
                  <th className="px-3 py-2.5 text-right">Guia</th>
                </>
              ) : (
                <>
                  <th className="px-3 py-2.5 text-right">Guia</th>
                  <th className="w-44 px-3 py-2.5">Data do pagamento</th>
                  <th className="px-3 py-2.5">Comprovante</th>
                </>
              )}
              <th className="px-3 py-2.5">Status</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lista.map((n) => {
              const v = valores[n.id];
              const p = previa(n);
              const guia = p.valor_difal + p.valor_fcop;
              const novoStatus = statusAutomatico(p);
              const mudou = alteradas.some((a) => a.id === n.id);
              return (
                <tr key={n.id} className={cn('align-middle', mudou && 'bg-accent/40')}>
                  <td className="px-4 py-2.5">
                    <p className="numeros font-semibold">NF {n.numero}</p>
                    <p className="max-w-[140px] truncate text-xs text-muted-foreground">{emissorDe(n)}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="max-w-[220px] truncate font-medium">{n.destinatario_nome || '—'}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="mr-1.5 rounded bg-muted px-1 py-px font-bold text-foreground/80">{n.destinatario_uf}</span>
                      emitida em {formatEmissao(n)}
                    </p>
                  </td>
                  <td className="numeros px-3 py-2.5 text-right text-muted-foreground">{formatBRL(n.valor_total)}</td>

                  {aba === 'emitir' ? (
                    <>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          placeholder="0,00"
                          aria-label={`DIFAL da NF ${n.numero}`}
                          value={v.valor_difal}
                          onChange={(e) => alterar(n.id, 'valor_difal', e.target.value)}
                          className={entrada}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          placeholder="0,00"
                          aria-label={`FCOP da NF ${n.numero}`}
                          value={v.valor_fcop}
                          onChange={(e) => alterar(n.id, 'valor_fcop', e.target.value)}
                          className={entrada}
                        />
                      </td>
                      <td className="numeros px-3 py-2.5 text-right font-semibold">{formatBRL(guia)}</td>
                    </>
                  ) : (
                    <>
                      <td className="numeros px-3 py-2.5 text-right font-semibold">{formatBRL(guia)}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="date"
                          aria-label={`Data do pagamento da NF ${n.numero}`}
                          value={v.data_pagamento}
                          onChange={(e) => alterar(n.id, 'data_pagamento', e.target.value)}
                          className="numeros h-9 rounded-lg border-border bg-background text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {v.comprovante_uri ? (
                          <span className="flex max-w-[200px] items-center gap-1.5 text-xs">
                            <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="truncate" title={v.comprovante_nome}>
                              {v.comprovante_nome || 'Comprovante'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                alterar(n.id, 'comprovante_uri', '');
                                alterar(n.id, 'comprovante_nome', '');
                              }}
                              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                              aria-label={`Remover comprovante da NF ${n.numero}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : (
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-accent">
                            {enviandoArquivo === n.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                            Anexar
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="hidden"
                              onChange={(e) => {
                                enviarArquivo(e.target.files?.[0], n.id);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                      </td>
                    </>
                  )}

                  <td className="px-3 py-2.5">
                    <StatusBadge status={novoStatus} />
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setValores((atual) => {
                          const { [n.id]: _, ...resto } = atual;
                          return resto;
                        });
                        onRemover(n.id);
                      }}
                      title="Tirar do lote"
                      aria-label={`Tirar a NF ${n.numero} do lote`}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/50 font-semibold">
              <td className="px-4 py-3" colSpan={2}>
                Total do lote
              </td>
              <td className="numeros px-3 py-3 text-right">{formatBRL(totais.nota)}</td>
              {aba === 'emitir' ? (
                <>
                  <td className="numeros px-3 py-3 text-right">{formatBRL(totais.difal)}</td>
                  <td className="numeros px-3 py-3 text-right">{formatBRL(totais.fcop)}</td>
                  <td className="numeros px-3 py-3 text-right">{formatBRL(totais.difal + totais.fcop)}</td>
                </>
              ) : (
                <>
                  <td className="numeros px-3 py-3 text-right">{formatBRL(totais.difal + totais.fcop)}</td>
                  <td className="px-3 py-3" colSpan={2} />
                </>
              )}
              <td className="px-3 py-3" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {erro ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</p>
      ) : null}

      <div className="sticky bottom-0 z-20 -mx-4 mt-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {aba === 'emitir'
              ? totais.semValor
                ? `${totais.semValor} nota(s) sem DIFAL nem FCOP continuarão "A emitir".`
                : 'Todas as notas do lote têm valor de guia.'
              : alteradas.length
                ? `${alteradas.length} nota(s) com alteração para confirmar.${
                    totais.pagasSemValor ? ` Atenção: ${totais.pagasSemValor} nota(s) sem DIFAL nem FCOP serão baixadas como pagas.` : ''
                  }`
                : 'Informe as datas e os comprovantes para confirmar a baixa.'}
          </p>
          <Button onClick={() => setConfirmando(true)} disabled={!qtdConfirmar || salvando} className="rounded-lg px-5">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {aba === 'emitir' ? `Confirmar emissão (${qtdConfirmar})` : `Confirmar baixa (${qtdConfirmar})`}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmando} onOpenChange={(v) => !salvando && setConfirmando(v)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {aba === 'emitir' ? `Emitir ${qtdConfirmar} guia(s)?` : `Baixar ${qtdConfirmar} pagamento(s)?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1 text-sm text-muted-foreground">
                {aba === 'emitir' ? (
                  <>
                    <p>
                      DIFAL {formatBRL(totais.difal)} e FCOP {formatBRL(totais.fcop)}, total de{' '}
                      <span className="font-semibold text-foreground">{formatBRL(totais.difal + totais.fcop)}</span>.
                    </p>
                    <p>Notas com valor ficam Emitidas; as que já têm data de pagamento continuam Pagas.</p>
                    {totais.semValor ? <p>{totais.semValor} nota(s) sem valor ficarão A emitir.</p> : null}
                  </>
                ) : (
                  <>
                    <p>As notas com data de pagamento ficam Pagas; sem data, voltam para Emitida ou A emitir.</p>
                    <p>
                      {totais.pagas} de {lista.length} nota(s) com data e {totais.comComprovante} com comprovante.
                    </p>
                    {totais.pagasSemValor ? (
                      <p className="font-semibold text-status-pendente">
                        {totais.pagasSemValor} nota(s) sem DIFAL nem FCOP serão baixadas como pagas.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvando}>Revisar</AlertDialogCancel>
            <AlertDialogAction
              disabled={salvando}
              onClick={(e) => {
                e.preventDefault();
                confirmar();
              }}
            >
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {aba === 'emitir' ? 'Emitir guias' : 'Confirmar baixa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sairSemSalvar} onOpenChange={setSairSemSalvar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem confirmar?</AlertDialogTitle>
            <AlertDialogDescription>
              {alteradas.length} nota(s) têm valores ainda não confirmados. Ao voltar, essas alterações são descartadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar no lote</AlertDialogCancel>
            <AlertDialogAction onClick={onVoltar} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar e voltar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

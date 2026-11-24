import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, ExternalLink, FileDown, Loader2, Pencil, Printer, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
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
import ColaboradorDialog from '@/components/disciplinar/ColaboradorDialog';
import PunicaoEditarDialog from '@/components/disciplinar/PunicaoEditarDialog';
import { Avatar, Carregando, NivelPill, SituacaoPill, Trilha, Vazio } from '@/components/disciplinar/Niveis';
import { useAcesso } from '@/lib/AcessoContext';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { abrirAnexo, baixarAnexo } from '@/lib/disciplinar/arquivos';
import { pdfFormulario, pdfHistorico } from '@/lib/disciplinar/pdf';
import { cn } from '@/lib/utils';
import { ciclos, dataHoje, ordenarPunicoes } from '@shared/disciplinar.js';

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

export default function Consulta() {
  const d = useDisciplinar();
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const [editarColab, setEditarColab] = useState(false);
  const [editarPun, setEditarPun] = useState(null);
  const [excluir, setExcluir] = useState(null);
  const [ocupado, setOcupado] = useState('');

  if (d.carregando) return <Carregando />;

  const selecionadoId = params.get('c') || '';
  const c = d.colaborador(selecionadoId);
  const lista = d.buscarColaboradores(busca);
  const mostrarLista = busca.trim() || !c;
  const escolher = (id) => {
    setParams(id ? { c: id } : {});
    setBusca('');
  };

  const executar = async (chave, fn, erroTitulo) => {
    setOcupado(chave);
    try {
      await fn();
    } catch (e) {
      toast({ variant: 'destructive', title: erroTitulo, description: e.message });
    } finally {
      setOcupado('');
    }
  };

  const puns = c ? d.punicoes.filter((p) => p.colaborador_id === c.id) : [];
  const fluxos = c ? d.fluxos(c.id) : [];
  const anexos = ordenarPunicoes(puns.filter((p) => p.anexo_uri)).reverse();
  const motivosIds = [...new Set(puns.map((p) => p.motivo_id))].sort((a, b) => d.nomeMotivo(a).localeCompare(d.nomeMotivo(b)));
  const hoje = dataHoje();

  return (
    <div>
      <PageHeader titulo="Consultar colaborador" descricao="Histórico, fluxos por motivo e documentos anexados." />

      <div className="relative mx-auto mt-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, matrícula, CPF ou função…"
          className="h-11 rounded-xl pl-10 text-[15px]"
          autoComplete="off"
        />
      </div>

      {mostrarLista ? (
        lista.length ? (
          <>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {lista.slice(0, 24).map((x) => (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => escolher(x.id)}
                  className={cn(
                    'painel px-4 py-3 text-left transition-colors hover:border-primary/40',
                    x.id === selecionadoId && 'border-primary',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{x.nome}</span>
                    <NivelPill nivel={d.nivelAtual(x.id)} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    Mat. {x.matricula}
                    {x.funcao ? ` · ${x.funcao}` : ''}
                  </span>
                </button>
              ))}
            </div>
            {lista.length > 24 ? <p className="mt-2 text-center text-xs text-muted-foreground">Mostrando 24 de {lista.length}. Refine a busca.</p> : null}
          </>
        ) : (
          <Vazio>Nenhum colaborador encontrado.</Vazio>
        )
      ) : null}

      {c ? (
        <div className="mt-6 space-y-4">
          <section className="painel flex flex-wrap items-center gap-4 p-5">
            <Avatar nome={c.nome} className="h-14 w-14 text-xl" />
            <div className="min-w-[220px] flex-1">
              <p className="flex flex-wrap items-center gap-2 font-display text-xl">
                {c.nome} <SituacaoPill status={c.status} />
              </p>
              <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Matrícula: <b className="text-foreground">{c.matricula}</b>
                </span>
                {c.cpf ? <span className="numeros">CPF: {c.cpf}</span> : null}
                {c.funcao ? <span>Função: {c.funcao}</span> : null}
                {c.departamento ? <span>Depto.: {c.departamento}</span> : null}
                {c.admissao ? <span>Admissão: {fmt(c.admissao)}</span> : null}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditarColab(true)} disabled={!podeEditar}>
                <Pencil className="h-4 w-4" /> Editar
              </Button>
              <Button
                onClick={() =>
                  executar(
                    'historico',
                    () => pdfHistorico({ colaborador: c, punicoes: d.punicoes, nomeMotivo: d.nomeMotivo, fluxos }),
                    'Erro ao gerar PDF',
                  )
                }
                disabled={ocupado === 'historico'}
              >
                {ocupado === 'historico' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                Exportar PDF
              </Button>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <section className="painel p-5">
              <h2 className="font-display text-lg">Histórico por motivo e ciclo</h2>
              {motivosIds.length ? (
                motivosIds.map((mid) => (
                  <div key={mid} className="mt-4">
                    <p className="text-sm font-semibold">{d.nomeMotivo(mid)}</p>
                    {ciclos(d.punicoes, c.id, mid)
                      .reverse()
                      .map((cy) => {
                        const aberto = cy.inicio <= hoje && hoje <= cy.fim;
                        return (
                          <div key={cy.inicio}>
                            <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-1.5 text-xs">
                              <b>
                                Ciclo {fmt(cy.inicio)} a {fmt(cy.fim)}
                              </b>
                              <span
                                className={cn(
                                  'rounded-full px-2 py-px font-semibold',
                                  aberto ? 'bg-status-pago/10 text-status-pago' : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {aberto ? 'aberto' : 'encerrado'}
                              </span>
                            </div>
                            {cy.punicoes
                              .slice()
                              .reverse()
                              .map((p) => (
                                <div key={p.id} className="grid gap-3 border-b border-border/60 py-3 last:border-0 sm:grid-cols-[96px_minmax(0,1fr)_auto]">
                                  <div>
                                    <p className="numeros text-sm font-semibold">{fmt(p.data)}</p>
                                    <p className="numeros text-xs text-muted-foreground">{p.referencia}</p>
                                  </div>
                                  <div className="min-w-0 text-sm">
                                    <p className="flex flex-wrap items-center gap-2">
                                      <NivelPill nivel={p.nivel} />
                                      {Number(p.nivel) === 5 && p.dias_suspensao ? (
                                        <span className="text-xs text-muted-foreground">{p.dias_suspensao} dia(s)</span>
                                      ) : null}
                                    </p>
                                    <p className="mt-1.5">{p.descricao}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Aplicada por {p.aplicada_por || '—'}
                                      {p.testemunhas ? ` · Testemunhas: ${p.testemunhas}` : ''}
                                    </p>
                                    {p.justificativa_nivel ? (
                                      <p className="mt-1 text-xs text-muted-foreground">Justificativa do nível: {p.justificativa_nivel}</p>
                                    ) : null}
                                    {p.anexo_uri ? (
                                      <button
                                        type="button"
                                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline dark:text-dourado"
                                        onClick={() => abrirAnexo(p.anexo_uri).catch((e) => toast({ variant: 'destructive', title: e.message }))}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" /> Ver PDF da punição
                                      </button>
                                    ) : null}
                                  </div>
                                  <div className="flex items-start gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      title="Formulário para assinatura"
                                      disabled={ocupado === `f-${p.id}`}
                                      onClick={() =>
                                        executar(
                                          `f-${p.id}`,
                                          () => pdfFormulario({ punicao: p, colaborador: c, empresa: d.empresa, punicoes: d.punicoes, nomeMotivo: d.nomeMotivo }),
                                          'Erro ao gerar PDF',
                                        )
                                      }
                                    >
                                      <Printer className="h-3.5 w-3.5" /> Formulário
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditarPun(p)} disabled={!podeEditar} aria-label={`Editar ${p.referencia}`}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => setExcluir(p)}
                                      disabled={!podeEditar}
                                      aria-label={`Excluir ${p.referencia}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                ))
              ) : (
                <Vazio>Nenhuma punição registrada para este colaborador.</Vazio>
              )}
            </section>

            <div className="space-y-4">
              <section className="painel p-5">
                <h2 className="font-display text-lg">Fluxos no ciclo atual</h2>
                <div className="mt-3 space-y-2.5">
                  {fluxos.length ? (
                    fluxos.map((f) => (
                      <div key={f.motivoId} className="rounded-lg border border-border px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">{d.nomeMotivo(f.motivoId)}</span>
                          <NivelPill nivel={f.nivel} />
                        </div>
                        <Trilha nivel={f.nivel} />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {f.ciclo ? `Ciclo ${fmt(f.ciclo.inicio)} a ${fmt(f.ciclo.fim)}` : 'Ciclo encerrado; a próxima punição recomeça em Verbal'}
                        </p>
                      </div>
                    ))
                  ) : (
                    <Vazio>Nenhum fluxo.</Vazio>
                  )}
                </div>
              </section>

              <section className="painel p-5">
                <h2 className="font-display text-lg">Arquivos anexados</h2>
                {anexos.length ? (
                  <ul className="mt-3 divide-y divide-border/60">
                    {anexos.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.anexo_nome || 'documento.pdf'}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.referencia} · {fmt(p.data)} · {d.nomeMotivo(p.motivo_id)}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirAnexo(p.anexo_uri).catch((e) => toast({ variant: 'destructive', title: e.message }))}
                        >
                          Visualizar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Baixar"
                          onClick={() => executar(`d-${p.id}`, () => baixarAnexo(p.anexo_uri, p.anexo_nome || `${p.referencia}.pdf`), 'Não foi possível baixar')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Vazio>Nenhum arquivo anexado.</Vazio>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}

      <ColaboradorDialog aberto={editarColab} colaborador={c} onFechar={() => setEditarColab(false)} onSalvo={() => setEditarColab(false)} />
      <PunicaoEditarDialog
        punicao={editarPun}
        onFechar={(salvo) => {
          setEditarPun(null);
          if (salvo) toast({ title: 'Punição atualizada' });
        }}
      />
      <AlertDialog open={Boolean(excluir)} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir punição</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir {excluir?.referencia} de {fmt(excluir?.data)}? Os níveis seguintes deste motivo serão recalculados.
              {Number(excluir?.nivel) === 6 ? ' A situação do colaborador não volta para Ativo automaticamente.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                executar(
                  'excluir',
                  async () => {
                    await api.entities.Punicao.delete(excluir.id);
                    await d.recarregar();
                    toast({ title: 'Punição excluída' });
                  },
                  'Não foi possível excluir',
                )
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

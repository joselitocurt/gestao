import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Paperclip, Printer, UserPlus, X } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import BuscaColaborador from '@/components/disciplinar/BuscaColaborador';
import ColaboradorDialog from '@/components/disciplinar/ColaboradorDialog';
import { Avatar, COR_NIVEL, Carregando, NivelPill, SituacaoPill, Textarea, Trilha, Vazio } from '@/components/disciplinar/Niveis';
import { useAcesso } from '@/lib/AcessoContext';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { pdfFormulario } from '@/lib/disciplinar/pdf';
import { cn } from '@/lib/utils';
import { NIVEIS, dataHoje, fluxoEm, normalizar, sugerirReferencia } from '@shared/disciplinar.js';

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const lerAplicador = () => {
  try {
    return localStorage.getItem('disc-aplicada-por') || '';
  } catch {
    return '';
  }
};
const novo = () => ({
  colaboradorId: '',
  motivoId: '',
  data: dataHoje(),
  nivel: 0,
  nivelManual: false,
  dias: '',
  justificativa: '',
  referencia: '',
  refManual: false,
  descricao: '',
  aplicadaPor: lerAplicador(),
  testemunhas: '',
  arquivo: null,
});

export default function Registrar() {
  const d = useDisciplinar();
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [r, setR] = useState(novo);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [novoColab, setNovoColab] = useState(false);
  const [registrada, setRegistrada] = useState(null);
  const [gerando, setGerando] = useState(false);

  const alterar = (campo, valor) => setR((a) => ({ ...a, [campo]: valor }));

  // Nível sugerido pelo ciclo de 12 meses do colaborador naquele motivo.
  const situacao = useMemo(
    () => (r.colaboradorId && r.motivoId ? fluxoEm(d.punicoes, r.colaboradorId, r.motivoId, r.data) : null),
    [d.punicoes, r.colaboradorId, r.motivoId, r.data],
  );
  const sugerido = situacao ? Math.min(6, situacao.nivel + 1) : 0;
  const nivel = r.nivelManual ? r.nivel : sugerido;
  const referencia = r.refManual ? r.referencia : sugerirReferencia(d.punicoes, r.data);

  useEffect(() => {
    // Mudou colaborador, motivo ou data: volta a seguir a sugestão.
    setR((a) => ({ ...a, nivelManual: false }));
  }, [r.colaboradorId, r.motivoId, r.data]);

  const motivosAtivos = d.motivos
    .filter((m) => m.ativo !== false || m.id === r.motivoId)
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  const colab = d.colaborador(r.colaboradorId);
  const fluxos = colab ? d.fluxos(colab.id) : [];
  if (colab && r.motivoId && !fluxos.some((f) => f.motivoId === r.motivoId)) fluxos.unshift({ motivoId: r.motivoId, nivel: 0, ciclo: null });

  const escolherArquivo = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') return toast({ variant: 'destructive', title: 'Selecione um arquivo PDF.' });
    if (f.size > 10 * 1048576) return toast({ variant: 'destructive', title: 'O PDF deve ter até 10 MB.' });
    alterar('arquivo', f);
  };

  const registrar = async () => {
    const erros = [];
    if (!r.colaboradorId) erros.push('Selecione o colaborador.');
    if (!r.motivoId) erros.push('Selecione o motivo.');
    if (!r.data) erros.push('Informe a data.');
    if (!nivel) erros.push('Selecione o nível.');
    if (!referencia.trim()) erros.push('Informe a referência.');
    else if (d.punicoes.some((p) => normalizar(p.referencia) === normalizar(referencia.trim()))) erros.push('Essa referência já foi usada.');
    if (!r.descricao.trim()) erros.push('Descreva o ocorrido.');
    if (!r.aplicadaPor.trim()) erros.push('Informe quem aplicou.');
    if (nivel === 5 && !(Number(r.dias) > 0)) erros.push('Informe os dias de suspensão.');
    if (sugerido && nivel !== sugerido && !r.justificativa.trim()) erros.push('Justifique o nível fora da sequência.');
    setErro(erros.join(' '));
    if (erros.length) return;

    setSalvando(true);
    try {
      let anexo = {};
      if (r.arquivo) {
        const { file_uri } = await api.files.upload(r.arquivo);
        anexo = { anexo_uri: file_uri, anexo_nome: r.arquivo.name };
      }
      const p = await api.entities.Punicao.create({
        referencia: referencia.trim(),
        colaborador_id: r.colaboradorId,
        motivo_id: r.motivoId,
        nivel,
        data: r.data,
        ciclo_inicio: situacao?.ciclo ? situacao.ciclo.inicio : r.data,
        dias_suspensao: nivel === 5 ? Number(r.dias) : null,
        descricao: r.descricao.trim(),
        justificativa_nivel: nivel !== sugerido ? r.justificativa.trim() : '',
        aplicada_por: r.aplicadaPor.trim(),
        testemunhas: r.testemunhas.trim(),
        ...anexo,
      });
      // Demissão: a situação do colaborador passa a Demitido.
      if (nivel === 6 && colab && colab.status !== 'Demitido') await api.entities.Colaborador.update(colab.id, { status: 'Demitido' });
      try {
        localStorage.setItem('disc-aplicada-por', r.aplicadaPor.trim());
      } catch {
        // lembrar quem aplicou é só uma conveniência
      }
      await d.recarregar();
      setRegistrada({ punicao: p, colaborador: colab });
      setR({ ...novo(), aplicadaPor: r.aplicadaPor.trim() });
      setErro('');
    } catch (e) {
      setErro(e.message || 'Não foi possível registrar.');
    } finally {
      setSalvando(false);
    }
  };

  const gerarFormulario = async () => {
    setGerando(true);
    try {
      await pdfFormulario({
        punicao: registrada.punicao,
        colaborador: registrada.colaborador,
        empresa: d.empresa,
        punicoes: d.punicoes,
        nomeMotivo: d.nomeMotivo,
      });
      setRegistrada(null);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Não foi possível gerar o PDF', description: e.message });
    } finally {
      setGerando(false);
    }
  };

  if (d.carregando) return <Carregando />;

  return (
    <div>
      <PageHeader titulo="Registrar punição" descricao="O nível é sugerido pelo ciclo de 12 meses do colaborador naquele motivo." />

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="painel p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="busca-colaborador">Colaborador *</Label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <BuscaColaborador valor={r.colaboradorId} onEscolher={(id) => alterar('colaboradorId', id)} />
                </div>
                <Button type="button" variant="outline" onClick={() => setNovoColab(true)} disabled={!podeEditar}>
                  <UserPlus className="h-4 w-4" /> Novo
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo *</Label>
              <Select value={r.motivoId} onValueChange={(v) => alterar('motivoId', v)}>
                <SelectTrigger aria-label="Motivo">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {motivosAtivos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-data">Data da punição *</Label>
              <Input id="r-data" type="date" max={dataHoje()} value={r.data} onChange={(e) => alterar('data', e.target.value || dataHoje())} />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Nível *</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {NIVEIS.slice(1).map((n) => (
                  <button
                    key={n.n}
                    type="button"
                    onClick={() => setR((a) => ({ ...a, nivel: n.n, nivelManual: true }))}
                    className={cn(
                      'relative rounded-lg border px-3 py-2.5 text-left transition-colors',
                      nivel === n.n ? 'border-primary bg-accent ring-1 ring-primary' : 'border-border hover:bg-muted/60',
                    )}
                  >
                    {sugerido === n.n ? (
                      <span className="absolute -top-2 right-2 rounded-full bg-status-pago px-2 py-px text-[10px] font-semibold text-white">
                        sugerido
                      </span>
                    ) : null}
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_NIVEL[n.n] }} />
                      {n.curto}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.nome}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {!sugerido
                  ? 'Escolha colaborador e motivo para ver o nível sugerido.'
                  : situacao?.ciclo
                    ? `Ciclo aberto de ${fmt(situacao.ciclo.inicio)} a ${fmt(situacao.ciclo.fim)} · nível atual: ${NIVEIS[situacao.nivel]?.curto || 'nenhum'}.`
                    : 'Sem ciclo aberto neste motivo: esta punição inicia um novo ciclo de 12 meses.'}
              </p>
              {nivel === 5 ? (
                <div className="max-w-[220px] space-y-1.5 pt-1">
                  <Label htmlFor="r-dias">Dias de suspensão *</Label>
                  <Input id="r-dias" type="number" min="1" max="30" value={r.dias} onChange={(e) => alterar('dias', e.target.value)} />
                </div>
              ) : null}
              {sugerido && nivel && nivel !== sugerido ? (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="r-just">Justificativa para fugir da sequência *</Label>
                  <Textarea
                    id="r-just"
                    placeholder="Ex.: falta grave conforme política interna"
                    value={r.justificativa}
                    onChange={(e) => alterar('justificativa', e.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-ref">Título / Referência *</Label>
              <Input
                id="r-ref"
                className="numeros"
                value={referencia}
                onChange={(e) => setR((a) => ({ ...a, referencia: e.target.value, refManual: true }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-apl">Aplicada por *</Label>
              <Input id="r-apl" placeholder="Nome do gestor" value={r.aplicadaPor} onChange={(e) => alterar('aplicadaPor', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-desc">Descrição do ocorrido *</Label>
              <Textarea id="r-desc" placeholder="O que aconteceu, quando e onde" value={r.descricao} onChange={(e) => alterar('descricao', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-test">Testemunhas</Label>
              <Input id="r-test" placeholder="Separe os nomes por vírgula" value={r.testemunhas} onChange={(e) => alterar('testemunhas', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>PDF da punição assinada</Label>
              {r.arquivo ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{r.arquivo.name}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => alterar('arquivo', null)} aria-label="Remover arquivo">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/40">
                  <FileText className="h-4 w-4" /> Anexar PDF (até 10 MB). Também pode ser anexado depois, em Consultar colaborador.
                  <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={escolherArquivo} />
                </label>
              )}
            </div>
          </div>

          {erro ? <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive">{erro}</p> : null}
          <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={() => setR({ ...novo(), aplicadaPor: r.aplicadaPor })} disabled={salvando}>
              Limpar
            </Button>
            <Button type="button" onClick={registrar} disabled={salvando || !podeEditar}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Registrar punição
            </Button>
          </div>
        </section>

        <section className="painel h-fit p-5">
          <h2 className="font-display text-lg">Situação do colaborador</h2>
          {!colab ? (
            <Vazio>Selecione um colaborador para ver os fluxos de cada motivo.</Vazio>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-3">
                <Avatar nome={colab.nome} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    {colab.nome} <SituacaoPill status={colab.status} />
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Mat. {colab.matricula}
                    {colab.funcao ? ` · ${colab.funcao}` : ''}
                    {colab.departamento ? ` · ${colab.departamento}` : ''}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                {fluxos.length ? (
                  fluxos.map((f) => (
                    <div
                      key={f.motivoId}
                      className={cn('rounded-lg border px-3 py-2.5', f.motivoId === r.motivoId ? 'border-primary ring-1 ring-primary/40' : 'border-border')}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{d.nomeMotivo(f.motivoId)}</span>
                        <NivelPill nivel={f.nivel} />
                      </div>
                      <Trilha nivel={f.nivel} />
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {f.ciclo ? `Ciclo ${fmt(f.ciclo.inicio)} a ${fmt(f.ciclo.fim)}` : 'Sem ciclo aberto hoje'}
                      </p>
                    </div>
                  ))
                ) : (
                  <Vazio>Sem punições registradas.</Vazio>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      <ColaboradorDialog
        aberto={novoColab}
        colaborador={null}
        onFechar={() => setNovoColab(false)}
        onSalvo={(c) => {
          setNovoColab(false);
          alterar('colaboradorId', c.id);
          toast({ title: 'Colaborador cadastrado' });
        }}
      />

      <Dialog open={Boolean(registrada)} onOpenChange={(v) => !v && setRegistrada(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Punição registrada</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="numeros font-semibold text-foreground">{registrada?.punicao.referencia}</span> ·{' '}
                  {NIVEIS[Number(registrada?.punicao.nivel) || 1]?.nome} para{' '}
                  <span className="font-semibold text-foreground">{registrada?.colaborador?.nome}</span>.
                </p>
                <p>Gere o formulário em PDF, imprima e colete as assinaturas. Depois, anexe o documento assinado em Consultar colaborador.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRegistrada(null)}>
              Agora não
            </Button>
            <Button onClick={gerarFormulario} disabled={gerando}>
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Gerar formulário para assinatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Carregando, Textarea, Vazio } from '@/components/disciplinar/Niveis';
import { useAcesso } from '@/lib/AcessoContext';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { cn } from '@/lib/utils';
import { normalizar } from '@shared/disciplinar.js';

function MotivoDialog({ aberto, motivo, onFechar }) {
  const d = useDisciplinar();
  const [f, setF] = useState({ nome: '', descricao: '', ativo: true });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (!aberto) return;
    setErro('');
    setF({ nome: motivo?.nome || '', descricao: motivo?.descricao || '', ativo: motivo ? motivo.ativo !== false : true });
  }, [aberto, motivo]);

  const salvar = async () => {
    const nome = f.nome.trim();
    if (!nome) return setErro('Informe o nome.');
    if (d.motivos.some((x) => x.id !== motivo?.id && normalizar(x.nome) === normalizar(nome))) return setErro('Já existe um motivo com esse nome.');
    setSalvando(true);
    try {
      const dados = { nome, descricao: f.descricao.trim(), ativo: f.ativo };
      if (motivo) await api.entities.Motivo.update(motivo.id, dados);
      else await api.entities.Motivo.create(dados);
      await d.recarregar();
      onFechar(true);
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{motivo ? 'Editar motivo' : 'Novo motivo'}</DialogTitle>
          <DialogDescription>Cada motivo tem um fluxo próprio de progressão por colaborador.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-nome">Nome *</Label>
            <Input id="m-nome" value={f.nome} onChange={(e) => setF((a) => ({ ...a, nome: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-desc">Descrição</Label>
            <Textarea id="m-desc" value={f.descricao} onChange={(e) => setF((a) => ({ ...a, descricao: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={f.ativo} onCheckedChange={(v) => setF((a) => ({ ...a, ativo: Boolean(v) }))} />
            Ativo (aparece na lista do registro)
          </label>
          {erro ? <p className="rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive">{erro}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onFechar(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Motivos() {
  const d = useDisciplinar();
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [dialogo, setDialogo] = useState(null);

  if (d.carregando) return <Carregando />;
  const lista = d.motivos.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  const usos = (id) => d.punicoes.filter((p) => p.motivo_id === id).length;

  const acao = async (fn, ok) => {
    try {
      await fn();
      await d.recarregar();
      toast({ title: ok });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Não foi possível salvar', description: e.message });
    }
  };

  return (
    <div>
      <PageHeader
        titulo="Motivos"
        descricao="Cada motivo tem um fluxo próprio de progressão por colaborador."
        acoes={
          <Button onClick={() => setDialogo({ motivo: null })} disabled={!podeEditar}>
            <Plus className="h-4 w-4" /> Novo motivo
          </Button>
        }
      />
      <section className="painel mt-6 overflow-hidden">
        {lista.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Motivo</th>
                <th className="px-3 py-2.5 font-semibold">Descrição</th>
                <th className="px-3 py-2.5 text-right font-semibold">Punições</th>
                <th className="px-3 py-2.5 font-semibold">Situação</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => {
                const n = usos(m.id);
                const ativo = m.ativo !== false;
                return (
                  <tr key={m.id} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-2.5 font-semibold">{m.nome}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{m.descricao}</td>
                    <td className="numeros px-3 py-2.5 text-right">{n}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                          ativo ? 'bg-status-pago/10 text-status-pago' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-2 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDialogo({ motivo: m })} disabled={!podeEditar} aria-label={`Editar ${m.nome}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!podeEditar}
                        onClick={() => acao(() => api.entities.Motivo.update(m.id, { ativo: !ativo }), ativo ? 'Motivo inativado' : 'Motivo ativado')}
                      >
                        {ativo ? 'Inativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={!podeEditar || n > 0}
                        title={n ? 'Motivo em uso: apenas inative' : undefined}
                        aria-label={`Excluir ${m.nome}`}
                        onClick={() => {
                          if (window.confirm(`Excluir o motivo “${m.nome}”?`)) acao(() => api.entities.Motivo.delete(m.id), 'Motivo excluído');
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Vazio>Nenhum motivo cadastrado.</Vazio>
        )}
      </section>
      <MotivoDialog
        aberto={Boolean(dialogo)}
        motivo={dialogo?.motivo || null}
        onFechar={(ok) => {
          if (ok) toast({ title: 'Motivo salvo' });
          setDialogo(null);
        }}
      />
    </div>
  );
}

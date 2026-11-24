import React, { useEffect, useState } from 'react';
import { Loader2, Paperclip } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/disciplinar/Niveis';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { normalizar } from '@shared/disciplinar.js';

/** Edita os dados descritivos e o PDF assinado (colaborador, motivo, data e nível ficam fixos). */
export default function PunicaoEditarDialog({ punicao, onFechar }) {
  const d = useDisciplinar();
  const [f, setF] = useState({});
  const [arquivo, setArquivo] = useState(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!punicao) return;
    setF({
      referencia: punicao.referencia || '',
      aplicada_por: punicao.aplicada_por || '',
      dias_suspensao: punicao.dias_suspensao || '',
      descricao: punicao.descricao || '',
      testemunhas: punicao.testemunhas || '',
    });
    setArquivo(null);
    setErro('');
  }, [punicao]);

  const salvar = async () => {
    const ref = f.referencia.trim();
    if (!ref || !f.descricao.trim()) return setErro('Referência e descrição são obrigatórias.');
    if (d.punicoes.some((x) => x.id !== punicao.id && normalizar(x.referencia) === normalizar(ref))) return setErro('Essa referência já foi usada.');
    if (arquivo && !/\.pdf$/i.test(arquivo.name) && arquivo.type !== 'application/pdf') return setErro('Selecione um arquivo PDF.');
    if (arquivo && arquivo.size > 10 * 1048576) return setErro('O PDF deve ter até 10 MB.');
    setSalvando(true);
    try {
      const dados = {
        referencia: ref,
        aplicada_por: f.aplicada_por.trim(),
        descricao: f.descricao.trim(),
        testemunhas: f.testemunhas.trim(),
      };
      if (Number(punicao.nivel) === 5) dados.dias_suspensao = Number(f.dias_suspensao) || null;
      if (arquivo) {
        const { file_uri } = await api.files.upload(arquivo);
        dados.anexo_uri = file_uri;
        dados.anexo_nome = arquivo.name;
      }
      await api.entities.Punicao.update(punicao.id, dados);
      await d.recarregar();
      onFechar(true);
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const campo = (k) => (e) => setF((a) => ({ ...a, [k]: e.target.value }));

  return (
    <Dialog open={Boolean(punicao)} onOpenChange={(v) => !v && onFechar(false)}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar punição {punicao?.referencia}</DialogTitle>
          <DialogDescription>
            Colaborador, motivo, data e nível não são editáveis para preservar o fluxo. Para corrigi-los, exclua e registre novamente.
          </DialogDescription>
        </DialogHeader>
        {punicao ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="e-ref">Referência</Label>
              <Input id="e-ref" className="numeros" value={f.referencia || ''} onChange={campo('referencia')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-apl">Aplicada por</Label>
              <Input id="e-apl" value={f.aplicada_por || ''} onChange={campo('aplicada_por')} />
            </div>
            {Number(punicao.nivel) === 5 ? (
              <div className="space-y-1.5">
                <Label htmlFor="e-dias">Dias de suspensão</Label>
                <Input id="e-dias" type="number" min="1" value={f.dias_suspensao || ''} onChange={campo('dias_suspensao')} />
              </div>
            ) : null}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="e-desc">Descrição</Label>
              <Textarea id="e-desc" value={f.descricao || ''} onChange={campo('descricao')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="e-test">Testemunhas</Label>
              <Input id="e-test" placeholder="Separe os nomes por vírgula" value={f.testemunhas || ''} onChange={campo('testemunhas')} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="e-file">PDF assinado</Label>
              {punicao.anexo_nome ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Paperclip className="h-3.5 w-3.5" /> Atual: {punicao.anexo_nome} (enviar outro substitui)
                </p>
              ) : null}
              <Input id="e-file" type="file" accept="application/pdf,.pdf" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
            </div>
            {erro ? <p className="rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive sm:col-span-2">{erro}</p> : null}
          </div>
        ) : null}
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

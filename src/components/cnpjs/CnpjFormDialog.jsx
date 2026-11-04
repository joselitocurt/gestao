import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/api/client';
import { UFS, apenasDigitos } from '@/lib/fiscal';

const INICIAL = { cnpj: '', razao_social: '', apelido: '', uf: 'SP', tipo: 'filial' };

export default function CnpjFormDialog({ aberto, emitente, onClose, onSaved }) {
  const [form, setForm] = useState(INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setErro('');
    setForm(
      emitente
        ? {
            cnpj: emitente.cnpj || '',
            razao_social: emitente.razao_social || '',
            apelido: emitente.apelido || '',
            uf: emitente.uf || 'SP',
            tipo: emitente.tipo || 'filial',
          }
        : INICIAL,
    );
  }, [aberto, emitente]);

  const alterar = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const salvar = async () => {
    const cnpj = apenasDigitos(form.cnpj);
    if (cnpj.length !== 14) {
      setErro('Informe o CNPJ com 14 dígitos.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const dados = {
        cnpj,
        razao_social: form.razao_social.trim(),
        apelido: form.apelido.trim(),
        uf: form.uf,
        tipo: form.tipo,
      };
      if (emitente?.id) await api.entities.Emitente.update(emitente.id, dados);
      else await api.entities.Emitente.create(dados);
      onSaved?.();
    } catch {
      setErro('Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">
            {emitente?.id ? 'Editar CNPJ' : 'Novo CNPJ'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="cnpj" className="text-xs text-muted-foreground">
              CNPJ
            </Label>
            <Input
              id="cnpj"
              value={form.cnpj}
              onChange={(e) => alterar('cnpj', e.target.value)}
              placeholder="00.000.000/0000-00"
              inputMode="numeric"
              className="numeros h-10 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="razao" className="text-xs text-muted-foreground">
              Razão social
            </Label>
            <Input
              id="razao"
              value={form.razao_social}
              onChange={(e) => alterar('razao_social', e.target.value)}
              className="h-10 rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apelido" className="text-xs text-muted-foreground">
              Nome curto
            </Label>
            <Input
              id="apelido"
              value={form.apelido}
              onChange={(e) => alterar('apelido', e.target.value)}
              placeholder="Ex.: Matriz, Filial Recife"
              className="h-10 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">UF</Label>
              <Select value={form.uf} onValueChange={(v) => alterar('uf', v)}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => alterar('tipo', v)}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matriz">Matriz</SelectItem>
                  <SelectItem value="filial">Filial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {erro ? <p className="text-[13px] text-destructive">{erro}</p> : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="rounded-lg">
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando} className="rounded-lg px-5">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

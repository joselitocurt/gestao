import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Carregando } from '@/components/disciplinar/Niveis';
import { useAcesso } from '@/lib/AcessoContext';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';

const mascaraCnpj = (v) =>
  String(v || '')
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');

export default function Empresa() {
  const d = useDisciplinar();
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [f, setF] = useState({ nome: '', cnpj: '', cidade: '', endereco: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (d.empresa) setF({ nome: d.empresa.nome || '', cnpj: d.empresa.cnpj || '', cidade: d.empresa.cidade || '', endereco: d.empresa.endereco || '' });
  }, [d.empresa]);

  if (d.carregando) return <Carregando />;
  const campo = (k) => (e) => setF((a) => ({ ...a, [k]: k === 'cnpj' ? mascaraCnpj(e.target.value) : e.target.value }));

  const salvar = async () => {
    setSalvando(true);
    try {
      const dados = { nome: f.nome.trim(), cnpj: f.cnpj.trim(), cidade: f.cidade.trim(), endereco: f.endereco.trim() };
      if (d.empresa) await api.entities.Empresa.update(d.empresa.id, dados);
      else await api.entities.Empresa.create(dados);
      await d.recarregar();
      toast({ title: 'Dados da empresa salvos' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Não foi possível salvar', description: e.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <PageHeader titulo="Empresa" descricao="Dados impressos no cabeçalho dos formulários de punição." />
      <section className="painel mt-6 max-w-3xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="em-nome">Razão social / Nome da empresa</Label>
            <Input id="em-nome" value={f.nome} onChange={campo('nome')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-cnpj">CNPJ</Label>
            <Input id="em-cnpj" inputMode="numeric" placeholder="00.000.000/0000-00" value={f.cnpj} onChange={campo('cnpj')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-cid">Cidade / UF</Label>
            <Input id="em-cid" placeholder="Ex.: Fortaleza/CE" value={f.cidade} onChange={campo('cidade')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="em-end">Endereço</Label>
            <Input id="em-end" value={f.endereco} onChange={campo('endereco')} />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">A cidade preenche o campo “Local e data” do formulário.</p>
          <Button onClick={salvar} disabled={salvando || !podeEditar}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </div>
      </section>
    </div>
  );
}

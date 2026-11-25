import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { SITUACOES, cpfValido, mascaraCpf, normalizar, somenteDigitos } from '@shared/disciplinar.js';

const VAZIO = { matricula: '', nome: '', cpf: '', funcao: '', departamento: '', admissao: '', status: 'Ativo' };

/** Cadastro/edição de colaborador. `colaborador` null = novo. */
export default function ColaboradorDialog({ aberto, colaborador, onFechar, onSalvo }) {
  const { colaboradores, recarregar } = useDisciplinar();
  const [f, setF] = useState(VAZIO);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErro('');
    setF({ ...VAZIO, ...(colaborador || {}), admissao: colaborador?.admissao ? String(colaborador.admissao).slice(0, 10) : '' });
  }, [aberto, colaborador]);

  const campo = (k) => (e) => setF((a) => ({ ...a, [k]: k === 'cpf' ? mascaraCpf(e.target.value) : e.target.value }));
  const departamentos = [...new Set(colaboradores.map((c) => c.departamento).filter(Boolean))].sort();

  const salvar = async (e) => {
    e.preventDefault();
    const v = {
      matricula: f.matricula.trim(),
      nome: f.nome.trim(),
      cpf: f.cpf.trim(),
      funcao: f.funcao.trim(),
      departamento: f.departamento.trim(),
      admissao: f.admissao || null,
      status: f.status,
    };
    const erros = [];
    if (!v.matricula) erros.push('Informe a matrícula.');
    if (!v.nome) erros.push('Informe o nome.');
    if (v.matricula && colaboradores.some((x) => x.id !== colaborador?.id && normalizar(x.matricula) === normalizar(v.matricula)))
      erros.push('Já existe colaborador com essa matrícula.');
    if (v.cpf && !cpfValido(v.cpf)) erros.push('CPF inválido.');
    if (v.cpf && colaboradores.some((x) => x.id !== colaborador?.id && somenteDigitos(x.cpf) && somenteDigitos(x.cpf) === somenteDigitos(v.cpf)))
      erros.push('Já existe colaborador com esse CPF.');
    if (erros.length) return setErro(erros.join(' '));
    setSalvando(true);
    try {
      const salvo = colaborador?.id ? await api.entities.Colaborador.update(colaborador.id, v) : await api.entities.Colaborador.create(v);
      await recarregar();
      onSalvo?.(salvo);
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{colaborador?.id ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle>
          <DialogDescription>Dados do quadro de funcionários usados nos registros e formulários.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-mat">Matrícula *</Label>
            <Input id="c-mat" value={f.matricula} onChange={campo('matricula')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-cpf">CPF</Label>
            <Input id="c-cpf" inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={campo('cpf')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="c-nome">Nome completo *</Label>
            <Input id="c-nome" value={f.nome} onChange={campo('nome')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-fun">Função</Label>
            <Input id="c-fun" value={f.funcao} onChange={campo('funcao')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-dep">Lotação</Label>
            <Input id="c-dep" list="c-deps" value={f.departamento} onChange={campo('departamento')} />
            <datalist id="c-deps">
              {departamentos.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-adm">Admissão</Label>
            <Input id="c-adm" type="date" value={f.admissao} onChange={campo('admissao')} />
          </div>
          <div className="space-y-1.5">
            <Label>Situação</Label>
            <Select value={f.status} onValueChange={(s) => setF((a) => ({ ...a, status: s }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SITUACOES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {erro ? <p className="rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive sm:col-span-2">{erro}</p> : null}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

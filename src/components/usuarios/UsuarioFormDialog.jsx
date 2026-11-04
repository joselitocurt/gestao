import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PermissoesChecklist from '@/components/usuarios/PermissoesChecklist';
import { PERFIL_OPTIONS, PERFIS, permissoesDoPerfil } from '@/lib/permissoes';

export default function UsuarioFormDialog({ aberto, usuario, onFechar, onSalvar }) {
  const novo = !usuario;
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState('consulta');
  const [ativo, setAtivo] = useState(true);
  const [permissoes, setPermissoes] = useState(permissoesDoPerfil('consulta'));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setErro('');
    setSalvando(false);
    setNome(usuario?.nome || '');
    setEmail(usuario?.email || '');
    setPerfil(usuario?.perfil || 'consulta');
    setAtivo(usuario ? usuario.ativo !== false : true);
    setPermissoes(
      usuario && Array.isArray(usuario.permissoes) ? usuario.permissoes : permissoesDoPerfil(usuario?.perfil || 'consulta'),
    );
  }, [aberto, usuario]);

  const trocarPerfil = (novoPerfil) => {
    setPerfil(novoPerfil);
    setPermissoes(permissoesDoPerfil(novoPerfil));
  };

  const salvar = async (evento) => {
    evento.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        perfil,
        ativo,
        permissoes,
      });
    } catch (err) {
      setErro(err.message || 'Não foi possível salvar o usuário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{novo ? 'Novo usuário' : 'Editar usuário'}</DialogTitle>
          <DialogDescription>
            {novo
              ? 'O convite para definir a senha é enviado ao e-mail informado.'
              : 'Ajuste o perfil, as permissões e o acesso do usuário.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do usuário" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Login (e-mail)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com.br"
              disabled={!novo}
              required
            />
            {!novo && (
              <p className="text-xs text-muted-foreground">
                O login é o e-mail e não pode ser alterado. Para trocar o login, cadastre um novo usuário.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select value={perfil} onValueChange={trocarPerfil}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERFIL_OPTIONS.map((opcao) => (
                    <SelectItem key={opcao.value} value={opcao.value}>
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-snug text-muted-foreground">{PERFIS[perfil]?.descricao}</p>
            </div>

            <div className="space-y-1.5">
              <Label>Usuário ativo</Label>
              <div className="flex h-9 items-center gap-2 rounded-md border border-input px-3">
                <Switch checked={ativo} onCheckedChange={setAtivo} id="ativo" />
                <span className="text-[13px] text-muted-foreground">{ativo ? 'Acesso liberado' : 'Acesso bloqueado'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permissões de acesso</Label>
            <PermissoesChecklist permissoes={permissoes} onChange={setPermissoes} desabilitado={perfil === 'master'} />
            {perfil === 'master' && (
              <p className="text-xs text-muted-foreground">O perfil Master tem acesso a todas as páginas.</p>
            )}
          </div>

          {erro && <div className="rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive">{erro}</div>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onFechar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {novo ? 'Cadastrar usuário' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

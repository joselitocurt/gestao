import React from 'react';
import { KeyRound, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { rotuloPerfil } from '@/lib/permissoes';

const TOM = {
  master: 'bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))] ring-[hsl(var(--chart-4))]/30',
  usuario: 'bg-status-emitido/10 text-status-emitido ring-status-emitido/25',
  consulta: 'bg-muted text-muted-foreground ring-border',
};

export default function UsuarioLinha({ usuario, ehVoce, onEditar, onAlternarAtivo, onEnviarSenha }) {
  const ativo = usuario.ativo !== false;
  const totalPermissoes = usuario.perfil === 'master' ? 'todas' : (usuario.permissoes || []).length;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-4 py-3 first:border-t-0 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{usuario.nome || 'Sem nome'}</p>
          {ehVoce && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">
              você
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{usuario.email}</p>
      </div>

      <span
        className={cn('rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', TOM[usuario.perfil] || TOM.consulta)}
      >
        {rotuloPerfil(usuario.perfil)}
      </span>

      <span className="numeros w-24 text-right text-xs text-muted-foreground">{totalPermissoes} páginas</span>

      <div className="flex items-center gap-1.5">
        <Switch
          checked={ativo}
          onCheckedChange={() => onAlternarAtivo(usuario)}
          disabled={ehVoce}
          aria-label={ativo ? 'Inativar usuário' : 'Ativar usuário'}
        />
        <span className={cn('w-20 text-xs', ativo ? 'text-status-pago' : 'text-muted-foreground')}>
          {ativo ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={() => onEnviarSenha(usuario)} title="Enviar link de nova senha">
          <KeyRound className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEditar(usuario)} title="Editar usuário">
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

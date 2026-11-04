import React from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UsuarioLinha from '@/components/usuarios/UsuarioLinha';

export default function ListaUsuarios({ usuarios, carregando, emailAtual, onNovo, onEditar, onAlternarAtivo, onEnviarSenha }) {
  if (carregando) {
    return (
      <div className="mt-3 space-y-2 painel p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    );
  }

  if (!usuarios.length) {
    return (
      <div className="mt-3 painel px-6 py-16 text-center">
        <p className="font-display text-lg">Nenhum usuário cadastrado</p>
        <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
          Cadastre o primeiro usuário e defina o perfil e as páginas a que ele terá acesso.
        </p>
        <Button className="mt-5" onClick={onNovo}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 overflow-hidden painel">
      {usuarios.map((usuario) => (
        <UsuarioLinha
          key={usuario.id}
          usuario={usuario}
          ehVoce={usuario.email === emailAtual}
          onEditar={onEditar}
          onAlternarAtivo={onAlternarAtivo}
          onEnviarSenha={onEnviarSenha}
        />
      ))}
    </div>
  );
}

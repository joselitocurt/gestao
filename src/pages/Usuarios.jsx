import PageHeader from '@/components/PageHeader';
import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAcesso } from '@/lib/AcessoContext';
import ListaUsuarios from '@/components/usuarios/ListaUsuarios';
import UsuarioFormDialog from '@/components/usuarios/UsuarioFormDialog';
import LinkAcessoDialog from '@/components/usuarios/LinkAcessoDialog';
import { PERFIS } from '@/lib/permissoes';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dialogo, setDialogo] = useState(null);
  const [linkAcesso, setLinkAcesso] = useState(null);
  const { emailAtual, recarregar } = useAcesso();
  const { toast } = useToast();

  const carregar = async () => {
    try {
      setUsuarios(await api.entities.UsuarioSistema.list({ sort: 'nome' }));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const salvar = async (dados) => {
    if (dialogo?.usuario) {
      if (dialogo.usuario.email === emailAtual && !dados.ativo) {
        throw new Error('Você não pode inativar o seu próprio acesso.');
      }
      await api.entities.UsuarioSistema.update(dialogo.usuario.id, dados);
      toast({ title: 'Usuário atualizado' });
    } else {
      const existente = await api.entities.UsuarioSistema.filter({ email: dados.email }, { limit: 1 });
      if (existente.items?.length) throw new Error('Já existe um usuário cadastrado com este e-mail.');
      const convite = await api.users.inviteUser(dados.email, dados.perfil === 'master' ? 'admin' : 'user');
      await api.entities.UsuarioSistema.create(dados);
      if (convite?.emailEnviado) {
        toast({ title: 'Usuário cadastrado', description: 'Enviamos um convite ao e-mail para definir a senha.' });
      } else {
        setLinkAcesso({ titulo: 'Usuário cadastrado', email: dados.email, link: convite?.link, motivo: convite?.motivo, validade: '7 dias' });
      }
    }

    await carregar();
    if (dados.email === emailAtual) await recarregar();
    setDialogo(null);
  };

  const alternarAtivo = async (usuario) => {
    const ativo = usuario.ativo === false;
    await api.entities.UsuarioSistema.update(usuario.id, { ativo });
    await carregar();
    toast({ title: ativo ? 'Usuário ativado' : 'Usuário inativado', description: usuario.nome });
  };

  const enviarSenha = async (usuario) => {
    try {
      const resultado = await api.users.resetLink(usuario.email);
      if (resultado?.emailEnviado) {
        toast({ title: 'Link de nova senha enviado', description: usuario.email });
      } else {
        setLinkAcesso({ titulo: 'Link de nova senha gerado', email: usuario.email, link: resultado?.link, motivo: resultado?.motivo, validade: '2 horas' });
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível gerar o link',
        description: e.message || 'Tente novamente em alguns instantes.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        titulo="Usuários"
        descricao="Quem acessa o sistema, com qual perfil e quais páginas pode abrir."
        acoes={<Button onClick={() => setDialogo({ usuario: null })}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>}
      />

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {Object.entries(PERFIS).map(([chave, perfil]) => (
          <div key={chave} className="painel px-3.5 py-3">
            <p className="text-xs font-medium text-muted-foreground">{perfil.label}</p>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">{perfil.descricao}</p>
          </div>
        ))}
      </div>

      <ListaUsuarios
        usuarios={usuarios}
        carregando={carregando}
        emailAtual={emailAtual}
        onNovo={() => setDialogo({ usuario: null })}
        onEditar={(usuario) => setDialogo({ usuario })}
        onAlternarAtivo={alternarAtivo}
        onEnviarSenha={enviarSenha}
      />

      <LinkAcessoDialog dados={linkAcesso} onFechar={() => setLinkAcesso(null)} />

      <UsuarioFormDialog
        aberto={Boolean(dialogo)}
        usuario={dialogo?.usuario || null}
        onFechar={() => setDialogo(null)}
        onSalvar={salvar}
      />
    </div>
  );
}

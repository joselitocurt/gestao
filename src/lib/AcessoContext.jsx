import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { PAGINAS, permissoesDoPerfil, permissoesEfetivas } from '@/lib/permissoes';

const AcessoContext = createContext(null);

export const AcessoProvider = ({ children }) => {
  const { user, isLoadingAuth } = useAuth();
  const [registro, setRegistro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!user?.email) {
      setRegistro(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      const pagina = await api.entities.UsuarioSistema.filter({ email: user.email }, { limit: 1 });
      let atual = pagina?.items?.[0] || null;

      // Primeiro acesso de um administrador: cria o cadastro Master automaticamente.
      if (!atual && user.role === 'admin') {
        atual = await api.entities.UsuarioSistema.create({
          nome: user.full_name || user.email,
          email: user.email,
          perfil: 'master',
          ativo: true,
          permissoes: permissoesDoPerfil('master'),
        });
      }

      setRegistro(atual);
    } catch {
      setRegistro(null);
    } finally {
      setCarregando(false);
    }
  }, [user?.email, user?.role, user?.full_name]);

  useEffect(() => {
    if (isLoadingAuth) return;
    carregar();
  }, [isLoadingAuth, carregar]);

  const permissoes = useMemo(() => permissoesEfetivas(registro), [registro]);

  const temAcesso = useCallback((chave) => permissoes.includes(chave), [permissoes]);
  const primeiraRota = PAGINAS.find((p) => permissoes.includes(p.chave))?.rota || null;

  const value = {
    carregando,
    registro,
    perfil: registro?.perfil || null,
    // Perfil Consulta é somente visualização.
    podeEditar: Boolean(registro) && registro.perfil !== 'consulta',
    ativo: Boolean(registro) && registro.ativo !== false,
    permissoes,
    temAcesso,
    primeiraRota,
    emailAtual: user?.email || null,
    recarregar: carregar,
  };

  return <AcessoContext.Provider value={value}>{children}</AcessoContext.Provider>;
};

export const useAcesso = () => {
  const contexto = useContext(AcessoContext);
  if (!contexto) throw new Error('useAcesso precisa estar dentro de AcessoProvider');
  return contexto;
};

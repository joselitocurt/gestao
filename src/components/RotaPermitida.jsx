import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAcesso } from '@/lib/AcessoContext';
import TelaAcessoNegado from '@/components/acesso/TelaAcessoNegado';

export default function RotaPermitida({ chave, children, redirecionar = false }) {
  const { carregando, registro, ativo, temAcesso, primeiraRota } = useAcesso();

  if (carregando) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  if (!registro) return <TelaAcessoNegado tipo="sem_cadastro" />;
  if (!ativo) return <TelaAcessoNegado tipo="inativo" />;

  if (chave && !temAcesso(chave)) {
    if (redirecionar && primeiraRota) return <Navigate to={primeiraRota} replace />;
    return <TelaAcessoNegado tipo="sem_permissao" />;
  }

  return children;
}

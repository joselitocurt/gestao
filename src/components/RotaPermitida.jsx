import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAcesso } from '@/lib/AcessoContext';
import { PAGINAS } from '@/lib/permissoes';
import TelaAcessoNegado from '@/components/acesso/TelaAcessoNegado';

export default function RotaPermitida({ chave, children, redirecionar = false, modulo = null }) {
  const { carregando, registro, ativo, temAcesso, primeiraRota: primeiraGeral } = useAcesso();
  // Sem acesso à página inicial do módulo: abre a primeira página liberada do mesmo módulo.
  const primeiraRota = modulo
    ? PAGINAS.find((p) => p.modulo === modulo && temAcesso(p.chave))?.rota || null
    : primeiraGeral;

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

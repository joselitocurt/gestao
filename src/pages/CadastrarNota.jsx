import PageHeader from '@/components/PageHeader';
import React from 'react';
import NotaManualForm from '@/components/notas/NotaManualForm';

export default function CadastrarNota() {
  return (
    <div>
      <PageHeader
        titulo="Cadastrar nota"
        descricao="Para notas sem XML. Entram na apuração apenas notas a consumidor final (CPF) com UF de destino diferente da UF do emissor."
      />
      <NotaManualForm />
    </div>
  );
}

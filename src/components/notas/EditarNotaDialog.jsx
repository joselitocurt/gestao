import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import NotaManualForm from '@/components/notas/NotaManualForm';

export default function EditarNotaDialog({ nota, onClose, onSaved }) {
  return (
    <Dialog
      open={!!nota}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Editar nota {nota?.numero || ''}</DialogTitle>
          <DialogDescription>Dados fiscais do emissor, destinatário e das guias.</DialogDescription>
        </DialogHeader>
        {nota ? <NotaManualForm key={nota.id} nota={nota} onSaved={onSaved} onCancel={onClose} /> : null}
      </DialogContent>
    </Dialog>
  );
}

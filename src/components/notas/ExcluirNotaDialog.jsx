import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/api/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function ExcluirNotaDialog({ nota, onClose, onDeleted }) {
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState('');

  const confirmar = async (evento) => {
    evento.preventDefault();
    setApagando(true);
    setErro('');
    try {
      await api.entities.NotaFiscal.delete(nota.id);
      onDeleted();
    } catch (e) {
      setErro(e.message || 'Não foi possível apagar a nota.');
    } finally {
      setApagando(false);
    }
  };

  return (
    <AlertDialog
      open={!!nota}
      onOpenChange={(aberto) => {
        if (!aberto) {
          setErro('');
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apagar a nota {nota?.numero || ''}?</AlertDialogTitle>
          <AlertDialogDescription>
            A nota sai da apuração e do total do período. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {erro ? <p className="text-[13px] text-destructive">{erro}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={apagando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={apagando}
            onClick={confirmar}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {apagando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Apagar nota
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

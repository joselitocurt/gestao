import React, { useState } from 'react';
import { FileText, Loader2, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/api/client';

export default function ComprovanteBotao({ uri, nome }) {
  const [abrindo, setAbrindo] = useState(false);
  const { toast } = useToast();

  if (!uri) {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <Paperclip className="h-3.5 w-3.5" />
        Sem comprovante anexado
      </span>
    );
  }

  const abrir = async () => {
    setAbrindo(true);
    // Abre a aba antes da chamada para não ser barrada pelo bloqueador de pop-ups.
    const aba = window.open('', '_blank');
    try {
      const { signed_url } = await api.files.signedUrl(uri);
      if (aba) aba.location.href = signed_url;
      else window.open(signed_url, '_blank', 'noopener');
    } catch (e) {
      aba?.close();
      toast({ variant: 'destructive', title: 'Não foi possível abrir o comprovante', description: e.message });
    } finally {
      setAbrindo(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={abrir}
      disabled={abrindo}
      className="h-8 max-w-[220px] rounded-lg text-xs"
    >
      {abrindo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
      <span className="truncate">{nome || 'Ver comprovante'}</span>
    </Button>
  );
}

import React, { useState } from 'react';
import { Check, Copy, MailWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Mostrado quando o e-mail de convite ou de nova senha não pôde ser enviado:
 * o Master copia o link e repassa à pessoa (WhatsApp, Teams, e-mail próprio).
 */
export default function LinkAcessoDialog({ dados, onFechar }) {
  const [copiado, setCopiado] = useState(false);
  if (!dados) return null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(dados.link);
    } catch {
      document.getElementById('link-acesso')?.select();
      document.execCommand?.('copy');
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <span className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-status-pendente/10 text-status-pendente">
            <MailWarning className="h-5 w-5" />
          </span>
          <DialogTitle>{dados.titulo}</DialogTitle>
          <DialogDescription>
            O e-mail para <span className="font-semibold text-foreground">{dados.email}</span> não foi enviado. Copie o link
            abaixo e envie à pessoa; ele vale por {dados.validade}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            id="link-acesso"
            readOnly
            value={dados.link}
            onFocus={(e) => e.target.select()}
            className="numeros h-10 rounded-lg text-xs"
          />
          <Button onClick={copiar} className="h-10 shrink-0 rounded-lg">
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Copiado' : 'Copiar link'}
          </Button>
        </div>

        {dados.motivo ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            Motivo da falha no e-mail: {dados.motivo}. Confira as variáveis SMTP na hospedagem.
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

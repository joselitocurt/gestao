import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MailWarning } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Envia um e-mail de teste ao próprio Master e mostra o resultado e a configuração usada. */
export default function TesteEmailDialog({ aberto, onFechar }) {
  const [estado, setEstado] = useState({ carregando: false, resultado: null, erro: '' });

  const testar = async () => {
    setEstado({ carregando: true, resultado: null, erro: '' });
    try {
      setEstado({ carregando: false, resultado: await api.users.testarEmail(), erro: '' });
    } catch (e) {
      setEstado({ carregando: false, resultado: null, erro: e.message || 'Não foi possível testar.' });
    }
  };

  useEffect(() => {
    if (aberto) testar();
  }, [aberto]);

  const r = estado.resultado;
  const cfg = r?.configuracao;
  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Teste de envio de e-mail</DialogTitle>
          <DialogDescription>Uma mensagem de teste é enviada para o seu e-mail com a configuração atual da hospedagem.</DialogDescription>
        </DialogHeader>

        {estado.carregando ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
          </p>
        ) : r ? (
          <div className="space-y-3">
            {r.enviado ? (
              <p className="flex items-start gap-2 rounded-lg bg-status-pago/10 p-3 text-sm text-status-pago">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  E-mail enviado para <b>{r.para}</b>. Confira a caixa de entrada (e o spam). Convites e links de senha usam a mesma configuração.
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <MailWarning className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Não foi enviado: {r.motivo}</span>
              </p>
            )}
            {cfg ? (
              <dl className="numeros grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-lg bg-muted/60 p-3 text-xs">
                <dt className="text-muted-foreground">Servidor</dt>
                <dd>{cfg.host || '(SMTP_HOST vazio)'}</dd>
                <dt className="text-muted-foreground">Porta / SSL</dt>
                <dd>
                  {cfg.porta} · {cfg.seguro ? 'SSL ativado (SMTP_SECURE=true)' : 'sem SSL direto (SMTP_SECURE=false)'}
                </dd>
                <dt className="text-muted-foreground">Usuário</dt>
                <dd className="truncate">{cfg.usuario || '(SMTP_USER vazio)'}</dd>
                <dt className="text-muted-foreground">Remetente</dt>
                <dd className="truncate">{cfg.remetente}</dd>
              </dl>
            ) : null}
          </div>
        ) : estado.erro ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{estado.erro}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={testar} disabled={estado.carregando}>
            Testar de novo
          </Button>
          <Button onClick={onFechar}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

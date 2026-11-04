import PageHeader from '@/components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import CnpjFormDialog from '@/components/cnpjs/CnpjFormDialog';
import { formatCnpj, nomeEmitente, ordenarEmitentes } from '@/lib/fiscal';

export default function Cnpjs() {
  const [emitentes, setEmitentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setEmitentes(ordenarEmitentes(await api.entities.Emitente.list()));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const excluir = async (emitente) => {
    const confirmado = window.confirm(`Remover ${nomeEmitente(emitente)}? As notas já importadas continuam na apuração.`);
    if (!confirmado) return;
    await api.entities.Emitente.delete(emitente.id);
    carregar();
  };

  const abrirNovo = () => {
    setEditando(null);
    setAberto(true);
  };

  const abrirEdicao = (emitente) => {
    setEditando(emitente);
    setAberto(true);
  };

  return (
    <div>
      <PageHeader
        titulo="CNPJs emissores"
        descricao="A matriz e as filiais que emitem as notas. A UF de cada CNPJ define se a nota é interestadual."
        acoes={<Button onClick={abrirNovo} className="rounded-lg">
          <Plus className="h-4 w-4" /> Novo CNPJ
        </Button>}
      />

      <div className="mt-6 overflow-hidden painel">
        {carregando ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded-full bg-muted" />
            ))}
          </div>
        ) : !emitentes.length ? (
          <div className="px-6 py-14 text-center">
            <p className="font-display text-lg">Nenhum CNPJ cadastrado</p>
            <p className="mx-auto mt-1 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              Cadastre a matriz e as filiais para começar a apurar as guias.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {emitentes.map((emitente) => (
              <li key={emitente.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{nomeEmitente(emitente)}</p>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {emitente.tipo}
                    </span>
                    <span className="numeros text-xs font-medium text-muted-foreground">
                      {emitente.uf}
                    </span>
                  </div>
                  <p className="numeros mt-0.5 truncate text-[12px] text-muted-foreground">
                    {formatCnpj(emitente.cnpj)}
                    {emitente.razao_social && emitente.razao_social !== nomeEmitente(emitente)
                      ? ` · ${emitente.razao_social}`
                      : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => abrirEdicao(emitente)} title="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => excluir(emitente)}
                    title="Remover"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CnpjFormDialog
        aberto={aberto}
        emitente={editando}
        onClose={() => setAberto(false)}
        onSaved={() => {
          setAberto(false);
          carregar();
        }}
      />
    </div>
  );
}

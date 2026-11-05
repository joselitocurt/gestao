import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, UploadCloud } from 'lucide-react';
import NotaRow, { COLUNAS } from '@/components/notas/NotaRow';
import NotaCard from '@/components/notas/NotaCard';
import { Button } from '@/components/ui/button';

const Cabecalho = () => (
  <div
    className={`grid ${COLUNAS} gap-3 border-b border-border bg-muted/50 px-5 py-2.5 text-xs font-semibold text-muted-foreground`}
  >
    <span>NF</span>
    <span>Destinatário</span>
    <span>Emissão</span>
    <span className="text-right">Valor da nota</span>
    <span className="text-right">DIFAL</span>
    <span className="text-right">FCOP</span>
    <span className="text-right">Guia</span>
    <span>Status</span>
    <span>Pago em</span>
    <span />
  </div>
);

const Carregando = () => (
  <div className="divide-y divide-border">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-4">
        <div className="h-3 w-16 animate-pulse rounded-full bg-muted" />
        <div className="h-3 flex-1 animate-pulse rounded-full bg-muted" />
        <div className="hidden h-3 w-24 animate-pulse rounded-full bg-muted sm:block" />
      </div>
    ))}
  </div>
);

const Vazio = ({ filtrado, podeEditar }) => (
  <div className="flex flex-col items-center px-6 py-14 text-center">
    <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground">
      <FileText className="h-5 w-5" />
    </span>
    <p className="mt-4 font-display text-lg">
      {filtrado ? 'Nenhuma nota com esses filtros' : 'Nenhuma nota cadastrada'}
    </p>
    <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
      {filtrado
        ? 'Volte algum filtro para "Todos" ou remova o filtro de status para ver mais notas.'
        : 'Importe os XMLs das notas emitidas ou cadastre uma nota para começar a apuração.'}
    </p>
    {!filtrado && podeEditar ? (
      <Button asChild className="mt-5">
        <Link to="/difal/importar">
          <UploadCloud className="h-4 w-4" />
          Importar XML
        </Link>
      </Button>
    ) : null}
  </div>
);

export default function TabelaNotas({ notas, loading, filtrado, podeEditar, emitenteDe, onSelect, onEdit, onDelete, onStatus }) {
  const props = { onSelect, onEdit, onDelete, onStatus, podeEditar, emitenteDe };
  return (
    <div className="painel mt-3 overflow-hidden">
      {loading ? (
        <Carregando />
      ) : !notas.length ? (
        <Vazio filtrado={filtrado} podeEditar={podeEditar} />
      ) : (
        <>
          <div className="hidden lg:block">
            <Cabecalho />
            <div className="divide-y divide-border">
              {notas.map((nota) => (
                <NotaRow key={nota.id} nota={nota} {...props} />
              ))}
            </div>
          </div>
          <div className="divide-y divide-border lg:hidden">
            {notas.map((nota) => (
              <NotaCard key={nota.id} nota={nota} {...props} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

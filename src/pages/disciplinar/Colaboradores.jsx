import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useToast } from '@/components/ui/use-toast';
import ColaboradorDialog from '@/components/disciplinar/ColaboradorDialog';
import ImportarColaboradoresDialog from '@/components/disciplinar/ImportarColaboradoresDialog';
import { Carregando, SituacaoPill, Vazio } from '@/components/disciplinar/Niveis';
import { useAcesso } from '@/lib/AcessoContext';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

export default function Colaboradores() {
  const d = useDisciplinar();
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const [busca, setBusca] = useState('');
  const [dialogo, setDialogo] = useState(null); // { colaborador }
  const [excluir, setExcluir] = useState(null);
  const [importar, setImportar] = useState(false);

  if (d.carregando) return <Carregando />;
  const lista = d.buscarColaboradores(busca);
  const qtdPunicoes = (id) => d.punicoes.filter((p) => p.colaborador_id === id).length;

  const confirmarExclusao = async () => {
    try {
      await api.entities.Colaborador.delete(excluir.id);
      await d.recarregar();
      toast({ title: 'Colaborador excluído' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Não foi possível excluir', description: e.message });
    }
  };

  return (
    <div>
      <PageHeader
        titulo="Colaboradores"
        descricao="Cadastro do quadro de funcionários."
        acoes={
          <>
            <Button variant="outline" onClick={() => setImportar(true)} disabled={!podeEditar}>
              <FileSpreadsheet className="h-4 w-4" /> Importar planilha
            </Button>
            <Button onClick={() => setDialogo({ colaborador: null })} disabled={!podeEditar}>
              <Plus className="h-4 w-4" /> Novo colaborador
            </Button>
          </>
        }
      />
      <div className="relative mt-6 max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, matrícula, CPF ou função…"
          className="h-11 rounded-xl pl-10"
        />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        {lista.length} de {d.colaboradores.length} colaborador(es)
      </p>
      <section className="painel mt-2 overflow-hidden">
        {lista.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs text-muted-foreground">
                  {['Matrícula', 'Nome', 'CPF', 'Função', 'Lotação', 'Admissão', 'Situação', ''].map((t) => (
                    <th key={t} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0">
                    <td className="numeros px-4 py-2.5">{c.matricula}</td>
                    <td className="px-4 py-2.5">
                      <Link to={`/disciplinar/consulta?c=${c.id}`} className="font-semibold hover:text-primary hover:underline">
                        {c.nome}
                      </Link>
                    </td>
                    <td className="numeros whitespace-nowrap px-4 py-2.5 text-muted-foreground">{c.cpf}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.funcao}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{c.departamento}</td>
                    <td className="numeros px-4 py-2.5 text-muted-foreground">{fmt(c.admissao)}</td>
                    <td className="px-4 py-2.5">
                      <SituacaoPill status={c.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDialogo({ colaborador: c })} disabled={!podeEditar} aria-label={`Editar ${c.nome}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setExcluir(c)}
                        disabled={!podeEditar}
                        aria-label={`Excluir ${c.nome}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vazio>{d.colaboradores.length ? 'Nenhum colaborador encontrado para essa busca.' : 'Nenhum colaborador cadastrado. Clique em “Novo colaborador”.'}</Vazio>
        )}
      </section>

      <ColaboradorDialog
        aberto={Boolean(dialogo)}
        colaborador={dialogo?.colaborador || null}
        onFechar={() => setDialogo(null)}
        onSalvo={() => {
          toast({ title: dialogo?.colaborador ? 'Colaborador atualizado' : 'Colaborador cadastrado' });
          setDialogo(null);
        }}
      />

      <ImportarColaboradoresDialog
        aberto={importar}
        onFechar={() => setImportar(false)}
        onConcluido={({ novos, atualizados, ignorados }) => {
          setImportar(false);
          toast({
            title: 'Importação concluída',
            description: `${novos} cadastrado(s), ${atualizados} atualizado(s)${ignorados ? `, ${ignorados} linha(s) com erro ignorada(s)` : ''}.`,
          });
        }}
      />

      <AlertDialog open={Boolean(excluir)} onOpenChange={(v) => !v && setExcluir(null)}>
        <AlertDialogContent>
          {excluir && qtdPunicoes(excluir.id) ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Exclusão não permitida</AlertDialogTitle>
                <AlertDialogDescription>
                  {excluir.nome} tem {qtdPunicoes(excluir.id)} punição(ões) registrada(s). Para preservar o histórico, altere a situação para
                  Afastado ou Demitido em vez de excluir.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Entendi</AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir colaborador</AlertDialogTitle>
                <AlertDialogDescription>
                  Excluir {excluir?.nome} (matrícula {excluir?.matricula})?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmarExclusao}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

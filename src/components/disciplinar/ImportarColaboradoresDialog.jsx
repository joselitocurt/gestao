import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, RefreshCw, Upload } from 'lucide-react';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { baixarModelo, lerPlanilha, validarLinhas } from '@/lib/disciplinar/planilhaColaboradores';
import { cn } from '@/lib/utils';

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const LOTE = 500;

const ROTULO = {
  novo: { texto: 'Novo', classe: 'bg-status-pago/10 text-status-pago', icone: CheckCircle2 },
  atualizar: { texto: 'Atualizar', classe: 'bg-status-emitido/10 text-status-emitido', icone: RefreshCw },
  erro: { texto: 'Erro', classe: 'bg-destructive/10 text-destructive', icone: AlertCircle },
};

/** Importação de colaboradores por planilha: escolher arquivo → prévia validada → gravar. */
export default function ImportarColaboradoresDialog({ aberto, onFechar, onConcluido }) {
  const d = useDisciplinar();
  const [arquivo, setArquivo] = useState(null);
  const [linhas, setLinhas] = useState(null);
  const [erro, setErro] = useState('');
  const [lendo, setLendo] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const limpar = () => {
    setArquivo(null);
    setLinhas(null);
    setErro('');
  };

  const escolher = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErro('');
    setLendo(true);
    try {
      const brutas = await lerPlanilha(f);
      if (!brutas.length) throw new Error('A planilha não tem colaboradores preenchidos abaixo do cabeçalho.');
      setArquivo(f);
      setLinhas(validarLinhas(brutas, d.colaboradores));
    } catch (err) {
      setArquivo(null);
      setLinhas(null);
      setErro(err.message || 'Não foi possível ler a planilha.');
    } finally {
      setLendo(false);
    }
  };

  const conta = (acao) => (linhas || []).filter((l) => l.acao === acao).length;
  const validas = (linhas || []).filter((l) => l.acao !== 'erro');

  const importar = async () => {
    setGravando(true);
    setErro('');
    try {
      const novos = validas.filter((l) => l.acao === 'novo').map((l) => l.dados);
      // Na atualização, campo em branco na planilha não apaga o que já está cadastrado.
      const atualizacoes = validas
        .filter((l) => l.acao === 'atualizar')
        .map((l) => ({
          id: l.existente.id,
          ...Object.fromEntries(Object.entries(l.dados).filter(([, v]) => v !== '' && v !== null)),
        }));
      for (let i = 0; i < novos.length; i += LOTE) await api.entities.Colaborador.bulkCreate(novos.slice(i, i + LOTE));
      for (let i = 0; i < atualizacoes.length; i += LOTE) await api.entities.Colaborador.updateMany(atualizacoes.slice(i, i + LOTE));
      await d.recarregar();
      onConcluido?.({ novos: novos.length, atualizados: atualizacoes.length, ignorados: conta('erro') });
      limpar();
    } catch (err) {
      setErro(err.message || 'Não foi possível importar.');
    } finally {
      setGravando(false);
    }
  };

  const modelo = async () => {
    setBaixando(true);
    try {
      await baixarModelo();
    } catch (err) {
      setErro(err.message || 'Não foi possível gerar o modelo.');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v && !gravando) {
          limpar();
          onFechar();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>Importar colaboradores</DialogTitle>
          <DialogDescription>
            Preencha o arquivo modelo (uma linha por colaborador) e envie aqui. Antes de gravar, você confere a prévia com os erros de
            cada linha. Matrículas que já existem têm o cadastro atualizado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">1. Baixe o modelo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Colunas: Matrícula*, Nome completo*, CPF, Função, Lotação, Admissão e Situação. Inclui uma aba de instruções.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={modelo} disabled={baixando}>
              {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Baixar modelo (.xlsx)
            </Button>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">2. Envie a planilha preenchida</p>
            <p className="mt-1 text-xs text-muted-foreground">Excel (.xlsx) ou CSV. Arquivos .xls antigos: salve como .xlsx antes.</p>
            <Button asChild size="sm" className="mt-3" disabled={lendo || gravando}>
              <label className="cursor-pointer">
                {lendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {arquivo ? 'Trocar planilha' : 'Escolher planilha'}
                <input type="file" accept=".xlsx,.csv,.xls" className="hidden" onChange={escolher} />
              </label>
            </Button>
            {arquivo ? <p className="mt-2 truncate text-xs text-muted-foreground">{arquivo.name}</p> : null}
          </div>
        </div>

        {linhas ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-status-pago/10 px-2.5 py-1 text-status-pago">{conta('novo')} novo(s)</span>
              <span className="rounded-full bg-status-emitido/10 px-2.5 py-1 text-status-emitido">{conta('atualizar')} a atualizar</span>
              <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">{conta('erro')} com erro (não serão importados)</span>
            </div>
            <div className="max-h-[42vh] overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr className="text-left text-muted-foreground">
                    {['Linha', 'Resultado', 'Matrícula', 'Nome', 'CPF', 'Função', 'Lotação', 'Admissão', 'Situação'].map((t) => (
                      <th key={t} className="whitespace-nowrap px-3 py-2 font-semibold">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => {
                    const r = ROTULO[l.acao];
                    const Icone = r.icone;
                    return (
                      <React.Fragment key={l.numero}>
                        <tr className={cn('border-t border-border/60', l.acao === 'erro' && 'bg-destructive/5')}>
                          <td className="numeros px-3 py-2 text-muted-foreground">{l.numero}</td>
                          <td className="px-3 py-2">
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold', r.classe)}>
                              <Icone className="h-3 w-3" /> {r.texto}
                            </span>
                          </td>
                          <td className="numeros px-3 py-2">{l.dados.matricula}</td>
                          <td className="px-3 py-2 font-medium">{l.dados.nome}</td>
                          <td className="numeros whitespace-nowrap px-3 py-2">{l.dados.cpf}</td>
                          <td className="px-3 py-2">{l.dados.funcao}</td>
                          <td className="px-3 py-2">{l.dados.departamento}</td>
                          <td className="numeros px-3 py-2">{fmt(l.dados.admissao)}</td>
                          <td className="px-3 py-2">{l.dados.status}</td>
                        </tr>
                        {l.erros.length ? (
                          <tr className="bg-destructive/5">
                            <td />
                            <td colSpan={8} className="px-3 pb-2 text-destructive">
                              {l.erros.join(' · ')}
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {erro ? <p className="rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive">{erro}</p> : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              limpar();
              onFechar();
            }}
            disabled={gravando}
          >
            Cancelar
          </Button>
          <Button onClick={importar} disabled={!validas.length || gravando}>
            {gravando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar {validas.length ? `${validas.length} colaborador(es)` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

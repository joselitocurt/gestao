import React, { useState } from 'react';
import { Database, FileSpreadsheet, FileText, Loader2, Upload } from 'lucide-react';
import { api } from '@/api/client';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Carregando } from '@/components/disciplinar/Niveis';
import { useAcesso } from '@/lib/AcessoContext';
import { useDisciplinar } from '@/lib/disciplinar/DadosContext';
import { baixarBlob } from '@/lib/disciplinar/arquivos';
import { NIVEIS, cicloDa, dataHoje, normalizar, ordenarPunicoes } from '@shared/disciplinar.js';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');

export default function Exportacoes() {
  const d = useDisciplinar();
  const { podeEditar } = useAcesso();
  const { toast } = useToast();
  const agora = new Date();
  const [mes, setMes] = useState(String(agora.getMonth() + 1).padStart(2, '0'));
  const [ano, setAno] = useState(String(agora.getFullYear()));
  const [ocupado, setOcupado] = useState('');
  const [restaurar, setRestaurar] = useState(null);

  if (d.carregando) return <Carregando />;

  const linhas = () =>
    ordenarPunicoes(d.punicoes.filter((p) => String(p.data || '').startsWith(`${ano}-${mes}`))).map((p) => {
      const c = d.colaborador(p.colaborador_id) || {};
      const cy = cicloDa(d.punicoes, p);
      return {
        Referência: p.referencia,
        Data: fmt(p.data),
        Matrícula: c.matricula || '',
        Colaborador: c.nome || '',
        CPF: c.cpf || '',
        Função: c.funcao || '',
        Lotação: c.departamento || '',
        Motivo: d.nomeMotivo(p.motivo_id),
        Nível: NIVEIS[Number(p.nivel)]?.nome || '',
        'Dias de suspensão': p.dias_suspensao || '',
        'Início do ciclo': cy ? fmt(cy.inicio) : '',
        'Fim do ciclo': cy ? fmt(cy.fim) : '',
        Descrição: p.descricao || '',
        'Justificativa do nível': p.justificativa_nivel || '',
        'Aplicada por': p.aplicada_por || '',
        Testemunhas: p.testemunhas || '',
        Anexo: p.anexo_nome || '',
      };
    });
  const qtd = linhas().length;
  const nome = (ext) => `punicoes_${ano}-${mes}.${ext}`;

  const tarefa = async (chave, fn) => {
    setOcupado(chave);
    try {
      await fn();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Não foi possível concluir', description: e.message });
    } finally {
      setOcupado('');
    }
  };

  const excel = () =>
    tarefa('xlsx', async () => {
      const r = linhas();
      if (!r.length) throw new Error('Não há punições nesse mês.');
      const { default: ExcelJS } = await import('exceljs');
      const livro = new ExcelJS.Workbook();
      const aba = livro.addWorksheet('Punições', { views: [{ state: 'frozen', ySplit: 1 }] });
      const chaves = Object.keys(r[0]);
      aba.columns = chaves.map((k) => ({
        header: k,
        key: k,
        width: Math.min(40, Math.max(k.length + 2, ...r.map((x) => String(x[k]).length + 1))),
        style: k === 'CPF' || k === 'Matrícula' ? { numFmt: '@' } : undefined,
      }));
      r.forEach((x) => aba.addRow(x));
      const cab = aba.getRow(1);
      cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14213D' } };
      aba.autoFilter = { from: 'A1', to: { row: r.length + 1, column: chaves.length } };
      const buffer = await livro.xlsx.writeBuffer();
      baixarBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), nome('xlsx'));
    });

  const csv = () =>
    tarefa('csv', async () => {
      const r = linhas();
      if (!r.length) throw new Error('Não há punições nesse mês.');
      const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const texto = `﻿${[Object.keys(r[0]).map(q).join(';'), ...r.map((x) => Object.values(x).map(q).join(';'))].join('\r\n')}`;
      baixarBlob(new Blob([texto], { type: 'text/csv;charset=utf-8' }), nome('csv'));
    });

  const backup = () =>
    baixarBlob(
      new Blob(
        [
          JSON.stringify(
            {
              sistema: 'gestao-punicoes',
              versao: 1,
              exportado_em: new Date().toISOString(),
              colaboradores: d.colaboradores,
              motivos: d.motivos,
              punicoes: d.punicoes,
            },
            null,
            2,
          ),
        ],
        { type: 'application/json' },
      ),
      `backup_punicoes_${dataHoje()}.json`,
    );

  const lerBackup = async (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      const dados = JSON.parse(await arquivo.text());
      if (!dados || !Array.isArray(dados.colaboradores) || !Array.isArray(dados.motivos) || !Array.isArray(dados.punicoes)) {
        throw new Error('Este arquivo não é um backup do sistema disciplinar.');
      }
      setRestaurar(dados);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Arquivo inválido', description: err.message });
    }
  };

  // Restaura (ou migra da versão anterior do sistema): reaproveita os cadastros iguais
  // (matrícula, nome do motivo, referência) e liga as punições pelos novos identificadores.
  const executarRestauracao = () =>
    tarefa('restaurar', async () => {
      const dados = restaurar;
      setRestaurar(null);
      const idMotivo = new Map();
      for (const m of dados.motivos) {
        if (!m?.nome) continue;
        const existente = d.motivos.find((x) => normalizar(x.nome) === normalizar(m.nome));
        const corpo = { nome: m.nome, descricao: m.descricao || '', ativo: m.ativo !== false };
        const salvo = existente ? await api.entities.Motivo.update(existente.id, corpo) : await api.entities.Motivo.create(corpo);
        idMotivo.set(m.id, salvo.id);
      }
      const idColab = new Map();
      for (const c of dados.colaboradores) {
        if (!c?.matricula || !c?.nome) continue;
        const existente = d.colaboradores.find((x) => normalizar(x.matricula) === normalizar(c.matricula));
        const corpo = {
          matricula: c.matricula,
          nome: c.nome,
          cpf: c.cpf || '',
          funcao: c.funcao || '',
          departamento: c.departamento || '',
          admissao: c.admissao || null,
          status: ['Ativo', 'Afastado', 'Demitido'].includes(c.status) ? c.status : 'Ativo',
        };
        const salvo = existente ? await api.entities.Colaborador.update(existente.id, corpo) : await api.entities.Colaborador.create(corpo);
        idColab.set(c.id, salvo.id);
      }
      let puns = 0;
      for (const p of dados.punicoes) {
        const colaborador_id = idColab.get(p.colaborador_id);
        const motivo_id = idMotivo.get(p.motivo_id);
        if (!colaborador_id || !motivo_id || !p.referencia) continue;
        const corpo = {
          referencia: p.referencia,
          colaborador_id,
          motivo_id,
          nivel: Number(p.nivel),
          data: p.data,
          ciclo_inicio: p.ciclo_inicio || p.data,
          dias_suspensao: p.dias_suspensao || null,
          descricao: p.descricao || '-',
          justificativa_nivel: p.justificativa_nivel || '',
          aplicada_por: p.aplicada_por || '-',
          testemunhas: p.testemunhas || '',
          ...(p.anexo_uri ? { anexo_uri: p.anexo_uri, anexo_nome: p.anexo_nome || '' } : {}),
        };
        const existente = d.punicoes.find((x) => normalizar(x.referencia) === normalizar(p.referencia));
        if (existente) await api.entities.Punicao.update(existente.id, corpo);
        else await api.entities.Punicao.create(corpo);
        puns += 1;
      }
      await d.recarregar();
      toast({ title: 'Backup restaurado', description: `${idColab.size} colaborador(es), ${idMotivo.size} motivo(s) e ${puns} punição(ões).` });
    });

  return (
    <div>
      <PageHeader titulo="Exportações" descricao="Backup organizado das punições fora do sistema." />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="painel p-5">
          <h2 className="font-display text-lg">Punições do mês</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-44">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Mês</p>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger className="h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1).padStart(2, '0')}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Ano</p>
              <Input type="number" min="2000" max="2100" value={ano} onChange={(e) => setAno(e.target.value)} className="numeros h-10" />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{qtd} punição(ões) no período selecionado.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={excel} disabled={ocupado === 'xlsx'}>
              {ocupado === 'xlsx' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Baixar Excel
            </Button>
            <Button variant="outline" onClick={csv} disabled={ocupado === 'csv'}>
              <FileText className="h-4 w-4" /> Baixar CSV
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">O arquivo pode ser importado no Google Sheets (Arquivo › Importar) para manter o backup mensal.</p>
        </section>

        <section className="painel p-5">
          <h2 className="font-display text-lg">Backup completo</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Salva colaboradores, motivos e punições num arquivo JSON. A restauração aceita também o backup da versão anterior do sistema
            disciplinar: atualiza os cadastros iguais (mesma matrícula, motivo ou referência) e inclui os novos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={backup}>
              <Database className="h-4 w-4" /> Baixar backup
            </Button>
            <Button asChild variant="outline" disabled={!podeEditar || ocupado === 'restaurar'}>
              <label className={podeEditar ? 'cursor-pointer' : 'pointer-events-none opacity-50'}>
                {ocupado === 'restaurar' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Restaurar backup
                <input type="file" accept=".json,application/json" className="hidden" onChange={lerBackup} />
              </label>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Os PDFs anexados não entram no backup; ficam guardados no sistema.</p>
        </section>
      </div>

      <AlertDialog open={Boolean(restaurar)} onOpenChange={(v) => !v && setRestaurar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar backup</AlertDialogTitle>
            <AlertDialogDescription>
              Restaurar {restaurar?.colaboradores.length} colaborador(es), {restaurar?.motivos.length} motivo(s) e {restaurar?.punicoes.length}{' '}
              punição(ões)? Cadastros com a mesma matrícula, nome de motivo ou referência serão atualizados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executarRestauracao}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

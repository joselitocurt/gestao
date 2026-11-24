import { NIVEIS, cicloDa, ciclos, dataHoje } from '@shared/disciplinar.js';
import { carregarLogoPdf, desenharLogo } from '@/lib/logoPdf';

// PDFs do Módulo II: histórico do colaborador e formulário da punição para assinatura.
// Cores da marca Controlar.io: azul-marinho #14213D e dourado #A67708.
const MARINHO = [20, 33, 61];
const DOURADO = [166, 119, 8];
const CINZA = [91, 100, 114];
const LINHA = [210, 214, 222];

const fmt = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
const nomeArquivo = (s) => String(s || '').replace(/[^\w-]/g, '');

async function preparar(orientacao = 'portrait') {
  const [{ jsPDF }, { default: autoTable }, logo] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    carregarLogoPdf(),
  ]);
  return { doc: new jsPDF({ unit: 'mm', format: 'a4', orientation: orientacao }), autoTable, logo };
}

function numerarPaginas(doc, esquerda = '') {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(140);
    if (esquerda) doc.text(esquerda, 16, 291);
    doc.text(`Página ${i} de ${total}`, 194, 291, { align: 'right' });
  }
}

/** Histórico disciplinar completo de um colaborador. */
export async function pdfHistorico({ colaborador: c, punicoes, nomeMotivo, fluxos }) {
  const { doc, autoTable, logo } = await preparar();
  const W = 210;
  doc.setFillColor(...MARINHO);
  doc.rect(0, 0, W, 26, 'F');
  doc.setFillColor(...DOURADO);
  doc.rect(0, 26, W, 1.2, 'F');
  doc.setTextColor(255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Histórico Disciplinar do Colaborador', 14, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Gestão Disciplinar · emitido em ${fmt(dataHoje())}`, 14, 19.5);
  if (logo) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - 60, 6, 48, 14, 2, 2, 'F');
    desenharLogo(doc, logo, W - 57, 8.6, 42);
  }

  doc.setTextColor(20);
  autoTable(doc, {
    startY: 33,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 1.4 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 32 } },
    body: [
      ['Nome', c.nome || ''],
      ['Matrícula', c.matricula || ''],
      ['CPF', c.cpf || '-'],
      ['Função', c.funcao || '-'],
      ['Departamento', c.departamento || '-'],
      ['Admissão', fmt(c.admissao) || '-'],
      ['Situação', c.status || 'Ativo'],
    ],
  });
  let y = doc.lastAutoTable.finalY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MARINHO);
  doc.text('Situação atual por motivo', 14, y);
  autoTable(doc, {
    startY: y + 2,
    head: [['Motivo', 'Nível atual', 'Ciclo']],
    headStyles: { fillColor: MARINHO },
    styles: { fontSize: 9 },
    body: fluxos.length
      ? fluxos.map((f) => [
          nomeMotivo(f.motivoId),
          f.nivel ? NIVEIS[f.nivel].nome : 'Nenhum (ciclo encerrado)',
          f.ciclo ? `${fmt(f.ciclo.inicio)} a ${fmt(f.ciclo.fim)}` : '-',
        ])
      : [['Sem punições', '', '']],
  });
  y = doc.lastAutoTable.finalY + 8;

  const motivos = [...new Set(punicoes.filter((p) => p.colaborador_id === c.id).map((p) => p.motivo_id))].sort((a, b) =>
    nomeMotivo(a).localeCompare(nomeMotivo(b)),
  );
  for (const mid of motivos) {
    for (const cy of ciclos(punicoes, c.id, mid)) {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(20);
      doc.text(`${nomeMotivo(mid)}  -  ciclo ${fmt(cy.inicio)} a ${fmt(cy.fim)}`, 14, y);
      autoTable(doc, {
        startY: y + 2,
        head: [['Data', 'Referência', 'Nível', 'Descrição', 'Aplicada por']],
        headStyles: { fillColor: CINZA },
        styles: { fontSize: 8.5, cellPadding: 1.8 },
        columnStyles: { 0: { cellWidth: 20 }, 1: { cellWidth: 26 }, 2: { cellWidth: 30 }, 4: { cellWidth: 30 } },
        body: cy.punicoes.map((p) => [
          fmt(p.data),
          p.referencia || '',
          NIVEIS[Number(p.nivel)].nome + (Number(p.nivel) === 5 && p.dias_suspensao ? ` (${p.dias_suspensao} dias)` : ''),
          (p.descricao || '') + (p.justificativa_nivel ? `\nJustificativa: ${p.justificativa_nivel}` : ''),
          p.aplicada_por || '',
        ]),
      });
      y = doc.lastAutoTable.finalY + 8;
    }
  }
  if (y > 245) {
    doc.addPage();
    y = 30;
  }
  y += 18;
  doc.setDrawColor(120);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.line(20, y, 90, y);
  doc.line(W - 90, y, W - 20, y);
  doc.text('Colaborador', 55, y + 5, { align: 'center' });
  doc.text('Gestor responsável', W - 55, y + 5, { align: 'center' });
  numerarPaginas(doc);
  doc.save(`historico_${nomeArquivo(c.matricula || 'colaborador')}_${dataHoje()}.pdf`);
}

const TITULOS = {
  1: 'REGISTRO DE ADVERTÊNCIA VERBAL',
  2: 'ADVERTÊNCIA DISCIPLINAR POR ESCRITO',
  3: 'ADVERTÊNCIA DISCIPLINAR POR ESCRITO',
  4: 'ADVERTÊNCIA DISCIPLINAR POR ESCRITO',
  5: 'COMUNICADO DE SUSPENSÃO DISCIPLINAR',
  6: 'COMUNICADO DE DESLIGAMENTO',
};

function textoComunicado(n, nivel, motivo, dataOc, dias) {
  const t = {
    1: `Pelo presente, registramos que o(a) colaborador(a) acima identificado(a) recebeu ADVERTÊNCIA VERBAL, em razão de "${motivo}", conforme a ocorrência de ${dataOc} descrita neste documento. Este registro tem caráter orientativo; a reincidência poderá resultar na aplicação de medidas disciplinares progressivas, conforme o regulamento interno da empresa.`,
    2: `Pelo presente, fica o(a) colaborador(a) acima identificado(a) ADVERTIDO(A) POR ESCRITO (${nivel.nome}), em razão de "${motivo}", conforme a ocorrência de ${dataOc} descrita neste documento. Solicitamos que tal conduta não se repita, sob pena de aplicação de medidas disciplinares mais severas, nos termos da legislação trabalhista e do regulamento interno da empresa.`,
    5: `Pelo presente, comunicamos que o(a) colaborador(a) acima identificado(a) fica SUSPENSO(A) de suas atividades por ${dias || '____'} dia(s), em razão de "${motivo}", conforme a ocorrência de ${dataOc} descrita neste documento. A suspensão terá início em ____/____/______, devendo o(a) colaborador(a) retornar ao trabalho em ____/____/______. A reincidência poderá acarretar a rescisão do contrato de trabalho, nos termos da legislação trabalhista.`,
    6: `Pelo presente, comunicamos ao(à) colaborador(a) acima identificado(a) o seu desligamento da empresa, em decorrência de "${motivo}", conforme a ocorrência de ${dataOc} descrita neste documento, após a aplicação progressiva das medidas disciplinares registradas. As orientações sobre os procedimentos de rescisão serão fornecidas pelo setor de Recursos Humanos.`,
  };
  return t[n] || t[2];
}

/** Formulário da punição em duas vias (empresa e colaborador) para impressão e assinatura. */
export async function pdfFormulario({ punicao: p, colaborador, empresa, punicoes, nomeMotivo }) {
  const { doc, autoTable, logo } = await preparar();
  const c = colaborador || {};
  const E = empresa || {};
  const n = Number(p.nivel);
  const nv = NIVEIS[n];
  const W = 210;
  const M = 16;
  const CW = W - 2 * M;
  const motivo = nomeMotivo(p.motivo_id);
  const dataOc = fmt(p.data);
  const cy = cicloDa(punicoes, p);
  const anteriores = cy
    ? cy.punicoes.filter(
        (x) => x.id !== p.id && (x.data < p.data || (x.data === p.data && (x.created_date || '') < (p.created_date || ''))),
      )
    : [];
  const testemunhas = (p.testemunhas || '')
    .split(/\s*[,;/]\s*|\s+e\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const dias = Number(p.dias_suspensao) || 0;
  const texto = textoComunicado(n, nv, motivo, dataOc, dias);

  const pagina = (via) => {
    let y = 14;
    let xTexto = M;
    if (logo) {
      desenharLogo(doc, logo, M, y - 4, 34);
      xTexto = M + 40;
    }
    doc.setTextColor(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(E.nome || 'Empresa (cadastre em Cadastros › Empresa)', xTexto, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...CINZA);
    const sub = [E.cnpj ? `CNPJ ${E.cnpj}` : '', E.endereco || '', E.cidade || ''].filter(Boolean).join('  ·  ');
    if (sub) doc.text(doc.splitTextToSize(sub, CW - 92), xTexto, y + 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(20);
    doc.text(`Ref. ${p.referencia || ''}`, W - M, y + 2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...CINZA);
    doc.text(via, W - M, y + 7, { align: 'right' });
    y += 13;
    doc.setDrawColor(...MARINHO);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    doc.setDrawColor(...DOURADO);
    doc.setLineWidth(0.3);
    doc.line(M, y + 0.9, M + 30, y + 0.9);

    y += 9;
    doc.setTextColor(...MARINHO);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.text(TITULOS[n] || 'MEDIDA DISCIPLINAR', W / 2, y, { align: 'center' });
    y += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...CINZA);
    doc.text(`Medida aplicada: ${nv.nome} (nível ${n} de 6 da escala disciplinar)`, W / 2, y, { align: 'center' });
    y += 5;

    const tabela = (titulo, body) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...MARINHO);
      doc.text(titulo.toUpperCase(), M, y + 4);
      autoTable(doc, {
        startY: y + 6,
        margin: { left: M, right: M },
        theme: 'grid',
        body,
        styles: { fontSize: 9, cellPadding: 1.8, lineColor: LINHA, lineWidth: 0.2, textColor: 20 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [244, 245, 247], cellWidth: 32 },
          2: { fontStyle: 'bold', fillColor: [244, 245, 247], cellWidth: 34 },
        },
      });
      y = doc.lastAutoTable.finalY + 3;
    };
    tabela('Dados do colaborador', [
      ['Nome', c.nome || '', 'Matrícula', c.matricula || ''],
      ['CPF', c.cpf || '-', 'Função', c.funcao || '-'],
      ['Departamento', c.departamento || '-', 'Admissão', fmt(c.admissao) || '-'],
    ]);
    tabela('Dados da ocorrência', [
      ['Motivo', motivo, 'Data da ocorrência', dataOc],
      [
        'Medida aplicada',
        nv.nome + (n === 5 && dias ? ` (${dias} dia${dias > 1 ? 's' : ''})` : ''),
        'Ciclo do motivo',
        cy ? `${fmt(cy.inicio)} a ${fmt(cy.fim)}` : '-',
      ],
    ]);

    const caixa = (titulo, txt) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...MARINHO);
      doc.text(titulo.toUpperCase(), M, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(20);
      const linhas = doc.splitTextToSize(txt || '-', CW - 6);
      const h = linhas.length * 4.4 + 5;
      doc.setDrawColor(...LINHA);
      doc.setLineWidth(0.2);
      doc.rect(M, y + 6, CW, h);
      doc.text(linhas, M + 3, y + 11);
      y += 6 + h + 3;
    };
    caixa('Descrição do ocorrido', p.descricao);
    if (p.justificativa_nivel) caixa('Justificativa da medida', p.justificativa_nivel);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...MARINHO);
    doc.text('HISTÓRICO NESTE MOTIVO (CICLO VIGENTE)', M, y + 4);
    if (anteriores.length) {
      autoTable(doc, {
        startY: y + 6,
        margin: { left: M, right: M },
        theme: 'grid',
        head: [['Data', 'Referência', 'Medida']],
        body: anteriores.map((x) => [
          fmt(x.data),
          x.referencia || '',
          NIVEIS[Number(x.nivel)].nome + (Number(x.nivel) === 5 && x.dias_suspensao ? ` (${x.dias_suspensao} dias)` : ''),
        ]),
        headStyles: { fillColor: [244, 245, 247], textColor: 20, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 1.5, lineColor: LINHA, lineWidth: 0.2, textColor: 20 },
      });
      y = doc.lastAutoTable.finalY + 4;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(20);
      doc.text('Primeira ocorrência deste motivo no ciclo.', M, y + 10);
      y += 14;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.8);
    doc.setTextColor(20);
    const tl = doc.splitTextToSize(texto, CW);
    if (y + tl.length * 4.6 + 78 > 285) {
      doc.addPage();
      y = 20;
    }
    y += 2;
    doc.text(tl, M, y, { lineHeightFactor: 1.35 });
    y += tl.length * 4.6 + 6;
    doc.text(`${E.cidade || '______________________'}, ______ de ________________________ de ________.`, M, y);
    y += 16;

    const assinatura = (x, yy, rotulo, nome, extra) => {
      doc.setDrawColor(60);
      doc.setLineWidth(0.3);
      doc.line(x, yy, x + 78, yy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(20);
      doc.text(rotulo, x, yy + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.3);
      doc.setTextColor(...CINZA);
      doc.text(nome || 'Nome: ______________________________', x, yy + 8.8);
      if (extra) doc.text(extra, x, yy + 12.8);
    };
    const x2 = W - M - 78;
    assinatura(M, y, 'Colaborador(a) - ciente', c.nome, `Mat. ${c.matricula || ''}`);
    assinatura(x2, y, 'Gestor(a) responsável', p.aplicada_por, '');
    y += 26;
    assinatura(M, y, 'Testemunha 1', testemunhas[0], 'CPF: ______________________');
    assinatura(x2, y, 'Testemunha 2', testemunhas[1], 'CPF: ______________________');
    y += 19;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(...CINZA);
    doc.text(
      doc.splitTextToSize(
        'Caso o(a) colaborador(a) se recuse a assinar, as testemunhas assinam atestando que ele(a) foi comunicado(a) do conteúdo deste documento na presença delas.',
        CW,
      ),
      M,
      y,
    );
  };

  ['VIA DA EMPRESA', 'VIA DO COLABORADOR'].forEach((via, i) => {
    if (i) doc.addPage();
    pagina(via);
  });
  numerarPaginas(doc, `${p.referencia || ''}  ·  Gerado em ${fmt(dataHoje())}`);
  doc.save(`formulario_${nomeArquivo(p.referencia || 'punicao')}_${nomeArquivo(c.matricula)}.pdf`);
}

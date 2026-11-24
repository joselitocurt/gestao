import {
  BarChart3,
  Building2,
  ClipboardList,
  Download,
  FilePlus2,
  FileSpreadsheet,
  Gavel,
  Landmark,
  Layers,
  LayoutDashboard,
  LayoutList,
  Percent,
  Search,
  Tag,
  UploadCloud,
  UserSearch,
  Users,
} from 'lucide-react';
import { PAGINAS } from '@/lib/permissoes';

// Catálogo de módulos do sistema. Para incluir um novo módulo: acrescente-o aqui (com o menu),
// cadastre suas páginas em shared/permissoes.js (com `modulo`) e as rotas em App.jsx.
export const MODULOS = [
  {
    id: 'difal',
    numero: 'I',
    nome: 'Gestão DIFAL',
    descricao: 'Apuração de DIFAL e FCOP, emissão de guias em lote, importação de XML e consolidado.',
    rota: '/difal',
    icone: Landmark,
    menu: [
      {
        titulo: 'Apuração',
        itens: [
          { to: '/difal', label: 'Notas do período', icon: LayoutList, chave: 'apuracao', end: true },
          { to: '/difal/lote', label: 'Emissão em lote', icon: Layers, chave: 'emissao_lote' },
          { to: '/difal/consulta', label: 'Consultar nota', icon: Search, chave: 'consulta' },
        ],
      },
      {
        titulo: 'Relatórios',
        itens: [
          { to: '/difal/consolidado', label: 'Consolidado', icon: BarChart3, chave: 'consolidado' },
          { to: '/difal/relatorio', label: 'Relatório de notas', icon: FileSpreadsheet, chave: 'relatorio_notas' },
        ],
      },
      {
        titulo: 'Entrada de notas',
        itens: [
          { to: '/difal/importar', label: 'Importar XML', icon: UploadCloud, chave: 'importar_xml' },
          { to: '/difal/notas/nova', label: 'Cadastrar nota', icon: FilePlus2, chave: 'cadastrar_nota' },
        ],
      },
      {
        titulo: 'Cadastros',
        itens: [
          { to: '/difal/cnpjs', label: 'CNPJs emissores', icon: Building2, chave: 'cnpjs' },
          { to: '/difal/aliquotas', label: 'Alíquotas', icon: Percent, chave: 'aliquotas' },
        ],
      },
    ],
  },
  {
    id: 'disciplinar',
    numero: 'II',
    nome: 'Gestão Disciplinar',
    descricao: 'Registro de punições com progressão por motivo em ciclos de 12 meses, histórico e formulários.',
    rota: '/disciplinar',
    icone: Gavel,
    menu: [
      {
        titulo: 'Controle disciplinar',
        itens: [
          { to: '/disciplinar', label: 'Painel', icon: LayoutDashboard, chave: 'disc_painel', end: true },
          { to: '/disciplinar/registrar', label: 'Registrar punição', icon: ClipboardList, chave: 'disc_registro' },
          { to: '/disciplinar/consulta', label: 'Consultar colaborador', icon: UserSearch, chave: 'disc_consulta' },
        ],
      },
      {
        titulo: 'Relatórios',
        itens: [{ to: '/disciplinar/exportacoes', label: 'Exportações', icon: Download, chave: 'disc_exportacoes' }],
      },
      {
        titulo: 'Cadastros',
        itens: [
          { to: '/disciplinar/colaboradores', label: 'Colaboradores', icon: Users, chave: 'disc_colaboradores' },
          { to: '/disciplinar/motivos', label: 'Motivos', icon: Tag, chave: 'disc_motivos' },
          { to: '/disciplinar/empresa', label: 'Empresa', icon: Building2, chave: 'disc_empresa' },
        ],
      },
    ],
  },
];

export const paginasDoModulo = (id) => PAGINAS.filter((p) => p.modulo === id);

export const moduloDaRota = (pathname) =>
  MODULOS.find((m) => pathname === m.rota || pathname.startsWith(`${m.rota}/`)) || null;

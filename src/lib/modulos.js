import { Landmark } from 'lucide-react';
import { PAGINAS } from '@/lib/permissoes';

// Catálogo de módulos do sistema. Para incluir um novo módulo: acrescente-o aqui,
// cadastre suas páginas em shared/permissoes.js (com `modulo`) e as rotas em App.jsx.
export const MODULOS = [
  {
    id: 'difal',
    numero: 'I',
    nome: 'Gestão DIFAL',
    descricao: 'Apuração de DIFAL e FCOP, emissão de guias em lote, importação de XML e consolidado.',
    rota: '/difal',
    icone: Landmark,
  },
];

export const paginasDoModulo = (id) => PAGINAS.filter((p) => p.modulo === id);

export const moduloDaRota = (pathname) =>
  MODULOS.find((m) => pathname === m.rota || pathname.startsWith(`${m.rota}/`)) || null;

// Usado pelo frontend e pelo servidor, para que as regras de acesso sejam as mesmas nos dois lados.

export const PAGINAS = [
  { chave: 'apuracao', rota: '/difal', label: 'Apuração', modulo: 'difal' },
  { chave: 'emissao_lote', rota: '/difal/lote', label: 'Emissão em lote', modulo: 'difal' },
  { chave: 'cadastrar_nota', rota: '/difal/notas/nova', label: 'Cadastrar nota', modulo: 'difal' },
  { chave: 'importar_xml', rota: '/difal/importar', label: 'Importar XML', modulo: 'difal' },
  { chave: 'cnpjs', rota: '/difal/cnpjs', label: 'CNPJs emissores', modulo: 'difal' },
  { chave: 'consulta', rota: '/difal/consulta', label: 'Consultar nota', modulo: 'difal' },
  { chave: 'consolidado', rota: '/difal/consolidado', label: 'Consolidado', modulo: 'difal' },
  { chave: 'relatorio_notas', rota: '/difal/relatorio', label: 'Relatório de notas', modulo: 'difal' },
  // Administração do sistema (fora dos módulos), aberta pela página inicial.
  { chave: 'usuarios', rota: '/usuarios', label: 'Usuários', modulo: null },
];

const TODAS = PAGINAS.map((p) => p.chave);

// Master: acesso total. Usuário: só as páginas marcadas no cadastro (personalizado por usuário).
export const PERFIS = {
  master: {
    label: 'Master',
    descricao: 'Acesso total a todos os módulos e páginas, incluindo usuários.',
    permissoes: TODAS,
  },
  usuario: {
    label: 'Usuário',
    descricao: 'Acessa somente as páginas marcadas no seu cadastro.',
    permissoes: [],
  },
};

export const PERFIL_OPTIONS = Object.entries(PERFIS).map(([value, v]) => ({
  value,
  label: v.label,
}));

export const permissoesDoPerfil = (perfil) => [...(PERFIS[perfil]?.permissoes || [])];

export const rotuloPerfil = (perfil) => PERFIS[perfil]?.label || '—';

// Permissões efetivas de um cadastro de UsuarioSistema (mesma regra do AcessoContext).
export const permissoesEfetivas = (registro) => {
  if (!registro) return [];
  if (registro.perfil === 'master') return [...TODAS];
  // Usuário: somente as páginas marcadas; a administração de usuários é exclusiva do Master.
  return Array.isArray(registro.permissoes) ? registro.permissoes.filter((p) => p !== 'usuarios') : [];
};

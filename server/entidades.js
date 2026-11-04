// Definição das entidades: mesmos campos, tipos, obrigatórios, enums e padrões
// dos arquivos base44/entities/*.jsonc da aplicação original.

export const ENTIDADES = {
  NotaFiscal: {
    tabela: 'nota_fiscal',
    campos: {
      numero: 'string',
      serie: 'string',
      chave_acesso: 'string',
      emitente_cnpj: 'string',
      emitente_nome: 'string',
      emitente_uf: 'string',
      destinatario_nome: 'string',
      destinatario_cpf: 'string',
      destinatario_uf: 'string',
      destinatario_municipio: 'string',
      data_emissao: 'date',
      ano: 'number',
      mes: 'number',
      valor_total: 'number',
      valor_difal: 'number',
      valor_fcop: 'number',
      status: 'string',
      data_pagamento: 'date',
      comprovante_uri: 'string',
      comprovante_nome: 'string',
    },
    obrigatorios: ['numero', 'emitente_cnpj'],
    enums: { status: ['a_emitir', 'emitido', 'pago'] },
    padroes: { valor_difal: 0, valor_fcop: 0, status: 'a_emitir' },
  },

  Emitente: {
    tabela: 'emitente',
    campos: {
      cnpj: 'string',
      razao_social: 'string',
      apelido: 'string',
      uf: 'string',
      tipo: 'string',
    },
    obrigatorios: ['cnpj', 'uf'],
    enums: { tipo: ['matriz', 'filial'] },
    padroes: { tipo: 'filial' },
  },

  UsuarioSistema: {
    tabela: 'usuario_sistema',
    campos: {
      nome: 'string',
      email: 'string',
      perfil: 'string',
      ativo: 'boolean',
      permissoes: 'array',
    },
    obrigatorios: ['nome', 'email', 'perfil'],
    enums: { perfil: ['master', 'usuario', 'consulta'] },
    padroes: { perfil: 'consulta', ativo: true },
  },
};

const META = ['id', 'created_date', 'updated_date', 'created_by'];

export const camposConsultaveis = (def) => new Set([...Object.keys(def.campos), ...META]);

export class ErroValidacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.status = 400;
  }
}

// Converte um valor recebido da API para o formato gravado no SQLite.
const paraBanco = (tipo, valor) => {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') {
    return tipo === 'string' ? (valor === '' ? '' : null) : null;
  }
  switch (tipo) {
    case 'number': {
      const n = Number(valor);
      if (Number.isNaN(n)) throw new ErroValidacao('Valor numérico inválido');
      return n;
    }
    case 'boolean':
      return valor ? 1 : 0;
    case 'array':
      if (!Array.isArray(valor)) throw new ErroValidacao('Lista inválida');
      return JSON.stringify(valor.map(String));
    case 'date':
      return String(valor).slice(0, 10);
    default:
      return String(valor);
  }
};

// Converte uma linha do SQLite para o formato devolvido ao frontend.
export const deBanco = (def, linha) => {
  if (!linha) return linha;
  const saida = { ...linha };
  for (const [campo, tipo] of Object.entries(def.campos)) {
    if (!(campo in saida)) continue;
    if (tipo === 'boolean' && saida[campo] !== null) saida[campo] = Boolean(saida[campo]);
    if (tipo === 'array' && typeof saida[campo] === 'string') {
      try {
        saida[campo] = JSON.parse(saida[campo]);
      } catch {
        saida[campo] = [];
      }
    }
  }
  return saida;
};

// Valida e normaliza os dados de criação (completo) ou atualização (parcial).
export const prepararDados = (def, dados, { parcial = false } = {}) => {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos');
  }
  const saida = {};
  for (const [campo, tipo] of Object.entries(def.campos)) {
    if (!(campo in dados)) continue;
    let valor = paraBanco(tipo, dados[campo]);
    if (campo === 'email' && typeof valor === 'string') valor = valor.trim().toLowerCase();
    if (valor !== undefined) saida[campo] = valor;
  }

  if (!parcial) {
    for (const [campo, padrao] of Object.entries(def.padroes || {})) {
      if (saida[campo] === undefined || saida[campo] === null) {
        saida[campo] = paraBanco(def.campos[campo], padrao);
      }
    }
  }

  for (const campo of def.obrigatorios) {
    const ausente = saida[campo] === undefined || saida[campo] === null || saida[campo] === '';
    if ((!parcial && ausente) || (parcial && campo in saida && ausente)) {
      throw new ErroValidacao(`O campo "${campo}" é obrigatório`);
    }
  }

  for (const [campo, permitidos] of Object.entries(def.enums || {})) {
    if (saida[campo] !== undefined && saida[campo] !== null && !permitidos.includes(saida[campo])) {
      throw new ErroValidacao(`Valor inválido para "${campo}"`);
    }
  }

  return saida;
};

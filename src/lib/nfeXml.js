const textoDe = (escopo, nome) => {
  if (!escopo) return '';
  const elemento = Array.from(escopo.getElementsByTagName('*')).find((el) => el.localName === nome);
  return elemento ? elemento.textContent.trim() : '';
};

const elementoFilho = (escopo, nome) => {
  if (!escopo) return null;
  return Array.from(escopo.getElementsByTagName('*')).find((el) => el.localName === nome) || null;
};

export function parseNfeXml(xmlTexto) {
  const doc = new DOMParser().parseFromString(xmlTexto, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('Arquivo XML inválido');
  }

  const raiz = elementoFilho(doc, 'infNFe');
  if (!raiz) throw new Error('Não é um XML de NF-e');

  const ide = elementoFilho(raiz, 'ide');
  const emit = elementoFilho(raiz, 'emit');
  const dest = elementoFilho(raiz, 'dest');
  const total = elementoFilho(raiz, 'total');
  const emissao =
    textoDe(ide, 'dhEmi') || textoDe(ide, 'dEmi') || textoDe(ide, 'dhEmissao') || textoDe(ide, 'dEmissao');

  return {
    chave_acesso: (raiz.getAttribute('Id') || '').replace(/^NFe/, ''),
    numero: textoDe(ide, 'nNF'),
    serie: textoDe(ide, 'serie'),
    data_emissao: emissao.slice(0, 10),
    emitente_cnpj: textoDe(emit, 'CNPJ') || textoDe(emit, 'CPF'),
    emitente_nome: textoDe(emit, 'xNome'),
    emitente_uf: textoDe(emit, 'UF'),
    destinatario_nome: textoDe(dest, 'xNome'),
    destinatario_cpf: textoDe(dest, 'CPF'),
    destinatario_cnpj: textoDe(dest, 'CNPJ'),
    destinatario_uf: textoDe(dest, 'UF'),
    destinatario_municipio: textoDe(dest, 'xMun'),
    valor_total: Number(textoDe(total, 'vNF')) || 0,
  };
}

export function classificarNfe(nota) {
  if (!nota.destinatario_cpf) {
    return { valida: false, motivo: 'Destinatário não é pessoa física' };
  }
  if (!nota.emitente_uf || !nota.destinatario_uf) {
    return { valida: false, motivo: 'UF de origem ou destino não identificada' };
  }
  if (nota.emitente_uf === nota.destinatario_uf) {
    return { valida: false, motivo: `Operação interna (${nota.emitente_uf} → ${nota.destinatario_uf})` };
  }
  return { valida: true, motivo: '' };
}

// Cliente da API própria. Substitui o SDK do Base44 mantendo os mesmos métodos
// usados pela aplicação (entities.X.list/filter/create/bulkCreate/update/delete/aggregate,
// auth, convite de usuários e arquivos de comprovante).

const CHAVE_TOKEN = 'difal_access_token';

export const getToken = () => {
  try {
    return window.localStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
};

const setToken = (token) => {
  try {
    if (token) window.localStorage.setItem(CHAVE_TOKEN, token);
    else window.localStorage.removeItem(CHAVE_TOKEN);
  } catch {
    // armazenamento indisponível (aba privada etc.)
  }
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(caminho, { method = 'GET', body, form, autenticado = true } = {}) {
  const headers = {};
  const token = getToken();
  if (autenticado && token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const resposta = await fetch(`/api${caminho}`, {
    method,
    headers,
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
  });

  let dados = null;
  const texto = await resposta.text();
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = { message: texto };
    }
  }

  if (!resposta.ok) {
    // Sessão expirada durante o uso: volta para o login.
    if (resposta.status === 401 && autenticado && token) {
      setToken(null);
      const destino = window.location.pathname + window.location.search;
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?returnTo=${encodeURIComponent(destino)}`;
      }
    }
    throw new ApiError(dados?.message || 'Não foi possível concluir a operação', resposta.status);
  }
  return dados;
}

const entidade = (nome) => {
  const base = `/entities/${nome}`;
  const consulta = (query, { sort, limit, cursor } = {}) => {
    const params = new URLSearchParams();
    if (query && Object.keys(query).length) params.set('q', JSON.stringify(query));
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return request(`${base}${qs ? `?${qs}` : ''}`);
  };

  return {
    // Lista completa (até 1000 registros), devolvida como array.
    list: async (opcoes = {}) => (await consulta({}, { limit: 1000, ...opcoes })).items,
    // Filtro paginado: { items, has_more, next_cursor }.
    filter: (query, opcoes) => consulta(query, opcoes),
    get: (id) => request(`${base}/${encodeURIComponent(id)}`),
    create: (dados) => request(base, { method: 'POST', body: dados }),
    bulkCreate: (lista) => request(`${base}/bulk`, { method: 'POST', body: lista }),
    update: (id, dados) => request(`${base}/${encodeURIComponent(id)}`, { method: 'PUT', body: dados }),
    // Atualiza vários registros de uma vez: [{ id, ...campos }].
    updateMany: (lista) => request(base, { method: 'PUT', body: lista }),
    delete: (id) => request(`${base}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    aggregate: (opcoes) => request(`${base}/aggregate`, { method: 'POST', body: opcoes }),
  };
};

export const api = {
  entities: {
    NotaFiscal: entidade('NotaFiscal'),
    Emitente: entidade('Emitente'),
    Aliquota: entidade('Aliquota'),
    UsuarioSistema: entidade('UsuarioSistema'),
  },

  auth: {
    getToken,
    me: () => request('/auth/me'),
    async login(email, password) {
      const resultado = await request('/auth/login', {
        method: 'POST',
        body: { email, password },
        autenticado: false,
      });
      setToken(resultado.access_token);
      return resultado.user;
    },
    logout(redirecionarPara = '/login') {
      setToken(null);
      if (redirecionarPara) window.location.href = redirecionarPara;
    },
    resetPasswordRequest: (email) =>
      request('/auth/reset-request', { method: 'POST', body: { email }, autenticado: false }),
    resetPassword: ({ resetToken, newPassword }) =>
      request('/auth/reset', { method: 'POST', body: { resetToken, newPassword }, autenticado: false }),
  },

  users: {
    inviteUser: (email, role) => request('/users/invite', { method: 'POST', body: { email, role } }),
    // Link de nova senha enviado pelo Master: { emailEnviado, link?, motivo? }.
    resetLink: (email) => request('/users/reset-link', { method: 'POST', body: { email } }),
  },

  files: {
    upload(arquivo) {
      const form = new FormData();
      form.append('file', arquivo);
      return request('/files', { method: 'POST', form });
    },
    signedUrl: (file_uri) => request('/files/link', { method: 'POST', body: { file_uri } }),
  },
};

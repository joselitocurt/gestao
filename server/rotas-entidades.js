import crypto from 'node:crypto';
import { Router } from 'express';
import { db, agora } from './db.js';
import { autenticar, definirPapel } from './auth.js';
import { ENTIDADES, ErroValidacao, camposConsultaveis, deBanco, prepararDados } from './entidades.js';
import { montarOrdem, montarWhere } from './consulta.js';
import { permissoesEfetivas } from '../shared/permissoes.js';
import { CAMPOS_DO_STATUS, statusAutomatico } from '../shared/status.js';

export const rotasEntidades = Router();
rotasEntidades.use(autenticar);

// ------------------------------------------------------------- controle de acesso

const cadastroDoUsuario = (email) => {
  const linha = db.prepare('SELECT * FROM usuario_sistema WHERE email = ? LIMIT 1').get(email);
  return deBanco(ENTIDADES.UsuarioSistema, linha);
};

const negar = (mensagem = 'Sem permissão para esta operação') => {
  const erro = new Error(mensagem);
  erro.status = 403;
  return erro;
};

// Páginas que permitem gravar cada entidade (mesmas telas que gravam no app original).
const ESCRITA = {
  NotaFiscal: ['apuracao', 'cadastrar_nota', 'importar_xml', 'emissao_lote'],
  Emitente: ['cnpjs', 'importar_xml'],
};

function verificarAcesso(req, entidade, operacao) {
  const usuario = req.user;

  // UsuarioSistema segue a regra (RLS) da entidade original:
  // leitura do próprio cadastro ou de todos para admin; escrita só para admin.
  if (entidade === 'UsuarioSistema') {
    if (operacao === 'leitura') return usuario.role === 'admin' ? null : { email: usuario.email };
    if (usuario.role !== 'admin') throw negar('Acesso restrito a usuários Master');
    return null;
  }

  const cadastro = cadastroDoUsuario(usuario.email);
  // Administrador sem cadastro ainda (primeiro acesso) ou ativo tem acesso total.
  if (usuario.role === 'admin' && (!cadastro || cadastro.ativo !== false)) return null;
  if (!cadastro) throw negar('Seu e-mail ainda não foi cadastrado neste sistema.');
  if (cadastro.ativo === false) throw negar('Seu acesso está desativado.');

  if (operacao === 'escrita') {
    const permissoes = permissoesEfetivas(cadastro);
    if (!ESCRITA[entidade].some((chave) => permissoes.includes(chave))) throw negar();
  }
  return null;
}

// ---------------------------------------------------------------------- auxiliares

const obterDef = (nome) => {
  const def = ENTIDADES[nome];
  if (!def) {
    const erro = new Error('Entidade não encontrada');
    erro.status = 404;
    throw erro;
  }
  return def;
};

const lerJson = (texto, padrao) => {
  if (texto === undefined || texto === '') return padrao;
  try {
    return JSON.parse(texto);
  } catch {
    throw new ErroValidacao('Parâmetro de consulta inválido');
  }
};

const combinar = (filtro, restricao) => (restricao ? { $and: [filtro || {}, restricao] } : filtro || {});

const inserir = (def, dados, req) => {
  const data = agora();
  const registro = { id: crypto.randomUUID(), ...dados, created_by: req.user.email, created_date: data, updated_date: data };
  const colunas = Object.keys(registro);
  db.prepare(
    `INSERT INTO ${def.tabela} (${colunas.map((c) => `"${c}"`).join(', ')}) VALUES (${colunas.map((c) => `@${c}`).join(', ')})`,
  ).run(registro);
  return deBanco(def, db.prepare(`SELECT * FROM ${def.tabela} WHERE id = ?`).get(registro.id));
};

// Quando o perfil de um usuário muda, o papel de login acompanha (Master = admin).
const sincronizarPapel = (registro) => {
  if (registro?.email && registro?.perfil) definirPapel(registro.email, registro.perfil === 'master' ? 'admin' : 'user');
};

// Nota fiscal sem status informado: o status é calculado pelos valores e pela data de pagamento.
const comStatusAutomatico = (entidade, dados) =>
  entidade === 'NotaFiscal' && dados && typeof dados === 'object' && !dados.status
    ? { ...dados, status: statusAutomatico(dados) }
    : dados;

// --------------------------------------------------------------------------- rotas

// Listagem/filtro: GET /api/entities/:entidade?q={...}&sort=campo&limit=50&cursor=...
rotasEntidades.get('/:entidade', (req, res) => {
  const def = obterDef(req.params.entidade);
  const restricao = verificarAcesso(req, req.params.entidade, 'leitura');
  const campos = camposConsultaveis(def);

  const filtro = combinar(lerJson(req.query.q, {}), restricao);
  const { sql, params } = montarWhere(filtro, campos);
  const ordem = montarOrdem(req.query.sort, campos);
  const limite = Math.min(Math.max(Number(req.query.limit) || 50, 1), 1000);
  const deslocamento = req.query.cursor ? Number(Buffer.from(String(req.query.cursor), 'base64url').toString()) || 0 : 0;

  const linhas = db
    .prepare(`SELECT * FROM ${def.tabela} WHERE ${sql} ${ordem} LIMIT ? OFFSET ?`)
    .all(...params, limite + 1, deslocamento);

  const has_more = linhas.length > limite;
  const items = linhas.slice(0, limite).map((l) => deBanco(def, l));
  res.json({
    items,
    has_more,
    next_cursor: has_more ? Buffer.from(String(deslocamento + limite)).toString('base64url') : null,
  });
});

// Agregação: POST /api/entities/:entidade/aggregate { query, groupBy, sum: [] }
rotasEntidades.post('/:entidade/aggregate', (req, res) => {
  const def = obterDef(req.params.entidade);
  const restricao = verificarAcesso(req, req.params.entidade, 'leitura');
  const campos = camposConsultaveis(def);
  const { query, groupBy, sum = [] } = req.body || {};

  if (groupBy && !campos.has(groupBy)) throw new ErroValidacao('Campo de agrupamento inválido');
  for (const campo of sum) {
    if (def.campos[campo] !== 'number') throw new ErroValidacao(`Não é possível somar "${campo}"`);
  }

  const { sql, params } = montarWhere(combinar(query, restricao), campos);
  const somas = sum.map((c) => `COALESCE(SUM("${c}"), 0) AS "sum_${c}"`);
  const selecao = [groupBy ? `"${groupBy}"` : null, 'COUNT(*) AS count', ...somas].filter(Boolean).join(', ');
  const rows = db
    .prepare(`SELECT ${selecao} FROM ${def.tabela} WHERE ${sql}${groupBy ? ` GROUP BY "${groupBy}"` : ''}`)
    .all(...params);
  res.json({ rows });
});

rotasEntidades.get('/:entidade/:id', (req, res) => {
  const def = obterDef(req.params.entidade);
  const restricao = verificarAcesso(req, req.params.entidade, 'leitura');
  const { sql, params } = montarWhere(combinar({ id: req.params.id }, restricao), camposConsultaveis(def));
  const linha = db.prepare(`SELECT * FROM ${def.tabela} WHERE ${sql}`).get(...params);
  if (!linha) return res.status(404).json({ message: 'Registro não encontrado' });
  res.json(deBanco(def, linha));
});

rotasEntidades.post('/:entidade', (req, res) => {
  const def = obterDef(req.params.entidade);
  verificarAcesso(req, req.params.entidade, 'escrita');
  const registro = inserir(def, prepararDados(def, comStatusAutomatico(req.params.entidade, req.body)), req);
  if (req.params.entidade === 'UsuarioSistema') sincronizarPapel(registro);
  res.status(201).json(registro);
});

rotasEntidades.post('/:entidade/bulk', (req, res) => {
  const def = obterDef(req.params.entidade);
  verificarAcesso(req, req.params.entidade, 'escrita');
  if (!Array.isArray(req.body)) throw new ErroValidacao('Envie uma lista de registros');
  const preparados = req.body.map((item) => prepararDados(def, comStatusAutomatico(req.params.entidade, item)));
  const criados = db.transaction(() => preparados.map((dados) => inserir(def, dados, req)))();
  res.status(201).json(criados);
});

// Atualiza um registro (parcial). Devolve o registro salvo ou null se não existir.
const atualizar = (def, entidade, id, corpo) => {
  const dados = prepararDados(def, corpo, { parcial: true });
  if (entidade === 'UsuarioSistema') delete dados.email; // o login (e-mail) não pode ser alterado

  const existente = db.prepare(`SELECT * FROM ${def.tabela} WHERE id = ?`).get(id);
  if (!existente) return null;

  // Alterou valores ou data de pagamento sem informar o status: recalcula o status.
  if (entidade === 'NotaFiscal' && !('status' in dados) && CAMPOS_DO_STATUS.some((campo) => campo in dados)) {
    dados.status = statusAutomatico({ ...existente, ...dados });
  }

  const colunas = Object.keys(dados);
  if (colunas.length) {
    db.prepare(
      `UPDATE ${def.tabela} SET ${colunas.map((c) => `"${c}" = @${c}`).join(', ')}, updated_date = @updated_date WHERE id = @id`,
    ).run({ ...dados, updated_date: agora(), id });
  }
  const registro = deBanco(def, db.prepare(`SELECT * FROM ${def.tabela} WHERE id = ?`).get(id));
  if (entidade === 'UsuarioSistema' && 'perfil' in dados) sincronizarPapel(registro);
  return registro;
};

// Atualização em lote: PUT /api/entities/:entidade com [{ id, ...campos }].
// Tudo numa transação: ou grava todas, ou nenhuma.
rotasEntidades.put('/:entidade', (req, res) => {
  const def = obterDef(req.params.entidade);
  verificarAcesso(req, req.params.entidade, 'escrita');
  if (!Array.isArray(req.body) || !req.body.length) throw new ErroValidacao('Envie uma lista de registros');
  if (req.body.length > 1000) throw new ErroValidacao('Envie no máximo 1.000 registros por vez');
  if (req.body.some((item) => !item || typeof item.id !== 'string')) throw new ErroValidacao('Cada registro precisa do id');

  const salvos = db.transaction(() =>
    req.body.map(({ id, ...campos }) => {
      const registro = atualizar(def, req.params.entidade, id, campos);
      if (!registro) {
        const erro = new Error(`Registro não encontrado: ${id}`);
        erro.status = 404;
        throw erro;
      }
      return registro;
    }),
  )();
  res.json(salvos);
});

rotasEntidades.put('/:entidade/:id', (req, res) => {
  const def = obterDef(req.params.entidade);
  verificarAcesso(req, req.params.entidade, 'escrita');
  const registro = atualizar(def, req.params.entidade, req.params.id, req.body);
  if (!registro) return res.status(404).json({ message: 'Registro não encontrado' });
  res.json(registro);
});

rotasEntidades.delete('/:entidade/:id', (req, res) => {
  const def = obterDef(req.params.entidade);
  verificarAcesso(req, req.params.entidade, 'escrita');
  const resultado = db.prepare(`DELETE FROM ${def.tabela} WHERE id = ?`).run(req.params.id);
  if (!resultado.changes) return res.status(404).json({ message: 'Registro não encontrado' });
  res.json({ ok: true });
});

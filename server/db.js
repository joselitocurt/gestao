// Banco SQLite via sql.js (WebAssembly, sem compilação nativa), salvo em arquivo.
// Funciona em hospedagem compartilhada (ex.: Hostinger), onde módulos nativos não compilam.
//
// O banco fica em memória e é gravado no arquivo a cada alteração (escrita atômica).
// Se mais de um processo do servidor estiver rodando, as escritas são serializadas por um
// arquivo de trava e cada processo recarrega o banco quando outro o altera.
import fs from 'node:fs';
import initSqlJs from 'sql.js';
import { DB_PATH } from './config.js';

const ESQUEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name TEXT,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    reset_token_hash TEXT,
    reset_expires INTEGER,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS emitente (
    id TEXT PRIMARY KEY,
    cnpj TEXT NOT NULL,
    razao_social TEXT,
    apelido TEXT,
    uf TEXT NOT NULL,
    tipo TEXT DEFAULT 'filial' CHECK (tipo IN ('matriz', 'filial')),
    created_by TEXT,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_emitente_cnpj ON emitente (cnpj);

  CREATE TABLE IF NOT EXISTS nota_fiscal (
    id TEXT PRIMARY KEY,
    numero TEXT NOT NULL,
    serie TEXT,
    chave_acesso TEXT,
    emitente_cnpj TEXT NOT NULL,
    emitente_nome TEXT,
    emitente_uf TEXT,
    destinatario_nome TEXT,
    destinatario_cpf TEXT,
    destinatario_uf TEXT,
    destinatario_municipio TEXT,
    data_emissao TEXT,
    ano INTEGER,
    mes INTEGER,
    valor_total REAL,
    valor_difal REAL DEFAULT 0,
    valor_fcop REAL DEFAULT 0,
    status TEXT DEFAULT 'a_emitir' CHECK (status IN ('a_emitir', 'emitido', 'pago')),
    data_pagamento TEXT,
    comprovante_uri TEXT,
    comprovante_nome TEXT,
    created_by TEXT,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_nota_emitente ON nota_fiscal (emitente_cnpj, ano, mes);
  CREATE INDEX IF NOT EXISTS idx_nota_periodo ON nota_fiscal (ano, mes);
  CREATE INDEX IF NOT EXISTS idx_nota_emissao ON nota_fiscal (data_emissao);
  CREATE INDEX IF NOT EXISTS idx_nota_chave ON nota_fiscal (chave_acesso);

  CREATE TABLE IF NOT EXISTS usuario_sistema (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE,
    perfil TEXT NOT NULL DEFAULT 'consulta' CHECK (perfil IN ('master', 'usuario', 'consulta')),
    ativo INTEGER DEFAULT 1,
    permissoes TEXT,
    created_by TEXT,
    created_date TEXT NOT NULL,
    updated_date TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_usuario_email ON usuario_sistema (email);

  CREATE TABLE IF NOT EXISTS arquivo (
    id TEXT PRIMARY KEY,
    nome_original TEXT,
    mime TEXT,
    tamanho INTEGER,
    caminho TEXT NOT NULL,
    created_by TEXT,
    created_date TEXT NOT NULL
  );
`;

const TRAVA = `${DB_PATH}.lock`;
let SQL = null;
let banco = null;
let versaoCarregada = null; // inode + mtime do arquivo carregado
let emTransacao = false;

const versaoDoArquivo = () => {
  try {
    const st = fs.statSync(DB_PATH);
    return `${st.ino}:${st.mtimeMs}:${st.size}`;
  } catch {
    return null;
  }
};

// Recarrega o banco do disco se outro processo gravou depois da última leitura.
const sincronizar = () => {
  if (emTransacao) return;
  const versao = versaoDoArquivo();
  if (banco && versao === versaoCarregada) return;
  banco?.close();
  banco = versao ? new SQL.Database(fs.readFileSync(DB_PATH)) : new SQL.Database();
  versaoCarregada = versao;
};

const salvar = () => {
  const temporario = `${DB_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporario, Buffer.from(banco.export()));
  fs.renameSync(temporario, DB_PATH);
  versaoCarregada = versaoDoArquivo();
};

const esperar = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Trava entre processos: um arquivo criado com exclusividade. Travas esquecidas (>15 s) são removidas.
const comTrava = (fn) => {
  const limite = Date.now() + 10_000;
  for (;;) {
    try {
      fs.closeSync(fs.openSync(TRAVA, 'wx'));
      break;
    } catch (erro) {
      if (erro.code !== 'EEXIST') throw erro;
      try {
        if (Date.now() - fs.statSync(TRAVA).mtimeMs > 15_000) fs.rmSync(TRAVA, { force: true });
      } catch {
        // a trava sumiu entre as verificações
      }
      if (Date.now() > limite) throw new Error('Banco de dados ocupado. Tente novamente.');
      esperar(15);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(TRAVA, { force: true });
  }
};

// sql.js não aceita undefined; parâmetros nomeados usam o prefixo "@" no SQL.
const parametros = (args) => {
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return Object.fromEntries(Object.entries(args[0]).map(([k, v]) => [`@${k}`, v === undefined ? null : v]));
  }
  return args.map((v) => (v === undefined ? null : v));
};

const consultar = (sql, args, unico) => {
  const stmt = banco.prepare(sql);
  try {
    stmt.bind(parametros(args));
    const linhas = [];
    while (stmt.step()) {
      linhas.push(stmt.getAsObject());
      if (unico) break;
    }
    return unico ? linhas[0] : linhas;
  } finally {
    stmt.free();
  }
};

const executar = (sql, args) => {
  banco.run(sql, parametros(args));
  return { changes: banco.getRowsModified() };
};

const escrever = (fn) => {
  if (emTransacao) return fn();
  return comTrava(() => {
    sincronizar();
    const resultado = fn();
    salvar();
    return resultado;
  });
};

/** Mesma interface usada antes com better-sqlite3: prepare().get/all/run e transaction(). */
export const db = {
  prepare(sql) {
    return {
      get: (...args) => {
        sincronizar();
        return consultar(sql, args, true);
      },
      all: (...args) => {
        sincronizar();
        return consultar(sql, args, false);
      },
      run: (...args) => escrever(() => executar(sql, args)),
    };
  },
  transaction(fn) {
    return (...args) =>
      comTrava(() => {
        sincronizar();
        emTransacao = true;
        banco.run('BEGIN');
        try {
          const resultado = fn(...args);
          banco.run('COMMIT');
          salvar();
          return resultado;
        } catch (erro) {
          banco.run('ROLLBACK');
          throw erro;
        } finally {
          emTransacao = false;
        }
      });
  },
};

/** Precisa ser chamado (e aguardado) antes de usar o banco. */
export async function abrirBanco() {
  if (SQL) return db;
  SQL = await initSqlJs();
  comTrava(() => {
    sincronizar();
    banco.exec(ESQUEMA);
    salvar();
  });
  return db;
}

export const agora = () => new Date().toISOString();

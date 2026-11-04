import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
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
`);

export const agora = () => new Date().toISOString();

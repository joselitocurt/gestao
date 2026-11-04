import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { IS_PROD, PORT, ROOT_DIR } from './config.js';
import { abrirBanco, db } from './db.js';
import { criarUsuario } from './auth.js';
import { rotasAuth, rotasUsuarios } from './auth.js';
import { rotasEntidades } from './rotas-entidades.js';
import { rotasArquivos } from './rotas-arquivos.js';

// Primeiro administrador, criado a partir do .env quando o banco ainda não tem usuários.
const criarAdministradorInicial = () => {
  const totalUsuarios = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (!totalUsuarios && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    criarUsuario({
      email: process.env.ADMIN_EMAIL,
      full_name: process.env.ADMIN_NOME || null,
      role: 'admin',
      senha: process.env.ADMIN_PASSWORD,
    });
    console.log(`Administrador inicial criado: ${process.env.ADMIN_EMAIL}`);
  } else if (!totalUsuarios) {
    console.warn('Nenhum usuário cadastrado. Defina ADMIN_EMAIL e ADMIN_PASSWORD no .env ou rode "npm run criar-admin".');
  }
};

// O banco abre de forma assíncrona (WebAssembly). O servidor começa a escutar na hora,
// e as requisições à API esperam o banco ficar pronto.
const bancoPronto = abrirBanco().then(criarAdministradorInicial);
bancoPronto.catch((erro) => console.error('Falha ao abrir o banco de dados:', erro));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use('/api', (_req, _res, next) => {
  bancoPronto.then(() => next(), next);
});
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', rotasAuth);
app.use('/api/users', rotasUsuarios);
app.use('/api/entities', rotasEntidades);
app.use('/api/files', rotasArquivos);
app.use('/api', (_req, res) => res.status(404).json({ message: 'Rota não encontrada' }));

// Em produção o próprio servidor entrega o frontend compilado (pasta dist).
const DIST = path.join(ROOT_DIR, 'dist');
if (IS_PROD && fs.existsSync(DIST)) {
  app.use(express.static(DIST, { index: false, maxAge: '1h' }));
  app.get('/{*caminho}', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((erro, _req, res, _next) => {
  const status = erro.status || (erro.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(erro);
  const mensagem =
    erro.code === 'LIMIT_FILE_SIZE'
      ? 'Arquivo muito grande (máximo 20 MB)'
      : status >= 500
        ? 'Erro interno do servidor'
        : erro.message;
  res.status(status).json({ message: mensagem });
});

app.listen(PORT, () => {
  console.log(`API Gestão DIFAL rodando em http://localhost:${PORT}`);
});

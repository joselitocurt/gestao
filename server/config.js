import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(__dirname, '..');
export const DATA_DIR = path.resolve(ROOT_DIR, process.env.DATA_DIR || 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
export const DB_PATH = path.join(DATA_DIR, 'difal.sqlite');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Segredo usado para assinar tokens de login e links de comprovante.
// Se não vier do ambiente, é gerado uma vez e guardado na pasta de dados.
const lerSegredo = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const arquivo = path.join(DATA_DIR, '.secret');
  if (fs.existsSync(arquivo)) return fs.readFileSync(arquivo, 'utf8').trim();
  const novo = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(arquivo, novo, { mode: 0o600 });
  return novo;
};

export const SECRET = lerSegredo();
export const PORT = Number(process.env.PORT) || 3001;
export const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
export const IS_PROD = process.env.NODE_ENV === 'production';

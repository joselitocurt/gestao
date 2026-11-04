import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { db, agora } from './db.js';
import { autenticar } from './auth.js';
import { SECRET, UPLOAD_DIR } from './config.js';

// Comprovantes de pagamento: upload privado + link assinado de curta duração
// (equivalente a UploadPrivateFile / CreateFileSignedUrl do Base44).

const TAMANHO_MAX = 20 * 1024 * 1024;
const VALIDADE_LINK = 5 * 60 * 1000;
const PREFIXO = 'arquivo://';

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, _file, cb) => cb(null, crypto.randomUUID()),
  }),
  limits: { fileSize: TAMANHO_MAX, files: 1 },
});

const assinar = (id, expira) => crypto.createHmac('sha256', SECRET).update(`${id}.${expira}`).digest('base64url');

export const rotasArquivos = Router();

rotasArquivos.post('/', autenticar, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });
  const id = req.file.filename;
  db.prepare(
    `INSERT INTO arquivo (id, nome_original, mime, tamanho, caminho, created_by, created_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    Buffer.from(req.file.originalname, 'latin1').toString('utf8'),
    req.file.mimetype,
    req.file.size,
    req.file.path,
    req.user.email,
    agora(),
  );
  res.status(201).json({ file_uri: `${PREFIXO}${id}` });
});

rotasArquivos.post('/link', autenticar, (req, res) => {
  const uri = String(req.body?.file_uri || '');
  if (!uri.startsWith(PREFIXO)) {
    return res
      .status(400)
      .json({ message: 'Este comprovante ficou no sistema anterior (Base44). Anexe o arquivo novamente.' });
  }
  const id = uri.slice(PREFIXO.length);
  if (!db.prepare('SELECT id FROM arquivo WHERE id = ?').get(id)) {
    return res.status(404).json({ message: 'Arquivo não encontrado' });
  }
  const expira = Date.now() + VALIDADE_LINK;
  res.json({ signed_url: `/api/files/${id}?exp=${expira}&sig=${assinar(id, expira)}` });
});

rotasArquivos.get('/:id', (req, res) => {
  const { id } = req.params;
  const expira = Number(req.query.exp);
  const sig = String(req.query.sig || '');
  const esperado = assinar(id, expira);
  const valido =
    expira > Date.now() &&
    sig.length === esperado.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(esperado));
  if (!valido) return res.status(403).send('Link expirado ou inválido');

  const arquivo = db.prepare('SELECT * FROM arquivo WHERE id = ?').get(id);
  const caminho = arquivo && path.resolve(arquivo.caminho);
  if (!caminho || !caminho.startsWith(path.resolve(UPLOAD_DIR)) || !fs.existsSync(caminho)) {
    return res.status(404).send('Arquivo não encontrado');
  }
  // PDF e imagens abrem no navegador; o resto é baixado.
  const exibivel = /^(application\/pdf|image\/(png|jpe?g|gif|webp))$/.test(arquivo.mime || '');
  res.setHeader('Content-Type', exibivel ? arquivo.mime : 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `${exibivel ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(arquivo.nome_original || id)}`,
  );
  res.sendFile(caminho);
});

import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, agora } from './db.js';
import { APP_URL, SECRET } from './config.js';
import { enviarEmail } from './email.js';

const UMA_HORA = 60 * 60 * 1000;
const VALIDADE_CONVITE = 7 * 24 * UMA_HORA;
const VALIDADE_RESET = 2 * UMA_HORA;

const publico = (u) =>
  u && { id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_date: u.created_date };

const hash = (texto) => crypto.createHash('sha256').update(texto).digest('hex');

export const buscarUsuarioPorEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase());

export function criarUsuario({ email, full_name = null, role = 'user', senha = null }) {
  const data = agora();
  const usuario = {
    id: crypto.randomUUID(),
    email: String(email).trim().toLowerCase(),
    full_name,
    password_hash: senha ? bcrypt.hashSync(senha, 10) : null,
    role,
    created_date: data,
    updated_date: data,
  };
  db.prepare(
    `INSERT INTO users (id, email, full_name, password_hash, role, created_date, updated_date)
     VALUES (@id, @email, @full_name, @password_hash, @role, @created_date, @updated_date)`,
  ).run(usuario);
  return usuario;
}

export function definirPapel(email, role) {
  db.prepare('UPDATE users SET role = ?, updated_date = ? WHERE email = ?').run(role, agora(), email);
}

// Gera um token de uso único e devolve o link para definir/redefinir a senha.
function gerarLinkSenha(usuario, validade) {
  const token = crypto.randomBytes(32).toString('base64url');
  db.prepare('UPDATE users SET reset_token_hash = ?, reset_expires = ?, updated_date = ? WHERE id = ?').run(
    hash(token),
    Date.now() + validade,
    agora(),
    usuario.id,
  );
  return `${APP_URL}/reset-password?token=${token}`;
}

// Devolve { enviado, motivo, link }: se o e-mail falhar, o link volta para o Master repassar.
export async function enviarConvite(usuario) {
  const link = gerarLinkSenha(usuario, VALIDADE_CONVITE);
  const envio = await enviarEmail({
    para: usuario.email,
    assunto: 'Convite — Gestão DIFAL ICMS',
    texto: `Você foi cadastrado no sistema Gestão DIFAL ICMS.\n\nDefina sua senha pelo link abaixo (válido por 7 dias):\n${link}\n`,
  });
  return { ...envio, link };
}

async function enviarRedefinicao(usuario) {
  const link = gerarLinkSenha(usuario, VALIDADE_RESET);
  const envio = await enviarEmail({
    para: usuario.email,
    assunto: 'Redefinição de senha — Gestão DIFAL ICMS',
    texto: `Recebemos um pedido para redefinir sua senha.\n\nCrie uma nova senha pelo link abaixo (válido por 2 horas):\n${link}\n\nSe você não pediu, ignore este e-mail.\n`,
  });
  return { ...envio, link };
}

// ---------------------------------------------------------------- middleware

export function autenticar(req, res, next) {
  const cabecalho = req.get('authorization') || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Autenticação necessária' });
  try {
    const { sub } = jwt.verify(token, SECRET);
    const usuario = db.prepare('SELECT * FROM users WHERE id = ?').get(sub);
    if (!usuario) return res.status(401).json({ message: 'Autenticação necessária' });
    req.user = usuario;
    next();
  } catch {
    res.status(401).json({ message: 'Sessão expirada. Entre novamente.' });
  }
}

export function somenteAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Acesso restrito a usuários Master' });
  next();
}

// -------------------------------------------------------------------- rotas

export const rotasAuth = Router();

// Limite simples de tentativas de login por IP + e-mail.
const tentativas = new Map();
const bloqueado = (chave) => {
  const t = tentativas.get(chave);
  if (!t) return false;
  if (Date.now() - t.inicio > 15 * 60 * 1000) {
    tentativas.delete(chave);
    return false;
  }
  return t.falhas >= 10;
};
const registrarFalha = (chave) => {
  const t = tentativas.get(chave) || { falhas: 0, inicio: Date.now() };
  t.falhas += 1;
  tentativas.set(chave, t);
};

rotasAuth.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const chave = `${req.ip}|${String(email || '').toLowerCase()}`;
  if (bloqueado(chave)) {
    return res.status(429).json({ message: 'Muitas tentativas. Aguarde alguns minutos.' });
  }
  const usuario = buscarUsuarioPorEmail(email);
  if (!usuario?.password_hash || !bcrypt.compareSync(String(password || ''), usuario.password_hash)) {
    registrarFalha(chave);
    return res.status(401).json({ message: 'E-mail ou senha inválidos' });
  }
  tentativas.delete(chave);
  const access_token = jwt.sign({ sub: usuario.id }, SECRET, { expiresIn: '7d' });
  res.json({ access_token, user: publico(usuario) });
});

rotasAuth.get('/me', autenticar, (req, res) => {
  res.json(publico(req.user));
});

rotasAuth.post('/reset-request', async (req, res) => {
  const usuario = buscarUsuarioPorEmail(req.body?.email);
  // Resposta sempre igual, para não revelar quais e-mails existem.
  if (usuario) {
    try {
      await enviarRedefinicao(usuario);
    } catch (e) {
      console.error('Falha ao enviar e-mail de redefinição:', e.message);
    }
  }
  res.json({ ok: true });
});

rotasAuth.post('/reset', (req, res) => {
  const { resetToken, newPassword } = req.body || {};
  if (!resetToken || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'Link inválido' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'A senha precisa ter pelo menos 8 caracteres' });
  }
  const usuario = db.prepare('SELECT * FROM users WHERE reset_token_hash = ?').get(hash(String(resetToken)));
  if (!usuario || !usuario.reset_expires || usuario.reset_expires < Date.now()) {
    return res.status(400).json({ message: 'Este link expirou ou já foi usado. Solicite um novo.' });
  }
  db.prepare(
    'UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL, updated_date = ? WHERE id = ?',
  ).run(bcrypt.hashSync(newPassword, 10), agora(), usuario.id);
  res.json({ ok: true });
});

// Convite de novo usuário (equivalente ao base44.users.inviteUser).
export const rotasUsuarios = Router();

rotasUsuarios.post('/invite', autenticar, somenteAdmin, async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = req.body?.role === 'admin' ? 'admin' : 'user';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'E-mail inválido' });

    let usuario = buscarUsuarioPorEmail(email);
    if (usuario) definirPapel(email, role);
    else usuario = criarUsuario({ email, role });

    const envio = await enviarConvite(usuario);
    // Sem e-mail, o Master recebe o link para repassar (só ele vê esta resposta).
    res.json(envio.enviado ? { ok: true, emailEnviado: true } : { ok: true, emailEnviado: false, motivo: envio.motivo, link: envio.link });
  } catch (e) {
    next(e);
  }
});

// Link de nova senha gerado pelo Master na tela de Usuários.
rotasUsuarios.post('/reset-link', autenticar, somenteAdmin, async (req, res, next) => {
  try {
    const usuario = buscarUsuarioPorEmail(req.body?.email);
    if (!usuario) return res.status(404).json({ message: 'Este e-mail ainda não tem acesso ao sistema.' });
    const envio = await enviarRedefinicao(usuario);
    res.json(envio.enviado ? { ok: true, emailEnviado: true } : { ok: true, emailEnviado: false, motivo: envio.motivo, link: envio.link });
  } catch (e) {
    next(e);
  }
});

// Cria (ou promove) um usuário administrador e define a senha.
// Uso: npm run criar-admin -- email@empresa.com.br "Senha forte" "Nome"
import bcrypt from 'bcryptjs';
import { db, agora } from '../db.js';
import { buscarUsuarioPorEmail, criarUsuario } from '../auth.js';

const [email, senha, nome] = process.argv.slice(2);

if (!email || !senha) {
  console.error('Uso: npm run criar-admin -- email@empresa.com.br "Senha forte" "Nome"');
  process.exit(1);
}
if (senha.length < 8) {
  console.error('A senha precisa ter pelo menos 8 caracteres.');
  process.exit(1);
}

const existente = buscarUsuarioPorEmail(email);
if (existente) {
  db.prepare("UPDATE users SET role = 'admin', password_hash = ?, full_name = COALESCE(?, full_name), updated_date = ? WHERE id = ?").run(
    bcrypt.hashSync(senha, 10),
    nome || null,
    agora(),
    existente.id,
  );
  console.log(`Usuário ${email} promovido a administrador e senha atualizada.`);
} else {
  criarUsuario({ email, senha, role: 'admin', full_name: nome || null });
  console.log(`Administrador ${email} criado.`);
}
console.log('No primeiro login o cadastro Master é criado automaticamente.');

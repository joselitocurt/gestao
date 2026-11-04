// Importa registros exportados da aplicação Base44 (ou de outro backup em JSON).
// Uso: npm run importar-dados -- caminho/arquivo.json
//
// Formato esperado:
// {
//   "Emitente": [ { "cnpj": "...", "uf": "SP", ... } ],
//   "NotaFiscal": [ { "numero": "...", "emitente_cnpj": "...", ... } ],
//   "UsuarioSistema": [ { "nome": "...", "email": "...", "perfil": "master", ... } ]
// }
// Registros com o mesmo "id" já existente são ignorados, então o script pode ser rodado de novo.
// Cada e-mail de UsuarioSistema ganha um login sem senha: a pessoa usa "Esqueci a senha" no primeiro acesso.

import fs from 'node:fs';
import { abrirBanco, db, agora } from '../db.js';
import { ENTIDADES, prepararDados } from '../entidades.js';
import { buscarUsuarioPorEmail, criarUsuario } from '../auth.js';

await abrirBanco();

const arquivo = process.argv[2];
if (!arquivo) {
  console.error('Uso: npm run importar-dados -- caminho/arquivo.json');
  process.exit(1);
}

const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
const ORDEM = ['Emitente', 'NotaFiscal', 'UsuarioSistema'];

const importar = db.transaction(() => {
  const resumo = {};
  for (const nome of ORDEM) {
    const lista = dados[nome];
    if (!Array.isArray(lista)) continue;
    const def = ENTIDADES[nome];
    let inseridos = 0;
    let ignorados = 0;

    for (const item of lista) {
      if (item.id && db.prepare(`SELECT 1 FROM ${def.tabela} WHERE id = ?`).get(item.id)) {
        ignorados += 1;
        continue;
      }
      const registro = {
        ...prepararDados(def, item),
        id: item.id || crypto.randomUUID(),
        created_by: item.created_by || null,
        created_date: item.created_date || agora(),
        updated_date: item.updated_date || item.created_date || agora(),
      };
      const colunas = Object.keys(registro);
      db.prepare(
        `INSERT INTO ${def.tabela} (${colunas.map((c) => `"${c}"`).join(', ')}) VALUES (${colunas.map((c) => `@${c}`).join(', ')})`,
      ).run(registro);
      inseridos += 1;

      if (nome === 'UsuarioSistema' && !buscarUsuarioPorEmail(registro.email)) {
        criarUsuario({
          email: registro.email,
          full_name: registro.nome,
          role: registro.perfil === 'master' ? 'admin' : 'user',
        });
      }
    }
    resumo[nome] = { inseridos, ignorados };
  }
  return resumo;
});

const resumo = importar();
for (const [nome, { inseridos, ignorados }] of Object.entries(resumo)) {
  console.log(`${nome}: ${inseridos} importado(s), ${ignorados} já existente(s)`);
}

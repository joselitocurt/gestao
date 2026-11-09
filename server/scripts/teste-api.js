// Teste rápido da API, usado na integração contínua (GitHub Actions).
// Sobe o servidor com um banco temporário e confere login, cadastro, filtros e permissões.
// Uso: node server/scripts/teste-api.js
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pastaDados = fs.mkdtempSync(path.join(os.tmpdir(), 'difal-teste-'));
const PORTA = 3877;
const BASE = `http://localhost:${PORTA}/api`;
const ADMIN = { email: 'admin@teste.local', password: 'senha-de-teste-123' };

// Inicia pelo server.js com require(), como a Hostinger (LiteSpeed) faz.
const servidor = spawn(process.execPath, ['-e', "require('./server.js')"], {
  cwd: raiz,
  env: {
    ...process.env,
    PORT: String(PORTA),
    DATA_DIR: pastaDados,
    ADMIN_EMAIL: ADMIN.email,
    ADMIN_PASSWORD: ADMIN.password,
    APP_URL: `http://localhost:${PORTA}`,
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});

let falhas = 0;
const conferir = (condicao, descricao) => {
  console.log(`${condicao ? 'ok  ' : 'FALHA'} ${descricao}`);
  if (!condicao) falhas += 1;
};

const pedir = async (caminho, { metodo = 'GET', corpo, token } = {}) => {
  const resposta = await fetch(BASE + caminho, {
    method: metodo,
    headers: {
      ...(corpo ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  return { status: resposta.status, dados: await resposta.json().catch(() => null) };
};

const esperarServidor = async () => {
  for (let i = 0; i < 50; i += 1) {
    try {
      await fetch(`${BASE}/auth/me`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('O servidor não respondeu.');
};

try {
  await esperarServidor();

  conferir((await pedir('/entities/NotaFiscal')).status === 401, 'sem login, a API recusa o acesso');

  const login = await pedir('/auth/login', { metodo: 'POST', corpo: ADMIN });
  conferir(login.status === 200 && login.dados?.access_token, 'login do administrador');
  const token = login.dados.access_token;

  const emitente = await pedir('/entities/Emitente', {
    metodo: 'POST',
    token,
    corpo: { cnpj: '11222333000181', uf: 'SP', tipo: 'matriz', apelido: 'Matriz' },
  });
  conferir(emitente.status === 201, 'cadastro de CNPJ');

  const notas = await pedir('/entities/NotaFiscal/bulk', {
    metodo: 'POST',
    token,
    corpo: [
      { numero: '1', emitente_cnpj: '11222333000181', destinatario_uf: 'PI', ano: 2026, mes: 1, valor_difal: 10, valor_fcop: 2, status: 'pago' },
      { numero: '2', emitente_cnpj: '11222333000181', destinatario_uf: 'CE', ano: 2026, mes: 2, valor_difal: 5 },
    ],
  });
  conferir(notas.status === 201 && notas.dados.length === 2, 'cadastro de notas em lote');

  const q = encodeURIComponent(JSON.stringify({ destinatario_uf: 'PI' }));
  const filtradas = await pedir(`/entities/NotaFiscal?q=${q}`, { token });
  conferir(filtradas.dados?.items?.length === 1, 'filtro por UF de destino');

  const agregado = await pedir('/entities/NotaFiscal/aggregate', {
    metodo: 'POST',
    token,
    corpo: { query: {}, groupBy: 'status', sum: ['valor_difal', 'valor_fcop'] },
  });
  const pago = agregado.dados?.rows?.find((r) => r.status === 'pago');
  conferir(pago?.sum_valor_difal === 10 && pago?.sum_valor_fcop === 2, 'soma por status');

  // Status automático: DIFAL/FCOP → emitido; data de pagamento → pago; sem valores → a_emitir.
  const semValor = await pedir('/entities/NotaFiscal', { metodo: 'POST', token, corpo: { numero: '3', emitente_cnpj: '11222333000181' } });
  conferir(semValor.dados?.status === 'a_emitir', 'nota sem valores entra como a_emitir');
  const comValor = await pedir(`/entities/NotaFiscal/${semValor.dados.id}`, { metodo: 'PUT', token, corpo: { valor_fcop: 3 } });
  conferir(comValor.dados?.status === 'emitido', 'lançar DIFAL/FCOP muda o status para emitido');
  const paga = await pedir(`/entities/NotaFiscal/${semValor.dados.id}`, { metodo: 'PUT', token, corpo: { data_pagamento: '2026-03-10' } });
  conferir(paga.dados?.status === 'pago', 'informar a data de pagamento muda o status para pago');
  const manual = await pedir(`/entities/NotaFiscal/${semValor.dados.id}`, { metodo: 'PUT', token, corpo: { status: 'emitido', data_pagamento: null } });
  conferir(manual.dados?.status === 'emitido', 'status informado manualmente é respeitado');
  // Atualização em lote: status automático em cada nota, tudo ou nada.
  const ids = notas.dados.map((n) => n.id);
  const lote = await pedir('/entities/NotaFiscal', {
    metodo: 'PUT',
    token,
    corpo: [
      { id: ids[0], data_pagamento: '2026-04-01' },
      { id: ids[1], valor_difal: 8, valor_fcop: 1 },
    ],
  });
  conferir(
    lote.status === 200 && lote.dados?.[0]?.status === 'pago' && lote.dados?.[1]?.status === 'emitido',
    'atualização em lote aplica o status automático',
  );
  const loteInvalido = await pedir('/entities/NotaFiscal', {
    metodo: 'PUT',
    token,
    corpo: [{ id: ids[1], valor_difal: 99 }, { id: 'nao-existe', valor_difal: 1 }],
  });
  const conferencia = await pedir(`/entities/NotaFiscal/${ids[1]}`, { token });
  conferir(loteInvalido.status === 404 && conferencia.dados?.valor_difal === 8, 'lote com erro não grava nenhuma nota');

  await pedir(`/entities/NotaFiscal/${semValor.dados.id}`, { metodo: 'DELETE', token });

  const invalida = await pedir('/entities/NotaFiscal', { metodo: 'POST', token, corpo: { serie: '1' } });
  conferir(invalida.status === 400, 'campos obrigatórios validados');

  const convite = await pedir('/users/invite', {
    metodo: 'POST',
    token,
    corpo: { email: 'consulta@teste.local', role: 'user' },
  });
  const cadastro = await pedir('/entities/UsuarioSistema', {
    metodo: 'POST',
    token,
    corpo: { nome: 'Consulta', email: 'consulta@teste.local', perfil: 'usuario', permissoes: ['consulta', 'consolidado'] },
  });
  conferir(convite.status === 200 && cadastro.status === 201, 'convite e cadastro de Usuário com páginas escolhidas');
  conferir(
    convite.dados?.emailEnviado === false && /\/definir-senha\?token=|token=/.test(convite.dados?.link || ''),
    'sem e-mail configurado, o convite devolve o link para repassar',
  );
  const novaSenha = await pedir('/users/reset-link', { metodo: 'POST', token, corpo: { email: 'consulta@teste.local' } });
  conferir(novaSenha.status === 200 && Boolean(novaSenha.dados?.link), 'Master gera link de nova senha');
  const semLogin = await pedir('/users/reset-link', { metodo: 'POST', token, corpo: { email: 'ninguem@teste.local' } });
  conferir(semLogin.status === 404, 'link de nova senha só para quem já tem acesso');

  const perfilAntigo = await pedir('/entities/UsuarioSistema', {
    metodo: 'POST',
    token,
    corpo: { nome: 'Antigo', email: 'antigo@teste.local', perfil: 'consulta' },
  });
  conferir(perfilAntigo.status === 400, 'só existem os perfis Master e Usuário');

  // O Usuário só grava nas páginas marcadas: com Consulta e Consolidado, não altera notas.
  const tokenLink = new URL(novaSenha.dados.link).searchParams.get('token');
  await pedir('/auth/reset', { metodo: 'POST', corpo: { resetToken: tokenLink, newPassword: 'senhaUsuario1' } });
  const loginUsuario = await pedir('/auth/login', { metodo: 'POST', corpo: { email: 'consulta@teste.local', password: 'senhaUsuario1' } });
  const tokenUsuario = loginUsuario.dados?.access_token;
  const leitura = await pedir('/entities/NotaFiscal', { token: tokenUsuario });
  const gravacao = await pedir('/entities/NotaFiscal', { metodo: 'POST', token: tokenUsuario, corpo: { numero: '9', emitente_cnpj: '1' } });
  conferir(Boolean(tokenUsuario) && leitura.status === 200 && gravacao.status === 403, 'Usuário lê, mas só grava nas páginas permitidas');
  await pedir(`/entities/UsuarioSistema/${cadastro.dados.id}`, {
    metodo: 'PUT',
    token,
    corpo: { permissoes: ['consulta', 'consolidado', 'cadastrar_nota'] },
  });
  const gravacaoLiberada = await pedir('/entities/NotaFiscal', { metodo: 'POST', token: tokenUsuario, corpo: { numero: '9', emitente_cnpj: '1' } });
  conferir(gravacaoLiberada.status === 201, 'ao marcar Cadastrar nota, o Usuário passa a gravar notas');
  const usuariosNegado = await pedir('/entities/UsuarioSistema', { metodo: 'POST', token: tokenUsuario, corpo: { nome: 'x', email: 'y@x.com', perfil: 'master' } });
  conferir(usuariosNegado.status === 403, 'administração de usuários é exclusiva do Master');

  // ------------------------------------------------ cálculo automático do DIFAL (por fora)
  const aliqs = await pedir('/entities/Aliquota?limit=100', { token });
  conferir(aliqs.dados?.items?.length === 27, 'alíquotas padrão das 27 UFs cadastradas');
  const ba = aliqs.dados.items.find((a) => a.uf === 'BA');
  const calc = await pedir('/entities/NotaFiscal', {
    metodo: 'POST',
    token,
    corpo: { numero: '500', emitente_cnpj: '11222333000181', emitente_uf: 'SP', destinatario_uf: 'BA', valor_total: 1000, difal_calculado: 999 },
  });
  // SP → BA: interestadual 7%, interna 20,5% → DIFAL 135,00; FCP 2% → 20,00
  conferir(
    calc.dados?.difal_calculado === 135 && calc.dados?.fcop_calculado === 20 && calc.dados?.aliq_interestadual === 7 && calc.dados?.status === 'a_emitir',
    'nota calculada pelo servidor (SP → BA: DIFAL 135,00 e FCP 20,00), sem mudar o status',
  );
  const importada = await pedir(`/entities/NotaFiscal/${calc.dados.id}`, { metodo: 'PUT', token, corpo: { importada: true, sem_fcp: true } });
  conferir(importada.dados?.difal_calculado === 165 && importada.dados?.fcop_calculado === 0, 'importada (4%) e sem FCP recalculam a nota');
  const emitida = await pedir('/entities/NotaFiscal', {
    metodo: 'POST',
    token,
    corpo: { numero: '501', emitente_cnpj: '11222333000181', emitente_uf: 'SP', destinatario_uf: 'BA', valor_total: 1000, valor_difal: 135, valor_fcop: 20 },
  });
  await pedir(`/entities/Aliquota/${ba.id}`, { metodo: 'PUT', token, corpo: { interna: 21, fcp: 1 } });
  const aposA = await pedir(`/entities/NotaFiscal/${calc.dados.id}`, { token });
  const aposE = await pedir(`/entities/NotaFiscal/${emitida.dados.id}`, { token });
  conferir(
    aposA.dados?.difal_calculado === 170 && aposE.dados?.difal_calculado === 135,
    'alterar a alíquota recalcula só as notas a emitir',
  );
  const mesmaUf = await pedir('/entities/NotaFiscal', {
    metodo: 'POST',
    token,
    corpo: { numero: '502', emitente_cnpj: '11222333000181', emitente_uf: 'BA', destinatario_uf: 'BA', valor_total: 1000 },
  });
  conferir(mesmaUf.dados?.difal_calculado === 0, 'operação na mesma UF não gera DIFAL');

  const semAdmin = await pedir('/entities/UsuarioSistema', { metodo: 'POST', corpo: { nome: 'x', email: 'x@x.com', perfil: 'master' } });
  conferir(semAdmin.status === 401, 'gestão de usuários exige login');
} catch (erro) {
  console.error(erro);
  falhas += 1;
} finally {
  servidor.kill();
  fs.rmSync(pastaDados, { recursive: true, force: true });
}

if (falhas) {
  console.error(`\n${falhas} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('\nTodas as verificações passaram.');

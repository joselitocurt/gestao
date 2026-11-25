import nodemailer from 'nodemailer';

// Envio de e-mails (convite e redefinição de senha).
// Nunca lança erro: devolve { enviado, motivo }. Uma falha de e-mail não pode impedir
// o cadastro do usuário; nesse caso o link é mostrado ao Master para ele repassar.

// Painéis de hospedagem às vezes gravam o valor com aspas ou espaços em volta.
const variavel = (nome) =>
  String(process.env[nome] ?? '')
    .trim()
    .replace(/^(['"])(.*)\1$/, '$2')
    .trim();

const HOST = variavel('SMTP_HOST');
const PORTA = Number(variavel('SMTP_PORT')) || 587;
const SEGURO = variavel('SMTP_SECURE').toLowerCase() === 'true' || (!variavel('SMTP_SECURE') && PORTA === 465);
const USUARIO = variavel('SMTP_USER');
const SENHA = variavel('SMTP_PASS');

/**
 * Remetente sempre com o e-mail da caixa autenticada (SMTP_USER): a Hostinger e a maioria
 * dos provedores recusam mensagem "de" outro endereço (erro 553, sender rejected).
 * SMTP_FROM vale só pelo nome exibido: "Gestão DIFAL", "Gestão DIFAL <x@y>" ou um e-mail.
 */
export function remetente() {
  const bruto = variavel('SMTP_FROM');
  const comEmail = /^(.*?)\s*<\s*([^>]+)\s*>\s*$/.exec(bruto);
  let nome = '';
  if (comEmail) nome = comEmail[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  else if (bruto && !bruto.includes('@')) nome = bruto;
  const endereco = USUARIO;
  return { nome: nome || 'Controlar.io', endereco };
}

const transporte = HOST
  ? nodemailer.createTransport({
      host: HOST,
      port: PORTA,
      secure: SEGURO,
      auth: USUARIO ? { user: USUARIO, pass: SENHA } : undefined,
      // Sem resposta do servidor de e-mail, desiste antes do limite de tempo da hospedagem.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  : null;

// Traduz os erros do SMTP para uma frase útil nos logs e na tela, com a resposta do servidor.
const explicar = (erro, para) => {
  const codigo = erro?.code || '';
  const comando = String(erro?.command || '').toUpperCase();
  const resposta = String(erro?.response || erro?.message || '')
    .replace(/\s+/g, ' ')
    .slice(0, 160);
  const detalhe = resposta ? ` — resposta do servidor: "${resposta}"` : '';
  if (codigo === 'EAUTH' || comando === 'AUTH PLAIN' || comando === 'AUTH LOGIN' || erro?.responseCode === 535)
    return `usuário ou senha do e-mail recusados (confira SMTP_USER com o e-mail completo e SMTP_PASS)${detalhe}`;
  if (codigo === 'ENOTFOUND' || codigo === 'EDNS') return `servidor de e-mail não encontrado (SMTP_HOST=${HOST})`;
  if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNREFUSED'].includes(codigo))
    return `sem conexão com ${HOST}:${PORTA} (confira SMTP_PORT e SMTP_SECURE: 465 com true, ou 587 com false)${detalhe}`;
  if (comando === 'RCPT TO') return `o servidor recusou o destinatário ${para} (confira se o e-mail do usuário está correto)${detalhe}`;
  if (comando === 'MAIL FROM') return `o servidor recusou o remetente ${USUARIO} (SMTP_USER deve ser uma caixa de e-mail existente)${detalhe}`;
  if (comando === 'DATA') return `o servidor recusou a mensagem${detalhe}`;
  return resposta || 'erro desconhecido';
};

export async function enviarEmail({ para, assunto, texto }) {
  if (!transporte) {
    console.log(`\n[e-mail não enviado: SMTP não configurado]\nPara: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    return { enviado: false, motivo: 'envio de e-mail não configurado (SMTP_HOST vazio)' };
  }
  const de = remetente();
  try {
    await transporte.sendMail({
      from: { name: de.nome, address: de.endereco },
      envelope: { from: de.endereco, to: para },
      to: para,
      subject: assunto,
      text: texto,
    });
    return { enviado: true };
  } catch (erro) {
    const motivo = explicar(erro, para);
    console.error(`[e-mail não enviado para ${para}] ${motivo}`, erro?.code || '', erro?.command || '');
    return { enviado: false, motivo };
  }
}

/** Resumo da configuração (sem a senha), para o teste de envio na tela de Usuários. */
export const resumoSmtp = () => ({
  configurado: Boolean(transporte),
  host: HOST,
  porta: PORTA,
  seguro: SEGURO,
  usuario: USUARIO,
  remetente: `${remetente().nome} <${remetente().endereco}>`,
});

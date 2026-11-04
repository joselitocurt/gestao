import nodemailer from 'nodemailer';

// Envio de e-mails (convite e redefinição de senha).
// Nunca lança erro: devolve { enviado, motivo }. Uma falha de e-mail não pode impedir
// o cadastro do usuário; nesse caso o link é mostrado ao Master para ele repassar.

const configurado = Boolean(process.env.SMTP_HOST);

const transporte = configurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      // Sem resposta do servidor de e-mail, desiste antes do limite de tempo da hospedagem.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  : null;

// Traduz os erros mais comuns do SMTP para uma frase útil nos logs e na tela.
const explicar = (erro) => {
  const codigo = erro?.code || '';
  const resposta = String(erro?.response || erro?.message || '');
  if (codigo === 'EAUTH' || /535|auth/i.test(resposta)) return 'usuário ou senha do e-mail (SMTP_USER / SMTP_PASS) recusados';
  if (codigo === 'ENOTFOUND' || codigo === 'EDNS') return `servidor de e-mail não encontrado (SMTP_HOST=${process.env.SMTP_HOST})`;
  if (codigo === 'ETIMEDOUT' || codigo === 'ECONNECTION' || codigo === 'ESOCKET' || codigo === 'ECONNREFUSED')
    return `sem conexão com ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} (confira SMTP_PORT e SMTP_SECURE)`;
  if (/sender|from|553|550/i.test(resposta)) return 'remetente recusado (SMTP_FROM deve usar o mesmo e-mail de SMTP_USER)';
  return resposta.slice(0, 200) || 'erro desconhecido';
};

export async function enviarEmail({ para, assunto, texto }) {
  if (!transporte) {
    console.log(`\n[e-mail não enviado: SMTP não configurado]\nPara: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    return { enviado: false, motivo: 'envio de e-mail não configurado (SMTP_HOST vazio)' };
  }
  try {
    await transporte.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: para,
      subject: assunto,
      text: texto,
    });
    return { enviado: true };
  } catch (erro) {
    const motivo = explicar(erro);
    console.error(`[e-mail não enviado para ${para}] ${motivo}`, erro?.code || '', erro?.response || erro?.message || '');
    return { enviado: false, motivo };
  }
}

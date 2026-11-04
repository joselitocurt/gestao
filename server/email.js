import nodemailer from 'nodemailer';

// Envio de e-mails (convite e redefinição de senha).
// Sem SMTP configurado, o link é escrito no log do servidor para o administrador repassar.

const configurado = Boolean(process.env.SMTP_HOST);

const transporte = configurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

export async function enviarEmail({ para, assunto, texto }) {
  if (!transporte) {
    console.log(`\n[e-mail não enviado: SMTP não configurado]\nPara: ${para}\nAssunto: ${assunto}\n${texto}\n`);
    return;
  }
  await transporte.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: para,
    subject: assunto,
    text: texto,
  });
}

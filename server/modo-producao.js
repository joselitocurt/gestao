// Sem NODE_ENV definido, assume produção para que o servidor entregue o site compilado (dist).
// Fica num módulo próprio porque precisa rodar antes de server/index.js.
process.env.NODE_ENV ??= 'production';

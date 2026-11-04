// Arquivo de entrada para hospedagens que pedem um "server.js" na raiz (ex.: Hostinger).
// Sem NODE_ENV definido, assume produção para que o servidor entregue o site compilado (dist).
process.env.NODE_ENV ??= 'production';

await import('./server/index.js');

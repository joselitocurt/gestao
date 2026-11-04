// Arquivo de entrada para hospedagens que pedem um "server.js" na raiz (ex.: Hostinger).
// Sem "await" no nível do módulo: a Hostinger (LiteSpeed) carrega este arquivo com require().
import './server/modo-producao.js';
import './server/index.js';

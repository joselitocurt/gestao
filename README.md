# Gestão DIFAL ICMS

Apuração das guias de DIFAL e FCOP de notas emitidas para consumidor final (pessoa física) com destino fora da UF do emissor.

Esta é a versão independente da aplicação que rodava no Base44. Ela tem os mesmos campos, telas, regras e visual, sem depender da plataforma.

## O que tem no sistema

| Tela | O que faz |
|---|---|
| **Apuração** (`/`) | Lista as notas por CNPJ, mês, ano, UF de destino e número. Mostra o resumo das guias (DIFAL, FCOP, pago e em aberto). Pelo detalhe da nota é possível lançar os valores, mudar o status e anexar o comprovante. |
| **Cadastrar nota** (`/notas/nova`) | Cadastro manual com a mesma validação da importação. |
| **Importar XML** (`/importar`) | Lê vários XMLs de NF-e de uma vez. Só aceita destinatário com CPF e UF de destino diferente da UF do emissor. Ignora duplicadas e cadastra CNPJs novos como filial. |
| **CNPJs** (`/cnpjs`) | Cadastro da matriz e das filiais. |
| **Consulta** (`/consulta`) | Busca uma nota pelo CNPJ e pelo número, com acesso ao comprovante. |
| **Consolidado** (`/consolidado`) | Painel com o total geral e filtros por CNPJ, ano, mês e UF de destino. Tem evolução mensal, rankings por UF e por CNPJ, gráfico UF × CNPJ e exportação em PDF e CSV (Excel). |
| **Usuários** (`/usuarios`) | Perfis **Master**, **Usuário** e **Consulta**, permissões por página, ativar ou inativar, convite e envio de link de senha. |

## Interface

- **Menu lateral** com as páginas agrupadas por tarefa (apuração, entrada de notas, cadastros). No celular, vira uma gaveta.
- **Tema claro e escuro**, com botão no rodapé do menu. Na primeira visita, segue o tema do sistema.
- **Situação das guias:** na Apuração, a barra mostra quanto do período está pago, emitido ou a emitir. Clicar num segmento (ou na legenda) filtra a lista por esse status.
- **Troca rápida de status:** o selo de status de cada nota abre um menu para mudar o status ali mesmo. Ao marcar "Pago", a data de pagamento é preenchida com o dia atual.
- **Consolidado:** abre com o total geral (todos os CNPJs, anos, meses e UFs) e pode ser filtrado por CNPJ, ano, mês e UF de destino, pelos campos do topo ou clicando nos próprios gráficos:
  - **acompanhamento por ano**: quantidade e valor das notas emitidas, a emitir e pagas em cada ano, com o total, o percentual pago e o valor em aberto. Pode mostrar o valor das guias (DIFAL + FCOP) ou o valor das notas, e clicar num ano filtra a página;
  - **linha do tempo mensal** (DIFAL e FCOP): clicar num mês filtra por ele;
  - **rankings por UF e por CNPJ**: clicar numa linha filtra por ela;
  - **gráfico UF × CNPJ**: clicar numa barra filtra a UF, e a legenda oculta CNPJs.

  Os filtros se cruzam: cada gráfico considera os demais filtros e mantém o item escolhido em destaque entre os outros. Os filtros ativos aparecem como etiquetas removíveis, e "Ver tudo" volta ao total. As exportações em PDF e Excel saem com os filtros aplicados.
- **Perfil Consulta:** é somente visualização. Os botões de edição não aparecem, e o servidor recusa gravações vindas desse perfil.
- **Cores e fonte:** ficam em `src/index.css` (variáveis CSS) e `tailwind.config.cjs`. A fonte é a Manrope.

## Tecnologia

- **Frontend:** React 18, Vite, Tailwind, componentes Radix/shadcn, Recharts e jsPDF.
- **Backend:** Node.js 20+ com Express e banco SQLite (arquivo único em `data/difal.sqlite`).
- **Login:** e-mail e senha com token JWT. Convite e redefinição de senha funcionam por link enviado por e-mail.
- **Comprovantes:** ficam guardados em `data/uploads` e só abrem por link assinado, válido por 5 minutos.

## Como rodar

```bash
git clone https://github.com/joselitocurt/gestao.git
cd gestao
npm install
cp .env.example .env      # preencha ADMIN_EMAIL e ADMIN_PASSWORD
npm run dev               # API em :3001 e site em http://localhost:5173
```

No primeiro login do administrador, o cadastro **Master** é criado automaticamente, como no app original.

Se precisar criar ou recuperar um administrador depois:

```bash
npm run criar-admin -- voce@empresa.com.br "SenhaForte123" "Seu Nome"
```

## Produção

```bash
npm run build
npm start                 # serve o site e a API na porta PORT (padrão 3001)
```

- Use um proxy com HTTPS na frente (Nginx, Caddy ou o próprio serviço de hospedagem).
- Defina `APP_URL` com o endereço público. Ele é usado nos links dos e-mails.
- Configure o SMTP no `.env` para que convites e "Esqueci a senha" sejam enviados. Sem SMTP, os links aparecem no log do servidor.
- Faça backup da pasta `data/`. Ela guarda o banco e os comprovantes.

### Na Hostinger (hospedagem Business ou Cloud)

Em **Websites → Adicionar site → Node.js web app**, conecte este repositório (branch `main`) e use:

- **Versão do Node:** 22
- **Comando de build:** `npm run build`
- **Arquivo de entrada:** `server.js`

Variáveis de ambiente: `NODE_ENV=production`, `APP_URL`, `DATA_DIR` (pasta fora de `domains/`, por exemplo `/home/u123456789/dados-difal`), `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` e, para os e-mails, `SMTP_HOST=smtp.hostinger.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM`. Não defina `PORT`, porque a Hostinger informa a porta.

### Com Docker

```bash
docker build -t gestao-difal .
docker run -d --name gestao-difal -p 3001:3001 -v gestao-dados:/data \
  -e APP_URL=https://seu-endereco -e ADMIN_EMAIL=voce@empresa.com.br -e ADMIN_PASSWORD="SenhaForte123" \
  gestao-difal
```

O volume `/data` guarda o banco e os comprovantes. Faça backup dele.

## GitHub

- **Integração contínua:** a cada envio para `main` e em cada pull request, o GitHub Actions (`.github/workflows/ci.yml`) instala as dependências, compila o site e roda `node server/scripts/teste-api.js`. Esse teste sobe a API com um banco temporário e confere login, cadastros, filtros, somas e permissões.
- **Fora do repositório:** o `.gitignore` deixa de fora o `.env`, a pasta `data/` (banco e comprovantes), `node_modules` e `dist`. Senhas e dados nunca vão para o GitHub.
- **Versão do Node:** fica fixada em `.nvmrc` (22).

## Migrar os dados do Base44

1. Exporte os registros das entidades `Emitente`, `NotaFiscal` e `UsuarioSistema` para um JSON neste formato:
   ```json
   { "Emitente": [ ... ], "NotaFiscal": [ ... ], "UsuarioSistema": [ ... ] }
   ```
2. Rode o comando de importação:
   ```bash
   npm run importar-dados -- backup-base44.json
   ```

O script pode ser rodado mais de uma vez, porque registros com o mesmo `id` são ignorados.

Cada usuário importado ganha um login sem senha. No primeiro acesso, a pessoa usa **Esqueci a senha**, ou um Master clica no ícone de chave na tela de Usuários.

Os comprovantes continuam guardados no Base44. A nota mantém o nome do arquivo, mas ao tentar abrir o sistema avisa que é preciso anexar o arquivo de novo.

## Diferenças em relação ao app do Base44

- **Login com Google, cadastro aberto e tela de consentimento OAuth/MCP foram removidos.** O acesso já era restrito a usuários cadastrados por um Master, então entra-se só por e-mail e senha.
- **O papel de login acompanha o perfil.** Ao mudar alguém para Master (ou tirar), o papel de administrador é atualizado junto. No Base44 isso só acontecia no convite.
- **As permissões também valem no servidor, e não só nas telas:**
  - um perfil sem acesso às telas de nota não consegue gravar notas pela API;
  - usuários inativos não acessam os dados;
  - só administradores gerenciam usuários.
- **A senha precisa ter pelo menos 8 caracteres.** Há também um limite de tentativas de login.
- **A importação de XML continua como no original.** DIFAL e FCOP entram zerados e são preenchidos no detalhe da nota.

## Estrutura

```
server/            API (Express + SQLite)
  entidades.js     campos, obrigatórios e enums das entidades
  consulta.js      filtros ($or, $in, $gte/$lte, $regex) → SQL
  auth.js          login, convite, redefinição de senha
  rotas-*.js       rotas de entidades e de arquivos
  scripts/         criar-admin, importar-dados
shared/            regras de perfis e permissões (usadas no site e na API)
src/               frontend React
```

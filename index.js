// ===========================================
// 🧠 Servidor Principal - TecNorte Informática
// ===========================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// ===========================================
// 🧠 Inicializar Banco de Dados
// ===========================================
require('./data/db');

// ===========================================
// 🧩 Middleware
// ===========================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================
// 🖥️ Pastas públicas (DEVEM VIR ANTES DAS ROTAS)
// ===========================================
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/frontend-cliente', express.static(path.join(__dirname, 'frontend-cliente')));

// Diretórios raiz permitidos para imagens
app.use('/img', express.static(path.join(__dirname, 'frontend-cliente', 'img')));
app.use('/img', express.static(path.join(__dirname, 'frontend', 'img')));

// ===========================================
// 🚀 Rotas principais (CARREGAR DEPOIS DAS PASTAS PÚBLICAS)
// ===========================================
const produtosRoute = require('./routes/produtos');
const pedidosRoute = require('./routes/pedidos');

// Rotas de API (cliente / app)
app.use('/produtos', produtosRoute);
app.use('/pedidos', pedidosRoute);

// ===========================================
// 📌 Rotas do Painel ADMIN
// ===========================================
app.use('/admin/produtos', produtosRoute);
app.use('/admin/pedidos', pedidosRoute);

// ===========================================
// 🗂️ Garantir pasta data/cupons
// ===========================================
const pastaData = path.join(__dirname, 'data');
const pastaCupons = path.join(pastaData, 'cupons');

if (!fs.existsSync(pastaData)) fs.mkdirSync(pastaData);
if (!fs.existsSync(pastaCupons)) {
  fs.mkdirSync(pastaCupons);
  console.log('📁 Pasta criada: data/cupons');
}

// ===========================================
// 🧾 Disponibilizar PDFs publicamente
// ===========================================
app.use('/data/cupons', express.static(pastaCupons));

// ===========================================
// 🏠 ROTA DA LOJA (CLIENTE)
// ===========================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend-cliente', 'index.html'));
});

// ===========================================
// ⚙️ ROTA DO PAINEL ADMIN
// ===========================================
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ===========================================
// ❗ ROTA DE TESTE (VER API FUNCIONANDO)
// ===========================================
app.get('/status', (req, res) => {
  res.json({ ok: true, mensagem: "Servidor funcionando corretamente!" });
});

// ===========================================
// 🖥️ Inicializar servidor
// ===========================================
app.listen(port, () => {
  console.log(`📦 Banco de dados carregado.`);
  console.log(`🚀 Servidor ativo em http://localhost:${port}`);
  console.log(`⚙️ Painel administrativo: http://localhost:${port}/admin`);
  console.log(`🛒 Loja do cliente: http://localhost:${port}/`);

  const fsPromises = require('fs').promises;

  async function verificarPDFs() {
    try {
      const arquivos = await fsPromises.readdir(pastaCupons);
      const pdfs = arquivos.filter((f) => f.endsWith('.pdf'));

      if (pdfs.length > 0) {
        const ultimo = pdfs[pdfs.length - 1];
        console.log(`📄 Último PDF encontrado: ${ultimo}`);
        console.log(`🌐 Link público: http://localhost:${port}/data/cupons/${ultimo}`);
      } else {
        console.log('⚠️ Nenhum PDF encontrado em data/cupons.');
      }
    } catch (err) {
      console.error('❌ Erro ao verificar PDFs:', err);
    }
  }

  setTimeout(verificarPDFs, 2000);
});

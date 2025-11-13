// ===========================================
// 🧠 Servidor Principal - TecNorte Informática
// ===========================================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // ✅ garante criação das pastas necessárias
const app = express();
const port = 3000;

// ===========================================
// 🧩 Middleware
// ===========================================
app.use(cors());

// ✅ Aumentar o limite de upload para 50MB (corrige erro PayloadTooLargeError e permite várias imagens)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ✅ Servir as pastas públicas corretamente
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));
app.use('/frontend-cliente', express.static(path.join(__dirname, 'frontend-cliente')));

// ✅ Linha extra — garante que arquivos da pasta frontend fiquem acessíveis direto na raiz (ex: /style.css)
app.use(express.static(path.join(__dirname, 'frontend')));

// ===========================================
// 🗂️ Garantir que a pasta 'data/cupons' exista
// ===========================================
const pastaData = path.join(__dirname, 'data');
const pastaCupons = path.join(pastaData, 'cupons');

if (!fs.existsSync(pastaData)) {
  fs.mkdirSync(pastaData);
}
if (!fs.existsSync(pastaCupons)) {
  fs.mkdirSync(pastaCupons);
  console.log('📁 Pasta criada: data/cupons');
}

// ===========================================
// 🧾 Torna o diretório de cupons acessível publicamente
// ===========================================
app.use(
  '/data/cupons',
  express.static(pastaCupons, {
    extensions: ['pdf'],
    setHeaders: (res, filePath) => {
      if (path.extname(filePath) === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      }
    },
  })
);

// ===========================================
// 🚀 Rotas principais
// ===========================================
const produtosRoute = require('./routes/produtos');
const pedidosRoute = require('./routes/pedidos'); // ✅ Rota de pedidos conectada

app.use('/produtos', produtosRoute);
app.use('/pedidos', pedidosRoute);

// ===========================================
// 🏠 Rota para abrir o site do cliente diretamente
// ===========================================
app.get('/', (req, res) => {
  const caminho = path.join(__dirname, 'frontend-cliente', 'index.html');
  res.sendFile(caminho);
});

// ===========================================
// ⚙️ Rota para o painel administrativo
// ===========================================
app.get('/admin', (req, res) => {
  const caminhoPainel = path.join(__dirname, 'frontend', 'index.html');
  if (fs.existsSync(caminhoPainel)) {
    res.sendFile(caminhoPainel);
  } else {
    res
      .status(404)
      .send('❌ Painel administrativo não encontrado. Verifique a pasta /frontend/index.html');
  }
});

// ===========================================
// 🖥️ Inicializar servidor
// ===========================================
app.listen(port, () => {
  console.log('📦 Produtos já existentes no banco.');
  console.log(`🚀 Servidor ativo em http://localhost:${port}`);
  console.log(`⚙️ Painel administrativo: http://localhost:${port}/admin`);
  console.log(`🛒 Loja do cliente: http://localhost:${port}/`);

  // ===========================================
  // 🔍 Teste automático: Verificar se o PDF foi gerado corretamente
  // ===========================================
  const fsPromises = require('fs').promises;

  async function verificarPDFs() {
    try {
      const arquivos = await fsPromises.readdir(pastaCupons);
      const pdfs = arquivos.filter((f) => f.endsWith('.pdf'));

      if (pdfs.length > 0) {
        const ultimo = pdfs[pdfs.length - 1];
        console.log(`📄 Último PDF encontrado: ${ultimo}`);
        console.log(`🧩 Caminho completo: ${path.join(pastaCupons, ultimo)}`);
        console.log(`🌐 Link público: http://localhost:${port}/data/cupons/${ultimo}`);
      } else {
        console.log('⚠️ Nenhum PDF encontrado em data/cupons. Gere um pedido para testar.');
      }
    } catch (err) {
      console.error('❌ Erro ao verificar PDFs:', err);
    }
  }

  // Executa 2 segundos após iniciar o servidor
  setTimeout(verificarPDFs, 2000);
});



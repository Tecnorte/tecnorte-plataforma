// ============================================================
// 🚀 ROTAS DE PEDIDOS — VERSÃO SQLITE3 (COMPATÍVEL COM db.js)
// ------------------------------------------------------------
// • Criação de pedidos
// • Geração de PDF na pasta data/cupons
// • Total compatibilidade com sqlite3 (db.run, db.all, db.get)
// ============================================================

const express = require("express");
const router = express.Router();
const db = require("../data/db");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ------------------------------------------------------------
// Helpers para usar async/await com sqlite3
// ------------------------------------------------------------
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// ============================================================
// 🔄 Criar pasta data/cupons caso não exista
// ============================================================
const pastaCupons = path.join(__dirname, "..", "data", "cupons");
if (!fs.existsSync(pastaCupons)) {
  fs.mkdirSync(pastaCupons, { recursive: true });
  console.log("📁 Pasta criada: data/cupons");
}

// ============================================================
// ➕ POST /pedidos — Criar pedido
// ============================================================
router.post("/", async (req, res) => {
  try {
    const { items, total, cliente } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ erro: "Carrinho vazio" });
    }

    if (!cliente || !cliente.nome || !cliente.telefone) {
      return res.status(400).json({ erro: "Dados do cliente incompletos" });
    }

    // ------------------------------------------------------------
    // Salvar pedido no banco
    // ------------------------------------------------------------
    const run = await dbRun(
      `
      INSERT INTO pedidos (itens, total, cliente, data)
      VALUES (?, ?, ?, datetime('now','localtime'))
    `,
      [
        JSON.stringify(items),
        total,
        JSON.stringify(cliente)
      ]
    );

    const pedidoId = run.lastID;

    // ------------------------------------------------------------
    // Gerar PDF
    // ------------------------------------------------------------
    const pdfPath = path.join(pastaCupons, `pedido_${pedidoId}.pdf`);
    const pdf = new PDFDocument();

    pdf.pipe(fs.createWriteStream(pdfPath));

    pdf.fontSize(20).text("Cupom de Pedido - TecNorte Informática", {
      align: "center"
    });

    pdf.moveDown();
    pdf.fontSize(14).text(`Pedido Nº: ${pedidoId}`);
    pdf.text(`Data: ${new Date().toLocaleString()}`);
    pdf.moveDown();

    pdf.fontSize(14).text("Cliente:");
    pdf.text(`Nome: ${cliente.nome}`);
    pdf.text(`Telefone: ${cliente.telefone}`);
    if (cliente.endereco) pdf.text(`Endereço: ${cliente.endereco}`);

    pdf.moveDown();

    pdf.text("Itens:");
    items.forEach((item) => {
      pdf.text(
        `• ${item.nome} — Quantidade: ${item.quantidade} — R$ ${item.preco.toFixed(
          2
        )}`
      );
    });

    pdf.moveDown();
    pdf.text(`Total: R$ ${total.toFixed(2)}`, { bold: true });

    pdf.end();

    console.log(`📄 PDF gerado: ${pdfPath}`);

    // ------------------------------------------------------------
    // Responder ao cliente
    // ------------------------------------------------------------
    res.json({
      sucesso: true,
      pedidoId,
      pdf: `/data/cupons/pedido_${pedidoId}.pdf`
    });
  } catch (err) {
    console.error("❌ Erro ao criar pedido:", err);
    res.status(500).json({ erro: "Erro ao criar pedido" });
  }
});

// ============================================================
// 📌 GET /pedidos/:id — Obter pedido
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const pedido = await dbGet("SELECT * FROM pedidos WHERE id = ?", [
      req.params.id
    ]);

    if (!pedido) {
      return res.status(404).json({ erro: "Pedido não encontrado" });
    }

    pedido.itens = JSON.parse(pedido.itens || "[]");
    pedido.cliente = JSON.parse(pedido.cliente || "{}");

    res.json(pedido);
  } catch (err) {
    console.error("❌ Erro ao buscar pedido:", err);
    res.status(500).json({ erro: "Erro ao buscar pedido" });
  }
});

// ============================================================
// 📌 GET /pedidos — Listar pedidos (opcional)
// ============================================================
router.get("/", async (req, res) => {
  try {
    const pedidos = await dbAll("SELECT * FROM pedidos ORDER BY id DESC");

    pedidos.forEach((p) => {
      p.itens = JSON.parse(p.itens || "[]");
      p.cliente = JSON.parse(p.cliente || "{}");
    });

    res.json(pedidos);
  } catch (err) {
    console.error("❌ Erro ao listar pedidos:", err);
    res.status(500).json({ erro: "Erro ao listar pedidos" });
  }
});

module.exports = router;


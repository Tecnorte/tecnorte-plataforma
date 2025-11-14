// ============================================================
// TecNorte • BANCO DE DADOS 3.7 — FIXO, SEGURO E SEM DUPLICAÇÃO
// ============================================================

const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// ============================================================
// 📌 Caminho DEFINITIVO para o SQLite (Render FREE utiliza /opt/render/data)
// ============================================================
const isRender = !!process.env.RENDER;
const baseDir = isRender
  ? "/opt/render/data"              // 👉 Banco PERSISTENTE no Render
  : path.join(__dirname, "data");   // 👉 Banco local durante desenvolvimento

// Criar pasta se não existir
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
  console.log("📁 Pasta criada:", baseDir);
}

// Caminho final do banco
const dbPath = path.join(baseDir, "database.sqlite");
console.log("📦 Banco de dados em:", dbPath);

// ============================================================
// 🧠 Proteção contra banco corrompido (Render às vezes cria arquivos quebrados)
// ============================================================
if (fs.existsSync(dbPath)) {
  const size = fs.statSync(dbPath).size;
  if (size < 5000) {
    console.log("⚠️ Banco corrompido detectado → removendo...");
    fs.unlinkSync(dbPath);
  }
}

// ============================================================
// 🔗 Conectar ao banco
// ============================================================
const db = new sqlite3.Database(dbPath);

db.serialize(() => {

  // ============================================================
  // 🧩 Criar tabela de produtos (seguro e idempotente)
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      descricao TEXT,
      categoria TEXT,
      custo REAL DEFAULT 0,
      margem REAL DEFAULT 0,
      imagem TEXT,
      imagens TEXT,
      foto1 TEXT,
      foto2 TEXT,
      foto3 TEXT,
      estoque INTEGER DEFAULT 0
    )
  `);

  // ============================================================
  // 🔐 Garantir colunas faltantes (compatível com versões antigas)
  // ============================================================
  function ensureColumn(name, def) {
    db.all(`PRAGMA table_info(produtos)`, (err, cols) => {
      if (err) return;
      if (!cols.some(c => c.name === name)) {
        db.run(`ALTER TABLE produtos ADD COLUMN ${name} ${def}`);
        console.log(`🧩 Coluna adicionada: ${name}`);
      }
    });
  }

  ensureColumn("categoria", "TEXT");
  ensureColumn("custo", "REAL DEFAULT 0");
  ensureColumn("margem", "REAL DEFAULT 0");
  ensureColumn("imagem", "TEXT");
  ensureColumn("imagens", "TEXT");
  ensureColumn("foto1", "TEXT");
  ensureColumn("foto2", "TEXT");
  ensureColumn("foto3", "TEXT");
  ensureColumn("estoque", "INTEGER DEFAULT 0");

  // ============================================================
  // 🧠 MIGRAÇÃO DE IMAGENS — só quando necessário
  // ============================================================
  db.get(`SELECT COUNT(*) AS total FROM produtos`, (err, row) => {
    if (err) return console.error("Erro ao verificar total:", err);
    const total = row?.total ?? 0;

    if (total === 0) {
      console.log("📭 Nenhum produto → migração ignorada.");
      return;
    }

    console.log(`🔄 Migrando imagens para ${total} produtos...`);

    db.all(`SELECT * FROM produtos`, (err, lista) => {
      if (err) return;

      const update = db.prepare(`
        UPDATE produtos
        SET imagens = ?, foto1 = ?, foto2 = ?, foto3 = ?
        WHERE id = ?
      `);

      for (const p of lista) {
        let imagensJSON = p.imagens;
        let f1 = p.foto1 || null;
        let f2 = p.foto2 || null;
        let f3 = p.foto3 || null;

        // Caso antigo: só existia "imagem"
        if (p.imagem && (!p.imagens || p.imagens === "")) {
          imagensJSON = JSON.stringify([p.imagem]);
          f1 = p.imagem;
        }

        update.run(imagensJSON || null, f1, f2, f3, p.id);
      }

      update.finalize();
      console.log("✅ Migração de imagens concluída!");
    });
  });

  // ============================================================
  // 🧠 PRODUTOS INICIAIS — inserir somente uma vez
  // ============================================================
  db.get("SELECT COUNT(*) AS total FROM produtos", (err, row) => {
    if (err) return;

    if (row.total > 0) {
      console.log("📦 Produtos já existentes → não inserir iniciais.");
      return;
    }

    console.log("🆕 Inserindo produtos iniciais...");

    const defaults = [
      {
        nome: "Camiseta Tec Norte",
        descricao: "Camiseta oficial Tec Norte.",
        custo: 40,
        margem: 50,
        categoria: "diversos",
        imagem: "/frontend-cliente/img/produtos/camiseta.jpg",
        estoque: 20
      },
      {
        nome: "Mouse Gamer Tec Norte",
        descricao: "Mouse RGB de alta precisão.",
        custo: 80,
        margem: 62.5,
        categoria: "informatica",
        imagem: "/frontend-cliente/img/produtos/mouse.jpg",
        estoque: 15
      },
      {
        nome: "Teclado Mecânico Tec Norte",
        descricao: "Switch azul, iluminação LED.",
        custo: 160,
        margem: 56.25,
        categoria: "acessorios",
        imagem: "/frontend-cliente/img/produtos/teclado.jpg",
        estoque: 8
      }
    ];

    const insert = db.prepare(`
      INSERT INTO produtos
      (nome, preco, descricao, categoria, custo, margem, imagem, imagens, foto1, foto2, foto3, estoque)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of defaults) {
      const preco = Number((p.custo * (1 + p.margem / 100)).toFixed(2));
      const imagens = JSON.stringify([p.imagem]);

      insert.run(
        p.nome, preco, p.descricao, p.categoria,
        p.custo, p.margem, p.imagem, imagens,
        p.imagem, null, null, p.estoque
      );
    }

    insert.finalize();
    console.log("✅ Produtos iniciais adicionados!");
  });
});

// ============================================================
// 🔗 Exportar DB
// ============================================================
module.exports = db;







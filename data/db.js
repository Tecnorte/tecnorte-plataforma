const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

/**
 * ============================================================
 * ⭐ TECNORTE DB 3.6 — SOLUÇÃO FINAL PARA RENDER FREE ⭐
 * Banco 100% persistente usando /opt/render/data
 * ============================================================
 */

// 📌 Diretório persistente REAL no Render Free
const persistentDir = process.env.RENDER
  ? "/opt/render/data"
  : path.join(process.cwd(), "data");

// Criar pasta se não existir
if (!fs.existsSync(persistentDir)) {
  console.log("📁 Criando pasta persistente:", persistentDir);
  fs.mkdirSync(persistentDir, { recursive: true });
}

// Caminho final do banco
const dbPath = path.join(persistentDir, "database.sqlite");

// ============================================================
// 🧠 Proteção contra banco corrompido
// ============================================================
if (fs.existsSync(dbPath)) {
  const size = fs.statSync(dbPath).size;

  if (size < 2000) {
    console.log("⚠️ Banco muito pequeno → removendo arquivo corrompido");
    fs.unlinkSync(dbPath);
  }
}

console.log("📦 Banco de dados em:", dbPath);

// ============================================================
// 🔗 Conectar
// ============================================================
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Criar tabela
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

  // Garantir colunas
  function ensureColumn(name, defSql) {
    db.all(`PRAGMA table_info(produtos)`, (err, cols) => {
      if (err) return;

      if (!cols.some((c) => c.name === name)) {
        db.run(`ALTER TABLE produtos ADD COLUMN ${name} ${defSql}`);
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
  // 🔁 Migração inteligente (somente se existir produtos)
  // ============================================================
  db.get("SELECT COUNT(*) AS total FROM produtos", (err, row) => {
    if (row.total === 0) {
      console.log("📭 Nenhum produto no banco → ignorando migração");
      return;
    }

    console.log("🔄 Migrando imagens…");

    db.all("SELECT * FROM produtos", (err, produtos) => {
      if (err) return;

      const update = db.prepare(`
        UPDATE produtos
        SET imagens = ?, foto1 = ?, foto2 = ?, foto3 = ?
        WHERE id = ?
      `);

      produtos.forEach((p) => {
        let imagensJSON = p.imagens || (p.imagem ? JSON.stringify([p.imagem]) : null);
        let foto1 = p.foto1 || (p.imagem || null);
        let foto2 = p.foto2 || null;
        let foto3 = p.foto3 || null;

        update.run(imagensJSON, foto1, foto2, foto3, p.id);
      });

      update.finalize();
      console.log("✅ Migração concluída");
    });
  });

  // ============================================================
  // 🧠 Inserir produtos iniciais somente 1 vez
  // ============================================================
  db.get("SELECT COUNT(*) AS total FROM produtos", (err, row) => {
    if (row.total > 0) {
      console.log("📦 Produtos já existentes → não inserir iniciais");
      return;
    }

    console.log("🆕 Inserindo produtos iniciais...");

    const produtosIniciais = [
      {
        nome: "Camiseta Tec Norte",
        descricao: "Camiseta oficial Tec Norte.",
        custo: 40,
        margem: 50,
        categoria: "diversos",
        imagem: "/frontend-cliente/img/produtos/camiseta.jpg",
        estoque: 20,
      },
      {
        nome: "Mouse Gamer Tec Norte",
        descricao: "Mouse RGB de alta precisão.",
        custo: 80,
        margem: 62.5,
        categoria: "informatica",
        imagem: "/frontend-cliente/img/produtos/mouse.jpg",
        estoque: 15,
      },
      {
        nome: "Teclado Mecânico Tec Norte",
        descricao: "Switch azul, iluminação LED.",
        custo: 160,
        margem: 56.25,
        categoria: "acessorios",
        imagem: "/frontend-cliente/img/produtos/teclado.jpg",
        estoque: 8,
      },
    ];

    const insert = db.prepare(`
      INSERT INTO produtos
      (nome, preco, descricao, categoria, custo, margem, imagem, imagens, foto1, foto2, foto3, estoque)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    produtosIniciais.forEach((p) => {
      const preco = Number((p.custo * (1 + p.margem / 100)).toFixed(2));
      const imagens = JSON.stringify([p.imagem]);

      insert.run(
        p.nome,
        preco,
        p.descricao,
        p.categoria,
        p.custo,
        p.margem,
        p.imagem,
        imagens,
        p.imagem,
        null,
        null,
        p.estoque
      );
    });

    insert.finalize();
    console.log("✅ Produtos iniciais adicionados!");
  });
});

module.exports = db;






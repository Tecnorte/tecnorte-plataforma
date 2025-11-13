// ============================================================
// ✅ BANCO DE DADOS TECNORTE 3.5 — sem duplicações e sem apagar banco
// ============================================================

const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// ============================================================
// 📌 Diretório persistente (Render FREE → usar pasta local /data)
// ============================================================

const persistentDir = process.env.RENDER
  ? path.join(process.cwd(), "data")
  : process.cwd();

if (!fs.existsSync(persistentDir)) {
  console.log("📁 Criando pasta persistente:", persistentDir);
  fs.mkdirSync(persistentDir, { recursive: true });
}

const dbPath = path.join(persistentDir, "database.sqlite");

console.log("📦 Banco de dados em:", dbPath);

// ============================================================
// 🔗 Conexão
// ============================================================

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // ============================================================
  // 🧩 Criar tabela principal
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
  // 🧠 Garantir colunas
  // ============================================================

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
  // 🔁 MIGRAÇÃO DE IMAGENS (somente se houver produtos)
  // ============================================================

  db.get(`SELECT COUNT(*) AS total FROM produtos`, (err, row) => {
    if (err) return;

    const total = row.total;

    if (total === 0) {
      console.log("📭 Nenhum produto no banco → migração ignorada.");
      return;
    }

    console.log(`🔄 Iniciando migração de imagens para ${total} produtos...`);

    db.all(`SELECT * FROM produtos`, (err, produtos) => {
      if (err) return;

      const update = db.prepare(`
        UPDATE produtos
        SET imagens = ?, foto1 = ?, foto2 = ?, foto3 = ?
        WHERE id = ?
      `);

      for (const p of produtos) {
        let imagensJSON = p.imagens;
        let foto1 = p.foto1 || null;
        let foto2 = p.foto2 || null;
        let foto3 = p.foto3 || null;

        // Caso antigo
        if (p.imagem && (!p.imagens || p.imagens === "")) {
          imagensJSON = JSON.stringify([p.imagem]);
          foto1 = p.imagem;
        }

        update.run(imagensJSON || null, foto1, foto2, foto3, p.id);
      }

      update.finalize();
      console.log("✅ Migração concluída!");
    });
  });

  // ============================================================
  // 🧠 INSERIR PRODUTOS INICIAIS — apenas 1 vez
  // ============================================================

  db.get("SELECT COUNT(*) AS total FROM produtos", (err, row) => {
    if (err) return;

    if (row.total > 0) {
      console.log("📦 Produtos já existentes → não inserir iniciais.");
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

    for (const p of produtosIniciais) {
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
    }

    insert.finalize();
    console.log("✅ Produtos iniciais adicionados!");
  });
});

// ============================================================
// 🔗 Exportar DB
// ============================================================

module.exports = db;






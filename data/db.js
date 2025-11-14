// ============================================================
// TecNorte DB 3.8 — FIX DEFINITIVO (Render + Local)
// Caminho único, sem duplicações, migração segura e inicialização estável
// ============================================================

const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// ============================================================
// 📌 1) Diretório persistente ÚNICO — Fix Final Render
// ============================================================
// Render cria DOIS caminhos diferentes automaticamente.
// Forçamos um único caminho permanente:

const dataRoot = process.env.RENDER
  ? "/opt/render/data" // caminho fixo e persistente do Render
  : path.join(process.cwd(), "data"); // caminho local

if (!fs.existsSync(dataRoot)) {
  console.log("📁 Criando pasta persistente:", dataRoot);
  fs.mkdirSync(dataRoot, { recursive: true });
}

const dbPath = path.join(dataRoot, "database.sqlite");
console.log("📦 Banco de dados:", dbPath);

// ============================================================
// 🛡️ 2) Proteção contra banco corrompido (Render cria arquivos vazios)
// ============================================================

if (fs.existsSync(dbPath)) {
  const size = fs.statSync(dbPath).size;
  if (size < 5000) {
    console.log("⚠️ Banco muito pequeno → removendo arquivo corrompido");
    fs.unlinkSync(dbPath);
  }
}

// ============================================================
// 🔗 3) Conexão com o banco
// ============================================================

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Erro ao abrir DB:", err);
  else console.log("📦 Banco de dados carregado.");
});

db.serialize(() => {
  // ============================================================
  // 🧩 4) Criar tabela principal se não existir
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
  // 🧠 Garantir colunas (caso venham de versões antigas)
  // ============================================================

  function ensureColumn(name, def) {
    db.all(`PRAGMA table_info(produtos)`, (err, cols) => {
      if (err) return;
      if (!cols.some((c) => c.name === name)) {
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
  // 🔄 5) Migração das imagens (somente se existirem produtos)
  // ============================================================

  db.get(`SELECT COUNT(*) AS total FROM produtos`, (err, row) => {
    const total = row?.total ?? 0;

    if (total === 0) {
      console.log("📭 Nenhum produto no banco → ignorando migração");
      return;
    }

    console.log("🔄 Migrando imagens se necessário...");

    db.all(`SELECT * FROM produtos`, (err, produtos) => {
      if (err) return console.error("Erro na migração:", err);

      const up = db.prepare(`
        UPDATE produtos
        SET imagens=?, foto1=?, foto2=?, foto3=?
        WHERE id=?
      `);

      produtos.forEach((p) => {
        let imagensJSON = p.imagens;
        let foto1 = p.foto1 || null;
        let foto2 = p.foto2 || null;
        let foto3 = p.foto3 || null;

        // Caso antigo — só havia "imagem"
        if (p.imagem && (!p.imagens || p.imagens === "")) {
          imagensJSON = JSON.stringify([p.imagem]);
          foto1 = p.imagem;
        }

        up.run(imagensJSON || null, foto1, foto2, foto3, p.id);
      });

      up.finalize();
      console.log("✅ Migração de imagens concluída");
    });
  });

  // ============================================================
  // 🧠 6) Inserir produtos iniciais SOMENTE UMA VEZ
  // ============================================================

  db.get("SELECT COUNT(*) AS total FROM produtos", (err, row) => {
    const total = row?.total ?? 0;

    if (total > 0) {
      console.log("📦 Banco já possui produtos → não inserir iniciais");
      return;
    }

    console.log("🆕 Inserindo produtos iniciais...");

    const base = [
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

    base.forEach((p) => {
      const preco = Number((p.custo * (1 + p.margem / 100)).toFixed(2));
      const imgs = JSON.stringify([p.imagem]);

      insert.run(
        p.nome,
        preco,
        p.descricao,
        p.categoria,
        p.custo,
        p.margem,
        p.imagem,
        imgs,
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

// ============================================================
// 🔗 Exportar DB
// ============================================================

module.exports = db;

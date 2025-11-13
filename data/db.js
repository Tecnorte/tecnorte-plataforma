// ✅ BANCO DE DADOS TECNORTE 3.3 — agora com suporte à coluna "categoria"

const path = require('path');
const Database = require('better-sqlite3');

// Caminho do arquivo de banco
const dbPath = path.resolve(__dirname, 'database.sqlite');

// Cria conexão com o banco
const db = new Database(dbPath);

// ============================================================
// 🧩 Criação da tabela principal (se não existir)
// ============================================================
db.prepare(`
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    preco REAL NOT NULL,
    descricao TEXT,
    categoria TEXT,            -- ✅ nova coluna de categoria
    custo REAL DEFAULT 0,
    margem REAL DEFAULT 0,
    imagem TEXT,
    imagens TEXT,              -- compatível com versões antigas
    foto1 TEXT,                -- ✅ nova foto 1
    foto2 TEXT,                -- ✅ nova foto 2
    foto3 TEXT,                -- ✅ nova foto 3
    estoque INTEGER DEFAULT 0
  )
`).run();

// ============================================================
// 🧠 Função para garantir colunas extras (migração segura)
// ============================================================
function ensureColumn(name, defSql) {
  const cols = db.prepare(`PRAGMA table_info(produtos)`).all();
  const has = cols.some(c => c.name === name);
  if (!has) {
    db.prepare(`ALTER TABLE produtos ADD COLUMN ${name} ${defSql}`).run();
    console.log(`🧩 Coluna adicionada: ${name}`);
  }
}

// ============================================================
// 🧩 Garante que todas as colunas existam (para versões antigas)
// ============================================================
ensureColumn('categoria', 'TEXT'); // ✅ adiciona automaticamente a coluna categoria
ensureColumn('custo', 'REAL DEFAULT 0');
ensureColumn('margem', 'REAL DEFAULT 0');
ensureColumn('imagem', 'TEXT');
ensureColumn('imagens', 'TEXT');
ensureColumn('foto1', 'TEXT');
ensureColumn('foto2', 'TEXT');
ensureColumn('foto3', 'TEXT');
ensureColumn('estoque', 'INTEGER DEFAULT 0');

// ============================================================
// 🔁 Migração automática: imagem antiga → imagens → fotos individuais
// ============================================================
try {
  const produtos = db.prepare('SELECT id, imagem, imagens, foto1, foto2, foto3 FROM produtos').all();
  const update = db.prepare('UPDATE produtos SET imagens = ?, foto1 = ?, foto2 = ?, foto3 = ? WHERE id = ?');

  for (const p of produtos) {
    let imagensJSON = p.imagens;
    let foto1 = p.foto1 || null;
    let foto2 = p.foto2 || null;
    let foto3 = p.foto3 || null;

    // Migra imagem única para JSON
    if (p.imagem && (!p.imagens || p.imagens === '')) {
      imagensJSON = JSON.stringify([p.imagem]);
      foto1 = p.imagem;
      console.log(`🔄 Migrada imagem única → fotos do produto ID ${p.id}`);
    }

    // Se existir JSON de imagens, distribui nas 3 fotos
    if (imagensJSON && (!foto1 || !foto2 || !foto3)) {
      try {
        const arr = JSON.parse(imagensJSON);
        foto1 = foto1 || arr[0] || null;
        foto2 = foto2 || arr[1] || null;
        foto3 = foto3 || arr[2] || null;
      } catch (e) {}
    }

    update.run(imagensJSON || null, foto1, foto2, foto3, p.id);
  }
} catch (err) {
  console.error('⚠️ Erro ao migrar imagens:', err);
}

// ============================================================
// 📦 Inserir produtos iniciais se o banco estiver vazio
// ============================================================
const count = db.prepare('SELECT COUNT(*) AS total FROM produtos').get();

if (count.total === 0) {
  console.log('🆕 Inserindo produtos iniciais...');
  const produtosIniciais = [
    {
      nome: 'Camiseta Tec Norte',
      descricao: 'Camiseta oficial Tec Norte.',
      custo: 40,
      margem: 50,
      categoria: 'diversos', // ✅ nova categoria padrão
      imagem: '/frontend-cliente/img/produtos/camiseta.jpg',
      estoque: 20
    },
    {
      nome: 'Mouse Gamer Tec Norte',
      descricao: 'Mouse RGB de alta precisão.',
      custo: 80,
      margem: 62.5,
      categoria: 'informatica', // ✅ nova categoria padrão
      imagem: '/frontend-cliente/img/produtos/mouse.jpg',
      estoque: 15
    },
    {
      nome: 'Teclado Mecânico Tec Norte',
      descricao: 'Switch azul, iluminação LED.',
      custo: 160,
      margem: 56.25,
      categoria: 'acessorios', // ✅ nova categoria padrão
      imagem: '/frontend-cliente/img/produtos/teclado.jpg',
      estoque: 8
    }
  ];

  const insert = db.prepare(`
    INSERT INTO produtos (nome, preco, descricao, categoria, custo, margem, imagem, imagens, foto1, foto2, foto3, estoque)
    VALUES (@nome, @preco, @descricao, @categoria, @custo, @margem, @imagem, @imagens, @foto1, @foto2, @foto3, @estoque)
  `);

  for (const p of produtosIniciais) {
    const preco = Number((p.custo * (1 + p.margem / 100)).toFixed(2));
    const imagens = JSON.stringify([p.imagem]);
    insert.run({
      ...p,
      preco,
      imagens,
      foto1: p.imagem,
      foto2: null,
      foto3: null
    });
  }

  console.log('✅ Produtos iniciais adicionados com sucesso!');
} else {
  console.log('📦 Produtos já existentes no banco.');
}

// ============================================================
// 🧩 Exporta o banco para uso nas rotas
// ============================================================
module.exports = db;

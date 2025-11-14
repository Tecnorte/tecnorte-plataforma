// ===============================================
// 📦 Rotas de Produtos — TecNorte Informática
// Totalmente compatível com o frontend atual
// ===============================================
const express = require("express");
const router = express.Router();
const db = require("../data/db");

// ------------------------------------------------
// 🔧 Função para normalizar imagens ANTES de enviar
// ------------------------------------------------
function normalizarImagens(produto) {
  const imagens = [];

  // 1) Se vier array em JSON
  if (typeof produto.imagens === "string" && produto.imagens.trim() !== "") {
    try {
      const arr = JSON.parse(produto.imagens);
      if (Array.isArray(arr)) imagens.push(...arr.filter(Boolean));
    } catch {}
  }

  // 2) Se vier array real
  if (Array.isArray(produto.imagens)) {
    imagens.push(...produto.imagens.filter(Boolean));
  }

  // 3) Fotos individuais
  ["foto1", "foto2", "foto3"].forEach((f) => {
    if (produto[f] && produto[f].trim() !== "") imagens.push(produto[f]);
  });

  // 4) Campo imagem único
  if (produto.imagem && produto.imagem.trim() !== "") {
    imagens.push(produto.imagem);
  }

  produto.imagens = imagens;
  delete produto.foto1;
  delete produto.foto2;
  delete produto.foto3;
  delete produto.imagem;

  return produto;
}

// ===============================================
// 📌 GET — Listar Produtos
// ===============================================
router.get("/", (req, res) => {
  db.all("SELECT * FROM produtos", [], (err, rows) => {
    if (err) return res.status(500).json({ erro: "Erro ao buscar produtos" });

    const lista = rows.map((p) => normalizarImagens({ ...p }));
    res.json(lista);
  });
});

// ===============================================
// 📌 GET por ID
// ===============================================
router.get("/:id", (req, res) => {
  db.get(
    "SELECT * FROM produtos WHERE id = ?",
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ erro: "Erro ao buscar produto" });

      if (!row) return res.status(404).json({ erro: "Produto não encontrado" });

      res.json(normalizarImagens(row));
    }
  );
});

// ===============================================
// 📌 POST — Criar Produto
// ===============================================
router.post("/", (req, res) => {
  const { nome, preco, descricao, categoria, custo, margem, imagens } = req.body;

  const imagensJSON = JSON.stringify(imagens || []);

  db.run(
    `INSERT INTO produtos (nome, preco, descricao, categoria, custo, margem, imagens)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nome, preco, descricao, categoria, custo, margem, imagensJSON],
    function (err) {
      if (err) return res.status(500).json({ erro: "Erro ao criar produto" });

      res.json({ id: this.lastID });
    }
  );
});

// ===============================================
// 📌 PUT — Atualizar Produto
// ===============================================
router.put("/:id", (req, res) => {
  const { nome, preco, descricao, categoria, custo, margem, imagens } = req.body;

  const imagensJSON = JSON.stringify(imagens || []);

  db.run(
    `UPDATE produtos SET nome=?, preco=?, descricao=?, categoria=?, custo=?, margem=?, imagens=?
     WHERE id=?`,
    [
      nome,
      preco,
      descricao,
      categoria,
      custo,
      margem,
      imagensJSON,
      req.params.id,
    ],
    function (err) {
      if (err)
        return res.status(500).json({ erro: "Erro ao atualizar produto" });

      res.json({ atualizado: this.changes });
    }
  );
});

// ===============================================
// 📌 DELETE — Remover Produto
// ===============================================
router.delete("/:id", (req, res) => {
  db.run(
    "DELETE FROM produtos WHERE id=?",
    [req.params.id],
    function (err) {
      if (err)
        return res.status(500).json({ erro: "Erro ao remover produto" });

      res.json({ removido: this.changes });
    }
  );
});

module.exports = router;

















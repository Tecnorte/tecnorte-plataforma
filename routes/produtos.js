// =============================
// ROTA DE PRODUTOS TEC NORTE
// =============================
const express = require('express');
const router = express.Router();
const db = require('../data/db');

// Util: checa se a tabela tem uma coluna (para writes resilientes)
function hasColumn(name) {
  try {
    const cols = db.prepare(`PRAGMA table_info(produtos)`).all();
    return cols.some(c => c.name === name);
  } catch {
    return false;
  }
}
const HAS_CATEGORIA = hasColumn('categoria');

// 🧩 Normaliza imagens (prioriza foto1..3; depois JSON; depois imagem única)
function normalizarImagensDeLinha(linha) {
  if (!linha) return linha;
  const out = { ...linha };

  // tenta montar array a partir das 3 fotos
  const fotos = [out.foto1, out.foto2, out.foto3].filter(v => typeof v === 'string' && v.trim() !== '');
  if (fotos.length) {
    out.imagens = fotos;
  } else {
    // tenta JSON em imagens
    try {
      if (out.imagens && typeof out.imagens === 'string' && out.imagens.trim() !== '') {
        out.imagens = JSON.parse(out.imagens);
      } else if (Array.isArray(out.imagens)) {
        // ok
      } else if (out.imagem) {
        out.imagens = [out.imagem];
      } else {
        out.imagens = [];
      }
    } catch {
      out.imagens = out.imagem ? [out.imagem] : [];
    }
  }

  return out;
}

// Filtro de imagens válidas
function filtrarImgs(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(i =>
    typeof i === 'string' &&
    (i.startsWith('data:image') || i.startsWith('/frontend') || i.startsWith('http'))
  ).slice(0, 3);
}

// ✅ Buscar todos os produtos
router.get('/', (req, res) => {
  try {
    const produtos = db.prepare('SELECT * FROM produtos ORDER BY id DESC').all();
    res.json(produtos.map(normalizarImagensDeLinha));
  } catch (err) {
    console.error('❌ Erro ao buscar produtos:', err);
    res.status(500).json({ erro: 'Erro ao buscar produtos' });
  }
});

// ✅ Adicionar novo produto
router.post('/', (req, res) => {
  try {
    const {
      nome, preco, descricao, custo, margem, imagens, estoque, categoria,
      foto1, foto2, foto3
    } = req.body;

    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });

    const custoNum = parseFloat(custo) || 0;
    const precoNum = parseFloat(preco) || 0;
    let margemNum = parseFloat(margem);
    if (isNaN(margemNum)) {
      margemNum = (custoNum > 0 && precoNum > 0) ? ((precoNum - custoNum) / custoNum) * 100 : 0;
    }

    // monta imagens a partir do array OU das fotos individuais
    let imgs = filtrarImgs(imagens);
    if (!imgs.length) {
      imgs = filtrarImgs([foto1, foto2, foto3]);
    }

    const fotos = [
      imgs[0] ?? (typeof foto1 === 'string' ? foto1 : null),
      imgs[1] ?? (typeof foto2 === 'string' ? foto2 : null),
      imgs[2] ?? (typeof foto3 === 'string' ? foto3 : null),
    ];

    const imagensJSON = JSON.stringify(imgs);

    // INSERT resiliente: com categoria se existir; sem categoria caso contrário
    if (HAS_CATEGORIA) {
      const insert = db.prepare(`
        INSERT INTO produtos (nome, preco, descricao, custo, margem, imagens, foto1, foto2, foto3, estoque, categoria)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run(nome, precoNum, descricao || '', custoNum, margemNum, imagensJSON, fotos[0], fotos[1], fotos[2], parseInt(estoque) || 0, categoria || null);
    } else {
      const insert = db.prepare(`
        INSERT INTO produtos (nome, preco, descricao, custo, margem, imagens, foto1, foto2, foto3, estoque)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insert.run(nome, precoNum, descricao || '', custoNum, margemNum, imagensJSON, fotos[0], fotos[1], fotos[2], parseInt(estoque) || 0);
    }

    const novo = db.prepare('SELECT * FROM produtos ORDER BY id DESC LIMIT 1').get();
    res.json(normalizarImagensDeLinha(novo));
  } catch (err) {
    console.error('❌ Erro ao adicionar produto:', err);
    res.status(500).json({ erro: 'Erro ao adicionar produto' });
  }
});

// ✅ Atualizar produto (mantém imagens antigas se não vierem novas)
router.put('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const atual = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
    if (!atual) return res.status(404).json({ erro: 'Produto não encontrado' });

    const {
      nome, preco, descricao, custo, margem, imagens, estoque, categoria,
      foto1, foto2, foto3
    } = req.body;

    const custoNum = parseFloat(custo);
    const precoNum = parseFloat(preco);
    let margemNum = parseFloat(margem);

    const custoOk = isNaN(custoNum) ? (atual.custo || 0) : custoNum;
    const precoOk = isNaN(precoNum) ? (atual.preco || 0) : precoNum;
    if (isNaN(margemNum)) {
      margemNum = (custoOk > 0 && precoOk > 0) ? ((precoOk - custoOk) / custoOk) * 100 : (atual.margem || 0);
    }

    // imagens novas? se não, mantém antigas
    let imgs = filtrarImgs(imagens);
    if (!imgs.length) {
      const prev = normalizarImagensDeLinha(atual).imagens;
      imgs = filtrarImgs(prev);
    }

    const fotos = [
      (typeof foto1 === 'string' && foto1.trim() !== '') ? foto1 : (imgs[0] || atual.foto1 || null),
      (typeof foto2 === 'string' && foto2.trim() !== '') ? foto2 : (imgs[1] || atual.foto2 || null),
      (typeof foto3 === 'string' && foto3.trim() !== '') ? foto3 : (imgs[2] || atual.foto3 || null),
    ];
    const imagensJSON = JSON.stringify(fotos.filter(Boolean));

    if (HAS_CATEGORIA) {
      db.prepare(`
        UPDATE produtos
        SET nome=?, preco=?, descricao=?, custo=?, margem=?, imagens=?, foto1=?, foto2=?, foto3=?, estoque=?, categoria=?
        WHERE id=?
      `).run(
        (nome ?? atual.nome),
        precoOk,
        (descricao ?? atual.descricao ?? ''),
        custoOk,
        margemNum,
        imagensJSON,
        fotos[0] || null,
        fotos[1] || null,
        fotos[2] || null,
        isNaN(parseInt(estoque)) ? (atual.estoque || 0) : parseInt(estoque),
        (categoria ?? atual.categoria ?? null),
        id
      );
    } else {
      db.prepare(`
        UPDATE produtos
        SET nome=?, preco=?, descricao=?, custo=?, margem=?, imagens=?, foto1=?, foto2=?, foto3=?, estoque=?
        WHERE id=?
      `).run(
        (nome ?? atual.nome),
        precoOk,
        (descricao ?? atual.descricao ?? ''),
        custoOk,
        margemNum,
        imagensJSON,
        fotos[0] || null,
        fotos[1] || null,
        fotos[2] || null,
        isNaN(parseInt(estoque)) ? (atual.estoque || 0) : parseInt(estoque),
        id
      );
    }

    const atualizado = db.prepare('SELECT * FROM produtos WHERE id = ?').get(id);
    res.json(normalizarImagensDeLinha(atualizado));
  } catch (err) {
    console.error('❌ Erro ao atualizar produto:', err);
    res.status(500).json({ erro: 'Erro ao atualizar produto' });
  }
});

// ✅ Excluir produto
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
    res.json({ sucesso: true });
  } catch (err) {
    console.error('❌ Erro ao excluir produto:', err);
    res.status(500).json({ erro: 'Erro ao excluir produto' });
  }
});

module.exports = router;















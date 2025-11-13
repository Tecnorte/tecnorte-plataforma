// ===========================================
// 🧾 Rotas de Pedidos - TecNorte Informática
// ===========================================
const express = require('express');
const router = express.Router();
const db = require('../data/db');
const fs = require('fs');
const path = require('path');
const gerarCupomPDF = require('../utils/gerarCupom'); // Gera o PDF

// Registrar novo pedido
router.post('/', (req, res) => {
  const { cliente_nome, cliente_contato, itens, pagamento } = req.body;

  try {
    // Insere o pedido no banco
    const stmt = db.prepare(`
      INSERT INTO pedidos (cliente_nome, cliente_contato, itens, pagamento, data)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(cliente_nome, cliente_contato, JSON.stringify(itens), pagamento);

    // Recupera o último pedido
    const novoPedido = db.prepare('SELECT * FROM pedidos ORDER BY id DESC LIMIT 1').get();

    // Gera o PDF do cupom
    const caminhoPDF = gerarCupomPDF({
      id: novoPedido.id,
      data: novoPedido.data,
      itens: JSON.parse(novoPedido.itens),
      cliente_nome,
      cliente_contato,
      pagamento
    });

    // Garante que o arquivo foi criado
    if (fs.existsSync(caminhoPDF)) {
      console.log(`✅ Cupom PDF salvo em: ${caminhoPDF}`);
    } else {
      console.warn('⚠️ O cupom não foi criado corretamente. Verifique o gerador.');
    }

    // Cria o link público
    const nomePDF = path.basename(caminhoPDF);
    const linkPublico = `http://localhost:3000/data/cupons/${nomePDF}`;

    // Cria link automático para WhatsApp
    const numero = cliente_contato.replace(/\D/g, '');
    const mensagem = encodeURIComponent(
      `Olá ${cliente_nome}! 🧾\nSegue seu comprovante de compra com a TecNorte Informática:\n${linkPublico}\n\n` +
      `Agradecemos pela preferência! 💙`
    );
    const linkWhats = `https://wa.me/55${numero}?text=${mensagem}`;

    // Mostra no console
    console.log('🧾 Novo pedido registrado com sucesso!');
    console.log(`📎 Cupom disponível em: ${linkPublico}`);
    console.log(`💬 Envie via WhatsApp: ${linkWhats}`);

    // Retorna a resposta para o frontend
    res.status(200).json({
      sucesso: true,
      mensagem: 'Pedido registrado e cupom gerado com sucesso!',
      cupom: linkPublico,
      linkWhats
    });

  } catch (err) {
    console.error('❌ Erro ao registrar pedido:', err);
    res.status(500).json({ erro: 'Erro ao registrar pedido.' });
  }
});

module.exports = router;


// ===========================================
// 🧾 Gerador de Cupom PDF - TecNorte Informática
// ===========================================
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function gerarCupomPDF(pedido) {
  try {
    // Garante que a pasta de cupons existe
    const pastaCupons = path.join(__dirname, '..', 'data', 'cupons');
    if (!fs.existsSync(pastaCupons)) {
      fs.mkdirSync(pastaCupons, { recursive: true });
    }

    // Caminho completo do PDF
    const caminhoPDF = path.join(pastaCupons, `pedido-${pedido.id}.pdf`);

    // Cria o documento PDF
    const doc = new PDFDocument({ margin: 40 });
    const stream = fs.createWriteStream(caminhoPDF);
    doc.pipe(stream);

    // Cabeçalho
    doc.fontSize(18).fillColor('#005eff').text('TecNorte Informática', { align: 'center' });
    doc.fontSize(10).fillColor('black')
      .text('Soluções rápidas em tecnologia & delivery', { align: 'center' })
      .moveDown(1);

    // Info do pedido
    doc.fontSize(12)
      .text(`Pedido Nº: ${pedido.id}`)
      .text(`Data: ${pedido.data}`)
      .moveDown();

    // Itens
    doc.fontSize(12).text('Itens:', { underline: true }).moveDown(0.3);
    let total = 0;
    pedido.itens.forEach((item, i) => {
      const subtotal = item.preco * item.quantidade;
      total += subtotal;
      doc.text(`${i + 1}. ${item.nome} — ${item.quantidade}x R$ ${item.preco.toFixed(2)} = R$ ${subtotal.toFixed(2)}`);
    });

    // Total e pagamento
    doc.moveDown(0.5)
      .text('--------------------------')
      .text(`Total: R$ ${total.toFixed(2)}`)
      .text(`Pagamento: ${pedido.pagamento}`)
      .moveDown(1);

    // Cliente
    doc.text('Cliente:', { underline: true }).moveDown(0.3);
    doc.text(`Nome: ${pedido.cliente_nome}`);
    doc.text(`Contato: ${pedido.cliente_contato}`).moveDown(1);

    // Rodapé
    doc.fontSize(10).fillColor('gray')
      .text('Obrigado por comprar na TecNorte Informática!', { align: 'center' })
      .text('Sinop - MT | tec-norte.com.br', { align: 'center' });

    doc.end();

    console.log(`✅ Cupom gerado e salvo em: ${caminhoPDF}`);
    return caminhoPDF;

  } catch (err) {
    console.error('❌ Erro ao gerar cupom:', err);
    return null;
  }
}

module.exports = gerarCupomPDF;




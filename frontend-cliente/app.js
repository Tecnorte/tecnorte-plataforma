// ============================================================
// TecNorte • Loja - Vitrine pública (filtros, busca e modal)
// Compatível com backend /produtos atual
// ============================================================

const grid = document.getElementById("gridProdutos");
const msgVazia = document.getElementById("mensagemVazia");
const campoBusca = document.getElementById("busca");
const filtroCategoria = document.getElementById("filtroCategoria");

// Modal
const modal = document.getElementById("modal");
const modalFechar = document.getElementById("modalFechar");
const modalImagem = document.getElementById("modalImagem");
const modalThumbs = document.getElementById("modalThumbs");
const modalNome = document.getElementById("modalNome");
const modalDesc = document.getElementById("modalDesc");
const modalPreco = document.getElementById("modalPreco");
const modalComprar = document.getElementById("modalComprar");

let produtos = [];
let produtosFiltrados = [];

// 🔧 Imagem padrão se faltar foto
const PLACEHOLDER = "/frontend-cliente/img/produtos/placeholder.png";

// 🏷️ Mapa de categorias
const mapaCategoria = {
  promocao: "🔥 Promoção do dia",
  informatica: "💻 Informática",
  diversos: "🎧 Diversos",
  acessorios: "🔌 Acessórios",
  carregadores: "⚡ Carregadores",
  notebooks: "💼 Notebooks",
};

// ------- Utilitários -------
function formatarMoeda(v) {
  const n = Number(v ?? 0);
  return "R$ " + n.toFixed(2);
}

function normalizarImagens(produto) {
  if (!produto) return [];

  // Se backend já manda array (caso atual)
  if (Array.isArray(produto.imagens)) {
    return produto.imagens.filter(Boolean);
  }

  // Se for string JSON
  if (typeof produto.imagens === "string" && produto.imagens.trim() !== "") {
    try {
      const arr = JSON.parse(produto.imagens);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch {
      // ignora
    }
  }

  // Campos individuais
  const fotos = [produto.foto1, produto.foto2, produto.foto3].filter(
    (v) => typeof v === "string" && v.trim() !== ""
  );
  if (fotos.length) return fotos;

  // Campo único
  if (produto.imagem) return [produto.imagem];

  return [];
}

function tituloCategoria(cat) {
  if (!cat) return "";
  return mapaCategoria[cat] || cat;
}

// ------- Renderização dos produtos -------
function renderGrid(lista) {
  if (!grid || !msgVazia) return;

  grid.innerHTML = "";
  if (!lista || lista.length === 0) {
    msgVazia.style.display = "block";
    return;
  }

  msgVazia.style.display = "none";
  const frag = document.createDocumentFragment();

  lista.forEach((p) => {
    const imgs = normalizarImagens(p);
    const primeira = imgs[0] || PLACEHOLDER;

    const card = document.createElement("div");
    card.className = "tn-card";
    card.innerHTML = `
      <div class="tn-card__media">
        <img src="${primeira}" alt="${p.nome || "Produto"}" />
      </div>
      <div class="tn-card__body">
        <h3 class="tn-card__title">${p.nome || "-"}</h3>
        <p class="tn-card__desc">${p.descricao || ""}</p>
        <small style="color:#6a82a8">${tituloCategoria(p.categoria)}</small>
      </div>
      <div class="tn-card__footer">
        <span class="tn-price">${formatarMoeda(p.preco)}</span>
        <div class="tn-card__actions">
          <button class="tn-btn tn-btn--light" data-action="ver" data-id="${p.id}">🔍 Ver mais</button>
          <button class="tn-btn tn-btn--primary" data-action="comprar" data-id="${p.id}">Comprar</button>
        </div>
      </div>
    `;

    const btnVer = card.querySelector('[data-action="ver"]');
    const btnComprar = card.querySelector('[data-action="comprar"]');

    if (btnVer) btnVer.addEventListener("click", () => abrirModal(p));
    if (btnComprar) btnComprar.addEventListener("click", () => comprar(p));

    frag.appendChild(card);
  });

  grid.appendChild(frag);
}

// ------- Modal -------
function abrirModal(produto) {
  if (!modal || !modalImagem || !modalThumbs || !modalNome || !modalDesc || !modalPreco || !modalComprar) return;

  const imgs = normalizarImagens(produto);
  const primeira = imgs[0] || PLACEHOLDER;

  modalImagem.src = primeira;
  modalNome.textContent = produto.nome || "-";
  modalDesc.textContent = produto.descricao || "Sem descrição disponível.";
  modalPreco.textContent = formatarMoeda(produto.preco);

  // Miniaturas
  modalThumbs.innerHTML = "";
  const lista = imgs.length ? imgs : [PLACEHOLDER];

  lista.forEach((src, idx) => {
    const t = document.createElement("img");
    t.src = src;
    if (idx === 0) t.classList.add("is-active");
    t.addEventListener("click", () => {
      modalImagem.src = src;
      modalThumbs.querySelectorAll("img").forEach((im) => im.classList.remove("is-active"));
      t.classList.add("is-active");
    });
    modalThumbs.appendChild(t);
  });

  modalComprar.onclick = () => comprar(produto);
  modal.setAttribute("aria-hidden", "false");
}

function fecharModal() {
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
}

if (modalFechar) {
  modalFechar.addEventListener("click", fecharModal);
}

if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fecharModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharModal();
});

// ------- Filtros & Busca -------
function aplicarFiltros() {
  const texto = (campoBusca?.value || "").toLowerCase().trim();
  const cat = filtroCategoria?.value || "";

  produtosFiltrados = produtos.filter((p) => {
    const passaCat = cat ? (p.categoria || "") === cat : true;
    const alvo = `${p.nome || ""} ${p.descricao || ""}`.toLowerCase();
    const passaBusca = texto ? alvo.includes(texto) : true;
    return passaCat && passaBusca;
  });

  renderGrid(produtosFiltrados);
}

if (campoBusca) campoBusca.addEventListener("input", aplicarFiltros);
if (filtroCategoria) filtroCategoria.addEventListener("change", aplicarFiltros);

// ------- Carregar produtos do backend -------
async function carregarProdutos() {
  if (!grid || !msgVazia) return;

  try {
    const resp = await fetch("/produtos");
    const data = await resp.json();

    produtos = (data || []).map((p) => {
      let preco = Number(p.preco);

      if ((preco === null || isNaN(preco)) && p.custo != null && p.margem != null) {
        preco = Number((Number(p.custo) * (1 + Number(p.margem) / 100)).toFixed(2));
      }

      return { ...p, preco };
    });

    aplicarFiltros();
  } catch (e) {
    console.error("Erro ao carregar produtos:", e);
    grid.innerHTML = "";
    msgVazia.style.display = "block";
    msgVazia.textContent = "❌ Não foi possível carregar os produtos. Verifique o servidor.";
  }
}

// ------- Comprar (simples, usando localStorage) -------
function comprar(produto) {
  let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

  carrinho.push({
    id: produto.id,
    nome: produto.nome,
    preco: produto.preco,
  });

  const totalAtual = carrinho
    .reduce((acc, p) => acc + Number(p.preco || 0), 0)
    .toFixed(2);

  localStorage.setItem("carrinho", JSON.stringify(carrinho));
  localStorage.setItem("totalCarrinho", totalAtual);

  alert(`🛒 '${produto.nome}' adicionado ao carrinho! Indo para o checkout...`);
  window.location.href = "/frontend-cliente/checkout.html";
}

// 🚀 Inicialização
document.addEventListener("DOMContentLoaded", carregarProdutos);


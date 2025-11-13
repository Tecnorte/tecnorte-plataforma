// ============================================================
// ⚙️ Painel Administrativo - TecNorte (CRUD completo + Categorias)
// ============================================================

// 🧮 Cálculo automático da margem
const campoCusto = document.getElementById("custo");
const campoPreco = document.getElementById("preco");
const campoMargem = document.getElementById("margem");
const campoCategoria = document.getElementById("categoria");

function calcularMargem() {
  const custo = parseFloat(campoCusto.value);
  const preco = parseFloat(campoPreco.value);
  if (!isNaN(custo) && !isNaN(preco) && custo > 0) {
    const margem = ((preco - custo) / custo) * 100;
    campoMargem.value = margem.toFixed(2);
  } else {
    campoMargem.value = "";
  }
}
campoCusto.addEventListener("input", calcularMargem);
campoPreco.addEventListener("input", calcularMargem);

// ============================================================
// 📸 Upload individual de até 3 imagens
// ============================================================
const imagens = [
  { input: "foto1", preview: "preview1", remove: "remove1" },
  { input: "foto2", preview: "preview2", remove: "remove2" },
  { input: "foto3", preview: "preview3", remove: "remove3" },
];
let imagensBase64 = [];

imagens.forEach(({ input, preview, remove }, index) => {
  const inputEl = document.getElementById(input);
  const previewEl = document.getElementById(preview);
  const removeEl = document.getElementById(remove);

  inputEl.addEventListener("change", (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (ev) => {
      imagensBase64[index] = ev.target.result;
      previewEl.src = ev.target.result;
      previewEl.style.display = "block";
      removeEl.style.display = "inline-block";
    };
    leitor.readAsDataURL(arquivo);
  });

  removeEl.addEventListener("click", () => {
    imagensBase64[index] = null;
    previewEl.src = "";
    previewEl.style.display = "none";
    removeEl.style.display = "none";
    inputEl.value = "";
  });
});

// ============================================================
// 🔁 Limpar formulário
// ============================================================
document.getElementById("btnNovo").addEventListener("click", () => {
  document.querySelector(".form-produto").reset();
  campoMargem.value = "";
  imagensBase64 = [];
  imagens.forEach(({ preview, remove }) => {
    document.getElementById(preview).style.display = "none";
    document.getElementById(remove).style.display = "none";
  });
  alert("🆕 Formulário limpo para novo produto!");
});

// ============================================================
// 🔁 Tabela de produtos
// ============================================================
const tabelaProdutos = document.getElementById("listaProdutos");

// 🧠 Normalização segura de imagens — ETAPA 3
function normalizarImagens(produto) {
  // lista vazia
  if (!produto) return [];

  // se já é array
  if (Array.isArray(produto.imagens) && produto.imagens.length > 0) {
    return produto.imagens;
  }

  // se veio JSON string
  try {
    if (typeof produto.imagens === "string" && produto.imagens.trim() !== "") {
      const arr = JSON.parse(produto.imagens);
      if (Array.isArray(arr)) return arr;
    }
  } catch (_) {}

  // compatibilidade com versões antigas → "imagem"
  if (produto.imagem) return [produto.imagem];

  return [];
}

// segurança em moeda
function formatarMoeda(v) {
  const n = Number(v ?? 0);
  if (isNaN(n)) return "R$ 0,00";
  return "R$ " + n.toFixed(2);
}

// traduz categoria
function formatarCategoria(cat) {
  const mapa = {
    promocao: "🔥 Promoção do dia",
    informatica: "💻 Informática",
    diversos: "🎧 Diversos",
    acessorios: "🔌 Acessórios",
    carregadores: "⚡ Carregadores",
    notebooks: "💼 Notebooks",
  };
  return mapa[cat] || "-";
}

// ============================================================
// 🖼️ Renderizar produto — versão segura
// ============================================================
function renderizarProduto(produto) {
  if (!produto) return;

  const imgs = normalizarImagens(produto);

  const imagensHTML = imgs.length
    ? imgs
        .slice(0, 3)
        .map(
          (src) =>
            `<img src="${src}" style="width:50px;height:50px;border-radius:6px;margin-right:4px;">`
        )
        .join("")
    : "-";

  const linha = document.createElement("tr");
  linha.dataset.id = produto.id;

  linha.innerHTML = `
    <td>${produto.id}</td>
    <td class="c-imagens">${imagensHTML}</td>
    <td class="c-nome">${produto.nome}</td>
    <td class="c-desc">${produto.descricao || "-"}</td>
    <td class="c-cat">${formatarCategoria(produto.categoria)}</td>
    <td class="c-custo">${formatarMoeda(produto.custo)}</td>
    <td class="c-margem">${Number(produto.margem ?? 0).toFixed(2)}%</td>
    <td class="c-preco">${formatarMoeda(produto.preco)}</td>
    <td class="c-estoque">${produto.estoque ?? 0}</td>
    <td>
      <button class="editar">✏️</button>
      <button class="excluir">🗑️</button>
    </td>
  `;

  linha.querySelector(".excluir").addEventListener("click", () =>
    excluirProduto(produto.id, linha)
  );
  linha.querySelector(".editar").addEventListener("click", () =>
    editarInline(linha, produto)
  );

  tabelaProdutos.appendChild(linha);
}

// ============================================================
// 🚀 Carregar produtos — seguro mesmo com banco vazio
// ============================================================
async function carregarProdutos() {
  tabelaProdutos.innerHTML = "";
  try {
    const r = await fetch("/produtos");
    const dados = await r.json();

    if (!Array.isArray(dados) || dados.length === 0) {
      tabelaProdutos.innerHTML =
        "<tr><td colspan='10' style='text-align:center;'>Nenhum produto cadastrado.</td></tr>";
      return;
    }

    dados.forEach(renderizarProduto);
  } catch (e) {
    console.error("Erro ao carregar produtos:", e);
  }
}

// ============================================================
// 💾 Salvar produto
// ============================================================
document.getElementById("btnSalvar").addEventListener("click", async () => {
  const nome = document.getElementById("nome").value.trim();
  const custo = document.getElementById("custo").value.trim();
  const preco = document.getElementById("preco").value.trim();
  const margem = document.getElementById("margem").value.trim();
  const estoque = document.getElementById("estoque").value.trim();
  const descricao = document.getElementById("descricao").value.trim();
  const categoria = campoCategoria.value || "";

  if (!nome || !custo || !preco || !estoque) {
    alert("⚠️ Preencha todos os campos obrigatórios!");
    return;
  }

  const produto = {
    nome,
    custo,
    preco,
    margem,
    estoque,
    descricao,
    categoria,
    imagens: imagensBase64.filter((img) => img),
  };

  try {
    const resp = await fetch("/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(produto),
    });
    const novo = await resp.json();
    renderizarProduto(novo);
    alert("✅ Produto salvo com sucesso!");
    document.querySelector(".form-produto").reset();
    campoMargem.value = "";
    imagensBase64 = [];
    imagens.forEach(({ preview, remove }) => {
      document.getElementById(preview).style.display = "none";
      document.getElementById(remove).style.display = "none";
    });
  } catch (e) {
    console.error(e);
    alert("❌ Erro ao salvar produto.");
  }
});

// ============================================================
// ✏️ Editar (corrigido, seguro)
// ============================================================
function editarInline(linha, produto) {
  if (linha.classList.contains("editando")) return;
  linha.classList.add("editando");

  const nome = produto.nome || "";
  const desc = produto.descricao || "";
  const custo = produto.custo || 0;
  const preco = produto.preco || 0;
  const margem = produto.margem || 0;
  const estoque = produto.estoque || 0;
  const categoria = produto.categoria || "";
  const imagensAtuais = normalizarImagens(produto);
  let novasImagens = [...imagensAtuais];

  linha.innerHTML = `
    <td>${produto.id}</td>
    <td class="c-imagens">
      ${imagensAtuais
        .map(
          (src, i) => `
            <div style="display:inline-block;text-align:center;margin-right:4px;">
              <img src="${src}" style="width:50px;height:50px;border-radius:6px;display:block;margin-bottom:3px;">
              <button class="remover-img" data-index="${i}" style="font-size:10px;">❌</button>
            </div>`
        )
        .join("")}
      <input type="file" class="nova-imagem" accept="image/*" style="display:block;margin-top:4px;">
    </td>
    <td><input value="${nome}"></td>
    <td><input value="${desc}"></td>
    <td>
      <select>
        <option value="">Selecione a categoria</option>
        <option value="promocao" ${categoria === "promocao" ? "selected" : ""}>Promoção do dia</option>
        <option value="informatica" ${categoria === "informatica" ? "selected" : ""}>Informática</option>
        <option value="diversos" ${categoria === "diversos" ? "selected" : ""}>Diversos</option>
        <option value="acessorios" ${categoria === "acessorios" ? "selected" : ""}>Acessórios</option>
        <option value="carregadores" ${categoria === "carregadores" ? "selected" : ""}>Carregadores</option>
        <option value="notebooks" ${categoria === "notebooks" ? "selected" : ""}>Notebooks</option>
      </select>
    </td>
    <td><input type="number" step="0.01" value="${custo}"></td>
    <td><input type="number" step="0.01" value="${margem}"></td>
    <td><input type="number" step="0.01" value="${preco}"></td>
    <td><input type="number" step="1" value="${estoque}"></td>
    <td>
      <button class="salvar">💾</button>
      <button class="cancelar">↩️</button>
    </td>
  `;

  linha.querySelectorAll(".remover-img").forEach((btn) =>
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      novasImagens.splice(index, 1);
      btn.parentElement.remove();
    })
  );

  linha.querySelector(".nova-imagem").addEventListener("change", (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = (ev) => {
      novasImagens.push(ev.target.result);
      alert("✅ Nova imagem adicionada!");
    };
    leitor.readAsDataURL(arquivo);
  });

  linha.querySelector(".cancelar").addEventListener("click", carregarProdutos);

  linha.querySelector(".salvar").addEventListener("click", async () => {
    const atualizado = {
      nome: linha.querySelector("td:nth-child(3) input").value.trim(),
      descricao: linha.querySelector("td:nth-child(4) input").value.trim(),
      categoria: linha.querySelector("td:nth-child(5) select").value,
      custo: parseFloat(linha.querySelector("td:nth-child(6) input").value) || 0,
      margem: parseFloat(linha.querySelector("td:nth-child(7) input").value) || 0,
      preco: parseFloat(linha.querySelector("td:nth-child(8) input").value) || 0,
      estoque: parseInt(linha.querySelector("td:nth-child(9) input").value) || 0,
      imagens: novasImagens,
    };

    try {
      const r = await fetch(`/produtos/${produto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(atualizado),
      });
      if (!r.ok) throw new Error("Erro ao atualizar produto");
      alert("✅ Produto atualizado com sucesso!");
      carregarProdutos();
    } catch (e) {
      console.error(e);
      alert("❌ Falha ao atualizar produto.");
    }
  });
}

// ============================================================
// 🗑️ Excluir produto
// ============================================================
async function excluirProduto(id, linha) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;
  try {
    const r = await fetch(`/produtos/${id}`, { method: "DELETE" });
    const js = await r.json();
    if (js && js.sucesso) {
      linha.remove();
      alert("🗑️ Produto excluído com sucesso!");
    } else {
      alert("❌ Erro ao excluir produto.");
    }
  } catch (e) {
    console.error(e);
    alert("❌ Erro ao excluir produto.");
  }
}

// ============================================================
// 🚀 Inicialização
// ============================================================
document.addEventListener("DOMContentLoaded", carregarProdutos);



















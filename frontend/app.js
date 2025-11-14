// ============================================================
// ⚙️ Painel Administrativo - TecNorte (CRUD completo + Categorias)
// Compatível com backend /routes/produtos.js atual
// ============================================================

// =============================
// 🔗 API dinâmica (LOCAL + RENDER)
// =============================
const API_PRODUTOS =
  location.hostname === "localhost"
    ? "http://localhost:3000/produtos"
    : "https://tecnorte-plataforma-backend.onrender.com/produtos";

// =============================
// 🧮 Cálculo automático da margem (form principal)
// =============================
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

if (campoCusto && campoPreco && campoMargem) {
  campoCusto.addEventListener("input", calcularMargem);
  campoPreco.addEventListener("input", calcularMargem);
}

// =============================
// 📸 Upload individual de até 3 imagens (form principal)
// =============================
const imagensSlots = [
  { input: "foto1", preview: "preview1", remove: "remove1" },
  { input: "foto2", preview: "preview2", remove: "remove2" },
  { input: "foto3", preview: "preview3", remove: "remove3" },
];

let imagensBase64 = [null, null, null];

imagensSlots.forEach(({ input, preview, remove }, index) => {
  const inputEl = document.getElementById(input);
  const previewEl = document.getElementById(preview);
  const removeEl = document.getElementById(remove);

  if (!inputEl || !previewEl || !removeEl) return;

  inputEl.addEventListener("change", (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (ev) => {
      const base64 = ev.target.result;
      imagensBase64[index] = base64;
      previewEl.src = base64;
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

// =============================
// 🔄 Limpar formulário (Novo Produto)
// =============================
const btnNovo = document.getElementById("btnNovo");
if (btnNovo) {
  btnNovo.addEventListener("click", () => {
    const form = document.querySelector(".form-produto");
    if (form) form.reset();
    if (campoMargem) campoMargem.value = "";

    imagensBase64 = [null, null, null];
    imagensSlots.forEach(({ preview, remove }) => {
      const p = document.getElementById(preview);
      const r = document.getElementById(remove);
      if (p) p.style.display = "none";
      if (r) r.style.display = "none";
    });

    alert("🆕 Formulário limpo para novo produto!");
  });
}

// =============================
// 📋 Tabela de produtos
// =============================
const tabelaProdutos = document.getElementById("listaProdutos");

function normalizarImagens(produto) {
  if (!produto) return [];

  if (Array.isArray(produto.imagens)) {
    return produto.imagens.filter(Boolean);
  }

  if (typeof produto.imagens === "string" && produto.imagens.trim() !== "") {
    try {
      const arr = JSON.parse(produto.imagens);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    } catch {}
  }

  const fotos = [produto.foto1, produto.foto2, produto.foto3].filter(
    (v) => typeof v === "string" && v.trim() !== ""
  );
  if (fotos.length) return fotos;

  if (produto.imagem) return [produto.imagem];

  return [];
}

function formatarMoeda(v) {
  const n = Number(v ?? 0);
  return "R$ " + n.toFixed(2);
}

function formatarCategoria(cat) {
  const mapa = {
    promocao: "🔥 Promoção do dia",
    informatica: "💻 Informática",
    diversos: "🎧 Diversos",
    acessorios: "🔌 Acessórios",
    carregadores: "⚡ Carregadores",
    notebooks: "💼 Notebooks",
  };
  if (!cat) return "-";
  return mapa[cat] || cat;
}

function renderizarProduto(produto) {
  const imgs = normalizarImagens(produto);
  const imagensHTML = imgs.length
    ? imgs
        .slice(0, 3)
        .map(
          (src) =>
            `<img src="${src}" style="width:50px;height:50px;border-radius:6px;margin-right:4px;object-fit:cover;">`
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

// =============================
// 🔄 Carregar produtos
// =============================
async function carregarProdutos() {
  if (!tabelaProdutos) return;

  tabelaProdutos.innerHTML = "";
  try {
    const r = await fetch(API_PRODUTOS);
    const dados = await r.json();

    (dados || []).forEach((p) => {
      renderizarProduto(p);
    });
  } catch (e) {
    console.error("Erro ao carregar produtos:", e);
    alert("❌ Erro ao carregar produtos. Verifique o servidor.");
  }
}

// =============================
// 💾 Salvar produto
// =============================
const btnSalvar = document.getElementById("btnSalvar");
if (btnSalvar) {
  btnSalvar.addEventListener("click", async () => {
    const nome = document.getElementById("nome")?.value.trim();
    const custoStr = document.getElementById("custo")?.value.trim();
    const precoStr = document.getElementById("preco")?.value.trim();
    const margemStr = document.getElementById("margem")?.value.trim();
    const estoqueStr = document.getElementById("estoque")?.value.trim();
    const descricao = document.getElementById("descricao")?.value.trim();
    const categoria = campoCategoria ? campoCategoria.value : "";

    if (!nome || !custoStr || !precoStr || !estoqueStr) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    let custo = parseFloat(custoStr.replace(",", "."));
    let preco = parseFloat(precoStr.replace(",", "."));
    let margem = parseFloat(margemStr?.replace(",", "."));
    let estoque = parseInt(estoqueStr);

    if (isNaN(custo) || isNaN(preco) || isNaN(estoque)) {
      alert("⚠️ Custo, preço e estoque precisam ser numéricos!");
      return;
    }

    if (isNaN(margem)) {
      if (custo > 0 && preco > 0) {
        margem = ((preco - custo) / custo) * 100;
      } else {
        margem = 0;
      }
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
      const resp = await fetch(API_PRODUTOS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(produto),
      });

      if (!resp.ok) throw new Error("Erro ao salvar produto");

      const dados = await resp.json();
      let novoProduto = dados.produto || dados;

      if (!novoProduto || novoProduto.id == null) {
        await carregarProdutos();
      } else {
        renderizarProduto(novoProduto);
      }

      alert("✅ Produto salvo com sucesso!");

      const form = document.querySelector(".form-produto");
      form?.reset();
      campoMargem.value = "";
      imagensBase64 = [null, null, null];

      imagensSlots.forEach(({ preview, remove }) => {
        document.getElementById(preview).style.display = "none";
        document.getElementById(remove).style.display = "none";
      });
    } catch (e) {
      console.error(e);
      alert("❌ Erro ao salvar produto.");
    }
  });
}

// =============================
// ✏️ Editar inline
// =============================
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

  const imagensHTML =
    imagensAtuais.length > 0
      ? imagensAtuais
          .map(
            (src, i) => `
    <div style="display:inline-block;text-align:center;margin-right:4px;">
      <img src="${src}" style="width:50px;height:50px;border-radius:6px;display:block;margin-bottom:3px;object-fit:cover;">
      <button class="remover-img" data-index="${i}" style="font-size:10px;">❌</button>
    </div>`
          )
          .join("")
      : "<small>Sem imagens</small>";

  linha.innerHTML = `
    <td>${produto.id}</td>
    <td class="c-imagens">
      ${imagensHTML}
      <input type="file" class="nova-imagem" accept="image/*" style="display:block;margin-top:4px;font-size:12px;">
    </td>
    <td><input value="${nome}" class="inp-nome"></td>
    <td><input value="${desc}" class="inp-desc"></td>
    <td>
      <select class="inp-cat">
        <option value="">Selecione a categoria</option>
        <option value="promocao" ${categoria === "promocao" ? "selected" : ""}>Promoção do dia</option>
        <option value="informatica" ${categoria === "informatica" ? "selected" : ""}>Informática</option>
        <option value="diversos" ${categoria === "diversos" ? "selected" : ""}>Diversos</option>
        <option value="acessorios" ${categoria === "acessorios" ? "selected" : ""}>Acessórios</option>
        <option value="carregadores" ${categoria === "carregadores" ? "selected" : ""}>Carregadores</option>
        <option value="notebooks" ${categoria === "notebooks" ? "selected" : ""}>Notebooks</option>
      </select>
    </td>
    <td><input type="number" step="0.01" value="${custo}" class="inp-custo"></td>
    <td><input type="number" step="0.01" value="${margem}" class="inp-margem"></td>
    <td><input type="number" step="0.01" value="${preco}" class="inp-preco"></td>
    <td><input type="number" step="1" value="${estoque}" class="inp-estoque"></td>
    <td>
      <button class="salvar">💾</button>
      <button class="cancelar">↩️</button>
    </td>
  `;

  linha.querySelectorAll(".remover-img").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      if (!isNaN(index)) {
        novasImagens.splice(index, 1);
        btn.parentElement.remove();
      }
    });
  });

  linha
    .querySelector(".nova-imagem")
    ?.addEventListener("change", (e) => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;
      const leitor = new FileReader();
      leitor.onload = (ev) => {
        novasImagens.push(ev.target.result);
        alert("✅ Nova imagem adicionada!");
      };
      leitor.readAsDataURL(arquivo);
    });

  linha
    .querySelector(".cancelar")
    ?.addEventListener("click", carregarProdutos);

  linha.querySelector(".salvar")?.addEventListener("click", async () => {
    const nomeNovo = linha.querySelector(".inp-nome")?.value.trim() || produto.nome;
    const descNova = linha.querySelector(".inp-desc")?.value.trim() || produto.descricao || "";
    const catNova = linha.querySelector(".inp-cat")?.value || produto.categoria || "";
    const custoNovo = parseFloat(linha.querySelector(".inp-custo")?.value);
    const precoNovo = parseFloat(linha.querySelector(".inp-preco")?.value);
    const margemNovaCampo = linha.querySelector(".inp-margem")?.value;
    let margemNova = parseFloat(margemNovaCampo);
    const estoqueNovo = parseInt(linha.querySelector(".inp-estoque")?.value);

    const custoOk = isNaN(custoNovo) ? produto.custo || 0 : custoNovo;
    const precoOk = isNaN(precoNovo) ? produto.preco || 0 : precoNovo;

    if (isNaN(margemNova)) {
      if (custoOk > 0 && precoOk > 0) {
        margemNova = ((precoOk - custoOk) / custoOk) * 100;
      } else {
        margemNova = produto.margem || 0;
      }
    }

    const payload = {
      nome: nomeNovo,
      descricao: descNova,
      categoria: catNova,
      custo: custoOk,
      preco: precoOk,
      margem: margemNova,
      estoque: isNaN(estoqueNovo) ? produto.estoque || 0 : estoqueNovo,
      imagens: novasImagens,
    };

    try {
      const r = await fetch(`${API_PRODUTOS}/${produto.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

// =============================
// 🗑️ Excluir produto
// =============================
async function excluirProduto(id, linha) {
  if (!confirm("Tem certeza que deseja excluir este produto?")) return;

  try {
    const r = await fetch(`${API_PRODUTOS}/${id}`, { method: "DELETE" });
    const js = await r.json();

    if (js && js.sucesso) {
      linha?.remove();
      alert("🗑️ Produto excluído com sucesso!");
    } else {
      alert("❌ Erro ao excluir produto.");
    }
  } catch (e) {
    console.error(e);
    alert("❌ Erro ao excluir produto.");
  }
}

// =============================
// 🚀 Inicialização
// =============================
document.addEventListener("DOMContentLoaded", carregarProdutos);

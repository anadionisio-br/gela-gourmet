
// =========================================================
// GELA GOURMET - SCRIPT PRINCIPAL
// Catálogo (Supabase), carrinho, entrega, checkout e WhatsApp.
// Efeitos visuais (parallax, 3D, revelar ao rolar) ficam em efeitos.js
// =========================================================

// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL = "https://aiirehncupywhmftzzmn.supabase.co";
const SUPABASE_KEY = "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

let supabaseClient = null;

try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (error) {
  console.error("❌ Não foi possível iniciar o Supabase:", error);
}

// =========================================================
// CONFIGURAÇÕES
// =========================================================

const WHATSAPP = "5519993149687";

// Taxa fixa de entrega (somente Tambaú)
const DELIVERY_FEE = 5;

const CITY_TAMBAU = "Tambaú - SP";
const CITY_SCP = "Santa Cruz das Palmeiras - SP";

// Textos da regra de Santa Cruz das Palmeiras
const TEXT_DELIVERY_TO_COMBINE = "Valor da entrega a combinar";
const NOTE_SCP = "Entrega em Santa Cruz das Palmeiras — valor da entrega a combinar";

// =========================================================
// STATUS DA LOJA (controlado pelo painel admin)
// O status fica na tabela "configuracoes_loja" do Supabase.
// =========================================================

const MENSAGEM_FECHADO_PADRAO =
  "Estamos fechados no momento e não estamos aceitando pedidos. Voltaremos em breve!";

let lojaAberta = true;
let mensagemFechado = MENSAGEM_FECHADO_PADRAO;

function verificarStatusLoja() {
  return lojaAberta;
}

function aplicarStatusLoja() {
  const banner = document.getElementById("lojaBanner");

  if (banner) {
    banner.hidden = lojaAberta;
    banner.textContent = lojaAberta ? "" : "🔒 " + mensagemFechado;
  }

  document.body.classList.toggle("loja-fechada", !lojaAberta);

  const botao = document.getElementById("sendOrder");

  if (botao) {
    botao.disabled = !lojaAberta;
    botao.textContent = lojaAberta
      ? "Finalizar pelo WhatsApp"
      : "Loja fechada no momento";
  }
}

async function carregarStatusLoja() {
  if (!supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from("configuracoes_loja")
      .select("loja_aberta, mensagem_fechado")
      .eq("id", 1)
      .maybeSingle();

    // Sem tabela/linha ainda: não bloqueia a loja por engano
    if (error || !data) {
      if (error) console.error("Erro ao ler status da loja:", error);
      return;
    }

    lojaAberta = data.loja_aberta !== false;
    mensagemFechado = (data.mensagem_fechado || "").trim() || MENSAGEM_FECHADO_PADRAO;
    aplicarStatusLoja();
  } catch (erro) {
    console.error("Erro ao ler status da loja:", erro);
  }
}

// Mantém o site atualizado sem o cliente precisar recarregar a página
function iniciarMonitorLoja() {
  carregarStatusLoja();
  setInterval(carregarStatusLoja, 30000);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) carregarStatusLoja();
  });
}

// =========================================================
// VARIÁVEIS
// =========================================================

let products = [];
let cart = [];
let adicionais = [];
let adicionaisSelecionados = {};
let categoriaAtiva = "todos";

const CATEGORIAS_FALLBACK = [
  { slug: "geladinho", nome: "Geladinhos Gourmet", icone: "🍦", ordem: 1, ativa: true },
  { slug: "fondue", nome: "Fondue", icone: "🍫", ordem: 2, ativa: true },
  { slug: "picole", nome: "Picolé Gourmet", icone: "🍭", ordem: 3, ativa: true }
];

let categorias = [...CATEGORIAS_FALLBACK];

// Acompanhamento do pedido
let pedidoAcompanhado = null;
let statusAnteriorPedido = null;
let intervaloStatusPedido = null;

// =========================================================
// ELEMENTOS
// =========================================================

const productsContainer = document.getElementById("products");
const cartContainer = document.getElementById("cartItems");
const subtotalElement = document.getElementById("subtotal");
const deliveryElement = document.getElementById("deliveryFee");
const totalElement = document.getElementById("total");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// =========================================================
// UTILITÁRIOS
// =========================================================

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Aviso rápido na tela
let toastTimer = null;

function showToast(message, type) {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.toggle("error", type === "error");
  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 2600);
}

// Marca um campo com erro, avisa e leva o cliente até ele
function failField(message, field) {
  showToast(message, "error");

  if (field) {
    field.classList.add("field-error");

    field.addEventListener(
      "input",
      function () {
        field.classList.remove("field-error");
      },
      { once: true }
    );

    field.addEventListener(
      "change",
      function () {
        field.classList.remove("field-error");
      },
      { once: true }
    );

    field.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center"
    });

    field.focus({ preventScroll: true });
  }

  return false;
}

// =========================================================
// IMAGENS E DESCRIÇÕES DOS PRODUTOS
// =========================================================

function resolveImage(path) {
  let image = path || "";

  if (
    image &&
    !image.startsWith("http") &&
    !image.startsWith("/") &&
    !image.startsWith("imagens/")
  ) {
    image = "imagens/" + image;
  }

  return image;
}

function fallbackImageFor(name) {
  const n = normalizeText(name);

  if (n.includes("ovomaltine")) return "imagens/ovomaltine1.jpg";
  if (n.includes("oreo")) return "imagens/oreo1.jpg";
  if (n.includes("ninho")) return "imagens/ninho.jpeg";

  return "";
}

function describeProduct(name, category) {
  const n = normalizeText(name);
  const cat = normalizeText(category || "");

  if (cat.includes("fondue")) {
    return "Fondue cremoso acompanhado de frutas frescas e complementos.";
  }
  if (cat.includes("picole")) {
    return "Picolé gourmet artesanal, super cremoso e recheado.";
  }

  if (n.includes("ninho") && n.includes("nutella")) {
    return "Base cremosa de leite Ninho com camadas de Nutella.";
  }
  if (n.includes("ovomaltine")) {
    return "Cremoso e gelado, com crocantes de Ovomaltine.";
  }
  if (n.includes("oreo")) {
    return "Cremoso e gelado, com biscoito Oreo.";
  }
  if (n.includes("ninho")) {
    return "Cremoso de leite Ninho, doce na medida.";
  }
  if (n.includes("nutella")) {
    return "Cremoso e recheado com Nutella.";
  }
  if (n.includes("maracuja")) {
    return "Cremoso, com o azedinho do maracujá.";
  }
  if (n.includes("morango")) {
    return "Cremoso e gelado, com sabor de morango.";
  }
  if (n.includes("chocolate")) {
    return "Chocolate cremoso e bem gelado.";
  }

  if (cat && cat !== "geladinho") {
    return "Preparado artesanalmente com ingredientes selecionados.";
  }

  return "Geladinho gourmet cremoso e bem gelado.";
}

function buildImage(src, name, className) {
  const img = document.createElement("img");

  img.className = className;
  img.alt = name;
  img.loading = "lazy";
  img.decoding = "async";

  const fallback = fallbackImageFor(name);
  let triedFallback = false;

  img.addEventListener("error", function () {
    if (!triedFallback && fallback && !img.src.endsWith(fallback)) {
      triedFallback = true;
      img.src = fallback;
      return;
    }

    img.dataset.broken = "true";
    img.removeAttribute("src");
    img.style.visibility = "hidden";

    const holder = img.parentElement;

    if (holder && !holder.querySelector(".card-fallback")) {
      const box = document.createElement("div");
      box.className = "card-fallback";
      box.innerHTML =
        '<img src="imagens/logo-selo-pequeno.jpg" alt="" width="80" height="90">';
      holder.appendChild(box);
    }
  });

  img.src = src || fallback || "imagens/logo-selo-pequeno.jpg";

  return img;
}

// =========================================================
// CARREGAR PRODUTOS
// =========================================================

function showCatalogMessage(title, text, withRetry) {
  if (!productsContainer) return;
  productsContainer.innerHTML = `
    <div class="cards-msg">
      <h3>${escapeHtml(title)}</h3>
      <p>${text}</p>
      ${
        withRetry
          ? '<button type="button" class="btn small" onclick="loadProducts()">Tentar novamente</button>'
          : ""
      }
    </div>
  `;
}

async function loadProducts() {
  if (!productsContainer) {
    console.error("ERRO: elemento #products não existe no index.html.");
    return;
  }

  showCatalogMessage("Carregando sabores...", "", false);

  if (!supabaseClient) {
    showCatalogMessage(
      "Não foi possível carregar os sabores",
      "Verifique sua conexão com a internet e tente novamente.",
      true
    );
    return;
  }

  try {
    // Carrega categorias dinâmicas do Supabase (se a tabela já existir)
    const catResult = await supabaseClient
      .from("categorias")
      .select("id, slug, nome, icone, ordem, ativa")
      .order("ordem", { ascending: true })
      .order("id", { ascending: true });

    if (!catResult.error && Array.isArray(catResult.data) && catResult.data.length > 0) {
      categorias = catResult.data.filter(function (c) { return c.ativa !== false; });
    } else {
      categorias = [...CATEGORIAS_FALLBACK];
    }

    const { data, error } = await supabaseClient
      .from("produtos")
      .select("id, nome, preco, imagem, disponivel, estoque_quantidade, categoria")
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ ERRO DO SUPABASE:", error);
      showCatalogMessage(
        "Não foi possível carregar os sabores",
        "Verifique a conexão com o banco de dados.",
        true
      );
      return;
    }

    if (!data || data.length === 0) {
      products = [];
      cart = [];
      showCatalogMessage(
        "Nenhum sabor cadastrado ainda",
        "Cadastre os sabores na tabela <strong>produtos</strong> do Supabase.",
        false
      );
      updateTotal();
      return;
    }

    let adicionaisResult = await supabaseClient
      .from("adicionais")
      .select("id, nome, preco, disponivel, categoria")
      .order("id", { ascending: true });

    if (adicionaisResult.error) {
      adicionaisResult = await supabaseClient
        .from("adicionais")
        .select("id, nome, preco, disponivel")
        .order("id", { ascending: true });
    }

    if (adicionaisResult.error) {
      console.error("Erro ao carregar adicionais:", adicionaisResult.error);
      adicionais = [];
    } else {
      adicionais = (adicionaisResult.data || [])
        .filter(function (item) { return item.disponivel !== false; })
        .map(function (item) {
          return {
            id: item.id,
            name: item.nome,
            price: Number(item.preco),
            disponivel: item.disponivel !== false,
            categoria: item.categoria || "geladinho"
          };
        });
    }

    products = data.map(function (product) {
      return {
        id: product.id,
        name: product.nome,
        price: Number(product.preco),
        img: product.imagem,
        categoria: product.categoria || "geladinho",
        disponivel: product.disponivel !== false && (product.estoque_quantidade === null || product.estoque_quantidade === undefined || Number(product.estoque_quantidade) > 0),
        estoqueQuantidade: product.estoque_quantidade === null || product.estoque_quantidade === undefined ? null : Number(product.estoque_quantidade)
      };
    });

    cart = Array(products.length).fill(0);
    adicionaisSelecionados = {};

    renderProducts();
    renderCart();
    updateTotal();
  } catch (error) {
    console.error("❌ ERRO AO CARREGAR PRODUTOS:", error);
    showCatalogMessage(
      "Ocorreu um erro ao carregar os sabores",
      "Tente novamente em instantes.",
      true
    );
  }
}

// =========================================================
// VITRINE
// =========================================================

function renderCategoryTabs() {
  const tabsContainer = document.getElementById("categoryTabs");
  if (!tabsContainer) return;

  const slugsValidos = new Set(categorias.map(function (c) { return c.slug; }));
  if (categoriaAtiva !== "todos" && !slugsValidos.has(categoriaAtiva)) {
    categoriaAtiva = "todos";
  }

  const botoes = [
    `<button type="button" class="cat-tab ${categoriaAtiva === "todos" ? "active" : ""}" data-category="todos" onclick="filtrarCategoria('todos')">Todos</button>`
  ];

  categorias.forEach(function (cat) {
    const temProdutos = products.some(function (p) { return (p.categoria || "geladinho") === cat.slug; });
    if (!temProdutos) return;
    const ativa = categoriaAtiva === cat.slug ? "active" : "";
    botoes.push(
      `<button type="button" class="cat-tab ${ativa}" data-category="${escapeHtml(cat.slug)}" onclick="filtrarCategoria('${escapeHtml(cat.slug)}')">${escapeHtml(cat.icone || "🍨")} ${escapeHtml(cat.nome)}</button>`
    );
  });

  tabsContainer.innerHTML = botoes.join("");
}

function filtrarCategoria(categoria) {
  categoriaAtiva = categoria || "todos";
  renderCategoryTabs();
  renderProducts();
}

function adicionaisDisponiveisParaCategoria(categoria) {
  return adicionais.filter(function (extra) {
    return !extra.categoria || extra.categoria === "todos" || extra.categoria === categoria;
  });
}

function criarCardProduto(product, index, ordemVisual) {
  const card = document.createElement("article");

  card.className = "card reveal";
  card.dataset.index = index;
  card.style.setProperty("--d", (ordemVisual % 3) * 90 + "ms");

  if (!product.disponivel) {
    card.classList.add("is-off");
  }
  if ((cart[index] || 0) > 0) {
    card.classList.add("in-cart");
  }

  const media = document.createElement("div");
  media.className = "card-media";

  media.appendChild(
    buildImage(resolveImage(product.img), product.name, "card-photo")
  );

  if (!product.disponivel) {
    const badge = document.createElement("span");
    badge.className = "badge-off";
    badge.textContent = "Esgotado";
    media.appendChild(badge);
  }

  card.appendChild(media);

  const body = document.createElement("div");
  body.className = "card-body";

  let action = "";

  if (product.disponivel) {
    action = `
      <button type="button" class="add-btn"
        onclick="changeQuantity(${index}, 1)"
        aria-label="Adicionar ${escapeHtml(product.name)} ao pedido">
        Adicionar
      </button>

      <div class="qty" role="group"
        aria-label="Quantidade de ${escapeHtml(product.name)}">
        <button type="button" onclick="changeQuantity(${index}, -1)"
          aria-label="Diminuir quantidade">−</button>
        <span id="quantity-${index}" aria-live="polite">${cart[index] || 0}</span>
        <button type="button" onclick="changeQuantity(${index}, 1)"
          aria-label="Aumentar quantidade">+</button>
      </div>
    `;
  }

  const extrasCategoria = adicionaisDisponiveisParaCategoria(product.categoria);

  body.innerHTML = `
    <h3>${escapeHtml(product.name)}</h3>
    <p class="card-desc">${escapeHtml(describeProduct(product.name, product.categoria))}</p>
    ${extrasCategoria.length && product.disponivel ? `
      <div class="extras-box">
        <p class="extras-title">Adicionais</p>
        ${extrasCategoria.map(function (extra) {
          const checked = (adicionaisSelecionados[index] || []).includes(extra.id) ? "checked" : "";
          return `<label class="extra-option">
            <input type="checkbox" ${checked} onchange="alternarAdicional(${index}, ${extra.id}, this.checked)">
            <span>${escapeHtml(extra.name)}</span>
            <strong>+ ${money(extra.price)}</strong>
          </label>`;
        }).join("")}
        <small>Selecione os adicionais para este item.</small>
      </div>` : ""}
    <div class="card-foot">
      <strong class="price">${money(product.price + precoAdicionais(index))}</strong>
      ${action}
    </div>
    ${
      product.disponivel
        ? ""
        : '<div class="indisponivel">Esgotado no momento. Os outros itens seguem disponíveis.</div>'
    }
  `;

  card.appendChild(body);
  return card;
}

function renderProducts() {
  if (!productsContainer) return;

  renderCategoryTabs();
  productsContainer.innerHTML = "";

  // Monta lista ordenada das categorias configuradas + eventuais categorias órfãs nos produtos
  const conhecidas = new Set(categorias.map(function (c) { return c.slug; }));
  const listaCategorias = [...categorias];

  products.forEach(function (p) {
    const slug = p.categoria || "geladinho";
    if (!conhecidas.has(slug)) {
      conhecidas.add(slug);
      listaCategorias.push({ slug: slug, nome: slug, icone: "🍨" });
    }
  });

  const categoriasParaMostrar = categoriaAtiva === "todos"
    ? listaCategorias
    : listaCategorias.filter(function (c) { return c.slug === categoriaAtiva; });

  let totalRenderizados = 0;

  categoriasParaMostrar.forEach(function (cat) {
    const itensCategoria = products
      .map(function (product, index) { return { product: product, index: index }; })
      .filter(function (item) { return (item.product.categoria || "geladinho") === cat.slug; });

    if (itensCategoria.length === 0) return;

    const bloco = document.createElement("div");
    bloco.className = "category-section";

    const titulo = document.createElement("h3");
    titulo.className = "category-heading";
    titulo.innerHTML = `<span>${escapeHtml(cat.icone || "🍨")}</span> ${escapeHtml(cat.nome)}`;
    bloco.appendChild(titulo);

    const grid = document.createElement("div");
    grid.className = "cards";

    itensCategoria.forEach(function (item, idxVisual) {
      const card = criarCardProduto(item.product, item.index, idxVisual);
      grid.appendChild(card);
      totalRenderizados++;
      if (window.observeReveal) {
        window.observeReveal(card);
      }
    });

    bloco.appendChild(grid);
    productsContainer.appendChild(bloco);
  });

  if (totalRenderizados === 0) {
    productsContainer.innerHTML = `
      <div class="cards-msg">
        <h3>Nenhum item nesta categoria ainda</h3>
        <p>Em breve teremos novidades por aqui!</p>
      </div>
    `;
  }
}

function precoAdicionais(index) {
  const ids = adicionaisSelecionados[index] || [];
  return adicionais.reduce(function (total, extra) {
    return total + (ids.includes(extra.id) ? extra.price : 0);
  }, 0);
}

function alternarAdicional(index, id, marcado) {
  const atuais = adicionaisSelecionados[index] || [];
  adicionaisSelecionados[index] = marcado
    ? [...new Set([...atuais, id])]
    : atuais.filter(function (itemId) { return itemId !== id; });
  renderProducts();
  renderCart();
  updateTotal();
}

function adicionaisDoProduto(index) {
  const ids = adicionaisSelecionados[index] || [];
  return adicionais.filter(function (extra) { return ids.includes(extra.id); });
}

// =========================================================
// QUANTIDADE E CARRINHO
// =========================================================

function changeQuantity(index, amount) {
  if (!products[index] || !products[index].disponivel) return;

  // Loja fechada: não deixa adicionar itens (remover continua permitido)
  if (!lojaAberta && amount > 0) {
    showToast(mensagemFechado, "error");
    return;
  }

  const before = cart[index];
  const proxima = Math.max(0, cart[index] + amount);
  if (amount > 0 && products[index].estoqueQuantidade !== null && proxima > products[index].estoqueQuantidade) {
    showToast("Estoque disponível: " + products[index].estoqueQuantidade + " unidade(s).", "error");
    return;
  }
  cart[index] = proxima;

  if (cart[index] === before) return;

  updateQuantityDisplay(index);
  renderCart();
  updateTotal();

  if (amount > 0) {
    const card = document.querySelector('.card[data-index="' + index + '"]');
    if (before === 0) {
      showToast(products[index].name + " adicionado ao pedido");
    }
    if (card) {
      flyToCart(card.querySelector(".card-photo"));
    }
  }
}

function updateQuantityDisplay(index) {
  const element = document.getElementById("quantity-" + index);
  const card = document.querySelector('.card[data-index="' + index + '"]');

  if (element) {
    element.textContent = cart[index];
    element.classList.remove("pop");
    void element.offsetWidth;
    element.classList.add("pop");
  }

  if (card) {
    card.classList.toggle("in-cart", cart[index] > 0);
  }
}

function flyToCart(sourceImage) {
  if (reducedMotion || !sourceImage || sourceImage.dataset.broken) return;

  const target = document.getElementById("navCart");
  if (!target) return;

  const from = sourceImage.getBoundingClientRect();
  const to = target.getBoundingClientRect();

  if (from.bottom < 0 || from.top > window.innerHeight) return;

  const clone = document.createElement("img");
  clone.className = "fly";
  clone.src = sourceImage.currentSrc || sourceImage.src;
  clone.alt = "";
  clone.style.left = from.left + from.width / 2 - 28 + "px";
  clone.style.top = from.top + from.height / 2 - 28 + "px";

  document.body.appendChild(clone);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      clone.style.transform = "translate(" + dx + "px," + dy + "px) scale(.25)";
      clone.style.opacity = ".15";
    });
  });

  setTimeout(function () {
    clone.remove();
    const badge = document.getElementById("cartBadge");
    if (badge) {
      badge.classList.remove("bump");
      void badge.offsetWidth;
      badge.classList.add("bump");
    }
  }, 760);
}

function getSelectedProducts() {
  return products
    .map(function (product, index) {
      return {
        product: product,
        quantity: cart[index],
        index: index
      };
    })
    .filter(function (item) {
      return item.quantity > 0;
    });
}

function getSubtotal() {
  return getSelectedProducts().reduce(function (total, item) {
    return total + (item.product.price + precoAdicionais(item.index)) * item.quantity;
  }, 0);
}

function getItemCount() {
  return getSelectedProducts().reduce(function (total, item) {
    return total + item.quantity;
  }, 0);
}

function getOrderType() {
  const selected = document.querySelector('input[name="orderType"]:checked');
  return selected ? selected.value : "delivery";
}

function getCity() {
  const city = document.getElementById("city");
  return city ? city.value : "";
}

function isDeliveryToCombine() {
  return getOrderType() === "delivery" && getCity() === CITY_SCP;
}

function getDeliveryFee() {
  if (getOrderType() === "delivery" && getCity() === CITY_TAMBAU) {
    return DELIVERY_FEE;
  }
  return 0;
}

function getTotal() {
  return getSubtotal() + getDeliveryFee();
}

function getDeliveryLabel() {
  if (getOrderType() === "pickup") return "Sem taxa";
  if (isDeliveryToCombine()) return TEXT_DELIVERY_TO_COMBINE;
  if (getCity() === CITY_TAMBAU) return money(DELIVERY_FEE);
  return "Informe a cidade";
}

const renderedCartItems = new Set();

function renderCart() {
  if (!cartContainer) return;

  const selected = getSelectedProducts();

  if (selected.length === 0) {
    renderedCartItems.clear();
    cartContainer.innerHTML = '<p class="empty">Seu carrinho está vazio. 💗</p>';
    return;
  }

  cartContainer.innerHTML = "";
  const stillInCart = new Set();

  selected.forEach(function (item) {
    const key = String(item.product.id);
    stillInCart.add(key);

    const row = document.createElement("div");
    row.className = "cart-item";

    if (!renderedCartItems.has(key)) {
      row.classList.add("new");
    }

    const thumb = buildImage(
      resolveImage(item.product.img),
      item.product.name,
      "cart-thumb"
    );
    thumb.loading = "eager";

    row.appendChild(thumb);

    const info = document.createElement("div");
    info.className = "cart-item-info";
    info.innerHTML = `
      <strong>${escapeHtml(item.product.name)}</strong>
      <small>${item.quantity} × ${money(item.product.price + precoAdicionais(item.index))}</small>${adicionaisDoProduto(item.index).length ? `<small class="cart-extras">Adicionais: ${adicionaisDoProduto(item.index).map(e => escapeHtml(e.name)).join(", ")}</small>` : ""}
    `;

    row.appendChild(info);

    const side = document.createElement("div");
    side.className = "cart-item-side";
    side.innerHTML = `
      <span class="cart-item-total">${money((item.product.price + precoAdicionais(item.index)) * item.quantity)}</span>
      <div class="qty" role="group" aria-label="Quantidade de ${escapeHtml(item.product.name)}">
        <button type="button" onclick="changeQuantity(${item.index}, -1)">−</button>
        <span>${item.quantity}</span>
        <button type="button" onclick="changeQuantity(${item.index}, 1)">+</button>
      </div>
    `;

    row.appendChild(side);
    cartContainer.appendChild(row);
  });

  renderedCartItems.clear();
  stillInCart.forEach(function (key) {
    renderedCartItems.add(key);
  });
}

function updateTotal() {
  const subtotal = getSubtotal();
  const total = getTotal();
  const combine = isDeliveryToCombine();

  if (subtotalElement) subtotalElement.textContent = money(subtotal);
  if (deliveryElement) deliveryElement.textContent = getDeliveryLabel();
  if (totalElement) totalElement.textContent = money(total);

  const totalLabel = document.getElementById("totalLabel");
  const totalNote = document.getElementById("totalNote");

  if (totalLabel) {
    totalLabel.textContent = combine ? "Total dos produtos" : "Total";
  }

  if (totalNote) {
    totalNote.hidden = !combine;
    totalNote.textContent = combine
      ? "O valor da entrega será combinado depois e não está incluído neste total."
      : "";
  }

  const notice = document.getElementById("deliveryNotice");

  if (notice) {
    if (getOrderType() !== "delivery") {
      notice.hidden = true;
    } else if (combine) {
      notice.hidden = false;
      notice.textContent = TEXT_DELIVERY_TO_COMBINE;
    } else if (getCity() === CITY_TAMBAU) {
      notice.hidden = false;
      notice.textContent = "Taxa de entrega em Tambaú: " + money(DELIVERY_FEE);
    } else {
      notice.hidden = true;
    }
  }

  updateCartIndicators(subtotal);
}

function updateCartIndicators(subtotal) {
  const count = getItemCount();

  const badge = document.getElementById("cartBadge");
  const bar = document.getElementById("cartBar");
  const barCount = document.getElementById("cartBarCount");
  const barTotal = document.getElementById("cartBarTotal");

  if (badge) badge.textContent = count;
  if (barCount) barCount.textContent = count === 1 ? "1 item" : count + " itens";
  if (barTotal) barTotal.textContent = money(subtotal);

  if (bar) {
    bar.dataset.hasItems = count > 0 ? "1" : "";
    syncCartBar();
  }

  document.body.classList.toggle("has-cart-bar", count > 0);
}

let orderSectionVisible = false;

function syncCartBar() {
  const bar = document.getElementById("cartBar");
  if (!bar) return;
  bar.classList.toggle(
    "on",
    bar.dataset.hasItems === "1" && !orderSectionVisible
  );
}

// =========================================================
// VALIDAR E FINALIZAR PEDIDO
// =========================================================

function getAddress() {
  if (getOrderType() === "pickup") {
    return "Retirada no local";
  }

  const city = getCity();
  const street = (document.getElementById("street")?.value || "").trim();
  const number = (document.getElementById("number")?.value || "").trim();
  const neighborhood = (document.getElementById("neighborhood")?.value || "").trim();

  return `${street}, Nº ${number} - ${neighborhood}, ${city}`;
}

function paymentLabel(payment) {
  switch (payment) {
    case "pix":
      return "Pix";
    case "dinheiro":
      return "Dinheiro";
    case "cartao":
      return "Cartão";
    default:
      return payment;
  }
}

function validateOrder() {
  // BLOQUEIO SE A LOJA ESTIVER FECHADA
  if (!verificarStatusLoja()) {
    showToast(mensagemFechado, "error");
    return false;
  }

  if (getSelectedProducts().length === 0) {
    showToast("Adicione pelo menos um sabor ao pedido.", "error");
    const section = document.getElementById("cardapio");
    if (section) {
      section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    }
    return false;
  }

  const nameInput = document.getElementById("customerName");
  const phoneInput = document.getElementById("customerPhone");
  const paymentInput = document.getElementById("paymentMethod");

  if (getOrderType() === "delivery") {
    const city = document.getElementById("city");
    const street = document.getElementById("street");
    const number = document.getElementById("number");
    const neighborhood = document.getElementById("neighborhood");

    if (!city.value) return failField("Selecione a cidade para a entrega.", city);
    if (!street.value.trim()) return failField("Informe a rua da entrega.", street);
    if (!number.value.trim()) return failField("Informe o número do endereço.", number);
    if (!neighborhood.value.trim()) return failField("Informe o bairro.", neighborhood);
  }

  if (!nameInput.value.trim()) return failField("Digite seu nome.", nameInput);
  if (!phoneInput.value.trim()) return failField("Digite seu telefone.", phoneInput);
  if (phoneInput.value.replace(/\D/g, "").length < 10) return failField("Digite um telefone com DDD.", phoneInput);
  if (!paymentInput.value) return failField("Selecione a forma de pagamento.", paymentInput);

  return true;
}

function mostrarPedidoSucesso(pedidoId, token, itens, total, whatsappUrl, entrega, fidelidade) {
  const combine = isDeliveryToCombine();

  const itensHtml = itens
    .map(function (item) {
      return `<p>• ${item.quantidade}x ${escapeHtml(item.nome)} - ${money(item.subtotal)}</p>`;
    })
    .join("");

  const modal = document.createElement("div");
  modal.className = "success-overlay";

  modal.innerHTML = `
    <div class="success-modal" role="dialog" aria-modal="true">
      <button type="button" class="success-close" aria-label="Fechar">×</button>
      <div class="success-icon">✓</div>
      <span class="success-small">Pedido recebido</span>
      <h2>Tudo certo!</h2>
      <p class="success-message">
        Seu pedido foi registrado. Obrigada por escolher a Gela Gourmet!
      </p>
      <div class="success-number">
        <span>Número do pedido</span>
        <strong>#${escapeHtml(pedidoId)}</strong>
      </div>
      <div class="success-items">${itensHtml}</div>
      <div class="success-sum">
        <span>Entrega</span>
        <strong>${escapeHtml(entrega ? entrega.texto : "")}</strong>
      </div>
      <div class="success-total">
        <span>${combine ? "Total dos produtos" : "Total"}</span>
        <strong>${money(total)}</strong>
      </div>
      ${combine ? '<p class="success-note">' + escapeHtml(NOTE_SCP) + ".</p>" : ""}
      ${fidelidade ? '<div class="loyalty loyalty--success">' + loyaltyHtml(fidelidade) + "</div>" : ""}
      <div class="success-actions">
        <button type="button" class="success-track" id="successTrack">Acompanhar pedido</button>
        <button type="button" class="success-whatsapp" id="successWhatsapp">Abrir WhatsApp novamente</button>
        <button type="button" class="success-home" id="successHome">Voltar para os sabores</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  function fecharModal() {
    modal.remove();
    document.body.style.overflow = "";
  }

  modal.querySelector(".success-close").addEventListener("click", fecharModal);

  modal.querySelector("#successHome").addEventListener("click", function () {
    fecharModal();
    const section = document.getElementById("cardapio");
    if (section) {
      section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    }
  });

  modal.addEventListener("click", function (event) {
    if (event.target === modal) {
      fecharModal();
    }
  });

  modal.querySelector("#successTrack").addEventListener("click", function () {
    if (!token) {
      showToast(
        "O pedido foi criado, mas o banco não retornou o código de acompanhamento.",
        "error"
      );
      console.error("Token do pedido não encontrado.");
      return;
    }

    const dados = {
      pedidoId: pedidoId,
      token: token,
      salvoEm: Date.now()
    };

    localStorage.setItem("gelaGourmetPedido", JSON.stringify(dados));
    window.location.href = "acompanhar-pedido.html?token=" + encodeURIComponent(token);
  });

  modal.querySelector("#successWhatsapp").addEventListener("click", function () {
    window.open(whatsappUrl, "_blank");
  });
}

// =========================================================
// ANIVERSÁRIO + FIDELIDADE (MIMO)
// =========================================================

// A cada quantos pedidos ATENDIDOS (status "entregue") o cliente ganha um mimo.
// Se mudar aqui, mude também em pedidos/pedidos.js.
const PEDIDOS_PARA_MIMO = 10;

function formatBirthday(isoDate) {
  const parts = String(isoDate || "").split("-");
  if (parts.length !== 3) return "";
  return parts[2] + "/" + parts[1] + "/" + parts[0];
}

function setupBirthday() {
  const input = document.getElementById("customerBirthday");
  if (!input) return;

  // Não deixa escolher data no futuro
  const hoje = new Date();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  input.max = hoje.getFullYear() + "-" + mes + "-" + dia;
}

// Salva nome + aniversário do cliente (chave = telefone)
async function salvarCliente(name, phone, birthday) {
  if (!supabaseClient) return;

  try {
    const result = await supabaseClient.rpc("registrar_cliente", {
      p_telefone: phone,
      p_nome: name,
      p_data_nascimento: birthday || null
    });

    if (result.error) {
      console.warn("Não foi possível salvar o cliente:", result.error);
    }
  } catch (error) {
    console.warn("Não foi possível salvar o cliente:", error);
  }
}

// Busca quantos pedidos o cliente já fez / foram atendidos
async function consultarFidelidade(phone) {
  if (!supabaseClient) return null;

  try {
    const result = await supabaseClient.rpc("consultar_fidelidade", {
      p_telefone: phone
    });

    if (result.error || !result.data) {
      if (result.error) console.warn("Fidelidade indisponível:", result.error);
      return null;
    }

    return {
      atendidos: Number(result.data.atendidos) || 0,
      emAndamento: Number(result.data.em_andamento) || 0
    };
  } catch (error) {
    console.warn("Fidelidade indisponível:", error);
    return null;
  }
}

// Calcula o progresso do ciclo atual (0 a PEDIDOS_PARA_MIMO)
function loyaltyProgress(fidelidade) {
  const atendidos = fidelidade.atendidos;
  const ciclo = atendidos % PEDIDOS_PARA_MIMO;
  const mimoDisponivel = atendidos > 0 && ciclo === 0;

  return {
    atendidos: atendidos,
    emAndamento: fidelidade.emAndamento,
    marcados: mimoDisponivel ? PEDIDOS_PARA_MIMO : ciclo,
    faltam: mimoDisponivel ? 0 : PEDIDOS_PARA_MIMO - ciclo,
    mimoDisponivel: mimoDisponivel,
    mimosGanhos: Math.floor(atendidos / PEDIDOS_PARA_MIMO)
  };
}

// Texto curto (usado na mensagem do WhatsApp)
function loyaltyResumo(fidelidade) {
  const p = loyaltyProgress(fidelidade);
  let texto = p.atendidos + (p.atendidos === 1 ? " pedido atendido" : " pedidos atendidos");

  if (p.emAndamento > 0) {
    texto += " (+" + p.emAndamento + " em andamento)";
  }

  texto += p.mimoDisponivel
    ? " — 🎉 MIMO DISPONÍVEL!"
    : " — faltam " + p.faltam + " para o mimo";

  return texto;
}

function loyaltyHtml(fidelidade) {
  const p = loyaltyProgress(fidelidade);

  let selos = "";
  for (let i = 0; i < PEDIDOS_PARA_MIMO; i++) {
    selos += '<span class="loyalty-stamp' + (i < p.marcados ? " is-filled" : "") + '"></span>';
  }

  let titulo;
  let detalhe;

  if (p.atendidos === 0) {
    titulo = "🎁 Programa de mimos";
    detalhe = "A cada " + PEDIDOS_PARA_MIMO + " pedidos atendidos você ganha um mimo. Seu primeiro pedido começa a contar a partir da entrega!";
  } else if (p.mimoDisponivel) {
    titulo = "🎉 Você ganhou um mimo!";
    detalhe = "Você já tem " + p.atendidos + " pedidos atendidos. Avise a Gela Gourmet no seu próximo pedido para receber o seu mimo.";
  } else {
    titulo = "🎁 " + p.atendidos + (p.atendidos === 1 ? " pedido atendido" : " pedidos atendidos");
    detalhe = "Faltam " + p.faltam + (p.faltam === 1 ? " pedido" : " pedidos") + " para ganhar um mimo.";
  }

  if (p.emAndamento > 0) {
    detalhe += " (" + p.emAndamento + (p.emAndamento === 1 ? " pedido em andamento" : " pedidos em andamento") + ")";
  }

  return (
    '<strong class="loyalty-title">' + titulo + "</strong>" +
    '<div class="loyalty-stamps" role="img" aria-label="' + p.marcados + " de " + PEDIDOS_PARA_MIMO + ' selos">' + selos + "</div>" +
    '<p class="loyalty-text">' + escapeHtml(detalhe) + "</p>"
  );
}

function renderLoyalty(fidelidade) {
  const box = document.getElementById("loyaltyBox");
  if (!box) return;

  if (!fidelidade) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }

  box.innerHTML = loyaltyHtml(fidelidade);
  box.hidden = false;
}

// Mostra o cartão de fidelidade assim que o telefone completo é digitado
function setupLoyalty() {
  const input = document.getElementById("customerPhone");
  if (!input) return;

  let timer = null;
  let ultimoTelefone = "";

  input.addEventListener("input", function () {
    const digitos = input.value.replace(/\D/g, "");

    clearTimeout(timer);

    if (digitos.length < 10) {
      ultimoTelefone = "";
      renderLoyalty(null);
      return;
    }

    if (digitos === ultimoTelefone) return;

    timer = setTimeout(async function () {
      ultimoTelefone = digitos;
      const fidelidade = await consultarFidelidade(digitos);

      // Ignora resposta antiga se o telefone mudou nesse meio tempo
      if (input.value.replace(/\D/g, "") !== digitos) return;

      renderLoyalty(fidelidade);
    }, 500);
  });
}

// =========================================================
// MENSAGEM DO WHATSAPP
// =========================================================

function buildOrderItems() {
  return getSelectedProducts().map(function (item) {
    const extras = adicionaisDoProduto(item.index);
    const valorAdicionais = extras.reduce(function (sum, extra) { return sum + extra.price; }, 0);
    const unitario = item.product.price + valorAdicionais;
    const nome = item.product.name + (extras.length ? " (Adicionais: " + extras.map(e => e.name).join(", ") + ")" : "");
    return {
      produto_id: item.product.id,
      nome: nome,
      quantidade: item.quantity,
      preco_unitario: unitario,
      subtotal: unitario * item.quantity,
      adicionais: extras.map(function (extra) { return { id: extra.id, nome: extra.name, preco: extra.price }; })
    };
  });
}

function buildWhatsappMessage(data) {
  let message = "🍓 *GELA GOURMET* 🍓\n\n";

  message += "📦 *Pedido nº " + data.pedidoId + "*\n\n";

  message += "👤 *Cliente:* " + data.name + "\n";
  message += "📞 *Telefone:* " + data.phone + "\n";

  if (data.birthday) {
    message += "🎂 *Aniversário:* " + formatBirthday(data.birthday) + "\n";
  }

  if (data.loyaltyText) {
    message += "🎁 *Fidelidade:* " + data.loyaltyText + "\n";
  }

  message += "\n🍦 *Pedido:*\n";

  data.itens.forEach(function (item) {
    message +=
      "• " +
      item.quantidade +
      "x " +
      item.nome +
      " — " +
      money(item.subtotal) +
      "\n";
  });

  message += "\n🛍️ *Subtotal:* " + money(data.subtotal) + "\n";

  if (data.orderType === "delivery") {
    if (data.combinar) {
      // Santa Cruz das Palmeiras: nenhum valor numérico de entrega
      message += "🚚 *Entrega:* " + TEXT_DELIVERY_TO_COMBINE + "\n";
      message += "💰 *Total dos produtos:* " + money(data.total) + "\n\n";
    } else {
      message += "🚚 *Entrega:* " + money(DELIVERY_FEE) + "\n";
      message += "💰 *Total:* " + money(data.total) + "\n\n";
    }
  } else {
    message += "🏪 *Retirada:* R$ 0,00\n";
    message += "💰 *Total:* " + money(data.total) + "\n\n";
  }

  message += "💳 *Pagamento:* " + paymentLabel(data.payment) + "\n";

  message +=
    "📦 *Tipo:* " +
    (data.orderType === "delivery" ? "Entrega" : "Retirada") +
    "\n";

  if (data.orderType === "delivery") {
    message += "📍 *Endereço:* " + data.address + "\n";
  }

  if (data.combinar) {
    message += "\n📌 *" + NOTE_SCP + "*\n";
  }

  if (data.note) {
    message += "\n📝 *Observação:* " + data.note + "\n";
  }

  message += "\n💗 Obrigado por pedir na Gela Gourmet!";

  return message;
}

// =========================================================
// CRIAR PEDIDO
// =========================================================

async function createOrder() {
  if (!validateOrder()) {
    return;
  }

  if (!supabaseClient) {
    showToast("Sem conexão com o sistema de pedidos. Tente novamente.", "error");
    return;
  }

  // Abre a aba do WhatsApp já no clique (síncrono) para o navegador
  // não bloquear o popup. Depois só trocamos o endereço da aba.
  const whatsappWindow = window.open("", "_blank");

  const button = document.getElementById("sendOrder");
  const originalText = button ? button.innerHTML : "";

  if (button) {
    button.disabled = true;
    button.textContent = "Registrando pedido...";
  }

  try {
    const nameInput = document.getElementById("customerName");
    const phoneInput = document.getElementById("customerPhone");
    const birthdayInput = document.getElementById("customerBirthday");
    const paymentInput = document.getElementById("paymentMethod");
    const noteInput = document.getElementById("customerNote");

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const birthday = birthdayInput ? birthdayInput.value : "";
    const payment = paymentInput.value;
    const note = noteInput ? noteInput.value.trim() : "";

    const orderType = getOrderType();
    const combinar = isDeliveryToCombine();

    const subtotal = getSubtotal();
    const total = getTotal(); // para Santa Cruz = só os geladinhos
    const itensPedido = buildOrderItems();

    const baseAddress = getAddress();

    // Endereço salvo no banco (o painel do vendedor lê este campo)
    let address = baseAddress;

    if (combinar) {
      address += " | " + NOTE_SCP;
    }

    if (note) {
      address += " | Observação: " + note;
    }

    // Reserva as unidades em uma operação transacional no banco antes de criar o pedido.
    // O banco bloqueia os registros para impedir que duas compras usem o mesmo saldo.
    const itensComEstoque = itensPedido
      .filter(item => products.some(p => String(p.id) === String(item.produto_id) && p.estoqueQuantidade !== null))
      .map(item => ({ produto_id: item.produto_id, quantidade: item.quantidade }));

    let estoqueReservado = false;
    if (itensComEstoque.length) {
      const reserva = await supabaseClient.rpc("baixar_estoque_produtos", { p_itens: itensComEstoque });
      if (reserva.error) throw reserva.error;
      window.__reservaEstoqueToken = reserva.data;
      estoqueReservado = true;
    }

    let result;
    try {
      result = await supabaseClient.rpc("criar_pedido", {
      p_cliente_nome: name,
      p_cliente_telefone: phone,
      p_cliente_endereco: address,
      p_itens: itensPedido,
      p_total: total,
      p_forma_pagamento: payment,
      p_tipo_entrega: orderType
      });
      if (result.error && estoqueReservado) {
        const estorno = await supabaseClient.rpc("repor_estoque_produtos", { p_token: window.__reservaEstoqueToken });
        if (estorno.error) console.error("Falha ao devolver estoque após erro no pedido:", estorno.error);
      }
    } catch (erroPedido) {
      if (estoqueReservado) {
        const estorno = await supabaseClient.rpc("repor_estoque_produtos", { p_token: window.__reservaEstoqueToken });
        if (estorno.error) console.error("Falha ao devolver estoque após erro no pedido:", estorno.error);
      }
      throw erroPedido;
    }

    if (result.error) {
      console.error("❌ Erro ao criar pedido:", result.error);
      throw result.error;
    }
    window.__reservaEstoqueToken = null;

    let dadosPedido = result.data;

    if (Array.isArray(dadosPedido)) {
      dadosPedido = dadosPedido[0];
    }

    let pedidoId = null;
    let token = null;

    if (dadosPedido && typeof dadosPedido === "object") {
      pedidoId =
        dadosPedido.id || dadosPedido.pedido_id || dadosPedido.id_pedido || null;

      token = dadosPedido.token || dadosPedido.pedido_token || null;
    } else {
      pedidoId = dadosPedido;
    }

    if (!pedidoId) {
      if (estoqueReservado) {
        const estorno = await supabaseClient.rpc("repor_estoque_produtos", { p_token: window.__reservaEstoqueToken });
        if (estorno.error) console.error("Falha ao devolver estoque sem confirmação do pedido:", estorno.error);
      }
      console.error("❌ O Supabase não retornou o ID do pedido.");

      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }

      showToast(
        "O pedido foi criado, mas não foi possível obter o número dele.",
        "error"
      );

      return;
    }

    // Guarda o pedido neste aparelho para o botão "Acompanhar pedido"
    const pedidoSalvo = {
      pedidoId: pedidoId,
      telefone: phone,
      token: token,
      status: "pendente",
      salvoEm: Date.now()
    };

    localStorage.setItem("gelaGourmetPedido", JSON.stringify(pedidoSalvo));

    pedidoAcompanhado = pedidoSalvo;
    statusAnteriorPedido = "pendente";

    // Salva o cliente (aniversário) e consulta a fidelidade.
    // Se algo falhar aqui, o pedido continua normalmente.
    await salvarCliente(name, phone, birthday);
    const fidelidade = await consultarFidelidade(phone);

    // WhatsApp
    const message = buildWhatsappMessage({
      pedidoId: pedidoId,
      name: name,
      phone: phone,
      birthday: birthday,
      loyaltyText: fidelidade ? loyaltyResumo(fidelidade) : "",
      itens: itensPedido,
      subtotal: subtotal,
      total: total,
      payment: payment,
      orderType: orderType,
      combinar: combinar,
      address: baseAddress,
      note: note
    });

    const whatsappUrl =
      "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(message);

    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, "_blank");
    }

    const entrega = {
      combinar: combinar,
      texto: getDeliveryLabel()
    };

    // Limpa carrinho e campos
    cart = Array(products.length).fill(0);
    adicionaisSelecionados = {};

    renderProducts();
    renderCart();
    updateTotal();
    // Busca os saldos atualizados após a reserva da venda.
    await loadProducts();

    nameInput.value = "";
    phoneInput.value = "";

    if (birthdayInput) {
      birthdayInput.value = "";
    }

    paymentInput.value = "";

    if (noteInput) {
      noteInput.value = "";
    }

    mostrarPedidoSucesso(
      pedidoId,
      token,
      itensPedido,
      total,
      whatsappUrl,
      entrega,
      fidelidade
    );

    // Atualiza o cartão de fidelidade do formulário (o campo de telefone foi limpo)
    renderLoyalty(null);
  } catch (error) {
    console.error("❌ ERRO COMPLETO:", error);

    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.close();
    }

    if (String((error && error.message) || "").includes("LOJA_FECHADA")) {
      // A loja foi fechada enquanto o cliente montava o pedido
      lojaAberta = false;
      aplicarStatusLoja();
      showToast(mensagemFechado, "error");
    } else {
      showToast(
        "Não foi possível registrar o pedido. Tente novamente em instantes.",
        "error"
      );
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText || "Finalizar pelo WhatsApp";
    }

    aplicarStatusLoja();
  }
}

// =========================================================
// CONFIGURAÇÃO DOS CAMPOS
// =========================================================

function updateOrderType() {
  const orderType = getOrderType();
  const isPickup = orderType === "pickup";

  const deliveryFields = document.getElementById("deliveryFields");
  const city = document.getElementById("city");
  const street = document.getElementById("street");
  const number = document.getElementById("number");
  const neighborhood = document.getElementById("neighborhood");

  if (deliveryFields) {
    deliveryFields.hidden = isPickup;
  }

  if (city) {
    city.disabled = isPickup;
  }

  const hasCity = city && city.value.trim() !== "";

  if (street) {
    street.disabled = isPickup || !hasCity;
    street.placeholder = hasCity
      ? "Digite sua rua..."
      : "Escolha a cidade primeiro...";
  }

  if (number) {
    number.disabled = isPickup;
  }

  if (neighborhood) {
    neighborhood.disabled = isPickup || !hasCity;
    neighborhood.placeholder = hasCity
      ? "Digite seu bairro..."
      : "Escolha a cidade primeiro...";
  }

  updateTotal();
}

function setupOrderButton() {
  const button = document.getElementById("sendOrder");

  if (!button) {
    console.error("ERRO: botão #sendOrder não encontrado.");
    return;
  }

  button.addEventListener("click", createOrder);
}

function setupOrderType() {
  document
    .querySelectorAll('input[name="orderType"]')
    .forEach(function (radio) {
      radio.addEventListener("change", updateOrderType);
    });

  updateOrderType();
}

function setupPhoneMask() {
  const input = document.getElementById("customerPhone");

  if (!input) {
    return;
  }

  input.addEventListener("input", function () {
    let value = input.value.replace(/\D/g, "").substring(0, 11);

    if (value.length <= 10) {
      value = value.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
    } else {
      value = value.replace(/^(\d{2})(\d{5})(\d{0,4})$/, "($1) $2-$3");
    }

    input.value = value;
  });
}

function setupCity() {
  const city = document.getElementById("city");

  if (!city) {
    console.error("Campo de cidade não encontrado.");
    return;
  }

  city.addEventListener("change", function () {
    updateOrderType();
    updateTotal();
  });

  updateOrderType();
}

function setupCartBar() {
  const bar = document.getElementById("cartBar");
  if (!bar) return;

  const orderSection = document.getElementById("pedido");
  if (!orderSection) return;

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        orderSectionVisible = entry.isIntersecting;
        syncCartBar();
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(orderSection);
}

// Botões "Acompanhar pedido" (cabeçalho e rodapé)
function setupTrackButtons() {
  document
    .querySelectorAll("#btnAcompanharPedido, [data-acompanhar]")
    .forEach(function (btn) {
      btn.addEventListener("click", function (event) {
        event.preventDefault();

        const pedidoSalvo = localStorage.getItem("gelaGourmetPedido");

        if (pedidoSalvo) {
          try {
            const pedido = JSON.parse(pedidoSalvo);

            if (pedido.token) {
              window.location.href =
                "acompanhar-pedido.html?token=" +
                encodeURIComponent(pedido.token);

              return;
            }
          } catch (erro) {
            console.error("Erro ao recuperar pedido:", erro);
          }
        }

        showToast("Nenhum pedido recente foi encontrado neste aparelho.", "error");
      });
    });
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
  iniciarMonitorLoja();
  loadProducts();

  setupOrderButton();
  setupOrderType();
  setupPhoneMask();
  setupBirthday();
  setupLoyalty();
  setupCity();
  setupCartBar();
  setupTrackButtons();
});

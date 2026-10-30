// REGRA DE BLOQUEIO DA LOJA
// Altere para false para fechar ou true para abrir
const LOJA_ABERTA = false; 

const MENSAGEM_FECHADO = "Estamos em treinamento/curso no momento e não estamos aceitando pedidos hoje. Voltaremos em breve!";

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

// Função para verificar se a loja está aberta
function verificarStatusLoja() {
  const localStatus = localStorage.getItem("LOJA_ABERTA");
  if (localStatus === "false" || !LOJA_ABERTA) {
    return false;
  }
  return true;
}

// =========================================================
// VARIÁVEIS
// =========================================================

let products = [];
let cart = [];
let adicionais = [];
let adicionaisSelecionados = {};

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

function describeProduct(name) {
  const n = normalizeText(name);

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
    const { data, error } = await supabaseClient
      .from("produtos")
      .select("id, nome, preco, imagem, disponivel")
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

    const adicionaisResult = await supabaseClient
      .from("adicionais")
      .select("id, nome, preco, disponivel")
      .order("id", { ascending: true });

    if (adicionaisResult.error) {
      console.error("Erro ao carregar adicionais:", adicionaisResult.error);
      adicionais = [];
    } else {
      adicionais = (adicionaisResult.data || [])
        .filter(function (item) { return item.disponivel !== false; })
        .map(function (item) {
          return { id: item.id, name: item.nome, price: Number(item.preco), disponivel: item.disponivel !== false };
        });
    }

    products = data.map(function (product) {
      return {
        id: product.id,
        name: product.nome,
        price: Number(product.preco),
        img: product.imagem,
        disponivel: product.disponivel !== false
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

function renderProducts() {
  if (!productsContainer) return;

  productsContainer.innerHTML = "";

  products.forEach(function (product, index) {
    const card = document.createElement("article");

    card.className = "card reveal";
    card.dataset.index = index;
    card.style.setProperty("--d", (index % 3) * 90 + "ms");

    if (!product.disponivel) {
      card.classList.add("is-off");
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

    body.innerHTML = `
      <h3>${escapeHtml(product.name)}</h3>
      <p class="card-desc">${escapeHtml(describeProduct(product.name))}</p>
      ${adicionais.length && product.disponivel ? `
        <div class="extras-box">
          <p class="extras-title">Adicionais</p>
          ${adicionais.map(function (extra) {
            const checked = (adicionaisSelecionados[index] || []).includes(extra.id) ? "checked" : "";
            return `<label class="extra-option">
              <input type="checkbox" ${checked} onchange="alternarAdicional(${index}, ${extra.id}, this.checked)">
              <span>${escapeHtml(extra.name)}</span>
              <strong>+ ${money(extra.price)}</strong>
            </label>`;
          }).join("")}
          <small>Selecione os adicionais para este sabor.</small>
        </div>` : ""}
      <div class="card-foot">
        <strong class="price">${money(product.price + precoAdicionais(index))}</strong>
        ${action}
      </div>
      ${
        product.disponivel
          ? ""
          : '<div class="indisponivel">Esgotado no momento. Os outros sabores seguem disponíveis.</div>'
      }
    `;

    card.appendChild(body);
    productsContainer.appendChild(card);

    if (window.observeReveal) {
      window.observeReveal(card);
    }
  });
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

  const before = cart[index];
  cart[index] = Math.max(0, cart[index] + amount);

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
    totalLabel.textContent = combine ? "Total dos geladinhos" : "Total";
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

function validateOrder() {
  // BLOQUEIO SE A LOJA ESTIVER FECHADA
  if (!verificarStatusLoja()) {
    alert(MENSAGEM_FECHADO);
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

function finalizarPedido() {
  if (!validateOrder()) {
    return;
  }

  alert("Iniciando envio do pedido...");
}

// Inicializa a aplicação
document.addEventListener("DOMContentLoaded", function () {
  loadProducts();
});

  const combine = !!(entrega && entrega.combinar);

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
        <span>${combine ? "Total dos geladinhos" : "Total"}</span>
        <strong>${money(total)}</strong>
      </div>

      ${
        combine
          ? '<p class="success-note">' + escapeHtml(NOTE_SCP) + ".</p>"
          : ""
      }

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

    window.location.href =
      "acompanhar-pedido.html?token=" + encodeURIComponent(token);
  });

  modal
    .querySelector("#successWhatsapp")
    .addEventListener("click", function () {
      window.open(whatsappUrl, "_blank");
    });


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

  if (data.email) {
    message += "✉️ *E-mail:* " + data.email + "\n";
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
      message += "💰 *Total dos geladinhos:* " + money(data.total) + "\n\n";
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
    const emailInput = document.getElementById("customerEmail");
    const paymentInput = document.getElementById("paymentMethod");
    const noteInput = document.getElementById("customerNote");

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : "";
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

    const result = await supabaseClient.rpc("criar_pedido", {
      p_cliente_nome: name,
      p_cliente_telefone: phone,
      p_cliente_endereco: address,
      p_itens: itensPedido,
      p_total: total,
      p_forma_pagamento: payment,
      p_tipo_entrega: orderType
    });

    if (result.error) {
      console.error("❌ Erro ao criar pedido:", result.error);
      throw result.error;
    }

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

    // WhatsApp
    const message = buildWhatsappMessage({
      pedidoId: pedidoId,
      name: name,
      phone: phone,
      email: email,
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

    nameInput.value = "";
    phoneInput.value = "";

    if (emailInput) {
      emailInput.value = "";
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
      entrega
    );
  } catch (error) {
    console.error("❌ ERRO COMPLETO:", error);

    if (whatsappWindow && !whatsappWindow.closed) {
      whatsappWindow.close();
    }

    showToast(
      "Não foi possível registrar o pedido. Tente novamente em instantes.",
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText || "Finalizar pelo WhatsApp";
    }
  }
}

// =========================================================
// CONFIGURAÇÃO DOS CAMPOS
// =========================================================

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
  const street = document.getElementById("street");
  const neighborhood = document.getElementById("neighborhood");

  if (!city) {
    return;
  }

  city.addEventListener("change", function () {
    const hasCity = city.value !== "";

    if (getOrderType() !== "pickup") {
      if (street) {
        street.disabled = !hasCity;
        street.placeholder = hasCity
          ? "Digite sua rua..."
          : "Escolha a cidade primeiro...";
      }

      if (neighborhood) {
        neighborhood.disabled = !hasCity;
        neighborhood.placeholder = hasCity
          ? "Digite seu bairro..."
          : "Escolha a cidade primeiro...";
      }
    }

    // Recalcula entrega, total e aviso conforme a cidade escolhida
    updateTotal();
  });
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
  loadProducts();

  setupOrderButton();
  setupOrderType();
  setupPhoneMask();
  setupCity();
  setupCartBar();
  setupTrackButtons();
});
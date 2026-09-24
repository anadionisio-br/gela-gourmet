// =========================================================
// GELA GOURMET - SCRIPT PRINCIPAL
// =========================================================

// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL =
  "https://aiirehncupywhmftzzmn.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

// =========================================================
// CONFIGURAÇÕES
// =========================================================

const WHATSAPP = "5519993149687";
const DELIVERY_FEE = 5;

// =========================================================
// VARIÁVEIS
// =========================================================

let products = [];
let cart = [];

// =========================================================
// ACOMPANHAMENTO DO PEDIDO
// =========================================================

let pedidoAcompanhado = null;
let statusAnteriorPedido = null;
let intervaloStatusPedido = null;

// =========================================================
// ELEMENTOS
// =========================================================

const productsContainer =
  document.getElementById("products");

const cartContainer =
  document.getElementById("cartItems");

const subtotalElement =
  document.getElementById("subtotal");

const deliveryElement =
  document.getElementById("deliveryFee");

const totalElement =
  document.getElementById("total");

// =========================================================
// DINHEIRO
// =========================================================

function money(value) {
  return Number(value || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}

// =========================================================
// ESCAPAR HTML
// =========================================================

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// =========================================================
// CARREGAR PRODUTOS
// =========================================================

async function loadProducts() {

  console.log("🍓 Carregando produtos...");

  if (!productsContainer) {

    console.error(
      "ERRO: elemento #products não existe no index.html."
    );

    return;
  }

  productsContainer.innerHTML = `
    <div style="
      width: 100%;
      text-align: center;
      padding: 40px 20px;
    ">
      <p>Carregando sabores... 🍓</p>
    </div>
  `;

  try {

    const { data, error } =
      await supabaseClient
        .from("produtos")
        .select(
          "id, nome, preco, imagem, disponivel"
        )
        .order("id", {
          ascending: true
        });

    if (error) {

      console.error(
        "❌ ERRO DO SUPABASE:",
        error
      );

      productsContainer.innerHTML = `
        <div style="
          width: 100%;
          text-align: center;
          padding: 40px 20px;
        ">

          <h3>
            Não foi possível carregar os sabores 😔
          </h3>

          <p>
            Verifique a conexão com o banco de dados.
          </p>

          <button
            type="button"
            onclick="loadProducts()"
            style="
              margin-top: 15px;
              padding: 12px 20px;
              border: none;
              border-radius: 10px;
              cursor: pointer;
            "
          >
            Tentar novamente
          </button>

        </div>
      `;

      return;
    }

    console.log(
      "✅ Produtos recebidos do Supabase:",
      data
    );

    if (!data || data.length === 0) {

      products = [];
      cart = [];

      productsContainer.innerHTML = `
        <div style="
          width: 100%;
          text-align: center;
          padding: 40px 20px;
        ">

          <h3>
            Nenhum produto encontrado 🍦
          </h3>

          <p>
            Cadastre os sabores na tabela
            <strong>produtos</strong> do Supabase.
          </p>

        </div>
      `;

      updateTotal();

      return;
    }

    // =====================================================
    // CONVERTER PRODUTOS
    // =====================================================

    products = data.map(function(product) {

      return {
        id: product.id,
        name: product.nome,
        price: Number(product.preco),
        img: product.imagem,
        disponivel: product.disponivel !== false
      };

    });

    console.log(
      "✅ Produtos convertidos:",
      products
    );

    cart =
      Array(products.length).fill(0);

    renderProducts();

    renderCart();

    updateTotal();

  } catch (error) {

    console.error(
      "❌ ERRO AO CARREGAR PRODUTOS:",
      error
    );

    productsContainer.innerHTML = `
      <div style="
        width: 100%;
        text-align: center;
        padding: 40px 20px;
      ">

        <h3>
          Ocorreu um erro 😔
        </h3>

        <p>
          Abra o console do navegador para ver o erro.
        </p>

        <button
          type="button"
          onclick="loadProducts()"
          style="
            margin-top: 15px;
            padding: 12px 20px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
          "
        >
          Tentar novamente
        </button>

      </div>
    `;
  }
}

// =========================================================
// MOSTRAR PRODUTOS
// =========================================================

function renderProducts() {

  if (!productsContainer) {
    return;
  }

  productsContainer.innerHTML = "";

  products.forEach(
    function(product, index) {

      let imagem =
        product.img || "";

      if (
        imagem &&
        !imagem.startsWith("http") &&
        !imagem.startsWith("/") &&
        !imagem.startsWith("imagens/")
      ) {
        imagem =
          "imagens/" + imagem;
      }

      const card =
        document.createElement("div");

      card.className = "card";

      if (product.disponivel) {

        card.innerHTML = `
          <img
            class="card-photo"
            src="${escapeHtml(imagem)}"
            alt="${escapeHtml(product.name)}"
            onerror="this.style.display='none';"
          >

          <div class="card-body">

            <h3>
              ${escapeHtml(product.name)}
            </h3>

            <strong>
              ${money(product.price)}
            </strong>

            <div class="qty">

              <button
                type="button"
                onclick="changeQuantity(${index}, -1)"
              >
                −
              </button>

              <span id="quantity-${index}">
                ${cart[index] || 0}
              </span>

              <button
                type="button"
                onclick="changeQuantity(${index}, 1)"
              >
                +
              </button>

            </div>

          </div>
        `;

      } else {

        card.innerHTML = `
          <img
            class="card-photo"
            src="${escapeHtml(imagem)}"
            alt="${escapeHtml(product.name)}"
            onerror="this.style.display='none';"
          >

          <div class="card-body">

            <h3>
              ${escapeHtml(product.name)}
            </h3>

            <strong>
              ${money(product.price)}
            </strong>

            <div class="indisponivel">
              Indisponível
            </div>

          </div>
        `;
      }

      productsContainer.appendChild(card);
    }
  );
}

// =========================================================
// QUANTIDADE
// =========================================================

function changeQuantity(index, amount) {

  if (!products[index]) {
    return;
  }

  if (!products[index].disponivel) {
    return;
  }

  cart[index] += amount;

  if (cart[index] < 0) {
    cart[index] = 0;
  }

  updateQuantityDisplay(index);

  renderCart();

  updateTotal();
}

// =========================================================
// ATUALIZAR QUANTIDADE
// =========================================================

function updateQuantityDisplay(index) {

  const element =
    document.getElementById(
      "quantity-" + index
    );

  if (element) {
    element.textContent =
      cart[index];
  }
}

// =========================================================
// ADICIONAR
// =========================================================

function addToCart(index) {

  if (!products[index]) {
    return;
  }

  if (!products[index].disponivel) {

    alert(
      "Este sabor está indisponível."
    );

    return;
  }

  cart[index]++;

  updateQuantityDisplay(index);

  renderCart();

  updateTotal();
}

// =========================================================
// REMOVER
// =========================================================

function removeFromCart(index) {

  if (!products[index]) {
    return;
  }

  if (cart[index] > 0) {
    cart[index]--;
  }

  updateQuantityDisplay(index);

  renderCart();

  updateTotal();
}

// =========================================================
// PRODUTOS SELECIONADOS
// =========================================================

function getSelectedProducts() {

  return products
    .map(function(product, index) {

      return {
        product: product,
        quantity: cart[index]
      };

    })
    .filter(function(item) {

      return item.quantity > 0;

    });
}

// =========================================================
// SUBTOTAL
// =========================================================

function getSubtotal() {

  return getSelectedProducts()
    .reduce(
      function(total, item) {

        return total +
          item.product.price *
          item.quantity;

      },
      0
    );
}

// =========================================================
// TIPO DE PEDIDO
// =========================================================

function getOrderType() {

  const selected =
    document.querySelector(
      'input[name="orderType"]:checked'
    );

  if (!selected) {
    return "delivery";
  }

  return selected.value;
}

// =========================================================
// TAXA
// =========================================================

function getDeliveryFee() {

  if (
    getOrderType() === "delivery"
  ) {
    return DELIVERY_FEE;
  }

  return 0;
}

// =========================================================
// TOTAL
// =========================================================

function getTotal() {

  return getSubtotal() +
    getDeliveryFee();
}

// =========================================================
// CARRINHO
// =========================================================

function renderCart() {

  if (!cartContainer) {
    return;
  }

  const selected =
    getSelectedProducts();

  if (selected.length === 0) {

    cartContainer.innerHTML = `
      <p class="empty">
        Seu carrinho está vazio. 💗
      </p>
    `;

    return;
  }

  cartContainer.innerHTML = "";

  selected.forEach(
    function(item) {

      const cartItem =
        document.createElement("div");

      cartItem.className =
        "cart-item";

      const subtotal =
        item.product.price *
        item.quantity;

      cartItem.innerHTML = `
        <div class="cart-item-info">

          <strong>
            ${escapeHtml(item.product.name)}
          </strong>

        </div>

        <div class="cart-item-total">

          <strong>
            ${money(subtotal)}
          </strong>

        </div>
      `;

      cartContainer.appendChild(
        cartItem
      );
    }
  );
}

// =========================================================
// ATUALIZAR TOTAL
// =========================================================

function updateTotal() {

  const subtotal =
    getSubtotal();

  const delivery =
    getDeliveryFee();

  const total =
    subtotal + delivery;

  if (subtotalElement) {
    subtotalElement.textContent =
      money(subtotal);
  }

  if (deliveryElement) {
    deliveryElement.textContent =
      money(delivery);
  }

  if (totalElement) {
    totalElement.textContent =
      money(total);
  }
}

// =========================================================
// ÁREA DO ENDEREÇO
// =========================================================

function getAddressContainer() {

  const city =
    document.getElementById("city");

  const street =
    document.getElementById("street");

  const number =
    document.getElementById("number");

  const neighborhood =
    document.getElementById(
      "neighborhood"
    );

  const fields = [
    city,
    street,
    number,
    neighborhood
  ].filter(Boolean);

  if (fields.length === 0) {
    return null;
  }

  const possibleContainer =
    fields[0].closest(
      ".address-row, .address-fields, .address-section, .address-container, [data-address]"
    );

  if (possibleContainer) {
    return possibleContainer;
  }

  let parent =
    fields[0].parentElement;

  while (
    parent &&
    parent !== document.body
  ) {

    const containsAll =
      fields.every(
        function(field) {

          return parent.contains(field);

        }
      );

    if (containsAll) {
      return parent;
    }

    parent =
      parent.parentElement;
  }

  return null;
}

// =========================================================
// MOSTRAR / ESCONDER ENDEREÇO
// =========================================================

function updateAddressVisibility() {

  const type =
    getOrderType();

  const city =
    document.getElementById("city");

  const street =
    document.getElementById("street");

  const number =
    document.getElementById("number");

  const neighborhood =
    document.getElementById(
      "neighborhood"
    );

  const fields = [
    city,
    street,
    number,
    neighborhood
  ].filter(Boolean);

  const addressContainer =
    getAddressContainer();

  if (type === "pickup") {

    if (addressContainer) {

      addressContainer.style.display =
        "none";

    } else {

      fields.forEach(
        function(field) {

          field.style.display =
            "none";

          field.disabled =
            true;

          field.value =
            "";

        }
      );
    }

    fields.forEach(
      function(field) {

        field.disabled =
          true;

        field.value =
          "";

      }
    );

  } else {

    if (addressContainer) {

      addressContainer.style.display =
        "";

    } else {

      fields.forEach(
        function(field) {

          field.style.display =
            "";

        }
      );
    }

    fields.forEach(
      function(field) {

        field.disabled =
          false;

      }
    );

    if (street) {

      street.disabled =
        !city || !city.value;

    }

    if (neighborhood) {

      neighborhood.disabled =
        !city || !city.value;

    }
  }
}

// =========================================================
// ENTREGA / RETIRADA
// =========================================================

function updateOrderType() {

  const type =
    getOrderType();

  updateAddressVisibility();

  updateTotal();

  console.log(
    "📦 Tipo de pedido:",
    type
  );
}

// =========================================================
// ENDEREÇO
// =========================================================

function getAddress() {

  if (
    getOrderType() === "pickup"
  ) {

    return "Retirada no local";
  }

  const city =
    document.getElementById("city");

  const street =
    document.getElementById("street");

  const number =
    document.getElementById("number");

  const neighborhood =
    document.getElementById(
      "neighborhood"
    );

  return [
    city
      ? city.value
      : "",

    street
      ? street.value.trim()
      : "",

    number
      ? number.value.trim()
      : "",

    neighborhood
      ? neighborhood.value.trim()
      : ""

  ]
    .filter(
      function(value) {

        return value !== "";

      }
    )
    .join(", ");
}

// =========================================================
// ITENS DO PEDIDO
// =========================================================

function buildOrderItems() {

  return getSelectedProducts()
    .map(function(item) {

      return {

        id:
          item.product.id,

        nome:
          item.product.name,

        quantidade:
          item.quantity,

        preco:
          item.product.price,

        subtotal:
          item.product.price *
          item.quantity

      };

    });
}

// =========================================================
// VALIDAR PEDIDO
// =========================================================

function validateOrder() {

  const selected =
    getSelectedProducts();

  if (selected.length === 0) {

    alert(
      "Adicione pelo menos um sabor ao carrinho. 🍓"
    );

    return false;
  }

  const nameInput =
    document.getElementById(
      "customerName"
    );

  const phoneInput =
    document.getElementById(
      "customerPhone"
    );

  const paymentInput =
    document.getElementById(
      "paymentMethod"
    );

  const name =
    nameInput
      ? nameInput.value.trim()
      : "";

  const phone =
    phoneInput
      ? phoneInput.value.trim()
      : "";

  const payment =
    paymentInput
      ? paymentInput.value
      : "";

  if (!name) {

    alert(
      "Digite seu nome."
    );

    if (nameInput) {
      nameInput.focus();
    }

    return false;
  }

  if (!phone) {

    alert(
      "Digite seu telefone."
    );

    if (phoneInput) {
      phoneInput.focus();
    }

    return false;
  }

  if (!payment) {

    alert(
      "Selecione a forma de pagamento."
    );

    if (paymentInput) {
      paymentInput.focus();
    }

    return false;
  }

  if (
    getOrderType() === "delivery"
  ) {

    const city =
      document.getElementById("city");

    const street =
      document.getElementById("street");

    const number =
      document.getElementById("number");

    const neighborhood =
      document.getElementById(
        "neighborhood"
      );

    if (
      !city ||
      !city.value ||
      !street ||
      !street.value.trim() ||
      !number ||
      !number.value.trim() ||
      !neighborhood ||
      !neighborhood.value.trim()
    ) {

      alert(
        "Preencha todos os campos do endereço para a entrega."
      );

      return false;
    }
  }

  return true;
}

// =========================================================
// FORMA DE PAGAMENTO
// =========================================================

function paymentLabel(payment) {

  const labels = {

    pix: "PIX",

    dinheiro: "Dinheiro",

    cartao: "Cartão"

  };

  return labels[payment] ||
    payment ||
    "Não informado";
}

// =========================================================
// STATUS DO PEDIDO
// =========================================================

function getStatusPedidoInfo(status) {

  const statusInfo = {

    pendente: {
      titulo: "Pedido recebido! 💗",
      mensagem:
        "Seu pedido foi recebido e está aguardando confirmação.",
      icone: "🕐"
    },

    preparo: {
      titulo:
        "Seu pedido está sendo preparado! 🍓",
      mensagem:
        "Já começamos a preparar seus geladinhos. Em breve estará prontinho!",
      icone: "👩‍🍳"
    },

    entrega: {
      titulo:
        "Seu pedido saiu para entrega! 🛵",
      mensagem:
        "Seu pedido já está a caminho. Fique de olho porque ele chegará em breve!",
      icone: "🛵"
    },

    entregue: {
      titulo:
        "Pedido entregue! 💕",
      mensagem:
        "Seu pedido foi entregue. Esperamos que você aproveite muito!",
      icone: "💗"
    },

    cancelado: {
      titulo:
        "Pedido cancelado 😔",
      mensagem:
        "Infelizmente, seu pedido foi cancelado. Entre em contato com a Gela Gourmet se precisar de ajuda.",
      icone: "❌"
    }

  };

  return (
    statusInfo[status] || {
      titulo: "Status atualizado",
      mensagem:
        "Seu pedido teve uma atualização.",
      icone: "📦"
    }
  );
}

// =========================================================
// SALVAR PEDIDO
// =========================================================

function salvarPedidoAcompanhado(
  pedidoId,
  telefone,
  status,
  token
) {

  const dados = {

    pedidoId:
      pedidoId,

    telefone:
      telefone,

    status:
      status || "pendente",

    token:
      token || null,

    salvoEm:
      Date.now()

  };

  localStorage.setItem(
    "gelaGourmetPedido",
    JSON.stringify(dados)
  );

  pedidoAcompanhado =
    dados;

  statusAnteriorPedido =
    dados.status;
}

// =========================================================
// RECUPERAR PEDIDO
// =========================================================

function recuperarPedidoAcompanhado() {

  try {

    const salvo =
      localStorage.getItem(
        "gelaGourmetPedido"
      );

    if (!salvo) {
      return null;
    }

    const dados =
      JSON.parse(salvo);

    if (
      !dados ||
      !dados.pedidoId
    ) {
      return null;
    }

    return dados;

  } catch (error) {

    console.error(
      "Erro ao recuperar pedido:",
      error
    );

    return null;
  }
}

// =========================================================
// CONSULTAR STATUS
// =========================================================

async function consultarStatusPedido() {

  if (!pedidoAcompanhado) {
    return;
  }

  if (
    !pedidoAcompanhado.telefone
  ) {
    return;
  }

  try {

    const result =
      await supabaseClient.rpc(
        "consultar_status_pedido",
        {
          p_pedido_id:
            pedidoAcompanhado.pedidoId,

          p_telefone:
            pedidoAcompanhado.telefone
        }
      );

    if (result.error) {

      console.error(
        "Erro ao consultar status:",
        result.error
      );

      return;
    }

    const dados =
      result.data;

    if (
      !dados ||
      !Array.isArray(dados) ||
      dados.length === 0
    ) {
      return;
    }

    const novoStatus =
      dados[0].status;

    if (
      statusAnteriorPedido &&
      novoStatus !==
        statusAnteriorPedido
    ) {

      mostrarAtualizacaoStatus(
        novoStatus
      );
    }

    statusAnteriorPedido =
      novoStatus;

    pedidoAcompanhado.status =
      novoStatus;

    localStorage.setItem(
      "gelaGourmetPedido",
      JSON.stringify(
        pedidoAcompanhado
      )
    );

  } catch (error) {

    console.error(
      "Erro ao acompanhar pedido:",
      error
    );
  }
}

// =========================================================
// INICIAR ACOMPANHAMENTO
// =========================================================

function iniciarAcompanhamentoPedido() {

  if (!pedidoAcompanhado) {
    return;
  }

  if (intervaloStatusPedido) {

    clearInterval(
      intervaloStatusPedido
    );
  }

  consultarStatusPedido();

  intervaloStatusPedido =
    setInterval(
      consultarStatusPedido,
      10000
    );
}

// =========================================================
// PARAR ACOMPANHAMENTO
// =========================================================

function pararAcompanhamentoPedido() {

  if (intervaloStatusPedido) {

    clearInterval(
      intervaloStatusPedido
    );

    intervaloStatusPedido =
      null;
  }
}

// =========================================================
// ATUALIZAÇÃO DE STATUS
// =========================================================

function mostrarAtualizacaoStatus(
  status
) {

  const info =
    getStatusPedidoInfo(status);

  const existente =
    document.querySelector(
      ".status-update-overlay"
    );

  if (existente) {
    existente.remove();
  }

  const overlay =
    document.createElement("div");

  overlay.className =
    "status-update-overlay";

  overlay.innerHTML = `
    <div class="status-update-modal">

      <button
        type="button"
        class="status-update-close"
        aria-label="Fechar"
      >
        ×
      </button>

      <div class="status-update-icon">
        ${info.icone}
      </div>

      <span class="status-update-small">
        ATUALIZAÇÃO DO PEDIDO
      </span>

      <h2>
        ${escapeHtml(info.titulo)}
      </h2>

      <p>
        ${escapeHtml(info.mensagem)}
      </p>

      <div class="status-update-number">

        Pedido

        <strong>
          #${escapeHtml(
            pedidoAcompanhado.pedidoId
          )}
        </strong>

      </div>

      <button
        type="button"
        class="status-update-button"
        id="fecharStatusUpdate"
      >
        Entendi 💗
      </button>

    </div>
  `;

  document.body.appendChild(
    overlay
  );

  document.body.style.overflow =
    "hidden";

  function fechar() {

    overlay.remove();

    document.body.style.overflow =
      "";
  }

  const close =
    overlay.querySelector(
      ".status-update-close"
    );

  const button =
    overlay.querySelector(
      "#fecharStatusUpdate"
    );

  if (close) {

    close.addEventListener(
      "click",
      fechar
    );
  }

  if (button) {

    button.addEventListener(
      "click",
      fechar
    );
  }

  overlay.addEventListener(
    "click",
    function(event) {

      if (
        event.target === overlay
      ) {
        fechar();
      }

    }
  );
}

// =========================================================
// MOSTRAR PEDIDO EM ANDAMENTO
// =========================================================

function mostrarPedidoEmAndamento() {

  if (!pedidoAcompanhado) {
    return;
  }

  const existente =
    document.querySelector(
      ".pedido-acompanhamento"
    );

  if (existente) {
    existente.remove();
  }

  const info =
    getStatusPedidoInfo(
      pedidoAcompanhado.status ||
        "pendente"
    );

  const acompanhamento =
    document.createElement("div");

  acompanhamento.className =
    "pedido-acompanhamento";

  acompanhamento.innerHTML = `
    <div class="pedido-acompanhamento-icon">
      ${info.icone}
    </div>

    <div class="pedido-acompanhamento-info">

      <span>
        PEDIDO #${escapeHtml(
          pedidoAcompanhado.pedidoId
        )}
      </span>

      <strong>
        ${escapeHtml(info.titulo)}
      </strong>

      <small>
        ${escapeHtml(info.mensagem)}
      </small>

    </div>

    <button
      type="button"
      id="fecharAcompanhamento"
      aria-label="Fechar acompanhamento"
    >
      ×
    </button>
  `;

  document.body.appendChild(
    acompanhamento
  );

  const fechar =
    acompanhamento.querySelector(
      "#fecharAcompanhamento"
    );

  if (fechar) {

    fechar.addEventListener(
      "click",
      function() {

        acompanhamento.remove();

      }
    );
  }
}

// =========================================================
// VERIFICAR PEDIDO SALVO
// =========================================================

function verificarPedidoSalvo() {

  const pedido =
    recuperarPedidoAcompanhado();

  if (!pedido) {
    return;
  }

  pedidoAcompanhado =
    pedido;

  statusAnteriorPedido =
    pedido.status || null;

  iniciarAcompanhamentoPedido();
}

// =========================================================
// MODAL DE SUCESSO
// =========================================================

function mostrarPedidoSucesso(
  pedidoId,
  token,
  itens,
  total,
  whatsappUrl
) {

  const itensHtml =
    itens
      .map(function(item) {

        return `
          <div class="success-item">

            <span>
              ${item.quantidade}x
              ${escapeHtml(item.nome)}
            </span>

            <strong>
              ${money(item.subtotal)}
            </strong>

          </div>
        `;

      })
      .join("");

  const modal =
    document.createElement("div");

  modal.className =
    "success-overlay";

  modal.innerHTML = `

    <div class="success-modal">

      <button
        type="button"
        class="success-close"
        aria-label="Fechar"
      >
        ×
      </button>

      <div class="success-icon">
        ✓
      </div>

      <span class="success-small">
        PEDIDO RECEBIDO
      </span>

      <h2>
        Tudo certinho! 💗
      </h2>

      <p class="success-message">
        Seu pedido foi registrado com sucesso.
        Obrigada por escolher a Gela Gourmet!
      </p>

      <div class="success-number">

        <span>
          Número do pedido
        </span>

        <strong>
          #${escapeHtml(pedidoId)}
        </strong>

      </div>

      <div class="success-items">
        ${itensHtml}
      </div>

      <div class="success-total">

        <span>
          Total
        </span>

        <strong>
          ${money(total)}
        </strong>

      </div>

      <div class="success-actions">

        <button
          type="button"
          class="success-track"
          id="successTrack"
        >
          Acompanhar pedido
        </button>

        <button
          type="button"
          class="success-whatsapp"
          id="successWhatsapp"
        >
          Abrir WhatsApp novamente
        </button>

        <button
          type="button"
          class="success-home"
          id="successHome"
        >
          Voltar para o cardápio
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(
    modal
  );

  document.body.style.overflow =
    "hidden";

  // =====================================================
  // FECHAR MODAL
  // =====================================================

  function fecharModal() {

    modal.remove();

    document.body.style.overflow =
      "";
  }

  const closeButton =
    modal.querySelector(
      ".success-close"
    );

  if (closeButton) {

    closeButton.addEventListener(
      "click",
      fecharModal
    );
  }

  const homeButton =
    modal.querySelector(
      "#successHome"
    );

  if (homeButton) {

    homeButton.addEventListener(
      "click",
      fecharModal
    );
  }

  modal.addEventListener(
    "click",
    function(event) {

      if (
        event.target === modal
      ) {

        fecharModal();
      }

    }
  );

  // =====================================================
  // ACOMPANHAR PEDIDO
  // =====================================================

  const trackButton =
    modal.querySelector(
      "#successTrack"
    );

  if (trackButton) {

    trackButton.addEventListener(
      "click",
      function() {

        if (!token) {

          alert(
            "O pedido foi criado, mas o banco não retornou o código de acompanhamento."
          );

          console.error(
            "Token do pedido não encontrado."
          );

          return;
        }

        const dados = {

          pedidoId:
            pedidoId,

          token:
            token,

          salvoEm:
            Date.now()

        };

        localStorage.setItem(
          "gelaGourmetPedido",
          JSON.stringify(dados)
        );

        window.location.href =
          "acompanhar-pedido.html?token=" +
          encodeURIComponent(token);

      }
    );
  }

  // =====================================================
  // WHATSAPP
  // =====================================================

  const whatsappButton =
    modal.querySelector(
      "#successWhatsapp"
    );

  if (whatsappButton) {

    whatsappButton.addEventListener(
      "click",
      function() {

        window.open(
          whatsappUrl,
          "_blank"
        );

      }
    );
  }
}

// =========================================================
// CRIAR PEDIDO
// =========================================================

async function createOrder() {

  if (!validateOrder()) {
    return;
  }

  // =====================================================
  // ABRIR A ABA DO WHATSAPP JÁ AQUI (AINDA NO CLIQUE)
  // =====================================================
  // Isso precisa acontecer de forma síncrona, direto no
  // clique do cliente, para o navegador não bloquear o
  // popup. Mais abaixo, quando a mensagem estiver pronta,
  // só trocamos o endereço desta aba para o link do
  // WhatsApp — assim ele abre sozinho, sem o cliente
  // precisar clicar em nada de novo.
  const whatsappWindow =
    window.open(
      "",
      "_blank"
    );

  const button =
    document.getElementById(
      "sendOrder"
    );

  const originalText =
    button
      ? button.innerHTML
      : "";

  if (button) {

    button.disabled =
      true;

    button.innerHTML =
      "⏳ Registrando pedido...";
  }

  try {

    const nameInput =
      document.getElementById(
        "customerName"
      );

    const phoneInput =
      document.getElementById(
        "customerPhone"
      );

    const paymentInput =
      document.getElementById(
        "paymentMethod"
      );

    const noteInput =
      document.getElementById(
        "customerNote"
      );

    const name =
      nameInput
        ? nameInput.value.trim()
        : "";

    const phone =
      phoneInput
        ? phoneInput.value.trim()
        : "";

    const payment =
      paymentInput
        ? paymentInput.value
        : "";

    const note =
      noteInput
        ? noteInput.value.trim()
        : "";

    const orderType =
      getOrderType();

    let address =
      getAddress();

    const itensPedido =
      buildOrderItems();

    const total =
      getTotal();

    // =====================================================
    // OBSERVAÇÃO
    // =====================================================

    if (note) {

      address +=
        " | Observação: " +
        note;
    }

    console.log(
      "📦 Enviando pedido..."
    );

    // =====================================================
    // CRIAR PEDIDO NO SUPABASE
    // =====================================================

    const result =
      await supabaseClient.rpc(
        "criar_pedido",
        {

          p_cliente_nome:
            name,

          p_cliente_telefone:
            phone,

          p_cliente_endereco:
            address,

          p_itens:
            itensPedido,

          p_total:
            total,

          p_forma_pagamento:
            payment,

          p_tipo_entrega:
            orderType

        }
      );

    // =====================================================
    // VERIFICAR ERRO
    // =====================================================

    if (result.error) {

      console.error(
        "❌ Erro ao criar pedido:",
        result.error
      );

      throw result.error;
    }

    // =====================================================
    // PEGAR DADOS RETORNADOS PELO RPC
    // =====================================================

    console.log(
      "📦 Resposta completa do criar_pedido:",
      result.data
    );

    let dadosPedido =
      result.data;

    // Caso o Supabase retorne array
    if (
      Array.isArray(dadosPedido)
    ) {

      dadosPedido =
        dadosPedido[0];
    }

    let pedidoId =
      null;

    let token =
      null;

    if (
      dadosPedido &&
      typeof dadosPedido === "object"
    ) {

      pedidoId =
        dadosPedido.id ||
        dadosPedido.pedido_id ||
        dadosPedido.id_pedido ||
        null;

      token =
        dadosPedido.token ||
        dadosPedido.pedido_token ||
        null;

    } else {

      pedidoId =
        dadosPedido;
    }

    console.log(
      "🆔 ID do pedido:",
      pedidoId
    );

    console.log(
      "🔑 Token do pedido:",
      token
    );

    // =====================================================
    // GARANTIR ID
    // =====================================================

    if (!pedidoId) {

      console.error(
        "❌ O Supabase não retornou o ID do pedido."
      );

      if (
        whatsappWindow &&
        !whatsappWindow.closed
      ) {

        whatsappWindow.close();
      }

      alert(
        "O pedido foi criado, mas não foi possível obter o número do pedido."
      );

      return;
    }

    // =====================================================
    // SALVAR PEDIDO LOCALMENTE
    // =====================================================

    const pedidoSalvo = {

      pedidoId:
        pedidoId,

      telefone:
        phone,

      token:
        token,

      status:
        "pendente",

      salvoEm:
        Date.now()

    };

    localStorage.setItem(
      "gelaGourmetPedido",
      JSON.stringify(pedidoSalvo)
    );

    pedidoAcompanhado =
      pedidoSalvo;

    statusAnteriorPedido =
      "pendente";

    // =====================================================
    // WHATSAPP
    // =====================================================

    let message =
      "🍓 *GELA GOURMET* 🍓\n\n";

    message +=
      "📦 *Pedido nº " +
      pedidoId +
      "*\n\n";

    message +=
      "👤 *Cliente:* " +
      name +
      "\n";

    message +=
      "📞 *Telefone:* " +
      phone +
      "\n\n";

    message +=
      "🍦 *Pedido:*\n";

    itensPedido.forEach(
      function(item) {

        message +=
          "• " +
          item.quantidade +
          "x " +
          item.nome +
          " — " +
          money(item.subtotal) +
          "\n";

      }
    );

    message +=
      "\n";

    message +=
      "🛍️ *Subtotal:* " +
      money(getSubtotal()) +
      "\n";

    if (
      orderType === "delivery"
    ) {

      message +=
        "🚚 *Entrega:* " +
        money(DELIVERY_FEE) +
        "\n";

    } else {

      message +=
        "🏪 *Retirada:* R$ 0,00\n";
    }

    message +=
      "💰 *Total:* " +
      money(total) +
      "\n\n";

    message +=
      "💳 *Pagamento:* " +
      paymentLabel(payment) +
      "\n";

    message +=
      "📦 *Tipo:* " +
      (
        orderType === "delivery"
          ? "Entrega"
          : "Retirada"
      ) +
      "\n";

    // =====================================================
    // ENDEREÇO
    // =====================================================

    if (
      orderType === "delivery"
    ) {

      message +=
        "📍 *Endereço:* " +
        getAddress() +
        "\n";
    }

    // =====================================================
    // OBSERVAÇÃO
    // =====================================================

    if (note) {

      message +=
        "\n📝 *Observação:* " +
        note +
        "\n";
    }

    message +=
      "\n💗 Obrigado por pedir na Gela Gourmet!";

    const whatsappUrl =
      "https://wa.me/" +
      WHATSAPP +
      "?text=" +
      encodeURIComponent(message);

    // =====================================================
    // ENVIAR AUTOMATICAMENTE PARA O WHATSAPP
    // =====================================================
    // Assim que o pedido é registrado, a mensagem já cai
    // pronta no WhatsApp — o cliente não precisa clicar em
    // nenhum botão extra para enviar.

    if (
      whatsappWindow &&
      !whatsappWindow.closed
    ) {

      whatsappWindow.location.href =
        whatsappUrl;

    } else {

      // Se o navegador bloqueou a abertura automática
      // (ex.: Safari/iOS em alguns casos), tenta abrir
      // de novo como reserva.
      window.open(
        whatsappUrl,
        "_blank"
      );
    }

    // =====================================================
    // LIMPAR CARRINHO
    // =====================================================

    cart =
      Array(products.length).fill(0);

    renderProducts();

    renderCart();

    updateTotal();

    // =====================================================
    // LIMPAR CAMPOS
    // =====================================================

    if (nameInput) {
      nameInput.value = "";
    }

    if (phoneInput) {
      phoneInput.value = "";
    }

    if (paymentInput) {
      paymentInput.value = "";
    }

    if (noteInput) {
      noteInput.value = "";
    }

    // =====================================================
    // MOSTRAR SUCESSO
    // =====================================================

    mostrarPedidoSucesso(
      pedidoId,
      token,
      itensPedido,
      total,
      whatsappUrl
    );

  } catch (error) {

    console.error(
      "❌ ERRO COMPLETO:",
      error
    );

    if (
      typeof whatsappWindow !== "undefined" &&
      whatsappWindow &&
      !whatsappWindow.closed
    ) {

      whatsappWindow.close();
    }

    alert(
      "Não foi possível registrar o pedido.\n\n" +
      "Verifique o console do navegador."
    );

  } finally {

    if (button) {

      button.disabled =
        false;

      button.innerHTML =
        originalText ||
        "📱 Finalizar pedido pelo WhatsApp";
    }
  }
}

// =========================================================
// BOTÃO DO PEDIDO
// =========================================================

function setupOrderButton() {

  const button =
    document.getElementById(
      "sendOrder"
    );

  if (!button) {

    console.error(
      "ERRO: botão #sendOrder não encontrado."
    );

    return;
  }

  button.addEventListener(
    "click",
    createOrder
  );
}

// =========================================================
// ENTREGA / RETIRADA
// =========================================================

function setupOrderType() {

  const radios =
    document.querySelectorAll(
      'input[name="orderType"]'
    );

  radios.forEach(
    function(radio) {

      radio.addEventListener(
        "change",
        updateOrderType
      );

    }
  );

  updateOrderType();
}

// =========================================================
// TELEFONE
// =========================================================

function setupPhoneMask() {

  const input =
    document.getElementById(
      "customerPhone"
    );

  if (!input) {
    return;
  }

  input.addEventListener(
    "input",
    function() {

      let value =
        input.value.replace(
          /\D/g,
          ""
        );

      if (value.length > 11) {

        value =
          value.substring(
            0,
            11
          );
      }

      if (value.length <= 10) {

        value =
          value.replace(
            /^(\d{2})(\d{4})(\d{0,4})$/,
            "($1) $2-$3"
          );

      } else {

        value =
          value.replace(
            /^(\d{2})(\d{5})(\d{0,4})$/,
            "($1) $2-$3"
          );
      }

      input.value =
        value;
    }
  );
}

// =========================================================
// CIDADE
// =========================================================

function setupCity() {

  const city =
    document.getElementById(
      "city"
    );

  const street =
    document.getElementById(
      "street"
    );

  const neighborhood =
    document.getElementById(
      "neighborhood"
    );

  if (!city) {
    return;
  }

  city.addEventListener(
    "change",
    function() {

      if (
        getOrderType() === "pickup"
      ) {
        return;
      }

      const hasCity =
        city.value !== "";

      if (street) {

        street.disabled =
          !hasCity;

        if (hasCity) {

          street.placeholder =
            "Digite sua rua...";

        } else {

          street.placeholder =
            "Escolha a cidade primeiro...";
        }
      }

      if (neighborhood) {

        neighborhood.disabled =
          !hasCity;

        if (hasCity) {

          neighborhood.placeholder =
            "Digite seu bairro...";

        } else {

          neighborhood.placeholder =
            "Escolha a cidade primeiro...";
        }
      }

    }
  );
}

// =========================================================
// INICIALIZAÇÃO
// =========================================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    console.log(
      "🍓 Gela Gourmet iniciado!"
    );

    console.log(
      "🔌 Conectando ao Supabase..."
    );

    loadProducts();

    setupOrderButton();

    setupOrderType();

    setupPhoneMask();

    setupCity();

  }

  
);

// =========================================================
// ACOMPANHAR PEDIDO PELO INDEX
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    const btnAcompanharPedido =
        document.getElementById("btnAcompanharPedido");

    if (!btnAcompanharPedido) {
        return;
    }

    btnAcompanharPedido.addEventListener("click", function (event) {

        event.preventDefault();

        const pedidoSalvo =
            localStorage.getItem("gelaGourmetPedido");

        // Se já existe um pedido salvo
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

                console.error(
                    "Erro ao recuperar pedido:",
                    erro
                );

            }
        }

        // Caso não tenha pedido salvo
        alert(
            "Nenhum pedido recente foi encontrado neste dispositivo."
        );
    });

});

// teste
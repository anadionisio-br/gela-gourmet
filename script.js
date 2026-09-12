// ========================================
// SUPABASE
// ========================================

const SUPABASE_URL = "https://aiirehncupywhmftzzmn.supabase.co";

const SUPABASE_KEY = "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


// ========================================
// PRODUTOS
// ========================================

let products = [];

async function loadProducts() {

  const { data, error } = await supabaseClient
    .from("produtos")
    .select("*")
    .order("id");

  if (error) {
    console.error("Erro ao carregar produtos:", error);

    alert("Não foi possível carregar os produtos.");

    return;
  }

  products = data.map(product => ({
    id: product.id,
    name: product.nome,
    price: Number(product.preco),
    img: product.imagem,
    disponivel: product.disponivel
  }));

  cart = Array(products.length).fill(0);

  renderProducts();
  updateTotal();
}

// ========================================
// CONFIGURAÇÕES
// ========================================

const DELIVERY_FEE = 5;

const WHATSAPP = "5519993149687";

// ========================================
// RUAS
// ========================================

const streets = {

"Tambaú": [
"Avenida Angelina Lepri Biasoli",
"Avenida Garcês",
"Avenida Agostinho José da Cunha",
"Avenida Antônio Carlos Marçal Pereira",
"Avenida Assyr Siqueira",
"Avenida Floriano Astorfo",
"Rua Adauto de Oliveira Lima",
"Rua Treze de Maio"
],

"Santa Cruz das Palmeiras": [
"Avenida XV de Novembro",
"Avenida do Café",
"Avenida Brasil",
"Avenida Constantino Stocco",
"Rua Manoel Valério",
"Rua Treze de Maio",
"Rua Tiradentes",
"Rua Coronel Penteado",
"Rua Santa Cruz",
"Rua Dom Bosco",
"Rua Rui Barbosa",
"Rua Tenente Pinto",
"Rua Roberto Frisanco",
"Rua Ferrucio de Fiori",
"Rua Ângelo Clemente",
"Rua dos Jasmins",
"Rua dos Jatobás",
"Rua dos Lírios",
"Rua Ametista"
]

};

// ========================================
// CARRINHO
// ========================================

let cart = [];

// ========================================
// ELEMENTOS
// ========================================

const productsEl = document.getElementById("products");

const cartItemsEl = document.getElementById("cartItems");

const subtotalEl = document.getElementById("subtotal");

const deliveryFeeEl = document.getElementById("deliveryFee");

const totalEl = document.getElementById("total");

const cityEl = document.getElementById("city");

const streetEl = document.getElementById("street");

const suggestionsEl =
document.getElementById("streetSuggestions");

const deliveryFields =
document.getElementById("deliveryFields");

const numberEl =
document.getElementById("number");

const neighborhoodEl =
document.getElementById("neighborhood");

const customerNameEl =
document.getElementById("customerName");

const customerNoteEl =
document.getElementById("customerNote");

const sendOrderEl =
document.getElementById("sendOrder");

// ========================================
// DINHEIRO
// ========================================

function money(value) {

return value.toLocaleString("pt-BR", {
style: "currency",
currency: "BRL"
});

}

// ========================================
// PRODUTOS
// ========================================

function renderProducts() {

productsEl.innerHTML = products.map((product, index) => {

return `
  <article class="card">

    <img
      src="${product.img}"
      alt="${product.name}"
      class="card-photo"
    >

    <div class="card-body">

      <h3>
        ${product.name}
      </h3>

      <strong>
        ${money(product.price)}
      </strong>

      ${
        product.disponivel
          ? `
            <div class="qty">

              <button
                type="button"
                data-action="remove"
                data-index="${index}"
                aria-label="Diminuir ${product.name}"
              >
                −
              </button>

              <span>
                ${cart[index]}
              </span>

              <button
                type="button"
                data-action="add"
                data-index="${index}"
                aria-label="Aumentar ${product.name}"
              >
                +
              </button>

            </div>
          `
          : `
            <div class="indisponivel">
              🔴 Indisponível
            </div>
          `
      }

    </div>

  </article>
`;


}).join("");

document
.querySelectorAll(".qty button")
.forEach(button => {

  button.addEventListener("click", () => {

    const index =
      Number(button.dataset.index);

    const action =
      button.dataset.action;

    if (action === "add") {
      cart[index]++;
    }

    if (action === "remove") {
      cart[index] =
        Math.max(0, cart[index] - 1);
    }

    renderProducts();

  });

});


renderCart();

}

// ========================================
// PRODUTOS SELECIONADOS
// ========================================

function getSelectedProducts() {

return products
.map((product, index) => {

  return {
    product: product,
    quantity: cart[index]
  };

})
.filter(item => item.quantity > 0);


}

// ========================================
// SUBTOTAL
// ========================================

function getSubtotal() {

return getSelectedProducts()
.reduce((total, item) => {

  return total +
    item.product.price *
    item.quantity;

}, 0);


}

// ========================================
// TIPO DO PEDIDO
// ========================================

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

// ========================================
// TAXA
// ========================================

function getDeliveryFee() {

if (getOrderType() === "delivery") {
return DELIVERY_FEE;
}

return 0;

}

// ========================================
// ATUALIZAR TOTAL
// ========================================

function updateTotal() {

const subtotal =
getSubtotal();

const fee =
getDeliveryFee();

const total =
subtotal + fee;

subtotalEl.textContent =
money(subtotal);

deliveryFeeEl.textContent =
money(fee);

totalEl.textContent =
money(total);

}

// ========================================
// CARRINHO
// ========================================

function renderCart() {

const selected =
getSelectedProducts();

if (selected.length === 0) {

cartItemsEl.innerHTML = `
  <p class="empty">
    Seu carrinho está vazio. 💗
  </p>
`;


} else {

cartItemsEl.innerHTML =
  selected.map(item => {

    const itemTotal =
      item.product.price *
      item.quantity;

    return `
      <div class="cart-line">

        <span>
          ${item.quantity}x
          ${item.product.name}
        </span>

        <strong>
          ${money(itemTotal)}
        </strong>

      </div>
    `;

  }).join("");


}

updateTotal();

}

// ========================================
// ENTREGA / RETIRADA
// ========================================

document
.querySelectorAll('input[name="orderType"]')
.forEach(radio => {

radio.addEventListener("change", () => {

  if (radio.value === "delivery" && radio.checked) {

    deliveryFields.style.display = "block";

    streetEl.disabled =
      cityEl.value === "";

  }


  if (radio.value === "pickup" && radio.checked) {

    deliveryFields.style.display = "none";

    suggestionsEl.innerHTML = "";

  }


  updateTotal();

});


});

// ========================================
// ESCOLHER CIDADE
// ========================================

cityEl.addEventListener("change", () => {

streetEl.value = "";

suggestionsEl.innerHTML = "";

if (cityEl.value === "") {

streetEl.disabled = true;

streetEl.placeholder =
  "Escolha a cidade primeiro";

return;


}

streetEl.disabled = false;

streetEl.placeholder =
"Digite o nome da rua";

});

// ========================================
// NORMALIZAR TEXTO
// ========================================

function normalizeText(text) {

return text
.toLowerCase()
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "");

}

// ========================================
// AUTOCOMPLETE
// ========================================

streetEl.addEventListener("input", () => {

const city =
cityEl.value;

const search =
normalizeText(streetEl.value.trim());

suggestionsEl.innerHTML = "";

if (!city || !search) {
return;
}

const cityStreets =
streets[city] || [];

const results =
cityStreets
.filter(street => {

    return normalizeText(street)
      .includes(search);

  })
  .slice(0, 8);


results.forEach(street => {

const button =
  document.createElement("button");

button.type = "button";

button.textContent =
  street;


button.addEventListener("click", () => {

  streetEl.value =
    street;

  suggestionsEl.innerHTML =
    "";

});


suggestionsEl.appendChild(button);


});

});

// ========================================
// FECHAR SUGESTÕES
// ========================================

document.addEventListener("click", event => {

if (
!event.target.closest(".autocomplete")
) {

suggestionsEl.innerHTML = "";


}

});

// ========================================
// FINALIZAR PEDIDO
// ========================================

sendOrderEl.addEventListener("click", () => {

const selected =
getSelectedProducts();

// Não deixa finalizar sem produtos

if (selected.length === 0) {

alert(
  "Escolha pelo menos um sabor 😊"
);

return;


}

const name =
customerNameEl.value.trim() ||
"Não informado";

const note =
customerNoteEl.value.trim();

const orderType =
getOrderType();

const subtotal =
getSubtotal();

const fee =
getDeliveryFee();

const total =
subtotal + fee;

// ========================================
// ITENS
// ========================================

const items =
selected.map(item => {

  const itemTotal =
    item.product.price *
    item.quantity;

  return `• ${item.quantity}x ${item.product.name} — ${money(itemTotal)}`;

}).join("\n");


// ========================================
// ENDEREÇO
// ========================================

let address = "";

if (orderType === "delivery") {

const city =
  cityEl.value;

const street =
  streetEl.value.trim();

const number =
  numberEl.value.trim();

const neighborhood =
  neighborhoodEl.value.trim();


if (!city) {

  alert(
    "Selecione a cidade da entrega."
  );

  cityEl.focus();

  return;

}


if (!street) {

  alert(
    "Digite a rua da entrega."
  );

  streetEl.focus();

  return;

}


if (!number) {

  alert(
    "Digite o número da residência."
  );

  numberEl.focus();

  return;

}


address =
  `${street}, nº ${number}`;


if (neighborhood) {

  address +=
    ` - ${neighborhood}`;

}


address +=
  ` - ${city}`;


}

// ========================================
// MENSAGEM WHATSAPP
// ========================================

let message =
`Olá! Quero fazer um pedido na Gela Gourmet 💗

${items}

Geladinhos: ${money(subtotal)}
Taxa de entrega: ${money(fee)}
TOTAL: ${money(total)}

Nome: ${name}
Tipo: ${orderType === "delivery" ? "🚚 Entrega" : "🏪 Retirada"}`;

if (orderType === "delivery") {

message +=
  `\nEndereço: ${address}`;


}

if (note) {

message +=
  `\nObservação: ${note}`;


}

message +=
"\n\nAguardo a confirmação do pedido! 😊";

// ========================================
// ABRIR WHATSAPP
// ========================================

const url =
  "https://wa.me/" +
  WHATSAPP +
  "?text=" +
  encodeURIComponent(message);

window.open(url, "_blank");


});

// ========================================
// INICIAR SITE
// ========================================

loadProducts();
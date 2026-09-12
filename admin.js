const SUPABASE_URL = "https://aiirehncupywhmftzzmn.supabase.co";

// Use aqui a sua Publishable Key
const SUPABASE_KEY = "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


let produtos = [];

let produtoEditando = null;


/* =========================
   CARREGAR PRODUTOS
========================= */

async function carregarProdutos() {

    const grid = document.getElementById("productsGrid");

    grid.innerHTML = `
        <div class="loading">
            Carregando produtos...
        </div>
    `;

    const { data, error } = await supabaseClient
        .from("produtos")
        .select("*")
        .order("id");

    if (error) {

        console.error(error);

        grid.innerHTML = `
            <div class="loading">
                ❌ Erro ao carregar os produtos.
            </div>
        `;

        return;
    }

    produtos = data;

    atualizarResumo();

    mostrarProdutos();
}


/* =========================
   MOSTRAR PRODUTOS
========================= */

function mostrarProdutos() {

    const grid = document.getElementById("productsGrid");

    if (produtos.length === 0) {

        grid.innerHTML = `
            <div class="loading">
                Nenhum produto cadastrado.
            </div>
        `;

        return;
    }


    grid.innerHTML = produtos.map(produto => {

        const disponivel = produto.disponivel;


        return `
            <article class="product-card">

                <img
                    src="${produto.imagem}"
                    alt="${produto.nome}"
                    class="product-image"
                >

                <div class="product-info">

                    <h3 class="product-name">
                        ${produto.nome}
                    </h3>

                    <div class="product-price">
                        R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}
                    </div>


                    <div class="product-status ${disponivel ? "available" : "unavailable"}">

                        ${disponivel ? "● Disponível" : "● Indisponível"}

                    </div>


                    <div class="product-actions">

                        <button
                            class="edit-button"
                            onclick="abrirEdicao(${produto.id})"
                        >
                            ✏️ Editar
                        </button>


                        <button
                            class="toggle-button ${disponivel ? "available" : "unavailable"}"
                            onclick="alternarDisponibilidade(${produto.id})"
                        >

                            ${disponivel ? "🔴 Desativar" : "🟢 Ativar"}

                        </button>

                    </div>

                </div>

            </article>
        `;

    }).join("");
}


/* =========================
   RESUMO
========================= */

function atualizarResumo() {

    const total = produtos.length;

    const disponiveis = produtos.filter(
        produto => produto.disponivel === true
    ).length;

    const indisponiveis = total - disponiveis;


    document.getElementById("totalProdutos").textContent = total;

    document.getElementById("produtosDisponiveis").textContent =
        disponiveis;

    document.getElementById("produtosIndisponiveis").textContent =
        indisponiveis;
}


/* =========================
   ABRIR EDIÇÃO
========================= */

function abrirEdicao(id) {

    const produto = produtos.find(
        item => item.id === id
    );

    if (!produto) return;


    produtoEditando = produto;


    document.getElementById("nomeProduto").value =
        produto.nome;


    document.getElementById("modalEditar")
        .classList.add("show");
}


/* =========================
   FECHAR MODAL
========================= */

function fecharModal() {

    document.getElementById("modalEditar")
        .classList.remove("show");

    produtoEditando = null;
}


/* =========================
   SALVAR NOME
========================= */

async function salvarNome() {

    if (!produtoEditando) return;


    const novoNome =
        document.getElementById("nomeProduto").value.trim();


    if (!novoNome) {

        alert("Digite um nome para o produto.");

        return;
    }


    const { error } = await supabaseClient
        .from("produtos")
        .update({
            nome: novoNome
        })
        .eq("id", produtoEditando.id);


    if (error) {

        console.error(error);

        alert("Não foi possível alterar o produto.");

        return;
    }


    alert("Produto alterado com sucesso!");


    fecharModal();

    carregarProdutos();
}


/* =========================
   DISPONIBILIDADE
========================= */

async function alternarDisponibilidade(id) {

    const produto = produtos.find(
        item => item.id === id
    );

    if (!produto) return;


    const novoStatus = !produto.disponivel;


    const { error } = await supabaseClient
        .from("produtos")
        .update({
            disponivel: novoStatus
        })
        .eq("id", id);


    if (error) {

        console.error(error);

        alert("Não foi possível alterar a disponibilidade.");

        return;
    }


    carregarProdutos();
}


/* =========================
   INICIAR
========================= */

carregarProdutos();
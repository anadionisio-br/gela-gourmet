const SUPABASE_URL = "https://aiirehncupywhmftzzmn.supabase.co";

// Use aqui a sua Publishable Key
const SUPABASE_KEY = "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =========================
// VARIÁVEIS
// =========================

let produtos = [];

let produtoEditando = null;

// =========================
// VERIFICAR LOGIN
// =========================

async function verificarLogin() {
  const { data, error } = await supabaseClient.auth.getUser();

  if (error || !data.user) {
    console.log("Usuário não está logado.");

    window.location.href = "admin-login.html";

    return false;
  }

  console.log("Usuário logado:", data.user.email);

  return true;
}

// =========================
// CARREGAR PRODUTOS
// =========================

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

  console.log("DADOS DO SUPABASE:", data);

  console.log("ERRO DO SUPABASE:", error);

  if (error) {
    grid.innerHTML = `
            <div class="loading">
                ❌ Erro ao carregar produtos:<br>
                ${error.message}
            </div>
        `;

    return;
  }

  produtos = data || [];

  atualizarResumo();

  mostrarProdutos();
}

// =========================
// MOSTRAR PRODUTOS
// =========================

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

  grid.innerHTML = produtos
    .map((produto) => {
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


                    <div class="product-status ${
                      disponivel ? "available" : "unavailable"
                    }">

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

    <button
        class="delete-button"
        onclick="excluirProduto(${produto.id})"
    >
        🗑️ Excluir
    </button>

</div>

                </div>

            </article>
        `;
    })
    .join("");
}

// =========================
// ATUALIZAR RESUMO
// =========================

function atualizarResumo() {
  const total = produtos.length;

  const disponiveis = produtos.filter(
    (produto) => produto.disponivel === true,
  ).length;

  const indisponiveis = total - disponiveis;

  document.getElementById("totalProdutos").textContent = total;

  document.getElementById("produtosDisponiveis").textContent = disponiveis;

  document.getElementById("produtosIndisponiveis").textContent = indisponiveis;
}

// =========================
// ABRIR CRIAÇÃO
// =========================

function abrirCriacao() {

    // Indica que NÃO estamos editando
    produtoEditando = null;


    // Limpa os campos
    document.getElementById("nomeProduto").value = "";

    document.getElementById("precoProduto").value = "";

    document.getElementById("imagemProduto").value = "";

    document.getElementById("disponivelProduto").value = "true";


    // Título
    document.getElementById("tituloModal").textContent =
        "Novo produto";


    // Descrição
    const descricao =
        document.querySelector(
            "#modalProduto .modal-header p"
        );

    if (descricao) {
        descricao.textContent =
            "Preencha os dados do geladinho.";
    }


    // Limpa prévia
    const preview =
        document.getElementById("previewImagem");

    if (preview) {
        preview.innerHTML = "";
    }


    // Abre modal
    document
        .getElementById("modalProduto")
        .classList.add("show");
}

// =========================
// ABRIR EDIÇÃO
// =========================

function abrirEdicao(id) {

    const produto = produtos.find(
        item => item.id === id
    );

    if (!produto) return;


    // Guarda o produto que está sendo editado
    produtoEditando = produto;


    // Preenche o nome
    document.getElementById("nomeProduto").value =
        produto.nome;


    // Preenche o preço
    document.getElementById("precoProduto").value =
        produto.preco;


    // Limpa o campo de arquivo
    document.getElementById("imagemProduto").value =
        "";


    // Preenche a disponibilidade
    document.getElementById("disponivelProduto").value =
        produto.disponivel ? "true" : "false";


    // Altera o título
    document.getElementById("tituloModal").textContent =
        "Editar produto";


    // Altera o texto da descrição
    const descricao =
        document.querySelector(
            "#modalProduto .modal-header p"
        );

    if (descricao) {
        descricao.textContent =
            "Altere os dados do geladinho.";
    }


    // Mostra a imagem atual
    const preview =
        document.getElementById("previewImagem");

    if (preview && produto.imagem) {

        preview.innerHTML = `
            <div class="imagem-atual">

                <span>Imagem atual</span>

                <img
                    src="${produto.imagem}"
                    alt="${produto.nome}"
                >

            </div>
        `;

    } else if (preview) {

        preview.innerHTML = "";

    }


    // Abre o modal
    document
        .getElementById("modalProduto")
        .classList.add("show");
}

// =========================
// FECHAR MODAL
// =========================

function fecharModalProduto() {

    document
        .getElementById("modalProduto")
        .classList.remove("show");

    produtoEditando = null;


    // Limpa os campos
    document.getElementById("nomeProduto").value = "";

    document.getElementById("precoProduto").value = "";

    document.getElementById("imagemProduto").value = "";


    // Limpa prévia
    const preview =
        document.getElementById("previewImagem");

    if (preview) {
        preview.innerHTML = "";
    }
}

// =========================
// SALVAR PRODUTO
// =========================

async function salvarProduto() {
  const nome = document.getElementById("nomeProduto").value.trim();

  const preco = parseFloat(document.getElementById("precoProduto").value);

  const arquivo = document.getElementById("imagemProduto").files[0];

  const disponivel =
    document.getElementById("disponivelProduto").value === "true";

  // =========================
  // VALIDAÇÕES
  // =========================

  if (!nome) {
    alert("Digite o nome do produto.");

    return;
  }

  if (isNaN(preco) || preco < 0) {
    alert("Digite um preço válido.");

    return;
  }

  // =========================
  // CRIAR PRODUTO
  // =========================

  if (!produtoEditando) {
    if (!arquivo) {
      alert("Escolha uma imagem para o produto.");

      return;
    }

    // Verifica se é imagem

    if (!arquivo.type.startsWith("image/")) {
      alert("Escolha um arquivo de imagem.");

      return;
    }

    // =========================
    // NOME DO ARQUIVO
    // =========================

    const extensao = arquivo.name.split(".").pop();

    const nomeArquivo = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extensao}`;

    // =========================
    // ENVIAR IMAGEM
    // =========================

    const { error: uploadError } = await supabaseClient.storage
      .from("produtos")
      .upload(nomeArquivo, arquivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error(uploadError);

      alert("Não foi possível enviar a imagem:\n" + uploadError.message);

      return;
    }

    // =========================
    // PEGAR URL DA IMAGEM
    // =========================

    const { data: imagemData } = supabaseClient.storage
      .from("produtos")
      .getPublicUrl(nomeArquivo);

    const imagemUrl = imagemData.publicUrl;

    // =========================
    // SALVAR PRODUTO
    // =========================

    const { error } = await supabaseClient.from("produtos").insert({
      nome: nome,

      preco: preco,

      imagem: imagemUrl,

      disponivel: disponivel,
    });

    if (error) {
      console.error(error);

      alert("Não foi possível criar o produto:\n" + error.message);

      return;
    }

    alert("Produto criado com sucesso!");
  }

  // =========================
  // EDITAR PRODUTO
  // =========================
  else {
    let imagemUrl = produtoEditando.imagem;

    // Se escolheu uma nova imagem

    if (arquivo) {
      if (!arquivo.type.startsWith("image/")) {
        alert("Escolha um arquivo de imagem.");

        return;
      }

      const extensao = arquivo.name.split(".").pop();

      const nomeArquivo = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${extensao}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("produtos")
        .upload(nomeArquivo, arquivo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);

        alert("Não foi possível enviar a nova imagem:\n" + uploadError.message);

        return;
      }

      const { data: imagemData } = supabaseClient.storage
        .from("produtos")
        .getPublicUrl(nomeArquivo);

      imagemUrl = imagemData.publicUrl;
    }

    // =========================
    // ATUALIZAR
    // =========================

    const { error } = await supabaseClient
      .from("produtos")
      .update({
        nome: nome,

        preco: preco,

        imagem: imagemUrl,

        disponivel: disponivel,
      })
      .eq("id", produtoEditando.id);

    if (error) {
      console.error(error);

      alert("Não foi possível editar o produto:\n" + error.message);

      return;
    }

    alert("Produto alterado com sucesso!");
  }

  fecharModalProduto();

  carregarProdutos();
}

// =========================
// ALTERAR DISPONIBILIDADE
// =========================

async function alternarDisponibilidade(id) {
  const produto = produtos.find((item) => item.id === id);

  if (!produto) return;

  const novoStatus = !produto.disponivel;

  const { error } = await supabaseClient
    .from("produtos")
    .update({
      disponivel: novoStatus,
    })
    .eq("id", id);

  if (error) {
    console.error(error);

    alert("Não foi possível alterar a disponibilidade.");

    return;
  }

  carregarProdutos();
}

async function excluirProduto(id) {

    // Procura o produto
    const produto = produtos.find(
        item => item.id === id
    );

    if (!produto) {
        return;
    }


    // Confirmação
    const confirmar = confirm(
        `Tem certeza que deseja excluir o produto "${produto.nome}"?`
    );


    if (!confirmar) {
        return;
    }


    // Exclui do banco
    const { error } = await supabaseClient
        .from("produtos")
        .delete()
        .eq("id", id);


    // Verifica erro
    if (error) {

        console.error(
            "Erro ao excluir produto:",
            error
        );

        alert(
            "Não foi possível excluir o produto:\n" +
            error.message
        );

        return;
    }


    // Sucesso
    alert(
        "Produto excluído com sucesso!"
    );


    // Atualiza a lista
    carregarProdutos();
}

// =========================
// SAIR
// =========================

async function sair() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    console.error("Erro ao sair:", error);

    alert("Não foi possível sair.");

    return;
  }

  window.location.href = "admin-login.html";
}

document
  .getElementById("imagemProduto")
  .addEventListener("change", function () {
    const arquivo = this.files[0];

    const preview = document.getElementById("previewImagem");

    if (!arquivo) {
      preview.innerHTML = "";

      return;
    }

    const url = URL.createObjectURL(arquivo);

    preview.innerHTML = `
            <img
                src="${url}"
                alt="Prévia da imagem"
            >
        `;
  });

// =========================
// INICIAR PAINEL
// =========================

verificarLogin().then((logado) => {
  if (logado) {
    carregarProdutos();
  }
});

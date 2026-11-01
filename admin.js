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
// GERENCIAR ADICIONAIS
// =========================
let listaAdicionais = [];

async function carregarAdicionais() {
  const grid = document.getElementById("adicionaisGrid");
  if (!grid) return;
  grid.innerHTML = '<div class="loading">Carregando adicionais...</div>';

  try {
    const { data, error } = await supabaseClient
      .from("adicionais")
      .select("id, nome, preco, disponivel")
      .order("id", { ascending: true });

    if (error) throw error;
    listaAdicionais = data || [];

    if (!listaAdicionais.length) {
      grid.innerHTML = '<div class="loading">Nenhum adicional cadastrado. Clique em “Novo adicional” para cadastrar.</div>';
      return;
    }

    grid.innerHTML = listaAdicionais.map((item) => {
      const ativo = item.disponivel !== false;
      const preco = Number(item.preco || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      const nomeSeguro = String(item.nome || "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
      return `<article class="product-card">
        <div class="product-info">
          <h3 class="product-name">${nomeSeguro}</h3>
          <div class="product-price">${preco}</div>
          <div class="product-status ${ativo ? "available" : "unavailable"}">${ativo ? "● Ativo" : "● Desativado"}</div>
          <div class="product-actions">
            <button class="edit-button" onclick="editarAdicional(${Number(item.id)})">✏️ Editar</button>
            <button class="toggle-button ${ativo ? "available" : "unavailable"}" onclick="alternarAdicional(${Number(item.id)})">${ativo ? "🔴 Desativar" : "🟢 Ativar"}</button>
            <button class="delete-button" onclick="excluirAdicional(${Number(item.id)})">🗑️ Excluir</button>
          </div>
        </div>
      </article>`;
    }).join("");
  } catch (error) {
    console.error("Erro ao carregar adicionais:", error);
    grid.innerHTML = `<div class="loading">Não foi possível carregar os adicionais. ${String(error.message || "Verifique se executou o arquivo setup-adicionais.sql no SQL Editor do Supabase.").replace(/[<>]/g, "")}</div>`;
  }
}

async function criarAdicional() {
  const nome = prompt("Nome do adicional:");
  if (nome === null) return;
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return alert("Informe o nome do adicional.");
  const valorTexto = prompt("Preço do adicional (ex.: 5,00):", "5,00");
  if (valorTexto === null) return;
  const preco = Number(valorTexto.trim().replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(preco) || preco < 0) return alert("Informe um preço válido.");

  const { error } = await supabaseClient.from("adicionais").insert({ nome: nomeLimpo, preco, disponivel: true });
  if (error) return alert("Não foi possível cadastrar: " + error.message);
  await carregarAdicionais();
}

async function editarAdicional(id) {
  const item = listaAdicionais.find((a) => Number(a.id) === Number(id));
  if (!item) return;
  const nome = prompt("Nome do adicional:", item.nome);
  if (nome === null) return;
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) return alert("Informe o nome do adicional.");
  const valorTexto = prompt("Preço do adicional (ex.: 5,00):", Number(item.preco).toFixed(2).replace(".", ","));
  if (valorTexto === null) return;
  const preco = Number(valorTexto.trim().replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(preco) || preco < 0) return alert("Informe um preço válido.");

  const { error } = await supabaseClient.from("adicionais").update({ nome: nomeLimpo, preco }).eq("id", id);
  if (error) return alert("Não foi possível editar: " + error.message);
  await carregarAdicionais();
}

async function alternarAdicional(id) {
  const item = listaAdicionais.find((a) => Number(a.id) === Number(id));
  if (!item) return;
  const { error } = await supabaseClient.from("adicionais").update({ disponivel: item.disponivel === false }).eq("id", id);
  if (error) return alert("Não foi possível alterar a disponibilidade: " + error.message);
  await carregarAdicionais();
}

async function excluirAdicional(id) {
  const item = listaAdicionais.find((a) => Number(a.id) === Number(id));
  if (!item || !confirm(`Deseja excluir o adicional “${item.nome}”?`)) return;
  const { error } = await supabaseClient.from("adicionais").delete().eq("id", id);
  if (error) return alert("Não foi possível excluir: " + error.message);
  await carregarAdicionais();
}



// =========================
// CONTROLE DA LOJA (ABRIR / FECHAR)
// =========================
let lojaConfig = { loja_aberta: true, mensagem_fechado: "" };
let lojaCarregada = false;

function renderLoja() {
  const aberta = lojaConfig.loja_aberta !== false;

  const badge = document.getElementById("lojaStatusBadge");
  const pill = document.getElementById("lojaPill");
  const botao = document.getElementById("btnAlternarLoja");
  const secao = document.getElementById("loja");
  const mensagem = document.getElementById("mensagemLoja");

  if (badge) {
    badge.className = "store-badge " + (aberta ? "store-badge-open" : "store-badge-closed");
    badge.textContent = aberta ? "🟢 Loja ABERTA" : "🔴 Loja FECHADA";
  }

  if (pill) {
    pill.className = "loja-pill " + (aberta ? "loja-pill-on" : "loja-pill-off");
    pill.textContent = aberta ? "Loja aberta" : "Loja fechada";
  }

  if (secao) secao.classList.toggle("is-closed", !aberta);

  if (botao) {
    botao.disabled = !lojaCarregada;
    botao.className = "store-toggle " + (aberta ? "do-close" : "do-open");
    botao.textContent = aberta ? "🔒 Fechar loja" : "🔓 Abrir loja";
  }

  if (mensagem && document.activeElement !== mensagem) {
    mensagem.value = lojaConfig.mensagem_fechado || "";
  }
}

async function carregarLoja() {
  const { data, error } = await supabaseClient
    .from("configuracoes_loja")
    .select("loja_aberta, mensagem_fechado")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error("Erro ao carregar status da loja:", error);
    const badge = document.getElementById("lojaStatusBadge");
    if (badge) {
      badge.className = "store-badge store-badge-loading";
      badge.textContent = "Execute o setup-loja.sql no Supabase";
    }
    const pill = document.getElementById("lojaPill");
    if (pill) pill.textContent = "Loja: não configurada";
    return;
  }

  lojaConfig = data;
  lojaCarregada = true;
  renderLoja();
}

async function alternarLoja() {
  if (!lojaCarregada) return;

  const abrir = lojaConfig.loja_aberta === false;
  const pergunta = abrir
    ? "Abrir a loja? Os clientes poderão fazer pedidos novamente."
    : "Fechar a loja? Os clientes não conseguirão fazer novos pedidos.";

  if (!confirm(pergunta)) return;

  const botao = document.getElementById("btnAlternarLoja");
  if (botao) botao.disabled = true;

  const { error } = await supabaseClient
    .from("configuracoes_loja")
    .update({ loja_aberta: abrir, atualizado_em: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    console.error(error);
    alert("Não foi possível alterar o status da loja:\n" + error.message);
    if (botao) botao.disabled = false;
    return;
  }

  lojaConfig.loja_aberta = abrir;
  renderLoja();
}

async function salvarMensagemLoja() {
  const campo = document.getElementById("mensagemLoja");
  if (!campo) return;

  const texto = campo.value.trim();
  if (!texto) {
    alert("Escreva uma mensagem para os clientes.");
    return;
  }

  const { error } = await supabaseClient
    .from("configuracoes_loja")
    .update({ mensagem_fechado: texto, atualizado_em: new Date().toISOString() })
    .eq("id", 1);

  if (error) {
    console.error(error);
    alert("Não foi possível salvar a mensagem:\n" + error.message);
    return;
  }

  lojaConfig.mensagem_fechado = texto;
  alert("Mensagem salva!");
}

// =========================
// INICIAR PAINEL
// =========================

verificarLogin().then((logado) => {
  if (logado) {
    carregarLoja();
    carregarProdutos();
    carregarAdicionais();
  }
});

// ======================================================
// SUPABASE
// ======================================================

const SUPABASE_URL =
    "https://aiirehncupywhmftzzmn.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// ======================================================
// VARIÁVEIS
// ======================================================

let todosPedidos = [];

let pedidoSelecionado = null;

let intervaloAtualizacao = null;


// ======================================================
// INICIAR
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const logado =
            await verificarLogin();

        if (!logado) {
            return;
        }

        await carregarPedidos();

        iniciarAtualizacaoAutomatica();

        configurarEventos();

    }
);


// ======================================================
// LOGIN
// ======================================================

async function verificarLogin() {

    try {

        const { data, error } =
            await supabaseClient.auth.getUser();


        if (
            error ||
            !data ||
            !data.user
        ) {

            window.location.href =
                "../admin-login.html";

            return false;

        }


        return true;

    } catch (erro) {

        console.error(
            erro
        );

        window.location.href =
            "../admin-login.html";

        return false;

    }

}


// ======================================================
// EVENTOS
// ======================================================

function configurarEventos() {

    const modal =
        document.getElementById(
            "modalPedido"
        );


    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (
                    event.target === modal
                ) {

                    fecharModal();

                }

            }
        );

    }


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                fecharModal();

            }

        }
    );

}


// ======================================================
// CARREGAR PEDIDOS
// ======================================================

async function carregarPedidos() {

    const lista =
        document.getElementById(
            "pedidosLista"
        );


    if (!lista) {
        return;
    }


    lista.innerHTML = `
        <div class="carregando-pedidos">

            <div class="loading-spinner"></div>

            <p>
                Carregando pedidos...
            </p>

        </div>
    `;


    try {

        const { data, error } =
            await supabaseClient
                .from("pedidos")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                error
            );

            mostrarErro(
                "Não foi possível carregar os pedidos."
            );

            return;

        }


        todosPedidos =
            Array.isArray(data)
                ? data
                : [];


        atualizarResumo();

        filtrarPedidos();

    } catch (erro) {

        console.error(
            erro
        );

        mostrarErro(
            "Ocorreu um erro ao carregar os pedidos."
        );

    }

}


// ======================================================
// RESUMO
// ======================================================

function atualizarResumo() {

    const total =
        todosPedidos.length;


    const pendentes =
        todosPedidos.filter(
            pedido =>
                pedido.status ===
                "pendente"
        ).length;


    const preparo =
        todosPedidos.filter(
            pedido =>
                pedido.status ===
                "preparo"
        ).length;


    const entregues =
        todosPedidos.filter(
            pedido =>
                pedido.status ===
                "entregue"
        ).length;


    document.getElementById(
        "totalPedidos"
    ).textContent = total;


    document.getElementById(
        "pedidosPendentes"
    ).textContent = pendentes;


    document.getElementById(
        "pedidosPreparo"
    ).textContent = preparo;


    document.getElementById(
        "pedidosEntregues"
    ).textContent = entregues;

}


// ======================================================
// FILTRO
// ======================================================

function filtrarPedidos() {

    const filtro =
        document.getElementById(
            "filtroStatus"
        ).value;


    const busca =
        document.getElementById(
            "campoBusca"
        ).value
            .toLowerCase()
            .trim();


    let pedidos =
        [...todosPedidos];


    if (
        filtro !== "todos"
    ) {

        pedidos =
            pedidos.filter(
                pedido =>
                    pedido.status ===
                    filtro
            );

    }


    if (busca) {

        pedidos =
            pedidos.filter(
                function (pedido) {

                    const id =
                        String(
                            pedido.id || ""
                        ).toLowerCase();


                    const nome =
                        String(
                            pedido.cliente_nome || ""
                        ).toLowerCase();


                    const telefone =
                        String(
                            pedido.cliente_telefone || ""
                        ).toLowerCase();


                    return (
                        id.includes(busca) ||
                        nome.includes(busca) ||
                        telefone.includes(busca)
                    );

                }
            );

    }


    renderizarPedidos(
        pedidos
    );

}


// ======================================================
// RENDERIZAR CARDS
// ======================================================

function renderizarPedidos(
    pedidos
) {

    const lista =
        document.getElementById(
            "pedidosLista"
        );


    const vazio =
        document.getElementById(
            "semPedidos"
        );


    if (!lista) {
        return;
    }


    // MUITO IMPORTANTE:
    // LIMPA ANTES DE CRIAR NOVOS CARDS

    lista.innerHTML = "";


    if (
        !pedidos ||
        pedidos.length === 0
    ) {

        if (vazio) {

            vazio.style.display =
                "block";

        }

        return;

    }


    if (vazio) {

        vazio.style.display =
            "none";

    }


    pedidos.forEach(
        function (pedido) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                `pedido-card pedido-status-${pedido.status || "pendente"}`;


            card.innerHTML = `

                <div class="pedido-card-topo">

                    <div>

                        <span class="pedido-label">
                            PEDIDO
                        </span>

                        <strong class="pedido-numero">
                            #${pedido.id}
                        </strong>

                    </div>


                    ${criarStatus(
                        pedido.status
                    )}

                </div>


                <div class="pedido-cliente">

                    <div class="cliente-icone">
                        👤
                    </div>

                    <div>

                        <span>
                            Cliente
                        </span>

                        <strong>
                            ${escapeHtml(
                                pedido.cliente_nome ||
                                "Cliente"
                            )}
                        </strong>

                    </div>

                </div>


                <div class="pedido-data">

                    <span>
                        📅 ${formatarData(
                            pedido.created_at
                        )}
                    </span>

                    <span>
                        🕐 ${formatarHora(
                            pedido.created_at
                        )}
                    </span>

                </div>


                <div class="pedido-info-grid">

                    <div>

                        <span>
                            Pagamento
                        </span>

                        <strong>
                            ${formatarPagamentoTexto(
                                pedido.forma_pagamento
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            Tipo
                        </span>

                        <strong>
                            ${formatarTipoTexto(
                                pedido.tipo_entrega
                            )}
                        </strong>

                    </div>

                </div>


                <div class="pedido-card-bottom">

                    <div>

                        <span>
                            Total
                        </span>

                        <strong class="pedido-total">
                            ${formatarMoeda(
                                pedido.total
                            )}
                        </strong>

                    </div>


                    <button
                        type="button"
                        class="ver-pedido"
                        onclick="abrirPedido(${pedido.id})"
                    >
                        Ver detalhes
                        <span>→</span>
                    </button>

                </div>

            `;


            lista.appendChild(
                card
            );

        }
    );

}


// ======================================================
// STATUS
// ======================================================

function criarStatus(
    status
) {

    return `
        <span class="status-badge status-${status || "pendente"}">
            <span class="status-ponto"></span>
            ${formatarStatus(status)}
        </span>
    `;

}


function formatarStatus(
    status
) {

    const mapa = {

        pendente:
            "Pendente",

        preparo:
            "Em preparo",

        entrega:
            "Saiu para entrega",

        entregue:
            "Entregue",

        cancelado:
            "Cancelado"

    };


    return (
        mapa[status] ||
        "Pendente"
    );

}


// ======================================================
// ABRIR PEDIDO
// ======================================================

function abrirPedido(id) {

    const pedido =
        todosPedidos.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!pedido) {
        return;
    }


    pedidoSelecionado =
        pedido;


    preencherModal(
        pedido
    );


    const modal =
        document.getElementById(
            "modalPedido"
        );


    if (modal) {

        modal.style.display =
            "flex";

        setTimeout(
            function () {

                modal.classList.add(
                    "show"
                );

            },
            10
        );

    }

}


// ======================================================
// MODAL
// ======================================================

function preencherModal(
    pedido
) {

    document.getElementById(
        "modalNumeroPedido"
    ).textContent =
        `Pedido #${pedido.id}`;


    document.getElementById(
        "detalheNome"
    ).textContent =
        pedido.cliente_nome ||
        "-";


    document.getElementById(
        "detalheTelefone"
    ).textContent =
        pedido.cliente_telefone ||
        "-";


    document.getElementById(
        "detalheEndereco"
    ).textContent =
        pedido.cliente_endereco ||
        "Retirada no local";


    document.getElementById(
        "detalhePagamento"
    ).textContent =
        formatarPagamentoTexto(
            pedido.forma_pagamento
        );


    document.getElementById(
        "detalheTipo"
    ).textContent =
        formatarTipoTexto(
            pedido.tipo_entrega
        );


    document.getElementById(
        "detalheTotal"
    ).textContent =
        formatarMoeda(
            pedido.total
        );


    document.getElementById(
        "novoStatus"
    ).value =
        pedido.status ||
        "pendente";


    document.getElementById(
        "detalheItens"
    ).innerHTML =
        renderizarItens(
            pedido.itens
        );

}


// ======================================================
// ITENS
// ======================================================

function renderizarItens(
    itens
) {

    let lista =
        itens;


    if (
        typeof itens ===
        "string"
    ) {

        try {

            lista =
                JSON.parse(itens);

        } catch (erro) {

            lista = [];

        }

    }


    if (
        !Array.isArray(lista) ||
        lista.length === 0
    ) {

        return `
            <div class="item-vazio">
                Nenhum produto informado.
            </div>
        `;

    }


    return lista
        .map(
            function (item) {

                const nome =
                    item.nome ||
                    item.name ||
                    "Produto";


                const quantidade =
                    item.quantidade ||
                    item.quantity ||
                    1;


                const subtotal =
                    item.subtotal ??
                    (
                        Number(
                            item.preco ||
                            item.price ||
                            0
                        ) *
                        Number(
                            quantidade
                        )
                    );


                return `

                    <div class="detail-item">

                        <div>

                            <strong>
                                ${escapeHtml(
                                    nome
                                )}
                            </strong>

                            <span>
                                ${quantidade}x
                            </span>

                        </div>


                        <strong>
                            ${formatarMoeda(
                                subtotal
                            )}
                        </strong>

                    </div>

                `;

            }
        )
        .join("");

}


// ======================================================
// ATUALIZAR STATUS
// ======================================================

async function atualizarStatus() {

    if (!pedidoSelecionado) {
        return;
    }


    const novoStatus =
        document.getElementById(
            "novoStatus"
        ).value;


    try {

        const { error } =
            await supabaseClient
                .from("pedidos")
                .update({
                    status: novoStatus
                })
                .eq(
                    "id",
                    pedidoSelecionado.id
                );


        if (error) {

            console.error(
                error
            );

            alert(
                "Não foi possível atualizar o status."
            );

            return;

        }


        const index =
            todosPedidos.findIndex(
                pedido =>
                    Number(pedido.id) ===
                    Number(
                        pedidoSelecionado.id
                    )
            );


        if (index !== -1) {

            todosPedidos[
                index
            ].status =
                novoStatus;

        }


        pedidoSelecionado.status =
            novoStatus;


        atualizarResumo();

        filtrarPedidos();

        fecharModal();

        mostrarMensagem(
            "Status atualizado com sucesso! 💗"
        );


    } catch (erro) {

        console.error(
            erro
        );

        alert(
            "Ocorreu um erro ao atualizar o status."
        );

    }

}


// ======================================================
// FECHAR MODAL
// ======================================================

function fecharModal() {

    const modal =
        document.getElementById(
            "modalPedido"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "show"
    );


    setTimeout(
        function () {

            modal.style.display =
                "none";

        },
        200
    );


    pedidoSelecionado =
        null;

}


// ======================================================
// PAGAMENTO
// ======================================================

function formatarPagamentoTexto(
    pagamento
) {

    const mapa = {

        dinheiro:
            "💵 Dinheiro",

        pix:
            "💚 PIX",

        cartao:
            "💳 Cartão",

        credito:
            "💳 Crédito",

        debito:
            "💳 Débito"

    };


    return (
        mapa[pagamento] ||
        pagamento ||
        "-"
    );

}


// ======================================================
// TIPO
// ======================================================

function formatarTipoTexto(
    tipo
) {

    if (
        tipo === "delivery" ||
        tipo === "entrega"
    ) {

        return "🚚 Entrega";

    }


    if (
        tipo === "pickup" ||
        tipo === "retirada"
    ) {

        return "🏪 Retirada";

    }


    return tipo || "-";

}


// ======================================================
// DATA
// ======================================================

function formatarData(
    data
) {

    if (!data) {
        return "-";
    }


    const dataObj =
        new Date(data);


    if (
        Number.isNaN(
            dataObj.getTime()
        )
    ) {

        return "-";

    }


    return dataObj.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


// ======================================================
// HORA
// ======================================================

function formatarHora(
    data
) {

    if (!data) {
        return "--:--";
    }


    const dataObj =
        new Date(data);


    if (
        Number.isNaN(
            dataObj.getTime()
        )
    ) {

        return "--:--";

    }


    return dataObj.toLocaleTimeString(
        "pt-BR",
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


// ======================================================
// MOEDA
// ======================================================

function formatarMoeda(
    valor
) {

    return (
        Number(valor || 0)
            .toLocaleString(
                "pt-BR",
                {
                    style: "currency",
                    currency: "BRL"
                }
            )
    );

}


// ======================================================
// ESCAPAR HTML
// ======================================================

function escapeHtml(
    valor
) {

    return String(
        valor ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ======================================================
// ATUALIZAÇÃO AUTOMÁTICA
// ======================================================

function iniciarAtualizacaoAutomatica() {

    if (intervaloAtualizacao) {

        clearInterval(
            intervaloAtualizacao
        );

    }


    intervaloAtualizacao =
        setInterval(
            async function () {

                await atualizarSilenciosamente();

            },
            10000
        );

}


async function atualizarSilenciosamente() {

    try {

        const { data, error } =
            await supabaseClient
                .from("pedidos")
                .select("*")
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {
            return;
        }


        todosPedidos =
            Array.isArray(data)
                ? data
                : [];


        atualizarResumo();

        filtrarPedidos();

        mostrarIndicadorAtualizado();

    } catch (erro) {

        console.error(
            erro
        );

    }

}


// ======================================================
// INDICADOR
// ======================================================

function mostrarIndicadorAtualizado() {

    const elemento =
        document.getElementById(
            "statusAtualizacao"
        );


    if (!elemento) {
        return;
    }


    elemento.classList.add(
        "atualizado"
    );


    setTimeout(
        function () {

            elemento.classList.remove(
                "atualizado"
            );

        },
        1000
    );

}


// ======================================================
// MENSAGEM
// ======================================================

function mostrarMensagem(
    texto
) {

    const antiga =
        document.querySelector(
            ".mensagem-sucesso"
        );


    if (antiga) {
        antiga.remove();
    }


    const mensagem =
        document.createElement(
            "div"
        );


    mensagem.className =
        "mensagem-sucesso";


    mensagem.textContent =
        texto;


    document.body.appendChild(
        mensagem
    );


    setTimeout(
        function () {

            mensagem.classList.add(
                "sumir"
            );

        },
        2000
    );


    setTimeout(
        function () {

            mensagem.remove();

        },
        2500
    );

}


// ======================================================
// ERRO
// ======================================================

function mostrarErro(
    texto
) {

    const lista =
        document.getElementById(
            "pedidosLista"
        );


    const vazio =
        document.getElementById(
            "semPedidos"
        );


    if (lista) {

        lista.innerHTML = `

            <div class="erro-pedidos">

                ⚠️

                <p>
                    ${escapeHtml(
                        texto
                    )}
                </p>

            </div>

        `;

    }


    if (vazio) {

        vazio.style.display =
            "none";

    }

}


// ======================================================
// SAIR
// ======================================================

async function sair() {

    try {

        const { error } =
            await supabaseClient
                .auth
                .signOut();


        if (error) {

            alert(
                "Não foi possível sair."
            );

            return;

        }


        window.location.href =
            "../admin-login.html";

    } catch (erro) {

        console.error(
            erro
        );

        window.location.href =
            "../admin-login.html";

    }

}


// ======================================================
// CONFIGURAÇÕES
// ======================================================

function abrirConfiguracoes(
    event
) {

    if (event) {

        event.preventDefault();

    }


    alert(
        "A área de configurações estará disponível em breve."
    );

}
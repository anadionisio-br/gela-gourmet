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

        avisarImpressora();

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

                        ${
                            entregaACombinar(pedido)
                                ? '<small class="entrega-combinar">+ entrega a combinar</small>'
                                : ""
                        }

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
// ENTREGA A COMBINAR (SANTA CRUZ DAS PALMEIRAS)
// ======================================================

function entregaACombinar(
    pedido
) {

    const tipo =
        String(
            pedido.tipo_entrega || ""
        ).toLowerCase();


    if (
        tipo !== "delivery" &&
        tipo !== "entrega"
    ) {

        return false;

    }


    const endereco =
        String(
            pedido.cliente_endereco || ""
        );


    return (
        /entrega a combinar/i.test(
            endereco
        ) ||
        /santa cruz das palmeiras/i.test(
            endereco
        )
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


    preencherFidelidade(
        pedido
    );


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


    const avisoEntrega =
        document.getElementById(
            "detalheEntregaCombinar"
        );

    if (avisoEntrega) {

        avisoEntrega.style.display =
            entregaACombinar(pedido)
                ? "block"
                : "none";

    }


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
// ANIVERSÁRIO + FIDELIDADE (MIMO)
// ======================================================

// A cada quantos pedidos ENTREGUES o cliente ganha um mimo.
// Se mudar aqui, mude também em script.js.
const PEDIDOS_PARA_MIMO = 10;


function somenteDigitos(
    valor
) {

    return String(
        valor || ""
    ).replace(
        /\D/g,
        ""
    );

}


function formatarDataNascimento(
    iso
) {

    const partes =
        String(iso || "")
            .split("-");

    if (partes.length !== 3) {
        return "Não informado";
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;

}


async function preencherFidelidade(
    pedido
) {

    const campoAniversario =
        document.getElementById(
            "detalheAniversario"
        );

    const campoFidelidade =
        document.getElementById(
            "detalheFidelidade"
        );

    if (
        !campoAniversario ||
        !campoFidelidade
    ) {
        return;
    }

    const telefone =
        somenteDigitos(
            pedido.cliente_telefone
        );

    campoAniversario.textContent =
        "Carregando...";

    campoFidelidade.textContent =
        "Carregando...";

    if (telefone.length < 10) {

        campoAniversario.textContent =
            "Não informado";

        campoFidelidade.textContent =
            "-";

        return;

    }


    // Fidelidade: calculada com os pedidos já carregados na tela
    const doCliente =
        todosPedidos.filter(
            item =>
                somenteDigitos(
                    item.cliente_telefone
                ) === telefone
        );

    const atendidos =
        doCliente.filter(
            item =>
                item.status ===
                "entregue"
        ).length;

    const ciclo =
        atendidos %
        PEDIDOS_PARA_MIMO;

    const mimoDisponivel =
        atendidos > 0 &&
        ciclo === 0;

    campoFidelidade.textContent =
        mimoDisponivel
            ? `${atendidos} atendidos — 🎉 MIMO DISPONÍVEL`
            : `${atendidos} atendidos — faltam ${PEDIDOS_PARA_MIMO - ciclo} para o mimo`;


    // Aniversário: vem da tabela "clientes"
    try {

        const { data, error } =
            await supabaseClient
                .from("clientes")
                .select(
                    "data_nascimento"
                )
                .eq(
                    "telefone",
                    telefone
                )
                .maybeSingle();

        // Ignora resposta antiga se outro pedido foi aberto
        if (
            !pedidoSelecionado ||
            Number(pedidoSelecionado.id) !==
            Number(pedido.id)
        ) {
            return;
        }

        if (error) {

            console.warn(
                error
            );

            campoAniversario.textContent =
                "-";

            return;

        }

        campoAniversario.textContent =
            data &&
            data.data_nascimento
                ? formatarDataNascimento(
                    data.data_nascimento
                )
                : "Não informado";

    } catch (erro) {

        console.warn(
            erro
        );

        campoAniversario.textContent =
            "-";

    }

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

        let error = null;
        if (novoStatus === "cancelado" && pedidoSelecionado.status !== "cancelado") {
            // A função SQL altera o status e devolve os geladinhos em uma única transação.
            const resultadoCancelamento = await supabaseClient.rpc(
                "cancelar_pedido_repor_estoque",
                { p_pedido_id: pedidoSelecionado.id }
            );
            error = resultadoCancelamento.error;
        } else {
            const resultadoStatus = await supabaseClient
                .from("pedidos")
                .update({ status: novoStatus })
                .eq("id", pedidoSelecionado.id);
            error = resultadoStatus.error;
        }


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

        avisarImpressora();

    } catch (erro) {

        console.error(
            erro
        );

    }

}


// ======================================================
// SOM DE NOVO PEDIDO
// ======================================================

let idsConhecidos = null;

let somLigado = true;

let somBloqueado = false;

let audioCtx = null;

let botaoSom = null;


try {

    somLigado =
        localStorage.getItem(
            "gelaSomPedidos"
        ) !== "0";

} catch (erro) {

    somLigado = true;

}


function obterAudio() {

    const Contexto =
        window.AudioContext ||
        window.webkitAudioContext;

    if (!Contexto) {
        return null;
    }

    if (!audioCtx) {

        audioCtx =
            new Contexto();

    }

    return audioCtx;

}


// O navegador só libera o som depois de um clique na página
async function liberarAudio() {

    const ctx =
        obterAudio();

    if (!ctx) {
        return false;
    }

    try {

        if (ctx.state !== "running") {

            await ctx.resume();

        }

    } catch (erro) {

        console.warn(
            erro
        );

    }

    somBloqueado =
        ctx.state !== "running";

    atualizarBotaoSom();

    return !somBloqueado;

}


async function tocarSom() {

    const liberado =
        await liberarAudio();

    if (!liberado) {
        return;
    }

    const ctx =
        audioCtx;

    const inicio =
        ctx.currentTime;

    // 3 "dim-dom" seguidos para dar para ouvir de longe
    for (let i = 0; i < 3; i++) {

        [880, 1175].forEach(
            function (frequencia, j) {

                const t =
                    inicio +
                    i * 0.9 +
                    j * 0.22;

                const osc =
                    ctx.createOscillator();

                const ganho =
                    ctx.createGain();

                osc.type =
                    "sine";

                osc.frequency.value =
                    frequencia;

                ganho.gain.setValueAtTime(
                    0.0001,
                    t
                );

                ganho.gain.exponentialRampToValueAtTime(
                    0.6,
                    t + 0.02
                );

                ganho.gain.exponentialRampToValueAtTime(
                    0.0001,
                    t + 0.5
                );

                osc.connect(
                    ganho
                );

                ganho.connect(
                    ctx.destination
                );

                osc.start(
                    t
                );

                osc.stop(
                    t + 0.55
                );

            }
        );

    }

}


// Toca quando aparece um pedido que não estava na lista antes
function avisarNovosPedidos() {

    if (idsConhecidos === null) {

        // primeira carga: só memoriza, não toca
        idsConhecidos =
            new Set(
                todosPedidos.map(
                    item =>
                        String(item.id)
                )
            );

        return;

    }


    const novos =
        todosPedidos.filter(
            item =>
                !idsConhecidos.has(
                    String(item.id)
                ) &&
                item.status !== "cancelado"
        );


    todosPedidos.forEach(
        item =>
            idsConhecidos.add(
                String(item.id)
            )
    );


    if (
        novos.length > 0 &&
        somLigado
    ) {

        tocarSom();

    }

}


function atualizarBotaoSom() {

    if (!botaoSom) {
        return;
    }

    const principal =
        botaoSom.querySelector(
            ".som-principal"
        );

    botaoSom.classList.toggle(
        "alerta",
        somLigado && somBloqueado
    );

    if (!somLigado) {

        principal.textContent =
            "🔕 Som desligado";

    } else if (somBloqueado) {

        principal.textContent =
            "🔔 Clique para ativar o som";

    } else {

        principal.textContent =
            "🔔 Som ligado";

    }

}


function criarBotaoSom() {

    const estilo =
        document.createElement(
            "style"
        );

    estilo.textContent =
        "#somPedidos{position:fixed;bottom:16px;right:322px;z-index:9998;" +
        "display:flex;gap:4px;background:#fff;border:1px solid #f0d9df;" +
        "border-radius:999px;padding:4px;box-shadow:0 6px 18px rgba(97,55,31,.15);" +
        "font:600 13px system-ui,sans-serif}" +
        "#somPedidos button{border:0;border-radius:999px;padding:8px 12px;" +
        "cursor:pointer;background:#f2ecee;color:#66575d;font:inherit}" +
        "#somPedidos.alerta .som-principal{background:#fff4d6;color:#8a5a00}" +
        "@media(max-width:700px){#somPedidos{right:16px;bottom:84px}}";

    document.head.appendChild(
        estilo
    );

    botaoSom =
        document.createElement(
            "div"
        );

    botaoSom.id =
        "somPedidos";

    botaoSom.innerHTML =
        "<button type=\"button\" class=\"som-principal\"></button>" +
        "<button type=\"button\" class=\"som-teste\" title=\"Ouvir o som\">▶</button>";

    document.body.appendChild(
        botaoSom
    );

    botaoSom
        .querySelector(".som-principal")
        .addEventListener(
            "click",
            async function () {

                if (
                    somLigado &&
                    somBloqueado
                ) {

                    // primeiro clique: libera o áudio
                    await tocarSom();

                    return;

                }

                somLigado =
                    !somLigado;

                try {

                    localStorage.setItem(
                        "gelaSomPedidos",
                        somLigado
                            ? "1"
                            : "0"
                    );

                } catch (erro) { /* ignora */ }

                atualizarBotaoSom();

                if (somLigado) {

                    tocarSom();

                }

            }
        );

    botaoSom
        .querySelector(".som-teste")
        .addEventListener(
            "click",
            tocarSom
        );

    // Qualquer clique na página já libera o som
    document.addEventListener(
        "click",
        function liberar() {

            liberarAudio().then(
                function (ok) {

                    if (ok) {

                        document.removeEventListener(
                            "click",
                            liberar
                        );

                    }

                }
            );

        }
    );

    // Começa como "bloqueado" até o navegador liberar o áudio
    somBloqueado = true;

    atualizarBotaoSom();

}


if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        criarBotaoSom
    );

} else {

    criarBotaoSom();

}


// ======================================================
// IMPRESSORA
// ======================================================

// Avisa o módulo da impressora que a lista de pedidos foi atualizada
// (ele imprime sozinho os pedidos novos)
function avisarImpressora() {

    avisarNovosPedidos();

    if (window.Impressora) {

        window.Impressora.verificarNovos(
            todosPedidos
        );

    }

}


// Botão "Imprimir" do pedido aberto
async function imprimirPedidoAtual() {

    if (!pedidoSelecionado) {
        return;
    }

    if (!window.Impressora) {

        alert(
            "O módulo da impressora não foi carregado."
        );

        return;

    }

    await window.Impressora.imprimirPedido(
        pedidoSelecionado
    );

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
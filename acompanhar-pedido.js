const SUPABASE_URL =
    "https://aiirehncupywhmftzzmn.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================================
   ELEMENTOS
========================================================= */

const carregando =
    document.getElementById("carregando");

const erro =
    document.getElementById("erro");

const pedido =
    document.getElementById("pedido");

const numeroPedido =
    document.getElementById("numeroPedido");

const saudacaoCliente =
    document.getElementById("saudacaoCliente");

const statusTexto =
    document.getElementById("statusTexto");

const mensagemStatus =
    document.getElementById("mensagemStatus");

const progressoAtivo =
    document.getElementById("progressoAtivo");

const itensPedido =
    document.getElementById("itensPedido");

const totalPedido =
    document.getElementById("totalPedido");

const pagamentoPedido =
    document.getElementById("pagamentoPedido");

const tipoPedido =
    document.getElementById("tipoPedido");


/* =========================================================
   TOKEN DA URL
========================================================= */

const parametros =
    new URLSearchParams(
        window.location.search
    );

const token =
    parametros.get("token");


/* =========================================================
   STATUS
========================================================= */

const statusOrdem = [
    "pendente",
    "preparo",
    "entrega",
    "entregue"
];


const mensagens = {

    pendente:
        "Seu pedido foi recebido com sucesso! 💗 Aguarde enquanto começamos a preparar tudo.",

    preparo:
        "Seu pedido está sendo preparado com muito carinho! 🍓💗",

    entrega:
        "Seu pedido saiu para entrega! 🛵💨 Em breve ele estará chegando até você.",

    entregue:
        "Pedido entregue! 🎉💗 Esperamos que você aproveite muito!",

    cancelado:
        "Infelizmente, seu pedido foi cancelado. 💔 Se precisar, entre em contato conosco."
};


/* =========================================================
   DINHEIRO
========================================================= */

function dinheiro(valor) {

    return Number(valor || 0)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(valor) {

    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   STATUS FORMATADO
========================================================= */

function statusFormatado(status) {

    const nomes = {

        pendente: "Pendente",

        preparo: "Em preparo",

        entrega: "Saiu para entrega",

        entregue: "Entregue",

        cancelado: "Cancelado"
    };

    return nomes[status] || status;
}


/* =========================================================
   PAGAMENTO
========================================================= */

function pagamentoFormatado(valor) {

    const pagamentos = {

        pix: "Pix",

        dinheiro: "Dinheiro",

        cartao: "Cartão",

        cartão: "Cartão",

        credito: "Cartão de crédito",

        debito: "Cartão de débito"
    };

    return pagamentos[
        String(valor || "")
            .toLowerCase()
    ] || valor || "-";
}


/* =========================================================
   TIPO
========================================================= */

function tipoFormatado(valor) {

    const tipo =
        String(valor || "")
            .toLowerCase();

    if (
        tipo === "delivery" ||
        tipo === "entrega"
    ) {
        return "Entrega";
    }

    if (
        tipo === "pickup" ||
        tipo === "retirada"
    ) {
        return "Retirada";
    }

    return valor || "-";
}


/* =========================================================
   BUSCAR PEDIDO
========================================================= */

async function carregarPedido() {

    if (!token) {

        mostrarErro();

        return;
    }

    try {

        const resultado =
            await supabaseClient.rpc(
                "consultar_pedido",
                {
                    p_token: token
                }
            );

        if (
            resultado.error ||
            !resultado.data ||
            resultado.data.encontrado === false
        ) {

            console.error(
                resultado.error
            );

            mostrarErro();

            return;
        }

        mostrarPedido(
            resultado.data
        );

    } catch (error) {

        console.error(error);

        mostrarErro();
    }
}


/* =========================================================
   MOSTRAR PEDIDO
========================================================= */

function mostrarPedido(dados) {

    carregando.style.display =
        "none";

    erro.style.display =
        "none";

    pedido.style.display =
        "block";


    numeroPedido.textContent =
        "#" + dados.id;


    const nome =
        dados.cliente_nome ||
        "cliente";


    saudacaoCliente.textContent =
        `Olá, ${nome}! 💗`;


    atualizarStatus(
        dados.status
    );


    renderizarItens(
        dados.itens
    );


    totalPedido.textContent =
        dinheiro(dados.total);


    pagamentoPedido.textContent =
        pagamentoFormatado(
            dados.forma_pagamento
        );


    tipoPedido.textContent =
        tipoFormatado(
            dados.tipo_entrega
        );
}


/* =========================================================
   ATUALIZAR STATUS
========================================================= */

function atualizarStatus(status) {

    status =
        String(status || "")
            .toLowerCase();


    statusTexto.textContent =
        statusFormatado(status);


    mensagemStatus.textContent =
        mensagens[status] ||
        "Seu pedido está sendo atualizado. 💗";


    document
        .querySelectorAll(".etapa")
        .forEach(function(etapa) {

            etapa.classList.remove(
                "ativa",
                "concluida"
            );
        });


    const statusBox =
        document.querySelector(
            ".status-box"
        );

    statusBox.classList.remove(
        "cancelado"
    );


    if (status === "cancelado") {

        statusBox.classList.add(
            "cancelado"
        );

        progressoAtivo.style.width =
            "0%";

        return;
    }


    const indice =
        statusOrdem.indexOf(status);


    if (indice === -1) {
        return;
    }


    const porcentagem =
        indice === 0
            ? 0
            : (indice / 3) * 100;


    progressoAtivo.style.width =
        porcentagem + "%";


    document
        .querySelectorAll(".etapa")
        .forEach(function(etapa, i) {

            if (i < indice) {

                etapa.classList.add(
                    "concluida"
                );

            } else if (i === indice) {

                etapa.classList.add(
                    "ativa"
                );
            }
        });


    if (status === "entregue") {

        document
            .querySelectorAll(".etapa")
            .forEach(function(etapa) {

                etapa.classList.add(
                    "concluida"
                );
            });

        progressoAtivo.style.width =
            "100%";
    }
}


/* =========================================================
   ITENS
========================================================= */

function renderizarItens(itens) {

    itensPedido.innerHTML = "";


    if (!Array.isArray(itens) ||
        itens.length === 0) {

        itensPedido.innerHTML = `
            <div class="item-pedido">
                <span class="item-nome">
                    Nenhum item informado
                </span>
            </div>
        `;

        return;
    }


    itens.forEach(function(item) {

        const nome =
            item.nome ||
            item.name ||
            "Produto";


        const quantidade =
            Number(
                item.quantidade ||
                item.quantity ||
                1
            );


        const subtotal =
            Number(
                item.subtotal ||
                (
                    Number(
                        item.preco ||
                        item.price ||
                        0
                    ) * quantidade
                )
            );


        const linha =
            document.createElement("div");

        linha.className =
            "item-pedido";


        linha.innerHTML = `
            <span class="item-nome">
                ${quantidade}x
                ${escapeHtml(nome)}
            </span>

            <strong class="item-preco">
                ${dinheiro(subtotal)}
            </strong>
        `;


        itensPedido.appendChild(
            linha
        );
    });
}


/* =========================================================
   ERRO
========================================================= */

function mostrarErro() {

    carregando.style.display =
        "none";

    pedido.style.display =
        "none";

    erro.style.display =
        "block";
}


/* =========================================================
   ATUALIZAÇÃO AUTOMÁTICA
========================================================= */

carregarPedido();


setInterval(
    carregarPedido,
    5000
);
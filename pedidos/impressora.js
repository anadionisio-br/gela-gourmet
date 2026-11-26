// ======================================================
// IMPRESSORA TÉRMICA (ESC/POS) — Gela Gourmet
// ------------------------------------------------------
// - Conecta pela porta serial Bluetooth (Chrome/Edge no Windows)
//   ou por Bluetooth LE.
// - Imprime automaticamente cada pedido NOVO enquanto o
//   painel de pedidos estiver aberto.
// - Sem impressora conectada, o botão "Imprimir" do pedido
//   abre a impressão normal do navegador.
// ======================================================

(function () {
    "use strict";

    // ---------------- CONFIGURAÇÃO ----------------

    // Caracteres por linha: 32 para papel de 58mm, 48 para 80mm
    const LARGURA = 32;

    // false = imprime sem acentos (funciona em qualquer impressora).
    // true  = tenta imprimir acentos (página de código PC850); se sair
    //         caractere estranho no papel, volte para false.
    const USAR_ACENTOS = false;

    // Velocidade da porta serial (em Bluetooth costuma não importar)
    const BAUD_RATE = 9600;

    const CHAVE_BASE = "gelaImpressaoBase";
    const CHAVE_IMPRESSOS = "gelaImpressaoImpressos";
    const CHAVE_AUTO = "gelaImpressaoAuto";

    // Serviços Bluetooth LE comuns em mini impressoras térmicas
    const SERVICOS_BLE = [
        0x18f0,
        0xff00,
        0xffe0,
        0xfee7,
        0xff12,
        "49535343-fe7d-4ae5-8fa9-9fafd205e455",
        "e7810a71-73ae-499d-8c15-faa9aef0c3f2"
    ];

    // Acentos na página de código PC850
    const CP850 = {
        "Ç": 0x80, "ü": 0x81, "é": 0x82, "â": 0x83, "à": 0x85, "ç": 0x87,
        "ê": 0x88, "É": 0x90, "ô": 0x93, "á": 0xa0, "í": 0xa1, "ó": 0xa2,
        "ú": 0xa3, "Á": 0xb5, "Â": 0xb6, "ã": 0xc6, "Ã": 0xc7, "Ê": 0xd2,
        "Í": 0xd6, "Ó": 0xe0, "Ô": 0xe2, "õ": 0xe4, "Õ": 0xe5, "Ú": 0xe9
    };


    // ---------------- ESTADO ----------------

    let conexao = null;
    let filaImpressao = Promise.resolve();
    let ultimaLista = [];
    let idInicial = null;
    let pendentes = [];
    let mensagem = "";
    let mensagemErro = false;

    const emImpressao = new Set();
    const falhou = new Set();


    // ---------------- ARMAZENAMENTO ----------------

    function lerBase() {
        try {
            const valor = localStorage.getItem(CHAVE_BASE);
            return valor === null ? null : Number(valor);
        } catch (e) {
            return null;
        }
    }

    function salvarBase(valor) {
        try {
            localStorage.setItem(CHAVE_BASE, String(valor));
        } catch (e) { /* ignora */ }
    }

    function lerImpressos() {
        try {
            const lista = JSON.parse(localStorage.getItem(CHAVE_IMPRESSOS) || "[]");
            return new Set(lista.map(String));
        } catch (e) {
            return new Set();
        }
    }

    function marcarImpresso(id) {
        const impressos = lerImpressos();
        impressos.add(String(id));

        try {
            localStorage.setItem(CHAVE_IMPRESSOS, JSON.stringify([...impressos]));
        } catch (e) { /* ignora */ }
    }

    function lerAuto() {
        try {
            return localStorage.getItem(CHAVE_AUTO) !== "0";
        } catch (e) {
            return true;
        }
    }

    function salvarAuto(ligado) {
        try {
            localStorage.setItem(CHAVE_AUTO, ligado ? "1" : "0");
        } catch (e) { /* ignora */ }
    }


    // ---------------- TEXTO ----------------

    // manterEspacos = true preserva os espaços de alinhamento da linha
    function limpar(texto, manterEspacos) {
        let s = String(texto === null || texto === undefined ? "" : texto);

        // tira emojis e símbolos
        s = s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\uFE0F\u200D]/gu, "");

        if (USAR_ACENTOS) {
            s = s.normalize("NFC");
        } else {
            s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }

        s = s
            .replace(/[“”]/g, "\"")
            .replace(/[‘’]/g, "'")
            .replace(/[–—]/g, "-");

        return manterEspacos ? s : s.replace(/\s+/g, " ").trim();
    }

    function codificar(texto, manterEspacos) {
        const bytes = [];

        for (const letra of limpar(texto, manterEspacos)) {
            const codigo = letra.charCodeAt(0);

            if (codigo >= 32 && codigo < 127) {
                bytes.push(codigo);
            } else if (USAR_ACENTOS && CP850[letra] !== undefined) {
                bytes.push(CP850[letra]);
            } else {
                bytes.push(0x3f); // "?"
            }
        }

        return bytes;
    }

    function quebrar(texto, largura) {
        const palavras = limpar(texto).split(" ").filter(Boolean);
        const linhas = [];
        let atual = "";

        palavras.forEach(function (palavra) {
            while (palavra.length > largura) {
                if (atual) {
                    linhas.push(atual);
                    atual = "";
                }

                linhas.push(palavra.slice(0, largura));
                palavra = palavra.slice(largura);
            }

            if (!atual) {
                atual = palavra;
            } else if ((atual + " " + palavra).length <= largura) {
                atual += " " + palavra;
            } else {
                linhas.push(atual);
                atual = palavra;
            }
        });

        if (atual) {
            linhas.push(atual);
        }

        return linhas.length ? linhas : [""];
    }

    function moeda(valor) {
        return "R$ " + Number(valor || 0).toFixed(2).replace(".", ",");
    }

    function dataHora(valor) {
        const data = valor ? new Date(valor) : new Date();

        if (isNaN(data.getTime())) {
            return "";
        }

        return data.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).replace(",", "");
    }


    // ---------------- MONTAR O CUPOM ----------------

    function novoCupom() {
        const bytes = [];
        const plano = [];

        const cupom = {
            cmd: function () {
                for (let i = 0; i < arguments.length; i++) {
                    bytes.push(arguments[i]);
                }
                return cupom;
            },

            linha: function (texto) {
                codificar(texto, true).forEach(function (b) { bytes.push(b); });
                bytes.push(0x0a);
                plano.push(limpar(texto, true));
                return cupom;
            },

            paragrafo: function (texto) {
                quebrar(texto, LARGURA).forEach(function (l) { cupom.linha(l); });
                return cupom;
            },

            centro: function (texto, grande) {
                const largura = grande ? Math.floor(LARGURA / 2) : LARGURA;

                cupom.cmd(0x1b, 0x61, 0x01);               // centralizar
                if (grande) cupom.cmd(0x1d, 0x21, 0x11);   // dobro de tamanho
                cupom.cmd(0x1b, 0x45, grande ? 1 : 0);     // negrito

                quebrar(texto, largura).forEach(function (l) {
                    codificar(l).forEach(function (b) { bytes.push(b); });
                    bytes.push(0x0a);

                    const espacos = Math.max(0, Math.floor((largura - l.length) / 2));
                    plano.push(" ".repeat(espacos * (grande ? 2 : 1)) + l);
                });

                cupom.cmd(0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00, 0x1b, 0x61, 0x00);
                return cupom;
            },

            separador: function () {
                return cupom.linha("-".repeat(LARGURA));
            },

            // texto à esquerda e valor à direita
            esqDir: function (esquerda, direita) {
                const dir = limpar(direita);
                const partes = quebrar(esquerda, Math.max(8, LARGURA - dir.length - 1));

                partes.forEach(function (parte, i) {
                    if (i === 0) {
                        cupom.linha(parte.padEnd(LARGURA - dir.length) + dir);
                    } else {
                        cupom.linha(parte);
                    }
                });

                return cupom;
            },

            negrito: function (ligado) {
                return cupom.cmd(0x1b, 0x45, ligado ? 1 : 0);
            },

            resultado: function () {
                return {
                    bytes: new Uint8Array(bytes),
                    texto: plano.join("\n")
                };
            }
        };

        return cupom;
    }

    function lerItens(itens) {
        let lista = itens;

        if (typeof itens === "string") {
            try {
                lista = JSON.parse(itens);
            } catch (e) {
                lista = [];
            }
        }

        return Array.isArray(lista) ? lista : [];
    }

    function nomePagamento(valor) {
        const mapa = {
            pix: "Pix",
            dinheiro: "Dinheiro",
            cartao: "Cartao",
            credito: "Credito",
            debito: "Debito"
        };

        return mapa[valor] || valor || "-";
    }

    function montarCupom(pedido) {
        const cupom = novoCupom();

        cupom.cmd(0x1b, 0x40);                       // iniciar impressora
        if (USAR_ACENTOS) cupom.cmd(0x1b, 0x74, 0x02); // página PC850

        cupom.centro("GELA GOURMET", true);
        cupom.centro("Geladinhos Gourmet");
        cupom.separador();
        cupom.centro("PEDIDO #" + pedido.id, true);
        cupom.centro(dataHora(pedido.created_at));
        cupom.separador();

        cupom.paragrafo("Cliente: " + (pedido.cliente_nome || "-"));
        cupom.paragrafo("Tel: " + (pedido.cliente_telefone || "-"));

        const entrega = pedido.tipo_entrega === "delivery" ||
            pedido.tipo_entrega === "entrega";

        cupom.negrito(true).linha(entrega ? "ENTREGA" : "RETIRADA NO LOCAL").negrito(false);

        if (entrega && pedido.cliente_endereco) {
            String(pedido.cliente_endereco).split(" | ").forEach(function (parte) {
                cupom.paragrafo(parte);
            });
        }

        cupom.separador();

        const itens = lerItens(pedido.itens);

        if (!itens.length) {
            cupom.linha("(sem itens)");
        }

        itens.forEach(function (item) {
            const nome = item.nome || item.name || "Produto";
            const quantidade = item.quantidade || item.quantity || 1;
            const subtotal = item.subtotal !== undefined && item.subtotal !== null
                ? item.subtotal
                : Number(item.preco || item.price || 0) * Number(quantidade);

            cupom.esqDir(quantidade + "x " + nome, moeda(subtotal));
        });

        cupom.separador();
        cupom.negrito(true).esqDir("TOTAL", moeda(pedido.total)).negrito(false);

        const combinar = typeof window.entregaACombinar === "function" &&
            window.entregaACombinar(pedido);

        if (combinar) {
            cupom.paragrafo("+ entrega a combinar (nao inclusa)");
        }

        cupom.linha("Pagamento: " + nomePagamento(pedido.forma_pagamento));
        cupom.separador();
        cupom.centro("Obrigado!");

        cupom.cmd(0x1b, 0x64, 0x04);                 // avança 4 linhas
        cupom.cmd(0x1d, 0x56, 0x42, 0x00);           // corta (se tiver guilhotina)

        return cupom.resultado();
    }

    function montarTeste() {
        const cupom = novoCupom();

        cupom.cmd(0x1b, 0x40);
        if (USAR_ACENTOS) cupom.cmd(0x1b, 0x74, 0x02);

        cupom.centro("TESTE", true);
        cupom.centro("Gela Gourmet");
        cupom.separador();
        cupom.paragrafo("Impressora conectada com sucesso!");
        cupom.paragrafo("Acentos: ação, coração, é, ú, ç");
        cupom.cmd(0x1b, 0x64, 0x04);
        cupom.cmd(0x1d, 0x56, 0x42, 0x00);

        return cupom.resultado();
    }


    // ---------------- CONEXÃO: PORTA SERIAL ----------------

    async function abrirSerial(porta) {
        if (!porta.writable) {
            await porta.open({ baudRate: BAUD_RATE });
        }

        const escritor = porta.writable.getWriter();

        const ligacao = {
            tipo: "Bluetooth (serial)",

            enviar: async function (dados) {
                for (let i = 0; i < dados.length; i += 512) {
                    await escritor.write(dados.slice(i, i + 512));
                }
            },

            fechar: async function () {
                try {
                    escritor.releaseLock();
                    await porta.close();
                } catch (e) { /* ignora */ }
            }
        };

        porta.addEventListener("disconnect", function () {
            if (conexao === ligacao) {
                conexao = null;
                definirMensagem("A impressora foi desconectada.", true);
            }
        });

        conexao = ligacao;
    }

    async function conectarSerial() {
        if (!("serial" in navigator)) {
            throw new Error("Este navegador não suporta porta serial. Use o Chrome ou o Edge.");
        }

        const porta = await navigator.serial.requestPort();
        await abrirSerial(porta);
    }

    // Reconecta sozinho se o navegador já tem permissão (sem precisar clicar)
    async function reconectarAutomatico() {
        if (!("serial" in navigator)) return;

        try {
            const portas = await navigator.serial.getPorts();

            for (let i = 0; i < portas.length; i++) {
                try {
                    await abrirSerial(portas[i]);
                    definirMensagem("Impressora reconectada automaticamente.", false);
                    return;
                } catch (e) {
                    console.warn("Não foi possível reabrir a porta:", e);
                }
            }
        } catch (e) {
            console.warn(e);
        }
    }


    // ---------------- CONEXÃO: BLUETOOTH LE ----------------

    async function conectarBle() {
        if (!("bluetooth" in navigator)) {
            throw new Error("Este navegador não suporta Bluetooth. Use o Chrome ou o Edge.");
        }

        const dispositivo = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: SERVICOS_BLE
        });

        const servidor = await dispositivo.gatt.connect();
        const servicos = await servidor.getPrimaryServices();

        let caracteristica = null;

        for (let i = 0; i < servicos.length && !caracteristica; i++) {
            const lista = await servicos[i].getCharacteristics();

            for (let j = 0; j < lista.length; j++) {
                if (lista[j].properties.writeWithoutResponse || lista[j].properties.write) {
                    caracteristica = lista[j];
                    break;
                }
            }
        }

        if (!caracteristica) {
            dispositivo.gatt.disconnect();
            throw new Error("Não encontrei como enviar dados para essa impressora por Bluetooth LE.");
        }

        const ligacao = {
            tipo: "Bluetooth LE (" + (dispositivo.name || "impressora") + ")",

            enviar: async function (dados) {
                const tamanho = 20;

                for (let i = 0; i < dados.length; i += tamanho) {
                    const parte = dados.slice(i, i + tamanho);

                    if (caracteristica.properties.writeWithoutResponse) {
                        await caracteristica.writeValueWithoutResponse(parte);
                    } else {
                        await caracteristica.writeValue(parte);
                    }

                    await new Promise(function (r) { setTimeout(r, 15); });
                }
            },

            fechar: async function () {
                try {
                    dispositivo.gatt.disconnect();
                } catch (e) { /* ignora */ }
            }
        };

        dispositivo.addEventListener("gattserverdisconnected", function () {
            if (conexao === ligacao) {
                conexao = null;
                definirMensagem("A impressora foi desconectada.", true);
            }
        });

        conexao = ligacao;
    }

    async function desconectar() {
        if (conexao) {
            const atual = conexao;
            conexao = null;
            await atual.fechar();
        }

        atualizarPainel();
    }


    // ---------------- IMPRIMIR ----------------

    function enfileirar(tarefa) {
        const proxima = filaImpressao.then(tarefa);
        filaImpressao = proxima.catch(function () { /* mantém a fila viva */ });
        return proxima;
    }

    async function enviarParaImpressora(cupom) {
        if (!conexao) {
            throw new Error("Impressora não conectada.");
        }

        await enfileirar(function () {
            return conexao.enviar(cupom.bytes);
        });
    }

    // Impressão normal do navegador (plano B, sem impressora conectada)
    function imprimirNavegador(cupom) {
        const frame = document.createElement("iframe");
        frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
        document.body.appendChild(frame);

        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(
            "<html><head><title>Pedido</title><style>" +
            "@page{margin:2mm}body{margin:0}" +
            "pre{font:12px/1.25 monospace;width:" + (LARGURA > 40 ? "76mm" : "56mm") + ";white-space:pre-wrap}" +
            "</style></head><body><pre></pre></body></html>"
        );
        doc.close();
        doc.querySelector("pre").textContent = cupom.texto;

        frame.contentWindow.focus();
        frame.contentWindow.print();

        setTimeout(function () { frame.remove(); }, 60000);
    }

    async function imprimirPedido(pedido) {
        const cupom = montarCupom(pedido);

        try {
            if (conexao) {
                await enviarParaImpressora(cupom);
                definirMensagem("Pedido #" + pedido.id + " impresso.", false);
            } else {
                imprimirNavegador(cupom);
            }

            marcarImpresso(pedido.id);
            falhou.delete(String(pedido.id));
            recalcularPendentes();
        } catch (erro) {
            console.error(erro);
            definirMensagem("Não consegui imprimir: " + (erro.message || erro), true);
        }
    }

    async function imprimirTeste() {
        try {
            if (conexao) {
                await enviarParaImpressora(montarTeste());
                definirMensagem("Teste enviado para a impressora.", false);
            } else {
                imprimirNavegador(montarTeste());
            }
        } catch (erro) {
            console.error(erro);
            definirMensagem("Falha no teste: " + (erro.message || erro), true);
        }
    }

    async function imprimirLista(lista) {
        for (let i = 0; i < lista.length; i++) {
            const pedido = lista[i];
            const id = String(pedido.id);

            if (emImpressao.has(id)) continue;
            emImpressao.add(id);

            try {
                await enviarParaImpressora(montarCupom(pedido));
                marcarImpresso(id);
                falhou.delete(id);
                definirMensagem("Pedido #" + id + " impresso.", false);
            } catch (erro) {
                console.error(erro);
                falhou.add(id);
                definirMensagem("Falha ao imprimir o pedido #" + id + ": " + (erro.message || erro), true);
            } finally {
                emImpressao.delete(id);
            }
        }

        recalcularPendentes();
    }

    async function imprimirPendentes() {
        const lista = pendentes.slice();

        lista.forEach(function (p) { falhou.delete(String(p.id)); });

        if (!conexao) {
            definirMensagem("Conecte a impressora primeiro.", true);
            return;
        }

        await imprimirLista(lista);
    }


    // ---------------- DETECTAR PEDIDOS NOVOS ----------------

    function naoImpressos() {
        const base = lerBase();
        const impressos = lerImpressos();

        return ultimaLista
            .filter(function (p) {
                return Number(p.id) > base &&
                    !impressos.has(String(p.id)) &&
                    p.status !== "cancelado";
            })
            .sort(function (a, b) { return Number(a.id) - Number(b.id); });
    }

    function recalcularPendentes() {
        pendentes = naoImpressos().filter(function (p) {
            return !emImpressao.has(String(p.id));
        });

        atualizarPainel();
    }

    // Chamada pelo painel toda vez que a lista de pedidos é atualizada
    function verificarNovos(lista) {
        if (!Array.isArray(lista)) return;

        ultimaLista = lista;

        const maior = lista.reduce(function (m, p) {
            return Math.max(m, Number(p.id) || 0);
        }, 0);

        // Primeira vez neste computador: não imprime pedidos antigos
        if (lerBase() === null) {
            salvarBase(maior);
        }

        // Pedidos que chegarem DEPOIS de abrir o painel imprimem sozinhos
        if (idInicial === null) {
            idInicial = maior;
        }

        const paraAutomatico = naoImpressos().filter(function (p) {
            return Number(p.id) > idInicial &&
                !falhou.has(String(p.id)) &&
                !emImpressao.has(String(p.id));
        });

        recalcularPendentes();

        if (lerAuto() && conexao && paraAutomatico.length) {
            imprimirLista(paraAutomatico);
        }
    }


    // ---------------- PAINEL NA TELA ----------------

    let painel = null;
    let refs = {};
    let minimizado = false;

    function definirMensagem(texto, erro) {
        mensagem = texto;
        mensagemErro = !!erro;
        atualizarPainel();
    }

    function criarPainel() {
        if (typeof document === "undefined") return;

        const estilo = document.createElement("style");
        estilo.textContent =
            "#impPainel{position:fixed;right:16px;bottom:16px;z-index:9999;width:290px;" +
            "background:#fff;border:1px solid #f0d9df;border-radius:14px;" +
            "box-shadow:0 10px 30px rgba(97,55,31,.18);font:14px/1.4 system-ui,sans-serif;color:#61371f}" +
            "#impPainel .imp-topo{display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;font-weight:700}" +
            "#impPainel .imp-ponto{width:10px;height:10px;border-radius:50%;background:#c0392b}" +
            "#impPainel.on .imp-ponto{background:#2e9d57}" +
            "#impPainel .imp-estado{margin-left:auto;font-weight:500;font-size:12px;color:#806c65}" +
            "#impPainel .imp-corpo{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px}" +
            "#impPainel.min .imp-corpo{display:none}" +
            "#impPainel button{border:0;border-radius:8px;padding:9px 10px;font:600 13px system-ui,sans-serif;" +
            "cursor:pointer;background:#b83c68;color:#fff}" +
            "#impPainel button.sec{background:#f2ecee;color:#66575d}" +
            "#impPainel button:disabled{opacity:.5;cursor:not-allowed}" +
            "#impPainel label{display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer}" +
            "#impPainel .imp-msg{font-size:12px;color:#2e7d4f}" +
            "#impPainel .imp-msg.erro{color:#b3261e}" +
            "#impPainel .imp-pend{background:#fff4d6;border:1px solid #f0d28a;border-radius:8px;padding:8px;font-size:13px}";
        document.head.appendChild(estilo);

        painel = document.createElement("div");
        painel.id = "impPainel";
        painel.innerHTML =
            "<div class=\"imp-topo\" id=\"impTopo\">" +
            "<span class=\"imp-ponto\"></span><span>🖨 Impressora</span>" +
            "<span class=\"imp-estado\" id=\"impEstado\"></span></div>" +
            "<div class=\"imp-corpo\">" +
            "<button id=\"impSerial\" type=\"button\">Conectar (Bluetooth serial)</button>" +
            "<button id=\"impBle\" type=\"button\" class=\"sec\">Conectar (Bluetooth LE)</button>" +
            "<button id=\"impDesc\" type=\"button\" class=\"sec\">Desconectar</button>" +
            "<button id=\"impTeste\" type=\"button\" class=\"sec\">Imprimir teste</button>" +
            "<label><input type=\"checkbox\" id=\"impAuto\"> Imprimir pedidos novos automaticamente</label>" +
            "<div class=\"imp-pend\" id=\"impPend\" hidden>" +
            "<div id=\"impPendTxt\"></div>" +
            "<button id=\"impPendBtn\" type=\"button\" style=\"margin-top:6px;width:100%\">Imprimir agora</button></div>" +
            "<div class=\"imp-msg\" id=\"impMsg\"></div></div>";
        document.body.appendChild(painel);

        refs = {
            estado: painel.querySelector("#impEstado"),
            serial: painel.querySelector("#impSerial"),
            ble: painel.querySelector("#impBle"),
            desc: painel.querySelector("#impDesc"),
            teste: painel.querySelector("#impTeste"),
            auto: painel.querySelector("#impAuto"),
            pend: painel.querySelector("#impPend"),
            pendTxt: painel.querySelector("#impPendTxt"),
            pendBtn: painel.querySelector("#impPendBtn"),
            msg: painel.querySelector("#impMsg")
        };

        refs.auto.checked = lerAuto();

        painel.querySelector("#impTopo").addEventListener("click", function () {
            minimizado = !minimizado;
            painel.classList.toggle("min", minimizado);
        });

        refs.serial.addEventListener("click", function () { conectarPeloPainel(conectarSerial); });
        refs.ble.addEventListener("click", function () { conectarPeloPainel(conectarBle); });
        refs.desc.addEventListener("click", desconectar);
        refs.teste.addEventListener("click", imprimirTeste);
        refs.pendBtn.addEventListener("click", imprimirPendentes);

        refs.auto.addEventListener("change", function () {
            salvarAuto(refs.auto.checked);
            recalcularPendentes();
        });

        atualizarPainel();
    }

    async function conectarPeloPainel(funcao) {
        try {
            await funcao();
            definirMensagem("Conectado: " + conexao.tipo, false);
        } catch (erro) {
            // fechar a janela de escolha do aparelho não é erro
            if (erro && (erro.name === "NotFoundError" || erro.name === "AbortError")) {
                atualizarPainel();
                return;
            }

            console.error(erro);
            definirMensagem(erro.message || String(erro), true);
        }

        recalcularPendentes();
    }

    function atualizarPainel() {
        if (!painel) return;

        const ligado = !!conexao;

        painel.classList.toggle("on", ligado);
        refs.estado.textContent = ligado ? "conectada" : "desconectada";

        refs.serial.hidden = ligado;
        refs.ble.hidden = ligado;
        refs.desc.hidden = !ligado;

        refs.serial.disabled = !("serial" in navigator);
        refs.ble.disabled = !("bluetooth" in navigator);
        refs.serial.title = refs.serial.disabled ? "Use o Chrome ou o Edge" : "";
        refs.ble.title = refs.ble.disabled ? "Use o Chrome ou o Edge" : "";

        if (pendentes.length) {
            refs.pend.hidden = false;

            refs.pendTxt.textContent = pendentes.length === 1
                ? "1 pedido aguardando impressão (#" + pendentes[0].id + ")"
                : pendentes.length + " pedidos aguardando impressão";

            refs.pendBtn.disabled = !ligado;
            refs.pendBtn.textContent = ligado ? "Imprimir agora" : "Conecte a impressora";
        } else {
            refs.pend.hidden = true;
        }

        refs.msg.textContent = mensagem;
        refs.msg.classList.toggle("erro", mensagemErro);
    }


    // ---------------- INICIAR ----------------

    function iniciar() {
        criarPainel();
        reconectarAutomatico().then(recalcularPendentes);
    }

    if (typeof document !== "undefined") {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", iniciar);
        } else {
            iniciar();
        }
    }

    window.Impressora = {
        verificarNovos: verificarNovos,
        imprimirPedido: imprimirPedido,
        imprimirTeste: imprimirTeste,
        // usado só em testes
        _montarCupom: montarCupom
    };
})();
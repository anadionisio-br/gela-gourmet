const SUPABASE_URL = "https://aiirehncupywhmftzzmn.supabase.co";

// Use aqui a sua Publishable Key
const SUPABASE_KEY = "sb_publishable_6qSFWsLKbBxwYEE_N_yU3A_d-vOpHv9";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Verifica se o administrador está logado
async function verificarLogin() {

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "admin-login.html";
        return false;
    }

    return true;
}


const form = document.getElementById("loginForm");

const mensagem = document.getElementById("mensagem");


form.addEventListener("submit", async function (event) {

    event.preventDefault();


    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;


    mensagem.textContent = "Entrando...";
    mensagem.style.color = "#777";


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    if (error) {

        console.error(error);

        mensagem.textContent =
            "❌ E-mail ou senha incorretos.";

        mensagem.style.color = "#c94f62";

        return;
    }


    mensagem.textContent =
        "✅ Login realizado!";

    mensagem.style.color = "#29955a";


    setTimeout(() => {

        window.location.href = "admin.html";

    }, 500);

});
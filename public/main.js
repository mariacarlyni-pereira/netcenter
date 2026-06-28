
import { buscarFerramentas } from './api/index.js';
import { obterToken, obterPerfil, logout } from './api/auth.js';

async function iniciarApp() {
    const grid = document.getElementById('grid-ferramentas');
    const inputBusca = document.getElementById('input-alvo');
    const btnBusca = document.getElementById('btn-busca');
    const authActions = document.getElementById('auth-actions');

    async function renderAuthState() {
        const token = obterToken();
        if (!token) {
            authActions.innerHTML = `
                <a id="btn-login" href="login.html" class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl transition">Entrar</a>
                <a href="register.html" class="text-slate-300 hover:text-white transition">Cadastrar</a>
            `;
            return;
        }

        try {
            const perfil = await obterPerfil();
            authActions.innerHTML = `
                <span class="text-slate-300 text-sm">Olá, ${perfil.user.name}</span>
                <a href="reports.html" class="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-xl transition">Relatórios</a>
                <button id="btn-logout" class="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 px-4 rounded-xl transition">Sair</button>
            `;
            document.getElementById('btn-logout').addEventListener('click', () => {
                logout();
                window.location.reload();
            });
        } catch (erro) {
            logout();
            renderAuthState();
        }
    }

    function redirectToLogin(redirectUrl) {
        window.location.href = `login.html?redirect=${encodeURIComponent(redirectUrl)}`;
    }

    try {
        await renderAuthState();

        //Busca os dados usando a função importada
        const dados = await buscarFerramentas();
        grid.innerHTML = ""; // Limpa a área

        // Cria os cards dinamicamente
        dados.forEach(item => {
            const card = document.createElement('div'); // Manipulação manual do DOM
            card.className = "bg-slate-900 p-6 rounded-xl border border-slate-800 hover:border-blue-500 transition-all group cursor-pointer text-left";
            
            card.innerHTML = `
                <i data-lucide="${item.icone}" class="text-blue-500 w-6 h-6 mb-4 group-hover:scale-110 transition-transform"></i>
                <h3 class="text-sm font-bold text-white mb-1">${item.nome}</h3>
                <p class="text-[10px] text-slate-500 uppercase font-semibold">${item.id}</p>
            `;

            //Tratamento de Evento: Clique no card
            card.addEventListener('click', () => {
                const alvo = inputBusca.value.trim() || 'meu-ip';
                const destino = `tools.html?ferramenta=${item.id}&alvo=${alvo}`;
                window.location.href = destino;
            });

            //Adiciona na tela
            grid.appendChild(card);
        });

        //Renderiza os ícones gerados
        lucide.createIcons();

    } catch (erro) {
        grid.innerHTML = `<p class="text-red-500 text-xs col-span-full font-mono">Erro: ${erro.message}</p>`;
    }

    // Tratamento de Evento: Clique no botão principal
    btnBusca.addEventListener('click', () => {
        const alvo = inputBusca.value.trim() || 'meu-ip';
        const destino = `tools.html?ferramenta=ping&alvo=${alvo}`;
        window.location.href = destino;
    });
}

// Roda o script assim que a página carrega
document.addEventListener('DOMContentLoaded', iniciarApp);

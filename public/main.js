
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

    // Tratamento de Evento: Relatório Completo
    const btnFullReport = document.getElementById('btn-full-report');
    const fullReportStatus = document.getElementById('full-report-status');

    if (btnFullReport) {
        btnFullReport.addEventListener('click', async () => {
            const alvo = inputBusca.value.trim();
            if (!alvo) {
                fullReportStatus.textContent = 'Por favor, informe um IP ou domínio válido para gerar o relatório.';
                fullReportStatus.className = 'text-sm font-semibold text-center mb-8 h-4 text-red-400';
                return;
            }

            const token = obterToken();
            if (!token) {
                fullReportStatus.textContent = 'Redirecionando para login...';
                fullReportStatus.className = 'text-sm font-semibold text-center mb-8 h-4 text-blue-400';
                setTimeout(() => redirectToLogin('index.html'), 1000);
                return;
            }

            btnFullReport.disabled = true;
            btnFullReport.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Gerando (pode levar 30s)...`;
            fullReportStatus.textContent = 'Executando todas as ferramentas de diagnóstico no alvo. Por favor aguarde...';
            fullReportStatus.className = 'text-sm font-semibold text-center mb-8 h-4 text-blue-400 animate-pulse';
            lucide.createIcons();

            try {
                // Importa dinamicamente a função
                const { gerarRelatorioCompleto } = await import('./api/auth.js');
                const result = await gerarRelatorioCompleto(alvo);
                
                fullReportStatus.innerHTML = `<a href="${result.pdf_url}" target="_blank" class="text-emerald-400 hover:underline">Relatório gerado com sucesso! Clique aqui para abrir.</a>`;
                fullReportStatus.className = 'text-sm font-semibold text-center mb-8 h-4 text-emerald-400';
                
                // Abre diretamente numa nova aba
                window.open(result.pdf_url, '_blank');
            } catch (error) {
                fullReportStatus.textContent = `Erro: ${error.message}`;
                fullReportStatus.className = 'text-sm font-semibold text-center mb-8 h-4 text-red-400';
            } finally {
                btnFullReport.disabled = false;
                btnFullReport.innerHTML = `<i data-lucide="file-text" class="w-5 h-5"></i> Relatório Completo`;
                lucide.createIcons();
            }
        });
    }
}

// Roda o script assim que a página carrega
document.addEventListener('DOMContentLoaded', iniciarApp);

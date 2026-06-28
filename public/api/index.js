const LOCAL_BASE_URL = 'http://localhost:3001';
const API_BASE_URL = (() => {
  if (typeof window === 'undefined' || window.location.protocol === 'file:') {
    return LOCAL_BASE_URL;
  }
  return `${window.location.protocol}//${window.location.host}`;
})();

export async function buscarFerramentas() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ferramentas`);
        if (!response.ok) {
            throw new Error('Falha ao buscar ferramentas.');
        }
        return await response.json();
    } catch (erro) {
        console.error('Erro ao buscar ferramentas:', erro);
        throw erro;
    }
}
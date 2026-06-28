const LOCAL_BASE_URL = 'http://localhost:3001';
const API_BASE_URL = (() => {
  if (typeof window === 'undefined' || window.location.protocol === 'file:') {
    return LOCAL_BASE_URL;
  }
  return `${window.location.protocol}//${window.location.host}`;
})();
const TOKEN_KEY = 'netcenter_token';

function handleResponse(response) {
  return response.text().then((text) => {
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      if (contentType.includes('application/json')) {
        try {
          const body = JSON.parse(text);
          throw new Error(body?.message || 'Erro inesperado.');
        } catch {
          throw new Error(text || 'Erro inesperado de rede.');
        }
      }
      throw new Error(text || 'Erro inesperado de rede.');
    }

    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  });
}

export function salvarToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function obterToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function fazerLogin(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
}

export async function registrarUsuario(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(response);
}

export async function obterPerfil() {
  const token = obterToken();
  if (!token) {
    throw new Error('Token ausente. Faça login para continuar.');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse(response);
}

export async function gerarRelatorio(ferramenta, alvo) {
  const token = obterToken();
  if (!token) {
    throw new Error('Token ausente. Faça login para continuar.');
  }

  const response = await fetch(`${API_BASE_URL}/api/reports/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ferramenta, alvo }),
  });
  return handleResponse(response);
}

export async function listarRelatorios() {
  const token = obterToken();
  if (!token) {
    throw new Error('Token ausente. Faça login para continuar.');
  }

  const response = await fetch(`${API_BASE_URL}/api/reports`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleResponse(response);
}

export async function executarFerramenta(ferramenta, alvo) {
  const token = obterToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/run-tool`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ferramenta, alvo }),
  });
  return handleResponse(response);
}

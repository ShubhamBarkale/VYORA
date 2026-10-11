const BASE = import.meta.env.VITE_DJANGO_BASE_URL;

export const saveTokens = (tokens) => {
  localStorage.setItem('access_token', tokens.access);
  localStorage.setItem('refresh_token', tokens.refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const getAccessToken  = () => localStorage.getItem('access_token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');

/**
 * Wrapper around fetch that automatically attaches the JWT Bearer token
 * and attempts a silent refresh if the access token has expired (401).
 */
export const authFetch = async (url, options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response = await fetch(url, { ...options, headers });

  // If 401, try refreshing the token once
  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE}/api/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          saveTokens({ access: data.access, refresh: data.refresh || refreshToken });
          headers['Authorization'] = `Bearer ${data.access}`;
          response = await fetch(url, { ...options, headers });
        } else {
          clearTokens();
        }
      } catch {
        clearTokens();
      }
    }
  }

  return response;
};

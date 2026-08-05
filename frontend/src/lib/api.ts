const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const ACCESS_TOKEN_KEY = 'corehr-access-token';

export const UNAUTHORIZED_EVENT = 'corehr:unauthorized';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(accessToken: string, remember = true) {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  store.setItem(ACCESS_TOKEN_KEY, accessToken);
  other.removeItem(ACCESS_TOKEN_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function parseErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const payload = await response.json();
      return payload.message || payload.error || 'Request failed';
    }

    const errorText = await response.text();
    return errorText || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
}

async function tryRefreshAccessToken(): Promise<string | null> {
  try {
    const response = await apiFetch<{ success: boolean; data: { accessToken: string } }>('/auth/refresh', {
      method: 'POST',
    });

    const store = localStorage.getItem(ACCESS_TOKEN_KEY) ? localStorage : sessionStorage;
    store.setItem(ACCESS_TOKEN_KEY, response.data.accessToken);
    return response.data.accessToken;
  } catch {
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // best-effort: the local session is cleared regardless
  }
}

export async function authFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const accessToken = getAccessToken();

  const withAuthHeaders = (token: string | null): RequestInit => ({
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const response = await fetch(`${API_BASE_URL}${endpoint}`, withAuthHeaders(accessToken));

  if (response.status === 401) {
    const refreshedToken = await tryRefreshAccessToken();

    if (!refreshedToken) {
      clearTokens();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      throw new Error('Session expired. Please sign in again.');
    }

    const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, withAuthHeaders(refreshedToken));

    if (!retryResponse.ok) {
      throw new Error(await parseErrorMessage(retryResponse));
    }

    return (await retryResponse.json()) as T;
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as T;
}

export default API_BASE_URL;

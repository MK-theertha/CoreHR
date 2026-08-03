const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';

    try {
      if (contentType.includes('application/json')) {
        const payload = await response.json();
        throw new Error(payload.message || payload.error || 'Request failed');
      }

      const errorText = await response.text();
      throw new Error(errorText || 'Request failed');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Request failed');
    }
  }

  return (await response.json()) as T;
}

export default API_BASE_URL;

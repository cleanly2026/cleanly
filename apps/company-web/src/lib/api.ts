// API client for company-web — thin wrapper over fetch with JWT auth injection
// Created as prerequisite for plan 02-09 (plan 02-02 dependency)

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api'

function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ data: T; status: number }> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error ?? 'Request failed'), { status: res.status, data: err })
  }

  const data: T = await res.json()
  return { data, status: res.status }
}

export const api = {
  get: <T = unknown>(path: string) => request<T>('GET', path),
  post: <T = unknown>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T = unknown>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T = unknown>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T = unknown>(path: string) => request<T>('DELETE', path),
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? `API error ${res.status}`)
  }
  return res.json()
}

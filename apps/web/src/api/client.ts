// API 客户端封装
import type { Release, Repo, User } from '@srrm/shared';

const BASE = import.meta.env.VITE_API_BASE ?? '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include', // 携带 HttpOnly Cookie
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return (await res.json()) as T;
}

interface PaginatedResponse<T> {
  releases: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const api = {
  releases: {
    list: async (params?: { date?: string; repo?: string }): Promise<Release[]> => {
      const qs = new URLSearchParams(params as any);
      const result = await request<PaginatedResponse<Release>>(`/api/releases?${qs}`);
      return result.releases;
    },
  },
  admin: {
    repos: {
      list: async () => {
        const result = await request<{ repos: Repo[] }>('/api/admin/repos');
        return result.repos;
      },
      add: (body: { owner: string; repo: string }) =>
        request<Repo>('/api/admin/repos', { method: 'POST', body: JSON.stringify(body) }),
      remove: (id: string) =>
        request<void>(`/api/admin/repos/${id}`, { method: 'DELETE' }),
    },
    scrape: {
      trigger: () => request<void>('/api/admin/scrape/trigger', { method: 'POST' }),
    },
  },
  auth: {
    login: () => request<{ url: string }>('/api/auth/login', { method: 'GET' }),
    me: () => request<{ authenticated: boolean; user?: User }>('/api/auth/me', { method: 'GET' }),
    logout: () => request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
  },
};
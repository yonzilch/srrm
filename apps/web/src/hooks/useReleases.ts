// Releases hook
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Release, Repo } from '@srrm/shared';
import { api } from '../api/client';

export function useReleases(params?: { date?: string; repo?: string; page?: number; limit?: number }) {
  const queryClient = useQueryClient();

  return useQuery<{
    releases: Release[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }>({
    queryKey: ['releases', params],
    queryFn: () => {
      const p = { page: params?.page ?? 1, limit: params?.limit ?? 50, ...params };
      return api.releases.list(p);
    },
    staleTime: 1000 * 60, // 1分钟
  });
}

export function useAdminRepos() {
  const queryClient = useQueryClient();

  return useQuery<Repo[]>({
    queryKey: ['admin-repos'],
    queryFn: () => api.admin.repos.list(),
    staleTime: 1000 * 60 * 5, // 5分钟
  });
}

export function useTriggerScrape() {
  const queryClient = useQueryClient();

  return async () => {
    await api.admin.scrape.trigger();
    await queryClient.invalidateQueries({ queryKey: ['releases'] });
  };
}

// Releases hook
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Release, Repo } from '@srrm/shared';
import { api } from '../api/client';

export function useReleases(params?: { date?: string; repo?: string }) {
  const queryClient = useQueryClient();

  return useQuery<Release[]>({
    queryKey: ['releases', params],
    queryFn: () => api.releases.list({ ...params, limit: 100 }),
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
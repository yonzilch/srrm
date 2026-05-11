// Releases hook
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api/client';

export function useReleases(params?: { date?: string; repo?: string }) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['releases', params],
    queryFn: () => api.releases.list(params),
    staleTime: 1000 * 60, // 1分钟
  });
}

export function useAdminRepos() {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['admin-repos'],
    queryFn: () => api.admin.repos.list(),
    staleTime: 1000 * 60 * 5, // 5分钟
  });
}

export function useTriggerScrape() {
  const queryClient = useQueryClient();
  
  return async () => {
    await api.admin.scrape.trigger();
    // 刷新相关查询
    await queryClient.invalidateQueries({ queryKey: ['releases'] });
  };
}

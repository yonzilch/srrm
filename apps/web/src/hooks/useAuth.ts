// Auth hook
import { useQuery } from '@tanstack/react-query';
import { api } from './api/client';

export function useAuth() {
  return useQuery({
    queryKey: ['auth'],
    queryFn: () => api.auth.me(),
    staleTime: 1000 * 60 * 5, // 5分钟
  });
}
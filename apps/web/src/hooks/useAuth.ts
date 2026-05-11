// Auth hook
import { useQuery } from '@tanstack/react-query';
import type { User } from '@srrm/shared';
import { api } from '../api/client';

export function useAuth() {
  return useQuery<User | undefined>({
    queryKey: ['auth'],
    queryFn: async () => {
      const result = await api.auth.me();
      return result.user;
    },
    staleTime: 1000 * 60 * 5, // 5分钟
  });
}
import { useQuery } from '@tanstack/react-query';
import { userTasksApi } from '../api/userTasks';

/**
 * Хук для условного показа вкладки «Задания» в навигации.
 * Возвращает enabled=true если у пользователя есть хоть одно доступное задание.
 */
export function useTasksAvailability(enabled: boolean = true) {
  const query = useQuery({
    queryKey: ['user', 'tasks', 'availability'],
    queryFn: () => userTasksApi.availability(),
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return {
    tasksEnabled: query.data?.has_available_tasks ?? false,
    unclaimedCount: query.data?.unclaimed_count ?? 0,
    isLoading: query.isLoading,
  };
}

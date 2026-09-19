import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { promocodesApi, type PromoGroupRecalculationStatus } from '@/api/promocodes';
import { useToast } from '@/components/Toast';
import { RECALCULATION_POLL_MS } from './pollInterval';

export const RECALCULATION_QUERY_KEY = ['admin-promo-groups-recalculation'] as const;
const GROUPS_QUERY_KEY = ['admin-promo-groups'] as const;

/**
 * Пересчёт участников групп по тратам: запуск, опрос, итог.
 *
 * Проход идёт у бота в фоне. Пока он идёт, состояние опрашивается; как только
 * проход кончился — список групп перечитывается (счётчики участников), а
 * оператору говорят, сколько человек переназначено. Проход может начаться и
 * не отсюда: бот сам пересчитывает после создания, правки или удаления группы
 * с порогом. Поэтому опрос привязан к состоянию, а не к нажатию кнопки.
 */
export function useRecalculation() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: RECALCULATION_QUERY_KEY,
    queryFn: promocodesApi.getPromoGroupRecalculation,
    refetchInterval: (query) => (query.state.data?.running ? RECALCULATION_POLL_MS : false),
  });

  const isRunning = status.data?.running ?? false;
  const last = status.data?.last ?? null;
  const wasRunning = useRef(false);

  useEffect(() => {
    if (wasRunning.current && !isRunning) {
      void queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
      if (last?.error) {
        showToast({
          type: 'error',
          message: t('admin.promoGroups.recalculateFailed'),
        });
      } else if (last) {
        showToast({
          type: 'success',
          message: t('admin.promoGroups.recalculateDone', {
            checked: last.checked,
            changed: last.changed,
          }),
        });
      }
    }
    wasRunning.current = isRunning;
  }, [isRunning, last, queryClient, showToast, t]);

  const start = useMutation({
    mutationFn: promocodesApi.recalculatePromoGroups,
    onSuccess: (data: PromoGroupRecalculationStatus) => {
      queryClient.setQueryData(RECALCULATION_QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: RECALCULATION_QUERY_KEY });
      showToast({
        type: 'info',
        message: t('admin.promoGroups.recalculateStarted'),
      });
    },
    onError: () => {
      showToast({
        type: 'error',
        message: t('admin.promoGroups.recalculateFailed'),
      });
    },
  });

  return {
    isRunning,
    isStarting: start.isPending,
    start: () => start.mutate(),
  };
}

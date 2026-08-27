import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { brandingApi } from '@/api/branding';
import { referralApi } from '@/api/referral';
import { wheelApi } from '@/api/wheel';
import { contestsApi } from '@/api/contests';
import { pollsApi } from '@/api/polls';

// Последние известные значения флагов. Пока запросы в полёте, флаги были
// undefined -> табы «Рефералы»/«Колесо» появлялись с задержкой и нижняя
// навигация прыгала на каждом холодном старте. Кэш убирает layout shift;
// при изменении флага на бэке UI догонит после ответа запроса.
const FLAGS_CACHE_KEY = 'cabinet-feature-flags';

type CachedFlags = {
  referralEnabled?: boolean;
  wheelEnabled?: boolean;
  hasContests?: boolean;
  hasPolls?: boolean;
  giftEnabled?: boolean;
};

function readFlagsCache(): CachedFlags {
  try {
    return JSON.parse(localStorage.getItem(FLAGS_CACHE_KEY) || '{}') as CachedFlags;
  } catch {
    return {};
  }
}

export function useFeatureFlags() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const cached = readFlagsCache();

  const { data: referralTerms } = useQuery({
    queryKey: ['referral-terms'],
    queryFn: referralApi.getReferralTerms,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const { data: wheelConfig } = useQuery({
    queryKey: ['wheel-config'],
    queryFn: wheelApi.getConfig,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const { data: contestsCount } = useQuery({
    queryKey: ['contests-count'],
    queryFn: contestsApi.getCount,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const { data: pollsCount } = useQuery({
    queryKey: ['polls-count'],
    queryFn: pollsApi.getCount,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const { data: giftConfig } = useQuery({
    queryKey: ['gift-enabled'],
    queryFn: brandingApi.getGiftEnabled,
    enabled: isAuthenticated,
    staleTime: 60000,
    retry: false,
  });

  const flags = {
    referralEnabled: referralTerms ? referralTerms.is_enabled : cached.referralEnabled,
    wheelEnabled: wheelConfig ? wheelConfig.is_enabled : cached.wheelEnabled,
    hasContests: contestsCount ? contestsCount.count > 0 : cached.hasContests,
    hasPolls: pollsCount ? pollsCount.count > 0 : cached.hasPolls,
    giftEnabled: giftConfig ? giftConfig.enabled : cached.giftEnabled,
  };

  useEffect(() => {
    if (!referralTerms && !wheelConfig && !contestsCount && !pollsCount && !giftConfig) return;
    try {
      localStorage.setItem(FLAGS_CACHE_KEY, JSON.stringify(flags));
    } catch {
      // квоты/приватный режим — некритично
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    flags.referralEnabled,
    flags.wheelEnabled,
    flags.hasContests,
    flags.hasPolls,
    flags.giftEnabled,
  ]);

  return flags;
}

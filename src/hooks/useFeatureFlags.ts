import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { brandingApi } from '@/api/branding';
import { referralApi } from '@/api/referral';
import { wheelApi } from '@/api/wheel';
import { contestsApi } from '@/api/contests';
import { pollsApi } from '@/api/polls';

export function useFeatureFlags() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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

  return {
    referralEnabled: referralTerms?.is_enabled,
    wheelEnabled: wheelConfig?.is_enabled,
    hasContests: (contestsCount?.count ?? 0) > 0,
    hasPolls: (pollsCount?.count ?? 0) > 0,
    giftEnabled: giftConfig?.enabled,
  };
}

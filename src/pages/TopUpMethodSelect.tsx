import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { balanceApi } from '../api/balance';
import { useCurrency } from '../hooks/useCurrency';
import { useBackButton } from '@/platform';
import { Card } from '@/components/data-display/Card';
import { staggerContainer, staggerItem } from '@/components/motion/transitions';

export default function TopUpMethodSelect() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formatAmount, currencySymbol } = useCurrency();

  useBackButton(() => navigate('/balance'));

  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: balanceApi.getPaymentMethods,
  });

  const handleMethodClick = (methodId: string) => {
    const params = new URLSearchParams();
    const amount = searchParams.get('amount');
    const returnTo = searchParams.get('returnTo');
    if (amount) params.set('amount', amount);
    if (returnTo) params.set('returnTo', returnTo);
    const qs = params.toString();
    navigate(`/balance/top-up/${methodId}${qs ? `?${qs}` : ''}`);
  };

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div variants={staggerItem}>
        <h1 className="text-2xl font-bold text-dark-50 sm:text-3xl">
          {t('balance.selectPaymentMethod')}
        </h1>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
            </div>
          ) : !paymentMethods || paymentMethods.length === 0 ? (
            <div className="py-6 text-center text-sm text-dark-400">
              {t('balance.noPaymentMethods')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paymentMethods.map((method) => {
                const methodKey = method.id.toLowerCase().replace(/-/g, '_');
                const translatedName = t(`balance.paymentMethods.${methodKey}.name`, {
                  defaultValue: '',
                });
                const translatedDesc = t(`balance.paymentMethods.${methodKey}.description`, {
                  defaultValue: '',
                });

                return (
                  <Card
                    key={method.id}
                    interactive={method.is_available}
                    className={!method.is_available ? 'cursor-not-allowed opacity-50' : ''}
                    onClick={() => method.is_available && handleMethodClick(method.id)}
                  >
                    <div className="font-semibold text-dark-100">
                      {translatedName || method.name}
                    </div>
                    {(translatedDesc || method.description) && (
                      <div className="mt-1 text-sm text-dark-500">
                        {translatedDesc || method.description}
                      </div>
                    )}
                    <div className="mt-3 text-xs text-dark-600">
                      {formatAmount(method.min_amount_kopeks / 100, 0)} –{' '}
                      {formatAmount(method.max_amount_kopeks / 100, 0)} {currencySymbol}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}

import { useTranslation } from 'react-i18next';
import { NODE_COLORS } from '../utils';

interface NetworkLegendProps {
  className?: string;
}

const CAMPAIGN_GRADIENT_COLORS = ['#4dd9c0', '#f0c261', '#e85d9a', '#6b9fff', '#b97aff'];

const FILL_ITEMS = [
  { color: NODE_COLORS.paidActive, labelKey: 'admin.referralNetwork.legend.paidActive' },
  { color: NODE_COLORS.trialActive, labelKey: 'admin.referralNetwork.legend.trialActive' },
  { color: NODE_COLORS.paidExpired, labelKey: 'admin.referralNetwork.legend.paidExpired' },
  { color: NODE_COLORS.trialExpired, labelKey: 'admin.referralNetwork.legend.trialExpired' },
  { color: NODE_COLORS.partner, labelKey: 'admin.referralNetwork.legend.partner' },
  { color: NODE_COLORS.topReferrer, labelKey: 'admin.referralNetwork.legend.topReferrer' },
  { color: NODE_COLORS.activeReferrer, labelKey: 'admin.referralNetwork.legend.activeReferrer' },
  { color: NODE_COLORS.regular, labelKey: 'admin.referralNetwork.legend.regularUser' },
];

export function NetworkLegend({ className }: NetworkLegendProps) {
  const { t } = useTranslation();

  const gradientStyle = {
    background: `linear-gradient(135deg, ${CAMPAIGN_GRADIENT_COLORS.join(', ')})`,
  };

  return (
    <div
      className={`rounded-xl border border-dark-700/50 bg-dark-900/80 p-3 backdrop-blur-md ${className ?? ''}`}
    >
      {/* Fill = Subscription status */}
      <h4 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-dark-500">
        {t('admin.referralNetwork.legend.fillTitle')}
      </h4>
      <div className="space-y-1">
        {FILL_ITEMS.map((item) => (
          <div key={item.labelKey} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-dark-300">{t(item.labelKey)}</span>
          </div>
        ))}
      </div>

      {/* Edges */}
      <div className="mt-2.5 space-y-1">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: '#ff8a65' }} />
          <span className="text-xs text-dark-300">
            {t('admin.referralNetwork.legend.partnerCampaignEdge')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={gradientStyle} />
          <span className="text-xs text-dark-300">
            {t('admin.referralNetwork.legend.campaignNode')}
          </span>
        </div>
      </div>
    </div>
  );
}

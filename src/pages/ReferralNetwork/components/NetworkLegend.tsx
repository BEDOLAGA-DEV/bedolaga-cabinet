import { useTranslation } from 'react-i18next';

interface NetworkLegendProps {
  className?: string;
}

const CAMPAIGN_GRADIENT_COLORS = ['#4dd9c0', '#f0c261', '#e85d9a', '#6b9fff', '#b97aff'];

const USER_LEGEND_ITEMS = [
  { colorKey: '#6b7280', labelKey: 'admin.referralNetwork.legend.regularUser' },
  { colorKey: '#7c6aef', labelKey: 'admin.referralNetwork.legend.activeReferrer' },
  { colorKey: '#f0c261', labelKey: 'admin.referralNetwork.legend.partner' },
  { colorKey: '#e85d9a', labelKey: 'admin.referralNetwork.legend.topReferrer' },
  { colorKey: '#4dd9c0', labelKey: 'admin.referralNetwork.legend.campaignUser' },
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
      <h4 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dark-500">
        {t('admin.referralNetwork.legend.title')}
      </h4>
      <div className="space-y-1.5">
        {USER_LEGEND_ITEMS.map((item) => (
          <div key={item.labelKey} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.colorKey }}
            />
            <span className="text-xs text-dark-300">{t(item.labelKey)}</span>
          </div>
        ))}
        {/* Partner → Campaign edge */}
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: '#ff8a65' }} />
          <span className="text-xs text-dark-300">
            {t('admin.referralNetwork.legend.partnerCampaignEdge')}
          </span>
        </div>
        {/* Campaign node with gradient to represent varying colors */}
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

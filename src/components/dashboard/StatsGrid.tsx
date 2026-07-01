import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useCurrency } from '../../hooks/useCurrency';

interface StatsGridProps {
  balanceRubles: number;
}

const ChevronIcon = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 16 16"
    fill="none"
    style={{ flexShrink: 0 }}
    aria-hidden="true"
  >
    <path
      d="M6 4l4 4-4 4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WalletIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
    <path d="M6 14h.01M10 14h.01" />
  </svg>
);

const HelpIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    <path d="M9 9h6M9 13h4" />
  </svg>
);

const PeopleIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default function StatsGrid({ balanceRubles }: StatsGridProps) {
  const { t } = useTranslation();
  const { formatAmount, currencySymbol } = useCurrency();

  const cards = [
    {
      title: t('dashboard.simple.balanceTitle'),
      description: `${formatAmount(balanceRubles)} ${currencySymbol} · ${t('dashboard.simple.balanceHint')}`,
      to: '/balance',
      icon: WalletIcon,
      tone: 'bg-accent-500/15 text-accent-300',
      onboarding: 'balance',
    },
    {
      title: t('dashboard.simple.supportTitle'),
      description: `${t('dashboard.simple.supportValue').toLocaleLowerCase()} ${t('dashboard.simple.supportHint')}`,
      to: '/support',
      icon: HelpIcon,
      tone: 'bg-success-500/15 text-success-300',
    },
    {
      title: t('dashboard.simple.referralTitle'),
      description: t('dashboard.simple.referralHint'),
      to: '/referral',
      icon: PeopleIcon,
      tone: 'bg-warning-500/15 text-warning-300',
    },
  ];

  return (
    <div className="space-y-3">
      {cards.map((card, i) => (
        <Link
          key={i}
          to={card.to}
          className="group flex min-h-[88px] items-center gap-4 rounded-2xl border border-dark-700/60 bg-dark-900/70 p-4 transition-colors hover:border-accent-500/50 hover:bg-dark-850"
          data-onboarding={card.onboarding}
        >
          <div
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl ${card.tone}`}
          >
            <card.icon />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold leading-tight text-dark-50">{card.title}</div>
            <div className="mt-1 text-sm font-normal leading-snug text-dark-400">
              {card.description}
            </div>
          </div>

          <div className="text-dark-500 transition-colors group-hover:text-accent-300">
            <ChevronIcon />
          </div>
        </Link>
      ))}
    </div>
  );
}

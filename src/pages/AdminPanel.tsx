import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Icons - smaller versions for mobile
const TicketIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
  </svg>
)

const CogIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const PhoneIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
)

const WheelIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
)

const TariffIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
  </svg>
)

const ServerIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
)

const AdminIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
)

const ChartIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
)

const BanSystemIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
)

const BroadcastIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
  </svg>
)

const PromocodeIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
  </svg>
)

const CampaignIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
  </svg>
)

const UsersIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)

const PaymentsIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
  </svg>
)

const PromoOffersIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
)

const RemnawaveIcon = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg className="w-4 h-4 text-dark-500 group-hover:text-dark-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
)

interface AdminSection {
  to: string
  icon: React.ReactNode
  mobileIcon: React.ReactNode
  title: string
  description: string
  color: string
  bgColor: string
  textColor: string
}

// Mobile compact card
function MobileAdminCard({ to, mobileIcon, title, bgColor, textColor }: AdminSection) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-3 bg-dark-800/80 rounded-2xl border border-dark-700/50 hover:border-dark-600 active:scale-95 transition-all duration-150"
    >
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center mb-2`}>
        <div className={textColor}>
          {mobileIcon}
        </div>
      </div>
      <span className="text-xs font-medium text-dark-200 text-center leading-tight">{title}</span>
    </Link>
  )
}

// Desktop card
function DesktopAdminCard({ to, icon, title, description, bgColor, textColor }: AdminSection) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 p-4 bg-dark-800/80 rounded-2xl border border-dark-700/50 hover:border-dark-600 hover:bg-dark-800 transition-all duration-200"
    >
      <div className={`w-14 h-14 rounded-xl ${bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
        <div className={textColor}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-dark-100 mb-0.5">{title}</h3>
        <p className="text-sm text-dark-400 truncate">{description}</p>
      </div>
      <ChevronRightIcon />
    </Link>
  )
}

export default function AdminPanel() {
  const { t } = useTranslation()

  const adminSections: AdminSection[] = [
    {
      to: '/admin/dashboard',
      icon: <ChartIcon />,
      mobileIcon: <ChartIcon className="w-6 h-6" />,
      title: t('admin.nav.dashboard'),
      description: t('admin.panel.dashboardDesc'),
      color: 'success',
      bgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-400'
    },
    {
      to: '/admin/tickets',
      icon: <TicketIcon />,
      mobileIcon: <TicketIcon className="w-6 h-6" />,
      title: t('admin.nav.tickets'),
      description: t('admin.panel.ticketsDesc'),
      color: 'warning',
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400'
    },
    {
      to: '/admin/settings',
      icon: <CogIcon />,
      mobileIcon: <CogIcon className="w-6 h-6" />,
      title: t('admin.nav.settings'),
      description: t('admin.panel.settingsDesc'),
      color: 'accent',
      bgColor: 'bg-blue-500/20',
      textColor: 'text-blue-400'
    },
    {
      to: '/admin/apps',
      icon: <PhoneIcon />,
      mobileIcon: <PhoneIcon className="w-6 h-6" />,
      title: t('admin.nav.apps'),
      description: t('admin.panel.appsDesc'),
      color: 'success',
      bgColor: 'bg-teal-500/20',
      textColor: 'text-teal-400'
    },
    {
      to: '/admin/wheel',
      icon: <WheelIcon />,
      mobileIcon: <WheelIcon className="w-6 h-6" />,
      title: t('admin.nav.wheel'),
      description: t('admin.panel.wheelDesc'),
      color: 'error',
      bgColor: 'bg-rose-500/20',
      textColor: 'text-rose-400'
    },
    {
      to: '/admin/tariffs',
      icon: <TariffIcon />,
      mobileIcon: <TariffIcon className="w-6 h-6" />,
      title: t('admin.nav.tariffs'),
      description: t('admin.panel.tariffsDesc'),
      color: 'info',
      bgColor: 'bg-cyan-500/20',
      textColor: 'text-cyan-400'
    },
    {
      to: '/admin/servers',
      icon: <ServerIcon />,
      mobileIcon: <ServerIcon className="w-6 h-6" />,
      title: t('admin.nav.servers'),
      description: t('admin.panel.serversDesc'),
      color: 'purple',
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-400'
    },
    {
      to: '/admin/broadcasts',
      icon: <BroadcastIcon />,
      mobileIcon: <BroadcastIcon className="w-6 h-6" />,
      title: t('admin.nav.broadcasts'),
      description: t('admin.panel.broadcastsDesc'),
      color: 'orange',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400'
    },
    {
      to: '/admin/promocodes',
      icon: <PromocodeIcon />,
      mobileIcon: <PromocodeIcon className="w-6 h-6" />,
      title: t('admin.nav.promocodes', 'Промокоды'),
      description: t('admin.panel.promocodesDesc', 'Управление промокодами'),
      color: 'violet',
      bgColor: 'bg-violet-500/20',
      textColor: 'text-violet-400'
    },
    {
      to: '/admin/promo-offers',
      icon: <PromoOffersIcon />,
      mobileIcon: <PromoOffersIcon className="w-6 h-6" />,
      title: t('admin.nav.promoOffers', 'Промопредложения'),
      description: t('admin.panel.promoOffersDesc', 'Персональные скидки и предложения'),
      color: 'orange',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400'
    },
    {
      to: '/admin/campaigns',
      icon: <CampaignIcon />,
      mobileIcon: <CampaignIcon className="w-6 h-6" />,
      title: t('admin.nav.campaigns', 'Кампании'),
      description: t('admin.panel.campaignsDesc', 'Рекламные кампании'),
      color: 'orange',
      bgColor: 'bg-orange-500/20',
      textColor: 'text-orange-400'
    },
    {
      to: '/admin/users',
      icon: <UsersIcon />,
      mobileIcon: <UsersIcon className="w-6 h-6" />,
      title: t('admin.nav.users', 'Пользователи'),
      description: t('admin.panel.usersDesc', 'Управление пользователями'),
      color: 'indigo',
      bgColor: 'bg-indigo-500/20',
      textColor: 'text-indigo-400'
    },
    {
      to: '/admin/ban-system',
      icon: <BanSystemIcon />,
      mobileIcon: <BanSystemIcon className="w-6 h-6" />,
      title: t('admin.nav.banSystem'),
      description: t('admin.panel.banSystemDesc'),
      color: 'error',
      bgColor: 'bg-red-500/20',
      textColor: 'text-red-400'
    },
    {
      to: '/admin/payments',
      icon: <PaymentsIcon />,
      mobileIcon: <PaymentsIcon className="w-6 h-6" />,
      title: t('admin.nav.payments', 'Платежи'),
      description: t('admin.panel.paymentsDesc', 'Проверка платежей'),
      color: 'lime',
      bgColor: 'bg-lime-500/20',
      textColor: 'text-lime-400'
    },
    {
      to: '/admin/remnawave',
      icon: <RemnawaveIcon />,
      mobileIcon: <RemnawaveIcon className="w-6 h-6" />,
      title: t('admin.nav.remnawave', 'RemnaWave'),
      description: t('admin.panel.remnawaveDesc', 'Управление панелью и статистика'),
      color: 'purple',
      bgColor: 'bg-purple-500/20',
      textColor: 'text-purple-400'
    },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header - compact on mobile */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 sm:p-3 bg-amber-500/20 rounded-xl">
          <AdminIcon className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark-100">{t('admin.panel.title')}</h1>
          <p className="text-sm text-dark-400 hidden sm:block">{t('admin.panel.subtitle')}</p>
        </div>
      </div>

      {/* Mobile: Compact 2-column grid */}
      <div className="grid grid-cols-3 gap-3 sm:hidden">
        {adminSections.map((section) => (
          <MobileAdminCard key={section.to} {...section} />
        ))}
      </div>

      {/* Tablet/Desktop: List style */}
      <div className="hidden sm:grid sm:grid-cols-1 lg:grid-cols-2 gap-3">
        {adminSections.map((section) => (
          <DesktopAdminCard key={section.to} {...section} />
        ))}
      </div>
    </div>
  )
}

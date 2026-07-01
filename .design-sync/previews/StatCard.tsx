import { PlatformProvider, StatCard } from 'cabinet-frontend';

const P = ({ children }: { children: any }) => (
  <PlatformProvider>
    <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
    <div
      style={{
        background: 'rgb(10,15,26)',
        color: 'rgb(241,245,249)',
        padding: 24,
        borderRadius: 12,
      }}
    >
      {children}
    </div>
  </PlatformProvider>
);

const BoltIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const Grid = () => (
  <P>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      <StatCard label="Трафик за месяц" value="128 ГБ" icon={<BoltIcon />} />
      <StatCard label="Активные устройства" value={4} />
      <StatCard
        label="Доход"
        value="₽ 24 500"
        change={{ value: 12, label: 'за неделю' }}
        trend="up"
      />
      <StatCard
        label="Отток"
        value="3.2%"
        change={{ value: -1.4, label: 'за неделю' }}
        trend="down"
      />
    </div>
  </P>
);

export const Loading = () => (
  <P>
    <StatCard label="Загрузка данных" value="—" loading style={{ maxWidth: 260 }} />
  </P>
);

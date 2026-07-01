import { PlatformProvider, BentoCard } from 'cabinet-frontend';

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

export const Default = () => (
  <P>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, width: 420 }}>
      <BentoCard>
        <div style={{ fontSize: 13, color: 'rgb(148,163,184)' }}>Локация</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>Амстердам</div>
      </BentoCard>
      <BentoCard hover glow>
        <div style={{ fontSize: 13, color: 'rgb(148,163,184)' }}>Пинг</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>24 мс</div>
      </BentoCard>
    </div>
  </P>
);

export const Sizes = () => (
  <P>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 90px)',
        gridAutoRows: '80px',
        gap: 12,
      }}
    >
      <BentoCard size="sm">
        <span style={{ fontSize: 13 }}>sm</span>
      </BentoCard>
      <BentoCard size="md">
        <span style={{ fontSize: 13 }}>md (col-span-2)</span>
      </BentoCard>
      <BentoCard size="lg">
        <span style={{ fontSize: 13 }}>lg (row-span-2)</span>
      </BentoCard>
    </div>
  </P>
);

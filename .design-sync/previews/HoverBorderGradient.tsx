import { PlatformProvider, HoverBorderGradient } from 'cabinet-frontend';

const P = ({ children }: { children: any }) => (
  <PlatformProvider>
    <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
    <div
      style={{
        background: 'rgb(10,15,26)',
        color: 'rgb(241,245,249)',
        padding: 32,
        borderRadius: 12,
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
      }}
    >
      {children}
    </div>
  </PlatformProvider>
);

export const Default = () => (
  <P>
    <HoverBorderGradient style={{ padding: '14px 28px', borderRadius: 12, fontWeight: 600 }}>
      Подключить VPN
    </HoverBorderGradient>
    <HoverBorderGradient
      accentColor="#00E5A0"
      style={{ padding: '14px 28px', borderRadius: 12, fontWeight: 600 }}
    >
      Premium
    </HoverBorderGradient>
  </P>
);

import { PlatformProvider, AnimatedCrossmark } from 'cabinet-frontend';

const P = ({ children }: { children: any }) => (
  <PlatformProvider>
    <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
    <div
      style={{
        background: 'rgb(10,15,26)',
        color: 'rgb(241,245,249)',
        padding: 32,
        borderRadius: 12,
        display: 'inline-flex',
        gap: 16,
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  </PlatformProvider>
);

export const Default = () => (
  <P>
    <AnimatedCrossmark />
    <span style={{ fontSize: 15, color: 'rgb(148,163,184)' }}>Не удалось выполнить платёж</span>
  </P>
);

import { PlatformProvider, BentoSkeleton } from 'cabinet-frontend';

const P = ({ children }: { children: any }) => (
  <PlatformProvider>
    <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
    <div
      style={{
        background: 'rgb(10,15,26)',
        color: 'rgb(241,245,249)',
        padding: 24,
        borderRadius: 12,
        maxWidth: 360,
      }}
    >
      {children}
    </div>
  </PlatformProvider>
);

export const Default = () => (
  <P>
    <BentoSkeleton />
  </P>
);

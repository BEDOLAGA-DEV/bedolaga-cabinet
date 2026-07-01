import { PlatformProvider, Spinner } from 'cabinet-frontend';

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
        gap: 24,
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  </PlatformProvider>
);

export const Default = () => (
  <P>
    <Spinner />
    <Spinner className="h-5 w-5" />
    <Spinner className="h-12 w-12" />
  </P>
);

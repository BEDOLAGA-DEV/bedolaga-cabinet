import { PlatformProvider, Skeleton } from 'cabinet-frontend';

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

export const Text = () => (
  <P>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton variant="text" count={3} />
    </div>
  </P>
);

export const Avatar = () => (
  <P>
    <div style={{ display: 'flex', gap: 12 }}>
      <Skeleton variant="avatar" />
      <Skeleton variant="avatar" />
      <Skeleton variant="avatar" />
    </div>
  </P>
);

export const CardVariant = () => (
  <P>
    <Skeleton variant="card" />
  </P>
);

export const ListVariant = () => (
  <P>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton variant="list" count={3} />
    </div>
  </P>
);

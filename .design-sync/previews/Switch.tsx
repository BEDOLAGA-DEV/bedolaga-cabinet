import { PlatformProvider, Switch } from 'cabinet-frontend';

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

export const WithLabel = () => (
  <P>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Switch
        label="Автопродление"
        description="Продлевать подписку автоматически"
        defaultChecked
      />
      <Switch label="Уведомления" description="Push при завершении подписки" />
      <Switch label="Тёмная тема" defaultChecked disabled />
    </div>
  </P>
);

export const Plain = () => (
  <P>
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Switch defaultChecked />
      <Switch />
      <Switch disabled />
    </div>
  </P>
);

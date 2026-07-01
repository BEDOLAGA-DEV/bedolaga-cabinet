import {
  PlatformProvider,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
} from 'cabinet-frontend';

const P = ({ children }: { children: any }) => (
  <PlatformProvider>
    <style>{'[style*="opacity: 0"],[style*="opacity:0"]{opacity:1!important}'}</style>
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgb(10,15,26)',
        color: 'rgb(241,245,249)',
      }}
    />
    <div style={{ position: 'relative', padding: 24 }}>{children}</div>
  </PlatformProvider>
);

export const Default = () => (
  <P>
    <Popover open>
      <PopoverTrigger asChild>
        <Button variant="outline">Детали тарифа</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Тариф Premium</div>
        <p style={{ margin: 0, fontSize: 13, color: 'rgb(148,163,184)' }}>
          Безлимит, до 5 устройств, приоритетная поддержка. 499 ₽ в месяц.
        </p>
      </PopoverContent>
    </Popover>
  </P>
);

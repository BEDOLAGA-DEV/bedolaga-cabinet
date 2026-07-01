import {
  PlatformProvider,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from 'cabinet-frontend';

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

export const Composed = () => (
  <P>
    <Card style={{ maxWidth: 360 }}>
      <CardHeader>
        <CardTitle>Подписка Pro</CardTitle>
        <CardDescription>Безлимитный трафик и доступ ко всем локациям</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ margin: 0, color: 'rgb(148,163,184)', fontSize: 14 }}>
          Действует до 30 декабря 2026. Автопродление включено.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="primary" size="sm">
          Продлить
        </Button>
      </CardFooter>
    </Card>
  </P>
);

export const Variants = () => (
  <P>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
      <Card variant="default">
        <CardTitle>Default</CardTitle>
      </Card>
      <Card variant="glass">
        <CardTitle>Glass</CardTitle>
      </Card>
      <Card variant="solid">
        <CardTitle>Solid</CardTitle>
      </Card>
      <Card variant="outline">
        <CardTitle>Outline</CardTitle>
      </Card>
    </div>
  </P>
);

export const Interactive = () => (
  <P>
    <Card interactive glow style={{ maxWidth: 320 }}>
      <CardTitle>Кликабельная карточка</CardTitle>
      <CardDescription>С эффектом свечения при наведении</CardDescription>
    </Card>
  </P>
);

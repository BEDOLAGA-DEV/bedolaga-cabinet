import { PlatformProvider, Button } from 'cabinet-frontend';

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

const Row = ({ children }: { children: any }) => (
  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 2v8m0 0 3-3m-3 3L5 7M3 13h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Variants = () => (
  <P>
    <Row>
      <Button variant="primary">Оплатить</Button>
      <Button variant="secondary">Продлить</Button>
      <Button variant="outline">Настройки</Button>
      <Button variant="ghost">Подробнее</Button>
      <Button variant="destructive">Удалить</Button>
      <Button variant="link">Условия</Button>
    </Row>
  </P>
);

export const Sizes = () => (
  <P>
    <Row>
      <Button variant="primary" size="sm">
        Small
      </Button>
      <Button variant="primary" size="md">
        Medium
      </Button>
      <Button variant="primary" size="lg">
        Large
      </Button>
    </Row>
  </P>
);

export const WithIcons = () => (
  <P>
    <Row>
      <Button variant="primary" leftIcon={<DownloadIcon />}>
        Скачать конфиг
      </Button>
      <Button variant="outline" rightIcon={<DownloadIcon />}>
        Экспорт
      </Button>
    </Row>
  </P>
);

export const States = () => (
  <P>
    <Row>
      <Button variant="primary" loading>
        Загрузка
      </Button>
      <Button variant="primary" disabled>
        Недоступно
      </Button>
      <Button variant="secondary" fullWidth>
        Во всю ширину
      </Button>
    </Row>
  </P>
);

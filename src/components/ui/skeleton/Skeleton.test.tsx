// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PageSkeleton } from './PageSkeleton';
import { Skeleton, SkeletonGroup } from './Skeleton';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

/** Единственный плейсхолдер в поддереве. */
function only(container: HTMLElement): HTMLElement {
  const nodes = container.querySelectorAll('span');
  expect(nodes).toHaveLength(1);
  return nodes[0] as HTMLElement;
}

describe('Skeleton', () => {
  it('по умолчанию рисует span с заливкой line и радиусом lg', () => {
    const { container } = render(<Skeleton />);
    const el = only(container);
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toContain('bg-dark-500/40');
    expect(el.className).toContain('rounded-lg');
    expect(el.className).toContain('animate-pulse');
  });

  it('вариант card даёт рамку и свою заливку', () => {
    const { container } = render(<Skeleton variant="card" />);
    const el = only(container);
    expect(el.className).toContain('bg-dark-500/25');
    expect(el.className).toContain('border-dark-500/40');
    expect(el.className).toContain('rounded-2xl');
  });

  it('circle делает плейсхолдер круглым', () => {
    const { container } = render(<Skeleton circle />);
    expect(only(container).className).toContain('rounded-full');
  });

  it('animate=false убирает пульсацию', () => {
    const { container } = render(<Skeleton animate={false} />);
    expect(only(container).className).not.toContain('animate-pulse');
  });

  it('count рисует столько же элементов', () => {
    const { container } = render(<Skeleton count={4} />);
    expect(container.querySelectorAll('span')).toHaveLength(4);
  });

  it('размер из className перекрывает авторазмер, а не дублируется', () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const cls = only(container).className;
    expect(cls).toContain('h-4');
    expect(cls).toContain('w-32');
    expect(cls).not.toContain('h-[1em]');
    expect(cls).not.toContain('w-full');
  });

  it('пробрасывает style — для рантайм-фона стеклянных тем', () => {
    const { container } = render(<Skeleton style={{ background: 'rgb(1, 2, 3)' }} />);
    expect(only(container).style.background).toBe('rgb(1, 2, 3)');
  });

  // Ключевое для скринридера: объявляет о загрузке только группа.
  it('сам ничего не объявляет скринридеру', () => {
    const { container } = render(<Skeleton />);
    const el = only(container);
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-busy')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
  });
});

describe('SkeletonGroup', () => {
  it('объявляет загрузку: role=status, aria-busy, подпись', () => {
    render(
      <SkeletonGroup className="space-y-2">
        <Skeleton />
      </SkeletonGroup>,
    );
    const group = screen.getByRole('status');
    expect(group).toHaveProperty('tagName', 'DIV');
    expect(group.getAttribute('aria-busy')).toBe('true');
    expect(group.getAttribute('aria-label')).toBe('common.loading');
    expect(group.className).toBe('space-y-2');
  });

  it('на десять плейсхолдеров приходится одно объявление, а не десять', () => {
    render(
      <SkeletonGroup>
        <Skeleton count={10} />
      </SkeletonGroup>,
    );
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
});

describe('PageSkeleton', () => {
  const leadingBoxes = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('[role="status"] > div > span')).slice(0, -1);

  it('юзер-вариант: заголовок h-8, без квадратов слева', () => {
    const { container } = render(<PageSkeleton />);
    const spans = container.querySelectorAll('[role="status"] > div > span');
    expect(spans).toHaveLength(1);
    expect((spans[0] as HTMLElement).className).toContain('h-8');
  });

  it('админский вариант: заголовок h-7 по канону (text-xl без скачков)', () => {
    const { container } = render(<PageSkeleton variant="admin" />);
    const spans = container.querySelectorAll('[role="status"] > div > span');
    expect((spans[spans.length - 1] as HTMLElement).className).toContain('h-7');
  });

  it('leading числом рисует квадраты размера по варианту', () => {
    const { container } = render(<PageSkeleton variant="admin" leading={2} />);
    const boxes = leadingBoxes(container);
    expect(boxes).toHaveLength(2);
    for (const b of boxes) {
      expect((b as HTMLElement).className).toContain('h-10 w-10 rounded-xl');
    }
  });

  it('leading массивом рисует разнородные квадраты — кнопка 40 и аватар 48', () => {
    const { container } = render(
      <PageSkeleton variant="admin" leading={['h-10 w-10 rounded-xl', 'h-12 w-12 rounded-full']} />,
    );
    const boxes = leadingBoxes(container) as HTMLElement[];
    expect(boxes).toHaveLength(2);
    expect(boxes[0].className).toContain('h-10 w-10 rounded-xl');
    expect(boxes[1].className).toContain('h-12 w-12 rounded-full');
  });

  it('юзер-вариант ставит слева иконку 24, а не кнопку 40', () => {
    const { container } = render(<PageSkeleton leading={1} />);
    expect((leadingBoxes(container)[0] as HTMLElement).className).toContain('h-6 w-6 rounded-lg');
  });

  it('тело страницы рендерится внутри группы', () => {
    render(
      <PageSkeleton>
        <div data-testid="body" />
      </PageSkeleton>,
    );
    expect(screen.getByRole('status').querySelector('[data-testid="body"]')).not.toBeNull();
  });

  it('ритм страницы настраивается', () => {
    render(<PageSkeleton className="space-y-5" />);
    expect(screen.getByRole('status').className).toBe('space-y-5');
  });
});

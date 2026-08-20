import { describe, expect, it } from 'vitest';
import { skeletonClass } from './skeletonStyles';

describe('skeletonClass', () => {
  it('по умолчанию даёт вариант line: заливка dark-700/50, радиус lg, пульс', () => {
    const cls = skeletonClass();
    expect(cls).toContain('bg-dark-700/50');
    expect(cls).toContain('rounded-lg');
    expect(cls).toContain('animate-pulse');
  });

  // shrink-0 ломал бы сжатие в узких flex-рядах — он опционален, не дефолтен.
  it('не навязывает shrink-0', () => {
    expect(skeletonClass()).not.toContain('shrink-0');
  });

  it('по умолчанию берёт размер от текста родителя (авторазмер)', () => {
    const cls = skeletonClass();
    expect(cls).toContain('h-[1em]');
    expect(cls).toContain('w-full');
  });

  it('размер из className перекрывает авторазмер, а не соседствует с ним', () => {
    const cls = skeletonClass({ className: 'h-4 w-32' });
    expect(cls).toContain('h-4');
    expect(cls).toContain('w-32');
    expect(cls).not.toContain('h-[1em]');
    expect(cls).not.toContain('w-full');
  });

  it('вариант card даёт рамку, свою заливку и радиус 2xl вместо line-стилей', () => {
    const cls = skeletonClass({ variant: 'card' });
    expect(cls).toContain('bg-dark-800/40');
    expect(cls).toContain('border-dark-700/30');
    expect(cls).toContain('rounded-2xl');
    expect(cls).not.toContain('bg-dark-700/50');
    expect(cls).not.toContain('rounded-lg');
  });

  it('circle заменяет радиус на rounded-full', () => {
    const cls = skeletonClass({ circle: true });
    expect(cls).toContain('rounded-full');
    expect(cls).not.toContain('rounded-lg');
  });

  it('animate=false убирает пульс', () => {
    expect(skeletonClass({ animate: false })).not.toContain('animate-pulse');
  });

  it('заливка из className перекрывает вариантную', () => {
    const cls = skeletonClass({ className: 'bg-dark-800/30' });
    expect(cls).toContain('bg-dark-800/30');
    expect(cls).not.toContain('bg-dark-700/50');
  });

  // Канон CLAUDE.md:128-132 — только токены палитры.
  it('не содержит стоковых tailwind-цветов и сырых хексов', () => {
    for (const opts of [{}, { variant: 'card' as const }, { circle: true }]) {
      const cls = skeletonClass(opts);
      expect(cls).not.toMatch(/\b(gray|slate|zinc|neutral|stone|purple|blue)-\d{2,3}\b/);
      expect(cls).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    }
  });
});

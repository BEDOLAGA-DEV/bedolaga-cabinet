// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityEvent } from '@/api/activity';

/**
 * Сбор следа: нажатие на любую кнопку/ссылку/переключатель уходит с подписью
 * и экраном, поля ввода не считаются, админка не считается, события копятся
 * в пачку и уходят одним запросом.
 */

const sent: ActivityEvent[][] = [];
vi.mock('@/api/activity', () => ({
  activityApi: {
    sendEvents: (events: ActivityEvent[]) => {
      sent.push(events);
      return Promise.resolve();
    },
  },
}));

import {
  installClickTracker,
  resetActivityTracker,
  resolveClickLabel,
  trackClick,
  trackScreen,
} from './activityTracker';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body.firstElementChild as HTMLElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetActivityTracker();
  sent.length = 0;
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

it('подпись берётся с кнопки: data-track, aria-label, title, текст, alt, [tag]', () => {
  expect(resolveClickLabel(mount('<button data-track="Копия ключа">Скопировать</button>'))).toBe(
    'Копия ключа',
  );
  expect(resolveClickLabel(mount('<button aria-label="Закрыть"><svg></svg></button>'))).toBe(
    'Закрыть',
  );
  expect(resolveClickLabel(mount('<a title="Открыть QR"><i></i></a>'))).toBe('Открыть QR');
  expect(resolveClickLabel(mount('<button>  Скопировать\n   ключ </button>'))).toBe(
    'Скопировать ключ',
  );
  expect(resolveClickLabel(mount('<button><img alt="Telegram" src="x"></button>'))).toBe(
    'Telegram',
  );
  expect(resolveClickLabel(mount('<button><svg></svg></button>'))).toBe('[button]');
});

it('клик по вложенному элементу кнопки — подпись самой кнопки', () => {
  const button = mount('<button>Скопировать <span>ключ</span></button>');
  expect(resolveClickLabel(button.querySelector('span'))).toBe('Скопировать ключ');
});

it('поля ввода, обычный текст и служебные зоны не считаются', () => {
  expect(resolveClickLabel(mount('<input type="text" value="x">'))).toBeNull();
  expect(resolveClickLabel(mount('<textarea></textarea>'))).toBeNull();
  expect(resolveClickLabel(mount('<p>Просто текст</p>'))).toBeNull();
  const ignored = mount('<div data-track-ignore><button>Секретная</button></div>');
  expect(resolveClickLabel(ignored.querySelector('button'))).toBeNull();
});

it('переключатели и вкладки считаются', () => {
  expect(resolveClickLabel(mount('<input type="checkbox" name="autopay">'))).toBe('autopay');
  expect(resolveClickLabel(mount('<div role="tab">История</div>'))).toBe('История');
});

it('события копятся и уходят одной пачкой', () => {
  trackScreen('/subscription');
  trackClick(mount('<button>Скопировать ключ</button>'), '/subscription');
  trackClick(mount('<button>Скопировать ключ</button>'), '/subscription');
  expect(sent).toEqual([]);

  vi.runAllTimers();

  expect(sent).toEqual([
    [
      { kind: 'screen', path: '/subscription' },
      { kind: 'click', path: '/subscription', label: 'Скопировать ключ' },
      { kind: 'click', path: '/subscription', label: 'Скопировать ключ' },
    ],
  ]);
});

it('повтор экрана в коротком окне не считается, админка не считается', () => {
  trackScreen('/subscription');
  trackScreen('/subscription');
  trackScreen('/admin/users');
  trackClick(mount('<button>Удалить</button>'), '/admin/users');
  vi.runAllTimers();

  expect(sent).toEqual([[{ kind: 'screen', path: '/subscription' }]]);
});

it('слушатель на документе ловит нажатие и отключается', () => {
  const stop = installClickTracker(() => '/balance');
  const button = mount('<button>Пополнить</button>');
  button.click();
  vi.runAllTimers();
  expect(sent).toEqual([[{ kind: 'click', path: '/balance', label: 'Пополнить' }]]);

  stop();
  button.click();
  vi.runAllTimers();
  expect(sent).toHaveLength(1);
});

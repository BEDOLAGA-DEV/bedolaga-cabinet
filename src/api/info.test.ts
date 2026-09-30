import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Язык документов на проводе между кабинетом и ботом.
 *
 * Бот отдаёт FAQ, правила, политику, оферту и документ о рекуррентных платежах на
 * языке из `?language=`, а без параметра — на языке по умолчанию. Кабинет параметр
 * не передавал, поэтому смена языка интерфейса не меняла текст документов (#570).
 * Тест закрепляет путь и параметр каждого метода: страницы мокают `@/api/info`
 * целиком и этого не видят.
 */

const get = vi.fn((_url: string, _config?: unknown) =>
  Promise.resolve({ data: { content: '', updated_at: null } }),
);

vi.mock('./client', () => ({
  default: { get, post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const DOCUMENTS = [
  ['getFaqPages', '/cabinet/info/faq'],
  ['getRules', '/cabinet/info/rules'],
  ['getPrivacyPolicy', '/cabinet/info/privacy-policy'],
  ['getPublicOffer', '/cabinet/info/public-offer'],
  ['getRecurrentPayments', '/cabinet/info/recurrent-payments'],
] as const;

describe('infoApi: язык документов', () => {
  beforeEach(() => get.mockClear());

  it.each(DOCUMENTS)('%s передаёт язык в query', async (method, url) => {
    const { infoApi } = await import('./info');

    await infoApi[method]('en');

    expect(get).toHaveBeenCalledWith(url, { params: { language: 'en' } });
  });

  it.each(DOCUMENTS)('%s без языка не шлёт пустой параметр', async (method, url) => {
    const { infoApi } = await import('./info');

    await infoApi[method]();

    expect(get).toHaveBeenCalledWith(url, undefined);
  });

  it('getFaqPage передаёт язык вместе с id страницы', async () => {
    const { infoApi } = await import('./info');

    await infoApi.getFaqPage(7, 'zh');

    expect(get).toHaveBeenCalledWith('/cabinet/info/faq/7', { params: { language: 'zh' } });
  });
});

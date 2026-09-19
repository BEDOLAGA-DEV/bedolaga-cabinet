// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { afterEach, describe, expect, it } from 'vitest';
import ru from './locales/ru.json';

/**
 * Воспроизведение самого симптома, а не только контракта модуля: конфигурация
 * i18next здесь повторяет боевую (ленивая загрузка словаря, `useSuspense: false`),
 * а чанк локали приезжает с задержкой — как на холодном кэше.
 *
 * Так видно, ПОЧЕМУ форма выглядела наполовину переведённой: `t('auth.login')`
 * отдаёт сам ключ, а `t('auth.register', 'Register')` — инлайн-дефолт. Ровно то,
 * что на скриншоте из репорта.
 */

function Form() {
  const { t } = useTranslation();
  return (
    <div>
      <span data-testid="no-default">{t('auth.login')}</span>
      <span data-testid="with-default">{t('auth.register', 'Register')}</span>
    </div>
  );
}

async function makeI18n() {
  const instance = i18next.createInstance();
  await instance.init({
    lng: 'ru',
    fallbackLng: 'ru',
    partialBundledLanguages: true,
    resources: {},
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

function loadRu(instance: typeof i18next, delayMs: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(() => {
      instance.addResourceBundle('ru', 'translation', ru, true, true);
      resolve();
    }, delayMs),
  );
}

afterEach(cleanup);

describe('отрисовка до словарей (холодный кэш)', () => {
  it('без ожидания на экране остаются сырые ключи и инлайн-дефолты', async () => {
    const instance = await makeI18n();
    const loading = loadRu(instance, 30);

    render(
      <I18nextProvider i18n={instance}>
        <Form />
      </I18nextProvider>,
    );

    // Ровно картинка из репорта: слева ключ, справа английский дефолт.
    expect(screen.getByTestId('no-default').textContent).toBe('auth.login');
    expect(screen.getByTestId('with-default').textContent).toBe('Register');

    await loading;
  });

  it('после ожидания загрузки — переведено', async () => {
    const instance = await makeI18n();
    await loadRu(instance, 30);

    render(
      <I18nextProvider i18n={instance}>
        <Form />
      </I18nextProvider>,
    );

    const translated = screen.getByTestId('no-default').textContent;
    expect(translated).not.toBe('auth.login');
    expect(translated).toBe(ru.auth.login);
  });
});

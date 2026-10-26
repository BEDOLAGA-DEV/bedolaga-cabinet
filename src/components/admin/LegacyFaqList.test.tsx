// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LegacyFaqList } from './LegacyFaqList';
import { legacyFaqApi } from '../../api/infoPages';
vi.mock('../../api/infoPages', () => ({ legacyFaqApi: { updatePage: vi.fn() } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
afterEach(cleanup);
const page = {
  id: 7,
  title: 'Existing FAQ',
  content: '<p>Answer</p>',
  language: 'fa',
  display_order: 4,
  is_active: true,
  is_enabled: false,
};
function mount(content = page.content) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <LegacyFaqList pages={[{ ...page, content }]} />
    </QueryClientProvider>,
  );
}
describe('existing bot FAQ editor', () => {
  it('edits the original ID without changing language/order or group visibility', async () => {
    vi.mocked(legacyFaqApi.updatePage).mockResolvedValue(page);
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'admin.infoPages.edit' }));
    fireEvent.change(screen.getByRole('textbox', { name: /question/ }), {
      target: { value: 'Updated question' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'admin.infoPages.faq.answer' }), {
      target: { value: '<p>Updated answer</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() =>
      expect(legacyFaqApi.updatePage).toHaveBeenCalledWith(
        { ...page, title: 'Updated question', content: '<p>Updated answer</p>' },
        expect.anything(),
      ),
    );
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
  });
  it('preserves Telegram HTML and raw newlines exactly when editing the answer', async () => {
    const content =
      '<b>Title</b>\n\nLine 1\n<tg-spoiler>Hidden</tg-spoiler>\n<tg-emoji emoji-id="123">🙂</tg-emoji> &amp; text';
    const edited = `${content}!`;
    vi.mocked(legacyFaqApi.updatePage).mockResolvedValue({ ...page, content: edited });
    mount(content);
    fireEvent.click(screen.getByRole('button', { name: 'admin.infoPages.edit' }));
    const answer = screen.getByRole('textbox', { name: 'admin.infoPages.faq.answer' });
    expect((answer as HTMLTextAreaElement).value).toBe(content);
    fireEvent.change(answer, { target: { value: edited } });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() =>
      expect(legacyFaqApi.updatePage).toHaveBeenCalledWith(
        { ...page, content: edited },
        expect.anything(),
      ),
    );
  });
  it('keeps the draft when saving fails', async () => {
    vi.mocked(legacyFaqApi.updatePage).mockRejectedValue(new Error('offline'));
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'admin.infoPages.edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await screen.findByRole('alert');
    expect(
      (screen.getByRole('textbox', { name: 'admin.infoPages.faq.answer' }) as HTMLTextAreaElement)
        .value,
    ).toBe('<p>Answer</p>');
  });
});

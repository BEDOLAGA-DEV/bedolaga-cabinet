import { describe, expect, it } from 'vitest';
import { availableMirrors, replaceSubscriptionUrl, selectedMirrorUrl } from './subscriptionMirrors';
const main = 'https://main.example/sub/token';
const mirror = { id: '0123456789abcdef', label: 'Alt', url: 'https://alt.example/sub/token' };
const data = { connect_mode: 'guide', hide_link: false, mirrors: [mirror] };
describe('subscription mirrors', () => {
  it('selects only known safe IDs, deriving fresh URLs after reissue', () => {
    expect(selectedMirrorUrl(main, availableMirrors(data), mirror.id)).toBe(mirror.url);
    expect(selectedMirrorUrl(main, availableMirrors(data), 'missing')).toBe(main);
    expect(selectedMirrorUrl(main, [{ ...mirror, url: mirror.url + 'new' }], mirror.id)).toBe(
      mirror.url + 'new',
    );
  });
  it('never offers raw mirrors in hidden or encrypted modes', () => {
    expect(availableMirrors({ ...data, hide_link: true })).toEqual([]);
    expect(availableMirrors({ ...data, connect_mode: 'happ_cryptolink' })).toEqual([]);
  });
  it('rejects unsafe addresses and nonopaque IDs', () => {
    expect(
      availableMirrors({
        ...data,
        mirrors: [
          { ...mirror, url: 'javascript:alert(1)' },
          { ...mirror, id: main },
          { ...mirror, url: 'https://user:pass@alt.example/sub' },
        ],
      }),
    ).toEqual([]);
  });
  it('replaces exact canonical URL in imports, never arbitrary origins or other tokens', () => {
    expect(replaceSubscriptionUrl('happ://add/' + main, main, mirror.url)).toBe(
      'happ://add/' + mirror.url,
    );
    expect(
      replaceSubscriptionUrl('app://add?url=' + encodeURIComponent(main), main, mirror.url),
    ).toBe('app://add?url=' + encodeURIComponent(mirror.url));
    expect(replaceSubscriptionUrl(main + 'other', main, mirror.url)).toBe(main + 'other');
    expect(replaceSubscriptionUrl('https://main.example/docs', main, mirror.url)).toBe(
      'https://main.example/docs',
    );
  });
});
it('rejects plaintext mirrors and embedded strings which are not a complete import argument', () => {
  expect(
    availableMirrors({ ...data, mirrors: [{ ...mirror, url: 'http://alt.example/sub/token' }] }),
  ).toEqual([]);
  const unrelated = 'https://evil.example/?q=prefix' + main;
  expect(replaceSubscriptionUrl(unrelated, main, mirror.url)).toBe(unrelated);
});
it('refreshes template imports without rewriting external buttons or text', async () => {
  const { mirrorAppConfig } = await import('./subscriptionMirrors');
  const config = {
    subscriptionUrl: main,
    buttons: [
      {
        type: 'subscriptionLink',
        url: 'happ://add/{{SUBSCRIPTION_LINK}}',
        resolvedUrl: 'happ://add/' + main,
      },
      {
        type: 'subscriptionLink',
        url: '{{HAPP_CRYPT4_LINK}}',
        resolvedUrl: 'happ://crypt4/primary',
      },
      { type: 'external', url: main },
    ],
    text: { url: main },
  };
  const result = mirrorAppConfig(config, main, mirror.url);
  expect(result.subscriptionUrl).toBe(mirror.url);
  expect(result.buttons[0].resolvedUrl).toBe('happ://add/{{SUBSCRIPTION_LINK}}');
  expect(result.buttons[1].resolvedUrl).toBe('{{HAPP_CRYPT4_LINK}}');
  expect(result.buttons[2].url).toBe(main);
  expect(result.text).toEqual(config.text);
});

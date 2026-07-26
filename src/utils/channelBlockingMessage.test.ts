import { describe, expect, it } from 'vitest';
import { customChannelMessage } from './channelBlockingMessage';

describe('customChannelMessage', () => {
  it('returns null for empty values', () => {
    expect(customChannelMessage(undefined)).toBeNull();
    expect(customChannelMessage(null)).toBeNull();
    expect(customChannelMessage('')).toBeNull();
    expect(customChannelMessage('   ')).toBeNull();
  });

  it('returns null for the hardcoded backend default message', () => {
    expect(
      customChannelMessage('Please subscribe to the required channels to continue'),
    ).toBeNull();
  });

  it('ignores surrounding whitespace when matching the backend default', () => {
    expect(
      customChannelMessage('  Please subscribe to the required channels to continue  '),
    ).toBeNull();
  });

  it('passes through a custom message', () => {
    expect(customChannelMessage('Подпишитесь на наш канал @example')).toBe(
      'Подпишитесь на наш канал @example',
    );
  });

  it('trims a custom message', () => {
    expect(customChannelMessage('  custom  ')).toBe('custom');
  });
});

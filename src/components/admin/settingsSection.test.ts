import { describe, expect, it } from 'vitest';
import { findSettingsSection } from './constants';

/** `?section=` в ссылке на настройки: известный раздел дерева открывается сразу, мусор игнорируется. */

describe('findSettingsSection', () => {
  it('принимает подпункт дерева и особый пункт, отбрасывает неизвестное', () => {
    expect(findSettingsSection('sys_reachability')).toBe('sys_reachability');
    expect(findSettingsSection('branding')).toBe('branding');
    expect(findSettingsSection('teapot')).toBeNull();
    expect(findSettingsSection(null)).toBeNull();
  });
});

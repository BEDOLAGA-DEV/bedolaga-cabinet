import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { transactionTypeBadge, transactionTypeLabelKey } from './transactionType';

/** Все типы операций бота (app/database/models.py, TransactionType). */
const BOT_TYPES = [
  'deposit',
  'withdrawal',
  'subscription_payment',
  'refund',
  'failed_refund',
  'referral_reward',
  'poll_reward',
  'gift_payment',
];

const LOCALES = ['ru', 'en', 'zh', 'fa'].map((lang) => ({
  lang,
  dict: JSON.parse(readFileSync(join(__dirname, '..', 'locales', `${lang}.json`), 'utf8')),
}));

const lookup = (dict: Record<string, unknown>, key: string) =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dict);

describe('тип операции в истории баланса', () => {
  it.each(BOT_TYPES)('%s подписан словами на всех языках, а не служебным именем', (type) => {
    const key = transactionTypeLabelKey(type);
    for (const { lang, dict } of LOCALES) {
      expect(typeof lookup(dict, key), `${lang}: ${key}`).toBe('string');
    }
  });

  it('регистр не важен: бот присылал и DEPOSIT, и deposit', () => {
    expect(transactionTypeLabelKey('DEPOSIT')).toBe(transactionTypeLabelKey('deposit'));
    expect(transactionTypeBadge('Referral_Reward')).toBe(transactionTypeBadge('referral_reward'));
  });

  it('незнакомый тип — нейтральное «Операция», не сырое имя', () => {
    const key = transactionTypeLabelKey('something_new');
    expect(key).toBe('balance.otherOperation');
    for (const { dict } of LOCALES) expect(typeof lookup(dict, key)).toBe('string');
    expect(transactionTypeBadge('something_new')).toBe('badge-neutral');
  });
});

import type { Verdict } from '@/api/reachability';

export type Tone = 'success' | 'error' | 'warning' | 'neutral';

/** Цвет ячейки — соответствие ожиданию. Без ожидания (null) — нейтрально, unknown — предупреждение. */
export function verdictTone(verdict: Verdict, matches: boolean | null): Tone {
  if (verdict === 'cancelled') return 'neutral';
  if (verdict === 'unknown') return 'warning';
  if (matches === true) return 'success';
  if (matches === false) return 'error';
  return 'neutral';
}

const TONE_CLASSES: Record<Tone, string> = {
  success: 'border-success-500/30 bg-success-500/15 text-success-400',
  error: 'border-error-500/30 bg-error-500/15 text-error-400',
  warning: 'border-warning-500/30 bg-warning-500/15 text-warning-400',
  neutral: 'border-dark-700/60 bg-dark-800/60 text-dark-300',
};

export function toneClasses(tone: Tone): string {
  return TONE_CLASSES[tone];
}

export function verdictLabelKey(verdict: Verdict): string {
  return `admin.reachability.verdict.${verdict}`;
}

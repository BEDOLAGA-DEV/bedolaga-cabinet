import { useScreenViewReporter } from '@/hooks/useScreenViewReporter';

/** Невидимый спутник авторизованных экранов: отправляет след об их открытии. */
export function ScreenViewReporter() {
  useScreenViewReporter();
  return null;
}

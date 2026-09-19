import { useDocumentBranding } from '@/hooks/useDocumentBranding';

/** Ничего не рисует: держит заголовок, фавикон, имя приложения и манифест в <head>. */
export function DocumentBranding() {
  useDocumentBranding();
  return null;
}
